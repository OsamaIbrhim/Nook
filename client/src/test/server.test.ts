import { describe, expect, it } from 'vitest'

describe('MSW test server', () => {
  it('refuses a request that has no handler instead of letting it reach the network', async () => {
    const failure = await fetch('http://localhost:3000/no-handler-registered').catch((error: Error) => error)
    expect(failure).toBeInstanceOf(Error)
    expect(String((failure as Error).cause)).toMatch(/Cannot bypass a request when using the "error" strategy/)
  })
})
