import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { compare } from 'bcrypt'
import { db } from './db'

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        try {
          if (!credentials?.email || !credentials?.password) {
            return null
          }

          const user = await db.user.findUnique({
            where: { email: credentials.email },
            include: { organization: true, ownedOrgs: true }
          })

          if (!user || !user.password) {
            console.warn(`[auth] Failed login attempt: user not found or no password for ${credentials.email}`)
            return null
          }

          const isPasswordValid = await compare(credentials.password, user.password)

          if (!isPasswordValid) {
            console.warn(`[auth] Failed login attempt: incorrect password for ${credentials.email}`)
            return null
          }

          console.log(`[auth] Successful login for user: ${user.email} (ID: ${user.id})`)
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            orgId: user.orgId || user.ownedOrgs[0]?.id || null,
          }
        } catch (error) {
          console.error('Auth error:', error)
          return null
        }
      }
    })
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: '/auth/signin',
    signOut: '/auth/signin',
    error: '/auth/signin',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.orgId = user.orgId
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.orgId = token.orgId as string
      }
      return session
    }
  },
  useSecureCookies: process.env.NODE_ENV === 'production',
}
