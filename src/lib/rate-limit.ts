export class RateLimiter {
  private cache = new Map<string, { count: number; resetTime: number }>()
  private windowMs: number
  private maxRequests: number

  constructor(windowMs = 60000, maxRequests = 30) {
    this.windowMs = windowMs
    this.maxRequests = maxRequests
  }

  check(ip: string): boolean {
    const now = Date.now()
    const record = this.cache.get(ip)

    if (!record) {
      this.cache.set(ip, { count: 1, resetTime: now + this.windowMs })
      return true
    }

    if (now > record.resetTime) {
      this.cache.set(ip, { count: 1, resetTime: now + this.windowMs })
      return true
    }

    if (record.count >= this.maxRequests) {
      return false
    }

    record.count++
    return true
  }
}

export const rateLimiter = new RateLimiter(60000, 30)
