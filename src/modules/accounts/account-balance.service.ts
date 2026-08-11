import { fromCents, toCents } from '../../shared/money/decimal.js'
import { findBalanceTotalsByAccountIds } from './account-balance.repository.js'

/**
 * Calculate current account balances from one grouped transaction query.
 */
export const calculateAccountBalances = async (
    userProfileId: string,
    accounts: Array<{ id: string; startingBalance: number }>,
) => {
    const totals = await findBalanceTotalsByAccountIds(
        userProfileId,
        accounts.map((account) => account.id),
    )
    const balances = new Map<string, bigint>()

    const add = (accountId: string, amount: bigint) => {
        balances.set(accountId, (balances.get(accountId) ?? 0n) + amount)
    }

    for (const total of totals) {
        const amount = toCents(total._sum.amount ?? 0)
        if (total.type === 'INCOME' && total.accountId) add(total.accountId, amount)
        if (total.type === 'EXPENSE' && total.accountId) add(total.accountId, -amount)
        if (total.type === 'ADJUSTMENT' && total.accountId) add(total.accountId, amount)
        if (total.type === 'TRANSFER' && total.toAccountId) add(total.toAccountId, amount)
        if (total.type === 'TRANSFER' && total.fromAccountId) add(total.fromAccountId, -amount)
    }

    return new Map(
        accounts.map((account) => [
            account.id,
            fromCents(toCents(account.startingBalance) + (balances.get(account.id) ?? 0n)),
        ]),
    )
}

export const calculateAccountBalance = async (
    userProfileId: string,
    accountId: string,
    startingBalance: number,
) => {
    const balances = await calculateAccountBalances(userProfileId, [
        { id: accountId, startingBalance },
    ])
    return balances.get(accountId) ?? startingBalance
}

export default { calculateAccountBalance, calculateAccountBalances }
