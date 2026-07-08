const BEARER = 'Bearer '

export type SupabaseMockUser = {
    id: string
    email: string
}

export const TEST_AUTH_USER_1 = {
    token: 'token-user-1',
    id: 'auth-user-1',
    email: 'user1@example.com',
}

export const TEST_AUTH_USER_2 = {
    token: 'token-user-2',
    id: 'auth-user-2',
    email: 'user2@example.com',
}

export const authHeader = (token: string) => {
    return { Authorization: `${BEARER}${token}` }
}

export const clone = <T>(value: T): T => {
    return JSON.parse(JSON.stringify(value)) as T
}

export const createSupabaseGetUserMock = (
    users: Record<string, SupabaseMockUser> = {
        [TEST_AUTH_USER_1.token]: {
            id: TEST_AUTH_USER_1.id,
            email: TEST_AUTH_USER_1.email,
        },
        [TEST_AUTH_USER_2.token]: {
            id: TEST_AUTH_USER_2.id,
            email: TEST_AUTH_USER_2.email,
        },
    },
    invalidMessage = 'Invalid',
) => {
    return async (token: string) => {
        const user = users[token]
        if (user) {
            return { data: { user: { ...user } }, error: null }
        }

        return { data: { user: null }, error: { message: invalidMessage } }
    }
}
