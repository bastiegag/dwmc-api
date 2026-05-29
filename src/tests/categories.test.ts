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

  (prisma.section.findFirst as any).mockImplementation(async ({ where }: any) => {
    const found = sections.find((section) => {
      if (where.id && section.id !== where.id) {
        return false
      }
      if (where.userProfileId && section.userProfileId !== where.userProfileId) {
        return false
      }
      if (where.name && section.name !== where.name) {
        return false
      }
      return true
    })

    return found ? clone(found) : null
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

  (prisma.category.findMany as any).mockImplementation(async ({ where, orderBy }: any) => {
    let result = categories.filter((category) => category.userProfileId === where.userProfileId)

    if (where.isArchived !== undefined) {
      result = result.filter((category) => category.isArchived === where.isArchived)
    }
    if (where.sectionId) {
      result = result.filter((category) => category.sectionId === where.sectionId)
    }

    if (orderBy?.name === 'asc') {
      result = [...result].sort((a, b) => a.name.localeCompare(b.name))
    }

    return clone(result)
  });

  (prisma.category.findFirst as any).mockImplementation(async ({ where }: any) => {
    const found = categories.find((category) => {
      if (where.id && category.id !== where.id) {
        return false
      }
      if (where.userProfileId && category.userProfileId !== where.userProfileId) {
        return false
      }
      if (where.sectionId && category.sectionId !== where.sectionId) {
        return false
      }
      if (where.name && category.name !== where.name) {
        return false
      }
      if (where.id?.not && category.id === where.id.not) {
        return false
      }
      return true
    })

    return found ? clone(found) : null
  });

  (prisma.category.create as any).mockImplementation(async ({ data }: any) => {
    const now = new Date()
    const category: Category = {
      id: `category-${categoryCounter++}`,
      userProfileId: data.userProfileId,
      sectionId: data.sectionId,
      name: data.name,
      icon: data.icon,
      isArchived: false,
      createdAt: now,
      updatedAt: now,
    }

    categories.push(category)
    return clone(category)
  });

  (prisma.category.update as any).mockImplementation(async ({ where, data }: any) => {
    const index = categories.findIndex((category) => category.id === where.id)
    if (index < 0) {
      throw new Error('Category not found')
    }

    const current = categories[index] as Category
    const next = {
      ...current,
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.icon !== undefined ? { icon: data.icon } : {}),
      ...(data.sectionId !== undefined ? { sectionId: data.sectionId } : {}),
      ...(data.isArchived !== undefined ? { isArchived: data.isArchived } : {}),
      updatedAt: new Date(),
    }

    categories[index] = next
    return clone(next)
  });

  (prisma.category.updateMany as any).mockImplementation(async ({ where, data }: any) => {
    let count = 0
    categories = categories.map((category) => {
      if (category.id !== where.id || category.userProfileId !== where.userProfileId) {
        return category
      }

      count += 1
      return {
        ...category,
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.icon !== undefined ? { icon: data.icon } : {}),
        ...(data.sectionId !== undefined ? { sectionId: data.sectionId } : {}),
        ...(data.isArchived !== undefined ? { isArchived: data.isArchived } : {}),
        updatedAt: new Date(),
      }
    })

    return { count }
  })
}

async function createSectionFor(token: string, name: string, color = '#22c55e') {
  const res = await app.request('/api/v1/sections', {
    method: 'POST',
    headers: {
      ...authHeader(token),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name, color }),
  })
  const body: any = await res.json()
  return body.data
}

