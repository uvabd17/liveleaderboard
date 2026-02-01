/**
 * Unit tests for email service
 */
import { generateToken } from '@/lib/email'

describe('Email Service', () => {
  describe('generateToken', () => {
    it('should generate a token of default length (32)', () => {
      const token = generateToken()
      expect(token).toHaveLength(32)
    })

    it('should generate a token of specified length', () => {
      const token = generateToken(64)
      expect(token).toHaveLength(64)
    })

    it('should generate unique tokens', () => {
      const token1 = generateToken()
      const token2 = generateToken()
      expect(token1).not.toBe(token2)
    })

    it('should only contain alphanumeric characters', () => {
      const token = generateToken(100)
      expect(token).toMatch(/^[A-Za-z0-9]+$/)
    })
  })
})
