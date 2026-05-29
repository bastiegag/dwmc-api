/* eslint-disable @typescript-eslint/no-explicit-any */
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
      upsert: vi.fn(),
    },
    section: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    category: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}))

type Profile = {
  id: string
  authUserId: string
  email: string | null
  firstName: string | null
  lastName: string | null
  currency: string
  locale: string
  createdAt: Date
  updatedAt: Date
}

type Section = {
  id: string
  userProfileId: string
  name: string
  color: string
  isArchived: boolean
  createdAt: Date
  updatedAt: Date
}

type Category = {
  id: string
  userProfileId: string
  sectionId: string
  name: string
  icon: string
  isArchived: boolean
  createdAt: Date
  updatedAt: Date
}

const BEARER = 'Bearer '
const TOKEN_USER_1 = 'token-user-1'
const TOKEN_USER_2 = 'token-user-2'

const profilesByAuthUserId = new Map<string, Profile>()
let sections: Section[] = []
let categories: Category[] = []
let sectionCounter = 1
let categoryCounter = 1

function authHeader(token: string) {
  return { Authorization: `${BEARER}${token}` }
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function configureSupabaseMock() {
  (supabase.auth.getUser as any).mockImplementation(async (token: string) => {
    if (token === TOKEN_USER_1) {
      return {
        data: { user: { id: 'auth-user-1', email: 'user1@example.com' } as any },
        error: null,
      }
    }

    if (token === TOKEN_USER_2) {
      return {
        data: { user: { id: 'auth-user-2', email: 'user2@example.com' } as any },
        error: null,
      }
    }

    return {
      data: { user: null },
      error: { message: 'Invalid JWT' } as any,
    }
  })
}

function configurePrismaMocks() {
  (prisma.userProfile.upsert as any).mockImplementation(async ({ where, update, create }: any) => {
    const existing = profilesByAuthUserId.get(where.authUserId)
    if (existing) {
      const next = {
        ...existing,
        email: update.email ?? existing.email,
        updatedAt: new Date(),
      }
      profilesByAuthUserId.set(where.authUserId, next)
      return clone(next)
    }

    const profile: Profile = {
      id: `profile-${where.authUserId}`,
      authUserId: create.authUserId,
      email: create.email ?? null,
      firstName: null,
      lastName: null,
      currency: 'CAD',
      locale: 'fr-CA',
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    profilesByAuthUserId.set(where.authUserId, profile)
    return clone(profile)
  });

  (prisma.section.findMany as any).mockImplementation(async ({ where, include, orderBy }: any) => {
    let result = sections.filter((section) => section.userProfileId === where.userProfileId)

    if (where.isArchived !== undefined) {
      result = result.filter((section) => section.isArchived === where.isArchived)
    }

    if (orderBy?.name === 'asc') {
      result = [...result].sort((a, b) => a.name.localeCompare(b.name))
    }

    if (!include?.categories) {
      return clone(result)
    }

    return clone(
      result.map((section) => {
        let nested = categories.filter((category) => category.sectionId === section.id)
        if (include.categories.where?.isArchived !== undefined) {
          nested = nested.filter((category) => category.isArchived === include.categories.where.isArchived)
        }
        if (include.categories.orderBy?.name === 'asc') {
          nested = [...nested].sort((a, b) => a.name.localeCompare(b.name))
        }

        return { ...section, categories: nested }
      }),
    )
  });

  (prisma.section.findFirst as any).mockImplementation(async ({ where, include }: any) => {
    const result = sections.filter((section) => {
      if (where.id && section.id !== where.id) {
        return false
      }
      if (where.userProfileId && section.userProfileId !== where.userProfileId) {
        return false
      }
      if (where.name && section.name !== where.name) {
        return false
      }
      if (where.id?.not && section.id === where.id.not) {
        return false
      }
      return true
    })

    const found = result[0]
    if (!found) {
      return null
    }

    if (!include?.categories) {
      return clone(found)
    }

    let nested = categories.filter((category) => category.sectionId === found.id)
    if (include.categories.where?.isArchived !== undefined) {
      nested = nested.filter((category) => category.isArchived === include.categories.where.isArchived)
    }

    return clone({ ...found, categories: nested })
  });

  (prisma.section.create as any).mockImplementation(async ({ data }: any) => {
    const now = new Date()
    const section: Section = {
      id: `section-${sectionCounter++}`,
      userProfileId: data.userProfileId,
      name: data.name,
      color: data.color,
      isArchived: false,
      createdAt: now,
      updatedAt: now,
    }

    sections.push(section)
    return clone(section)
  });

  (prisma.section.update as any).mockImplementation(async ({ where, data }: any) => {
    const index = sections.findIndex((section) => section.id === where.id)
    if (index < 0) {
      throw new Error('Section not found')
    }

    const current = sections[index] as Section
    const next = {
      ...current,
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.color !== undefined ? { color: data.color } : {}),
      ...(data.isArchived !== undefined ? { isArchived: data.isArchived } : {}),
      updatedAt: new Date(),
    }

    sections[index] = next
    return clone(next)
  });

  (prisma.section.updateMany as any).mockImplementation(async ({ where, data }: any) => {
    let count = 0
    sections = sections.map((section) => {
      if (section.id !== where.id || section.userProfileId !== where.userProfileId) {
        return section
      }

      count += 1
      return {
        ...section,
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.color !== undefined ? { color: data.color } : {}),
        ...(data.isArchived !== undefined ? { isArchived: data.isArchived } : {}),
        updatedAt: new Date(),
      }
    })

    return { count }
  });

  (prisma.category.updateMany as any).mockImplementation(async ({ where, data }: any) => {
    let count = 0
    categories = categories.map((category) => {
      if (category.sectionId !== where.sectionId || category.userProfileId !== where.userProfileId) {
        return category
      }

      count += 1
      return {
        ...category,
        ...(data.isArchived !== undefined ? { isArchived: data.isArchived } : {}),
        updatedAt: new Date(),
      }
    })

    return { count }
  })
}

