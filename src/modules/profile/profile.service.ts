import type { AuthUser } from '../../types/app.js'
import { getOrCreateUserProfile } from '../auth/auth.service.js'
import { updateByAuthUserId } from './profile.repository.js'
import type { UpdateProfileInput } from './profile.schema.js'

const serializeProfile = ({
    email: _email,
    ...profile
}: Awaited<ReturnType<typeof getOrCreateUserProfile>>) => profile

export const getProfile = async (authUser: AuthUser) => {
    return serializeProfile(await getOrCreateUserProfile(authUser))
}

export const updateProfile = async (authUser: AuthUser, input: UpdateProfileInput) => {
    await getOrCreateUserProfile(authUser)
    return serializeProfile(await updateByAuthUserId(authUser.id, input))
}
