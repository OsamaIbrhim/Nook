export const money = (value: number, currency = 'USD') => new Intl.NumberFormat('en-US', { style: 'currency', currency: currency.toUpperCase() }).format(value)
export const date = (value: string) => new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(new Date(value))
