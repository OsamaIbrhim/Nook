type MoneyOptions = { dropZeroDecimals?: boolean }

export const formatMoney = (value: number, currency: string, locale: string, { dropZeroDecimals }: MoneyOptions = {}) =>
  new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency.toUpperCase(),
    ...(dropZeroDecimals && Number.isInteger(value) && { minimumFractionDigits: 0, maximumFractionDigits: 0 })
  }).format(value)
