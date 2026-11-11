export type FieldError = { field: string; message: string }
export type ApiFailure = { status: number; code: string; message: string; fieldErrors?: FieldError[] }

export class HttpError extends Error implements ApiFailure {
  status: number
  code: string
  fieldErrors?: FieldError[]

  constructor(failure: ApiFailure) {
    super(failure.message)
    this.name = 'HttpError'
    this.status = failure.status
    this.code = failure.code
    this.fieldErrors = failure.fieldErrors
  }
}

export function isApiFailure(value: unknown): value is ApiFailure {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Record<string, unknown>
  return (
    typeof candidate.status === 'number' && typeof candidate.code === 'string' && typeof candidate.message === 'string'
  )
}

export function errorMessage(error: unknown): string {
  if (typeof error === 'string') return error
  if (isApiFailure(error)) {
    if (error.code === 'network_error') {
      return navigator.onLine ? 'The server could not be reached. Please try again.' : 'You appear to be offline.'
    }
    if (error.code === 'timeout') return 'The server took too long to respond. Please try again.'
    return error.message
  }
  return error instanceof Error ? error.message : 'Something went wrong'
}
