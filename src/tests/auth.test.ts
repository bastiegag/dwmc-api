import { describe, it, expect, vi, beforeEach } from 'vitest'
import { app } from '../app.js'
import { supabase } from '../lib/supabase.js'
import { prisma } from '../db/prisma.js'

// Mock Supabase so tests never make real network requests.
vi.mock('../lib/supabase.js', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
    },
  },
}))

// Mock Prisma so tests never require a running database.
vi.mock('../db/prisma.js', () => ({
  prisma: {
    $queryRaw: vi.fn(),
    userProfile: {
      upsert: vi.fn(),
    },
  },
}))

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyBody = any

const BEARER = 'Bearer '

describe('GET /api/v1/auth/me', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 without an Authorization header', async () => {
    const res = await app.request('/api/v1/auth/me')
    expect(res.status).toBe(401)
    const body: AnyBody = await res.json()
    expect(body.error.code).toBe('UNAUTHORIZED')
  })

  it('returns 401 with a malformed Authorization header', async () => {
    const res = await app.request('/api/v1/auth/me', {
      headers: { Authorization: 'Token bad-format' },
    })
    expect(res.status).toBe(401)
    const body: AnyBody = await res.json()
    expect(body.error.code).toBe('UNAUTHORIZED')
  })

  it('returns 401 when Supabase rejects the token', async () => {
    vi.mocked(supabase.auth.getUser).mockResolvedValueOnce({
      data: { user: null },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      error: { message: 'Invalid JWT' } as any,
    })

    const res = await app.request('/api/v1/auth/me', {
      headers: { Authorization: BEARER + 'invalid-token' },
    })
    expect(res.status).toBe(401)
    const body: AnyBody = await res.json()
    expect(body.error.code).toBe('UNAUTHORIZED')
  })

  it('returns 200 with user and profile for a valid token', async () => {
    vi.mocked(supabase.auth.getUser).mockResolvedValueOnce({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: { user: { id: 'user-123', email: 'test@example.com' } as any },
      error: null,
    })

    vi.mocked(prisma.userProfile.upsert).mockResolvedValueOnce({
      id: 'profile-123',
      authUserId: 'user-123',
      email: 'test@example.com',
      firstName: null,
      lastName: null,
      currency: 'CAD',
      locale: 'fr-CA',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    })

    const res = await app.request('/api/v1/auth/me', {
      headers: { Authorization: BEARER + 'valid-mock-token' },
    })

    expect(res.status).toBe(200)
    const body: AnyBody = await res.json()
    expect(body.data.user.id).toBe('user-123')
    expect(body.data.user.email).toBe('test@example.com')
    expect(body.data.profile.authUserId).toBe('user-123')
    expect(body.data.profile.currency).toBe('CAD')
  })
})
