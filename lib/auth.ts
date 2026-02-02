import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'
import { compare } from 'bcryptjs'
import { db } from './db'

export const authOptions: NextAuthOptions = {
  providers: [
    // Google OAuth - only add if credentials are configured
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            authorization: {
              params: {
                prompt: 'consent',
                access_type: 'offline',
                response_type: 'code'
              }
            }
          })
        ]
      : []),

    // Email/Password credentials
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
            console.warn(`[auth] Failed login: user not found or OAuth-only for ${credentials.email}`)
            return null
          }

          // Check email verification if required (optional - can be enabled via env)
          if (process.env.EMAIL_VERIFICATION_REQUIRED === 'true' && !user.emailVerified) {
            throw new Error('EMAIL_NOT_VERIFIED')
          }

          const isPasswordValid = await compare(credentials.password, user.password)

          if (!isPasswordValid) {
            console.warn(`[auth] Failed login: incorrect password for ${credentials.email}`)
            return null
          }

          console.log(`[auth] Successful login for user: ${user.email} (ID: ${user.id})`)
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
            orgId: user.orgId || user.ownedOrgs[0]?.id || null,
            emailVerified: user.emailVerified,
            onboardingComplete: user.onboardingComplete,
          }
        } catch (error: any) {
          if (error.message === 'EMAIL_NOT_VERIFIED') {
            throw new Error('EMAIL_NOT_VERIFIED')
          }
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
    verifyRequest: '/auth/verify-email',
  },

  callbacks: {
    async signIn({ user, account }) {
      // For OAuth providers (Google), handle account creation/linking
      if (account?.provider === 'google') {
        try {
          const email = user.email!
          const existingUser = await db.user.findUnique({
            where: { email }
          })

          if (existingUser) {
            // Check if already linked to this provider
            const existingAccount = await db.account.findUnique({
              where: {
                provider_providerAccountId: {
                  provider: account.provider,
                  providerAccountId: account.providerAccountId
                }
              }
            })

            if (!existingAccount) {
              // Link the OAuth account to existing user
              await db.account.create({
                data: {
                  userId: existingUser.id,
                  type: account.type,
                  provider: account.provider,
                  providerAccountId: account.providerAccountId,
                  access_token: account.access_token,
                  refresh_token: account.refresh_token,
                  expires_at: account.expires_at,
                  token_type: account.token_type,
                  scope: account.scope,
                  id_token: account.id_token,
                }
              })
              console.log(`[auth] Linked Google account to existing user: ${email}`)
            }

            // Mark email as verified for OAuth users
            if (!existingUser.emailVerified) {
              await db.user.update({
                where: { id: existingUser.id },
                data: { 
                  emailVerified: new Date(), 
                  image: user.image || existingUser.image 
                }
              })
            }
          } else {
            // Create new user from OAuth
            const newUser = await db.user.create({
              data: {
                email,
                name: user.name,
                image: user.image,
                emailVerified: new Date(), // OAuth = automatically verified
              }
            })

            await db.account.create({
              data: {
                userId: newUser.id,
                type: account.type,
                provider: account.provider,
                providerAccountId: account.providerAccountId,
                access_token: account.access_token,
                refresh_token: account.refresh_token,
                expires_at: account.expires_at,
                token_type: account.token_type,
                scope: account.scope,
                id_token: account.id_token,
              }
            })
            console.log(`[auth] Created new user from Google OAuth: ${email}`)
          }
        } catch (error) {
          console.error('[auth] Error in Google OAuth signIn callback:', error)
          return false
        }
      }
      return true
    },

    async jwt({ token, user, account, trigger }) {
      if (user) {
        token.id = user.id
        token.orgId = user.orgId
        token.emailVerified = user.emailVerified
        token.onboardingComplete = user.onboardingComplete
      }

      // Refresh user data from DB on update trigger (e.g., after onboarding)
      if (trigger === 'update' && token.email) {
        const dbUser = await db.user.findUnique({
          where: { email: token.email as string },
          include: { ownedOrgs: true }
        })
        if (dbUser) {
          token.id = dbUser.id
          token.orgId = dbUser.orgId || dbUser.ownedOrgs[0]?.id || null
          token.emailVerified = dbUser.emailVerified
          token.onboardingComplete = dbUser.onboardingComplete
        }
      }

      // For OAuth, fetch user from DB to get latest orgId
      if (account?.provider === 'google' && token.email) {
        const dbUser = await db.user.findUnique({
          where: { email: token.email },
          include: { ownedOrgs: true }
        })
        if (dbUser) {
          token.id = dbUser.id
          token.orgId = dbUser.orgId || dbUser.ownedOrgs[0]?.id || null
          token.emailVerified = dbUser.emailVerified
          token.onboardingComplete = dbUser.onboardingComplete
        }
      }

      return token
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.orgId = token.orgId as string
        session.user.emailVerified = token.emailVerified as Date | null
        session.user.onboardingComplete = token.onboardingComplete as boolean
      }
      return session
    }
  },

  events: {
    async signIn({ user, account }) {
      console.log(`[auth] Sign in: ${user.email} via ${account?.provider || 'credentials'}`)
    },
  },

  useSecureCookies: process.env.NODE_ENV === 'production',
  debug: process.env.NODE_ENV === 'development',
}
