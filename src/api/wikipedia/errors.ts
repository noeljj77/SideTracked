export type ApiErrorKind = 'NotFound' | 'Network' | 'RateLimited' | 'Invalid'

export class ApiError extends Error {
  constructor(readonly kind: ApiErrorKind) {
    super(kind)
  }
}

/** Calm, user-facing text. Never shows raw error strings. */
export function describeError(err: unknown, id: string): string {
  const kind = err instanceof ApiError ? err.kind : 'Network'
  switch (kind) {
    case 'NotFound':
      return `Couldn't find an article called "${id}".`
    case 'RateLimited':
      return 'Wikipedia is busy right now. Try again in a moment.'
    case 'Invalid':
      return 'Got an unexpected answer from Wikipedia.'
    default:
      return "Couldn't reach Wikipedia. Check your connection."
  }
}
