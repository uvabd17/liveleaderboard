import 'next-auth'

declare module 'next-auth' {
  interface User {
    id: string
    email: string
    name?: string | null
    image?: string | null
    orgId?: string | null
    emailVerified?: Date | null
  }

  interface Session {
    user: {
      id: string
      email: string
      name?: string | null
      image?: string | null
      orgId?: string | null
      emailVerified?: Date | null
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    orgId?: string | null
    emailVerified?: Date | null
  }
}
