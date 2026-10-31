import type { z } from 'zod'
import { ApiError } from './wikipedia/errors'

/** GET + JSON with failures mapped to ApiError. An aborted request rethrows as-is. */
export async function getJson(
  url: string,
  signal?: AbortSignal,
  headers: Record<string, string> = {},
): Promise<unknown> {
  let res: Response
  try {
    res = await fetch(url, { signal, headers })
  } catch (err) {
    if (signal?.aborted) throw err
    throw new ApiError('Network')
  }
  if (res.status === 404) throw new ApiError('NotFound')
  if (res.status === 429) throw new ApiError('RateLimited')
  if (!res.ok) throw new ApiError('Network')
  try {
    return await res.json()
  } catch {
    throw new ApiError('Invalid')
  }
}

export function parse<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data)
  if (!result.success) throw new ApiError('Invalid')
  return result.data
}
