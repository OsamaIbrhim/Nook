export const formatDate = (value: string, locale: string) =>
  new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(value))
