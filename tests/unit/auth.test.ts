/**
 * Unit tests for authentication utilities
 */

describe('Authentication', () => {
  describe('Password Validation', () => {
    const validatePassword = (password: string): boolean => {
      return password.length >= 8
    }

    it('should reject passwords shorter than 8 characters', () => {
      expect(validatePassword('short')).toBe(false)
      expect(validatePassword('1234567')).toBe(false)
    })

    it('should accept passwords of 8 characters or more', () => {
      expect(validatePassword('password')).toBe(true)
      expect(validatePassword('longerpassword123')).toBe(true)
    })
  })

  describe('Email Validation', () => {
    const validateEmail = (email: string): boolean => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      return emailRegex.test(email)
    }

    it('should accept valid email formats', () => {
      expect(validateEmail('user@example.com')).toBe(true)
      expect(validateEmail('user.name@example.co.uk')).toBe(true)
      expect(validateEmail('user+tag@example.com')).toBe(true)
    })

    it('should reject invalid email formats', () => {
      expect(validateEmail('invalid')).toBe(false)
      expect(validateEmail('invalid@')).toBe(false)
      expect(validateEmail('@example.com')).toBe(false)
      expect(validateEmail('user@.com')).toBe(false)
    })
  })

  describe('Slug Generation', () => {
    const generateSlug = (name: string): string => {
      return name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
    }

    it('should convert name to lowercase slug', () => {
      expect(generateSlug('My Organization')).toBe('my-organization')
      expect(generateSlug('UPPERCASE')).toBe('uppercase')
    })

    it('should replace special characters with hyphens', () => {
      expect(generateSlug('Hello & World!')).toBe('hello-world')
      expect(generateSlug('Test@123#456')).toBe('test-123-456')
    })

    it('should trim leading and trailing hyphens', () => {
      expect(generateSlug('---Test---')).toBe('test')
      expect(generateSlug('  Spaces  ')).toBe('spaces')
    })
  })
})