describe('Categories API', () => {
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

  it('GET /api/v1/categories without token returns 401', async () => {
    const res = await app.request('/api/v1/categories')
    expect(res.status).toBe(401)
  })

  it('POST /api/v1/categories without token returns 401', async () => {
    const res = await app.request('/api/v1/categories', { method: 'POST' })
    expect(res.status).toBe(401)
  })

  it('creating a category validates required fields', async () => {
    const section = await createSectionFor(TOKEN_USER_1, 'Food')

    const res = await app.request('/api/v1/categories', {
      method: 'POST',
      headers: {
        ...authHeader(TOKEN_USER_1),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: '', icon: '', sectionId: section.id }),
    })

    expect(res.status).toBe(400)
    const body: any = await res.json()
    expect(body.error.code).toBe('VALIDATION_ERROR')
  })

  it('creating a category trims the name', async () => {
    const section = await createSectionFor(TOKEN_USER_1, 'Food')

    const res = await app.request('/api/v1/categories', {
      method: 'POST',
      headers: {
        ...authHeader(TOKEN_USER_1),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: '  Groceries  ', icon: 'shopping-cart', sectionId: section.id }),
    })

    expect(res.status).toBe(201)
    const body: any = await res.json()
    expect(body.data.name).toBe('Groceries')
  })

  it('creating a category requires a valid section owned by the user', async () => {
    const otherSection = await createSectionFor(TOKEN_USER_2, 'Home')

    const res = await app.request('/api/v1/categories', {
      method: 'POST',
      headers: {
        ...authHeader(TOKEN_USER_1),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: 'Groceries', icon: 'shopping-cart', sectionId: otherSection.id }),
    })

    expect(res.status).toBe(400)
    const body: any = await res.json()
    expect(body.error.code).toBe('VALIDATION_ERROR')
  })

  it('creating a duplicate category in the same section returns 409', async () => {
    const section = await createSectionFor(TOKEN_USER_1, 'Food')

    await app.request('/api/v1/categories', {
      method: 'POST',
      headers: {
        ...authHeader(TOKEN_USER_1),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: 'Groceries', icon: 'shopping-cart', sectionId: section.id }),
    })

    const res = await app.request('/api/v1/categories', {
      method: 'POST',
      headers: {
        ...authHeader(TOKEN_USER_1),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: 'Groceries', icon: 'basket', sectionId: section.id }),
    })

    expect(res.status).toBe(409)
  })

  it('listing categories only returns categories for the authenticated user', async () => {
    const sectionUser1 = await createSectionFor(TOKEN_USER_1, 'Food')
    const sectionUser2 = await createSectionFor(TOKEN_USER_2, 'Home')

    await app.request('/api/v1/categories', {
      method: 'POST',
      headers: {
        ...authHeader(TOKEN_USER_1),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: 'Groceries', icon: 'shopping-cart', sectionId: sectionUser1.id }),
    })

    await app.request('/api/v1/categories', {
      method: 'POST',
      headers: {
        ...authHeader(TOKEN_USER_2),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: 'Rent', icon: 'home', sectionId: sectionUser2.id }),
    })

    const res = await app.request('/api/v1/categories', {
      headers: authHeader(TOKEN_USER_1),
    })

    expect(res.status).toBe(200)
    const body: any = await res.json()
    expect(body.data).toHaveLength(1)
    expect(body.data[0].name).toBe('Groceries')
  })

  it('filtering categories by sectionId works', async () => {
    const foodSection = await createSectionFor(TOKEN_USER_1, 'Food')
    const homeSection = await createSectionFor(TOKEN_USER_1, 'Home')

    await app.request('/api/v1/categories', {
      method: 'POST',
      headers: {
        ...authHeader(TOKEN_USER_1),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: 'Groceries', icon: 'shopping-cart', sectionId: foodSection.id }),
    })

    await app.request('/api/v1/categories', {
      method: 'POST',
      headers: {
        ...authHeader(TOKEN_USER_1),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: 'Rent', icon: 'home', sectionId: homeSection.id }),
    })

    const res = await app.request(`/api/v1/categories?sectionId=${foodSection.id}`, {
      headers: authHeader(TOKEN_USER_1),
    })

    const body: any = await res.json()
    expect(body.data).toHaveLength(1)
    expect(body.data[0].sectionId).toBe(foodSection.id)
  })

  it("filtering by another user's sectionId returns VALIDATION_ERROR (400)", async () => {
    const otherSection = await createSectionFor(TOKEN_USER_2, 'Income')

    const res = await app.request(`/api/v1/categories?sectionId=${otherSection.id}`, {
      headers: authHeader(TOKEN_USER_1),
    })

    expect(res.status).toBe(400)
    const body: any = await res.json()
    expect(body.error.code).toBe('VALIDATION_ERROR')
  })

  it("GET /api/v1/categories/:id returns 404 for another user's category", async () => {
    const section = await createSectionFor(TOKEN_USER_2, 'Food')
    const createRes = await app.request('/api/v1/categories', {
      method: 'POST',
      headers: {
        ...authHeader(TOKEN_USER_2),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: 'Groceries', icon: 'shopping-cart', sectionId: section.id }),
    })
    const created: any = await createRes.json()

    const res = await app.request(`/api/v1/categories/${created.data.id}`, {
      headers: authHeader(TOKEN_USER_1),
    })

    expect(res.status).toBe(404)
  })

  it("PATCH /api/v1/categories/:id updates only the authenticated user's category", async () => {
    const section = await createSectionFor(TOKEN_USER_1, 'Food')
    const createRes = await app.request('/api/v1/categories', {
      method: 'POST',
      headers: {
        ...authHeader(TOKEN_USER_1),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: 'Groceries', icon: 'shopping-cart', sectionId: section.id }),
    })
    const created: any = await createRes.json()

    const res = await app.request(`/api/v1/categories/${created.data.id}`, {
      method: 'PATCH',
      headers: {
        ...authHeader(TOKEN_USER_1),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ icon: 'basket' }),
    })

    expect(res.status).toBe(200)
    const body: any = await res.json()
    expect(body.data.icon).toBe('basket')

    const otherUserRes = await app.request(`/api/v1/categories/${created.data.id}`, {
      method: 'PATCH',
      headers: {
        ...authHeader(TOKEN_USER_2),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ icon: 'x' }),
    })
    expect(otherUserRes.status).toBe(404)
  })

  it('PATCH /api/v1/categories/:id can move a category to another section owned by the same user', async () => {
    const foodSection = await createSectionFor(TOKEN_USER_1, 'Food')
    const homeSection = await createSectionFor(TOKEN_USER_1, 'Home')

    const createRes = await app.request('/api/v1/categories', {
      method: 'POST',
      headers: {
        ...authHeader(TOKEN_USER_1),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: 'Groceries', icon: 'shopping-cart', sectionId: foodSection.id }),
    })
    const created: any = await createRes.json()

    const res = await app.request(`/api/v1/categories/${created.data.id}`, {
      method: 'PATCH',
      headers: {
        ...authHeader(TOKEN_USER_1),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sectionId: homeSection.id }),
    })

    expect(res.status).toBe(200)
    const body: any = await res.json()
    expect(body.data.sectionId).toBe(homeSection.id)
  })

  it("PATCH /api/v1/categories/:id cannot move a category to another user's section", async () => {
    const userSection = await createSectionFor(TOKEN_USER_1, 'Food')
    const otherSection = await createSectionFor(TOKEN_USER_2, 'Home')

    const createRes = await app.request('/api/v1/categories', {
      method: 'POST',
      headers: {
        ...authHeader(TOKEN_USER_1),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: 'Groceries', icon: 'shopping-cart', sectionId: userSection.id }),
    })
    const created: any = await createRes.json()

    const res = await app.request(`/api/v1/categories/${created.data.id}`, {
      method: 'PATCH',
      headers: {
        ...authHeader(TOKEN_USER_1),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sectionId: otherSection.id }),
    })

    expect(res.status).toBe(400)
    const body: any = await res.json()
    expect(body.error.code).toBe('VALIDATION_ERROR')
  })

  it('DELETE /api/v1/categories/:id soft deletes a category', async () => {
    const section = await createSectionFor(TOKEN_USER_1, 'Food')
    const createRes = await app.request('/api/v1/categories', {
      method: 'POST',
      headers: {
        ...authHeader(TOKEN_USER_1),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: 'Groceries', icon: 'shopping-cart', sectionId: section.id }),
    })
    const created: any = await createRes.json()

    const res = await app.request(`/api/v1/categories/${created.data.id}`, {
      method: 'DELETE',
      headers: authHeader(TOKEN_USER_1),
    })

    expect(res.status).toBe(200)
    const body: any = await res.json()
    expect(body.data.isArchived).toBe(true)
  })

  it('archived categories are excluded by default', async () => {
    const section = await createSectionFor(TOKEN_USER_1, 'Food')
    const createRes = await app.request('/api/v1/categories', {
      method: 'POST',
      headers: {
        ...authHeader(TOKEN_USER_1),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: 'Groceries', icon: 'shopping-cart', sectionId: section.id }),
    })
    const created: any = await createRes.json()

    await app.request(`/api/v1/categories/${created.data.id}`, {
      method: 'DELETE',
      headers: authHeader(TOKEN_USER_1),
    })

    const res = await app.request('/api/v1/categories', {
      headers: authHeader(TOKEN_USER_1),
    })

    const body: any = await res.json()
    expect(body.data).toHaveLength(0)
  })

  it('includeArchived=true includes archived categories', async () => {
    const section = await createSectionFor(TOKEN_USER_1, 'Food')
    const createRes = await app.request('/api/v1/categories', {
      method: 'POST',
      headers: {
        ...authHeader(TOKEN_USER_1),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: 'Groceries', icon: 'shopping-cart', sectionId: section.id }),
    })
    const created: any = await createRes.json()

    await app.request(`/api/v1/categories/${created.data.id}`, {
      method: 'DELETE',
      headers: authHeader(TOKEN_USER_1),
    })

    const res = await app.request('/api/v1/categories?includeArchived=true', {
      headers: authHeader(TOKEN_USER_1),
    })

    const body: any = await res.json()
    expect(body.data).toHaveLength(1)
    expect(body.data[0].isArchived).toBe(true)
  })
})