describe('Sections API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    profilesByAuthUserId.clear()
    sections = []
    categories = []
    sectionCounter = 1
    categoryCounter = 1

    configureSupabaseMock()
    configurePrismaMocks()
  })

  it('GET /api/v1/sections without token returns 401', async () => {
    const res = await app.request('/api/v1/sections')
    expect(res.status).toBe(401)
  })

  it('POST /api/v1/sections without token returns 401', async () => {
    const res = await app.request('/api/v1/sections', { method: 'POST' })
    expect(res.status).toBe(401)
  })

  it('creating a section validates required fields', async () => {
    const res = await app.request('/api/v1/sections', {
      method: 'POST',
      headers: {
        ...authHeader(TOKEN_USER_1),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: '', color: '' }),
    })

    expect(res.status).toBe(400)
    const body: any = await res.json()
    expect(body.error.code).toBe('VALIDATION_ERROR')
  })

  it('creating a section trims the name', async () => {
    const res = await app.request('/api/v1/sections', {
      method: 'POST',
      headers: {
        ...authHeader(TOKEN_USER_1),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: '  Food  ', color: '#22c55e' }),
    })

    expect(res.status).toBe(201)
    const body: any = await res.json()
    expect(body.data.name).toBe('Food')
  })

  it('creating a duplicate section for the same user returns 409', async () => {
    await app.request('/api/v1/sections', {
      method: 'POST',
      headers: {
        ...authHeader(TOKEN_USER_1),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: 'Food', color: '#22c55e' }),
    })

    const res = await app.request('/api/v1/sections', {
      method: 'POST',
      headers: {
        ...authHeader(TOKEN_USER_1),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: 'Food', color: '#3b82f6' }),
    })

    expect(res.status).toBe(409)
    const body: any = await res.json()
    expect(body.error.code).toBe('CONFLICT')
  })

  it('listing sections only returns sections for the authenticated user', async () => {
    await app.request('/api/v1/sections', {
      method: 'POST',
      headers: {
        ...authHeader(TOKEN_USER_1),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: 'Food', color: '#22c55e' }),
    })

    await app.request('/api/v1/sections', {
      method: 'POST',
      headers: {
        ...authHeader(TOKEN_USER_2),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: 'Home', color: '#3b82f6' }),
    })

    const res = await app.request('/api/v1/sections', {
      headers: authHeader(TOKEN_USER_1),
    })

    expect(res.status).toBe(200)
    const body: any = await res.json()
    expect(body.data).toHaveLength(1)
    expect(body.data[0].name).toBe('Food')
  })

  it("GET /api/v1/sections/:id returns 404 for another user's section", async () => {
    const createRes = await app.request('/api/v1/sections', {
      method: 'POST',
      headers: {
        ...authHeader(TOKEN_USER_2),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: 'Home', color: '#3b82f6' }),
    })
    const created: any = await createRes.json()

    const res = await app.request(`/api/v1/sections/${created.data.id}`, {
      headers: authHeader(TOKEN_USER_1),
    })

    expect(res.status).toBe(404)
  })

  it("PATCH /api/v1/sections/:id updates only the authenticated user's section", async () => {
    const createRes = await app.request('/api/v1/sections', {
      method: 'POST',
      headers: {
        ...authHeader(TOKEN_USER_1),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: 'Food', color: '#22c55e' }),
    })
    const created: any = await createRes.json()

    const res = await app.request(`/api/v1/sections/${created.data.id}`, {
      method: 'PATCH',
      headers: {
        ...authHeader(TOKEN_USER_1),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: 'Food Updated' }),
    })

    expect(res.status).toBe(200)
    const body: any = await res.json()
    expect(body.data.name).toBe('Food Updated')

    const otherUserRes = await app.request(`/api/v1/sections/${created.data.id}`, {
      method: 'PATCH',
      headers: {
        ...authHeader(TOKEN_USER_2),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: 'Not Allowed' }),
    })
    expect(otherUserRes.status).toBe(404)
  })

  it('DELETE /api/v1/sections/:id soft deletes a section', async () => {
    const createRes = await app.request('/api/v1/sections', {
      method: 'POST',
      headers: {
        ...authHeader(TOKEN_USER_1),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: 'Food', color: '#22c55e' }),
    })
    const created: any = await createRes.json()

    const res = await app.request(`/api/v1/sections/${created.data.id}`, {
      method: 'DELETE',
      headers: authHeader(TOKEN_USER_1),
    })

    expect(res.status).toBe(200)
    const body: any = await res.json()
    expect(body.data.isArchived).toBe(true)
  })

  it('archived sections are excluded by default', async () => {
    const createRes = await app.request('/api/v1/sections', {
      method: 'POST',
      headers: {
        ...authHeader(TOKEN_USER_1),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: 'Food', color: '#22c55e' }),
    })
    const created: any = await createRes.json()

    await app.request(`/api/v1/sections/${created.data.id}`, {
      method: 'DELETE',
      headers: authHeader(TOKEN_USER_1),
    })

    const res = await app.request('/api/v1/sections', {
      headers: authHeader(TOKEN_USER_1),
    })
    const body: any = await res.json()

    expect(body.data).toHaveLength(0)
  })

  it('includeArchived=true includes archived sections', async () => {
    const createRes = await app.request('/api/v1/sections', {
      method: 'POST',
      headers: {
        ...authHeader(TOKEN_USER_1),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: 'Food', color: '#22c55e' }),
    })
    const created: any = await createRes.json()

    await app.request(`/api/v1/sections/${created.data.id}`, {
      method: 'DELETE',
      headers: authHeader(TOKEN_USER_1),
    })

    const res = await app.request('/api/v1/sections?includeArchived=true', {
      headers: authHeader(TOKEN_USER_1),
    })
    const body: any = await res.json()

    expect(body.data).toHaveLength(1)
    expect(body.data[0].isArchived).toBe(true)
  })

  it('includeCategories=true includes categories', async () => {
    const createRes = await app.request('/api/v1/sections', {
      method: 'POST',
      headers: {
        ...authHeader(TOKEN_USER_1),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: 'Food', color: '#22c55e' }),
    })
    const created: any = await createRes.json()

    const profile = profilesByAuthUserId.get('auth-user-1')
    if (!profile) {
      throw new Error('Missing profile')
    }

    categories.push({
      id: `category-${categoryCounter++}`,
      userProfileId: profile.id,
      sectionId: created.data.id,
      name: 'Groceries',
      icon: 'shopping-cart',
      isArchived: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    const res = await app.request('/api/v1/sections?includeCategories=true', {
      headers: authHeader(TOKEN_USER_1),
    })
    const body: any = await res.json()

    expect(body.data[0].categories).toHaveLength(1)
    expect(body.data[0].categories[0].name).toBe('Groceries')
  })

  it('archived categories are excluded by default when including categories', async () => {
    const createRes = await app.request('/api/v1/sections', {
      method: 'POST',
      headers: {
        ...authHeader(TOKEN_USER_1),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: 'Food', color: '#22c55e' }),
    })
    const created: any = await createRes.json()

    const profile = profilesByAuthUserId.get('auth-user-1')
    if (!profile) {
      throw new Error('Missing profile')
    }

    categories.push(
      {
        id: `category-${categoryCounter++}`,
        userProfileId: profile.id,
        sectionId: created.data.id,
        name: 'Groceries',
        icon: 'shopping-cart',
        isArchived: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: `category-${categoryCounter++}`,
        userProfileId: profile.id,
        sectionId: created.data.id,
        name: 'Restaurants',
        icon: 'utensils',
        isArchived: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    )

    const res = await app.request('/api/v1/sections?includeCategories=true', {
      headers: authHeader(TOKEN_USER_1),
    })
    const body: any = await res.json()

    expect(body.data[0].categories).toHaveLength(1)
    expect(body.data[0].categories[0].name).toBe('Groceries')
  })
})
