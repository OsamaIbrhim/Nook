import { useCallback } from 'react'
import { formatDate } from '../../shared/format/dates'
import { formatMoney } from '../../shared/format/money'
import { useGetShopConfigQuery } from './api'

export const usePolicy = () => useGetShopConfigQuery().data

export function useMoney() {
  const policy = usePolicy()
  return useCallback(
    (value: number, currency?: string) =>
      policy ? formatMoney(value, currency ?? policy.currency, policy.locale) : '',
    [policy]
  )
}

export function useDate() {
  const policy = usePolicy()
  return useCallback((value: string) => (policy ? formatDate(value, policy.locale) : ''), [policy])
}
