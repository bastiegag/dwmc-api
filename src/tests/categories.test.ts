import { beforeEach, describe, expect, it, vi } from 'vitest'
import { app } from '../app.js'
import { prisma } from '../db/prisma.js'
import { supabase } from '../lib/supabase.js'

vi.mock('../lib/supabase.js', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
    },
  },
}))

vi.mock('../db/prisma.js', () => ({
  prisma: {
    $queryRaw: vi.fn(),
    userProfile: {
      findUnique: vi.fn(),
    },
    category: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}))

const BEARER = 'Bearer '
const profile = { id: 'profile-1' }

function mockAuth(userId = 'user-1') {
  vi.mocked(supabase.auth.getUser).mockResolvedValue({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: { user: { id: userId, email: `${userId}@example.com` } as any },
    error: null,
  })
}

describe('Categories routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth()
    vi.mocked(prisma.userProfile.findUnique).mockResolvedValue({
      id: profile.id,
      authUserId: 'user-1',
      email: 'user-1@example.com',
      firstName: null,
      lastName: null,
      currency: 'CAD',
      locale: 'fr-CA',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    })
  })

  it('GET /api/v1/categories without token returns 401', async () => {
    const res = await app.request('/api/v1/categories')
    expect(res.status).toBe(401)
  })

  it('POST /api/v1/categories without token returns 401', async () => {
    const res = await app.request('/api/v1/categories', { method: 'POST' })
    expect(res.status).toBe(401)
  })

  it('Creating a category validates required fields', async () => {
    const res = await app.request('/api/v1/categories', {
      method: 'POST',
      headers: {
        Authorization: `${BEARER}valid-token`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({}),
    })

    expect(res.status).toBe(422)
  })

  it('Creating a category trims the name', async () => {
    vi.mocked(prisma.category.findFirst).mockResolvedValue(null)
    vi.mocked(prisma.category.create).mockResolvedValue({
      id: 'cat-1',
      userProfileId: profile.id,
      name: 'Groceries',
      type: 'EXPENSE',
      color: null,
      icon: null,
      parentId: null,
      isArchived: false,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    })

    const res = await app.request('/api/v1/categories', {
      method: 'POST',
      headers: {
        Authorization: `${BEARER}valid-token`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        name: '   Groceries   ',
        type: 'EXPENSE',
      }),
    })

    expect(res.status).toBe(201)
    expect(prisma.category.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ name: 'Groceries' }),
      }),
    )
  })

  it('Creating a duplicate category returns 409', async () => {
    vi.mocked(prisma.category.findFirst).mockResolvedValueOnce({
      id: 'cat-existing',
      userProfileId: profile.id,
      name: 'Salary',
      type: 'INCOME',
      color: null,
      icon: null,
      parentId: null,
      isArchived: false,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    })

    const res = await app.request('/api/v1/categories', {
      method: 'POST',
      headers: {
        Authorization: `${BEARER}valid-token`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Salary',
        type: 'INCOME',
      }),
    })

    expect(res.status).toBe(409)
  })

  it('Listing categories only returns categories for the authenticated user', async () => {
    vi.mocked(prisma.category.findMany).mockResolvedValue([
      {
        id: 'cat-1',
        userProfileId: profile.id,
        name: 'Groceries',
        type: 'EXPENSE',
        color: null,
        icon: null,
        parentId: null,
        isArchived: false,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      },
    ])

    const res = await app.request('/api/v1/categories', {
      headers: { Authorization: `${BEARER}valid-token` },
    })

    expect(res.status).toBe(200)
    expect(prisma.category.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ userProfileId: profile.id }) }),
    )
    const body = (await res.json()) as { data: Array<{ id: string }> }
    expect(body.data).toHaveLength(1)
    expect(body.data[0]?.id).toBe('cat-1')
  })

  it("GET /api/v1/categories/:id returns 404 for another user's category", async () => {
    vi.mocked(prisma.category.findFirst).mockResolvedValue(null)

    const res = await app.request('/api/v1/categories/cat-foreign', {
      headers: { Authorization: `${BEARER}valid-token` },
    })

    expect(res.status).toBe(404)
  })

  it("PATCH /api/v1/categories/:id updates only the authenticated user's category", async () => {
    vi.mocked(prisma.category.findFirst)
      .mockResolvedValueOnce({
        id: 'cat-1',
        userProfileId: profile.id,
        name: 'Groceries',
        type: 'EXPENSE',
        color: null,
        icon: null,
        parentId: null,
        isArchived: false,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      })
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 'cat-1',
        userProfileId: profile.id,
        name: 'Supermarket',
        type: 'EXPENSE',
        color: null,
        icon: null,
        parentId: null,
        isArchived: false,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
      })

    vi.mocked(prisma.category.updateMany).mockResolvedValue({ count: 1 })

    const res = await app.request('/api/v1/categories/cat-1', {
      method: 'PATCH',
      headers: {
        Authorization: `${BEARER}valid-token`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ name: '  Supermarket  ' }),
    })

    expect(res.status).toBe(200)
    expect(prisma.category.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'cat-1', userProfileId: profile.id },
        data: expect.objectContaining({ name: 'Supermarket' }),
      }),
    )
  })

  it('DELETE /api/v1/categories/:id soft deletes by setting isArchived = true', async () => {
    vi.mocked(prisma.category.updateMany).mockResolvedValue({ count: 1 })
    vi.mocked(prisma.category.findFirst).mockResolvedValue({
      id: 'cat-1',
      userProfileId: profile.id,
      name: 'Groceries',
      type: 'EXPENSE',
      color: null,
      icon: null,
      parentId: null,
      isArchived: true,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-02'),
    })

    const res = await app.request('/api/v1/categories/cat-1', {
      method: 'DELETE',
      headers: { Authorization: `${BEARER}valid-token` },
    })

    expect(res.status).toBe(200)
    expect(prisma.category.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { isArchived: true } }),
    )
    const body = (await res.json()) as { data: { isArchived: boolean } }
    expect(body.data.isArchived).toBe(true)
  })

  it('Archived categories are excluded by default from GET /api/v1/categories', async () => {
    vi.mocked(prisma.category.findMany).mockResolvedValue([])

    const res = await app.request('/api/v1/categories', {
      headers: { Authorization: `${BEARER}valid-token` },
    })

    expect(res.status).toBe(200)
    expect(prisma.category.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ isArchived: false }) }),
    )
  })

  it('includeArchived=true includes archived categories', async () => {
    vi.mocked(prisma.category.findMany).mockResolvedValue([])

    const res = await app.request('/api/v1/categories?includeArchived=true', {
      headers: { Authorization: `${BEARER}valid-token` },
    })

    expect(res.status).toBe(200)
    expect(prisma.category.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userProfileId: profile.id } }),
    )
  })

  it('Invalid parentId returns 400', async () => {
    vi.mocked(prisma.category.findFirst).mockResolvedValue(null)

    const res = await app.request('/api/v1/categories', {
      method: 'POST',
      headers: {
        Authorization: `${BEARER}valid-token`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Subcategory',
        type: 'EXPENSE',
        parentId: 'missing-parent',
      }),
    })

    expect(res.status).toBe(400)
  })

  it('A category cannot be its own parent', async () => {
    vi.mocked(prisma.category.findFirst).mockResolvedValueOnce({
      id: 'cat-1',
      userProfileId: profile.id,
      name: 'Groceries',
      type: 'EXPENSE',
      color: null,
      icon: null,
      parentId: null,
      isArchived: false,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    })

    const res = await app.request('/api/v1/categories/cat-1', {
      method: 'PATCH',
      headers: {
        Authorization: `${BEARER}valid-token`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ parentId: 'cat-1' }),
    })

    expect(res.status).toBe(400)
  })
})
