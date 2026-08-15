import { prisma } from '../../db/prisma.js'
import type { UpdateProfileInput } from './profile.schema.js'

export const findByAuthUserId = async (authUserId: string) => {
    return prisma.userProfile.findUnique({ where: { authUserId } })
}

export const updateByAuthUserId = async (authUserId: string, input: UpdateProfileInput) => {
    return prisma.userProfile.update({
        where: { authUserId },
        data: {
            ...(input.firstName !== undefined ? { firstName: input.firstName } : {}),
            ...(input.lastName !== undefined ? { lastName: input.lastName } : {}),
            ...(input.displayName !== undefined ? { displayName: input.displayName } : {}),
            ...(input.preferredCurrency !== undefined
                ? { preferredCurrency: input.preferredCurrency }
                : {}),
        },
    })
}
