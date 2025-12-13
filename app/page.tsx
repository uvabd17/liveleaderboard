"use client"
import React from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import Card from "@/components/ui/card"

export default function Home() {
  const { data: session, status } = useSession()
  const router = useRouter()

  React.useEffect(() => {
    console.log('Session status:', status)
    if (status === 'authenticated') {
      router.push('/dashboard')
    }
  }, [status, router])

  // if (status === 'loading') {
  //   return (
  //     <div className="min-h-screen bg-background flex items-center justify-center">
  //       <div className="text-foreground text-xl">Loading... (status: {status})</div>
  //       <div className="mt-4">
  //         <Button asChild size="lg">
  //           <Link href="/auth/signup">
  //             Get Started Free
  //           </Link>
  //         </Button>
  //       </div>
  //     </div>
  //   )
  // }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-foreground mb-4">🏆 Live Leaderboard</h1>
          <p className="text-xl text-muted-foreground mb-8">
            Multi-tenant real-time competition platform with live scoring and analytics
          </p>
          <div className="flex gap-4 justify-center">
            <Button asChild size="lg">
              <Link href="/auth/signup">
                Get Started Free
              </Link>
            </Button>
            <Button asChild variant="secondary" size="lg">
              <Link href="/auth/signin">
                Sign In
              </Link>
            </Button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <Card className="flex flex-col">
            <div className="text-4xl mb-4">🎯</div>
            <h3 className="text-xl font-semibold text-card-foreground mb-2">Unlimited Events</h3>
            <p className="text-muted-foreground">Create unlimited competitions with unique public URLs and QR codes</p>
          </Card>
          <Card className="flex flex-col">
            <div className="text-4xl mb-4">⚡</div>
            <h3 className="text-xl font-semibold text-card-foreground mb-2">Real-Time Updates</h3>
            <p className="text-muted-foreground">Live leaderboard updates via SSE for instant score synchronization</p>
          </Card>
          <Card className="flex flex-col">
            <div className="text-4xl mb-4">📊</div>
            <h3 className="text-xl font-semibold text-card-foreground mb-2">Advanced Analytics</h3>
            <p className="text-muted-foreground">Track participation, judge activity, and score distributions</p>
          </Card>
        </div>

        <Card className="p-8 text-center">
          <h3 className="text-2xl font-semibold text-card-foreground mb-4">Ready to get started?</h3>
          <p className="text-muted-foreground mb-6">
            Join organizations already using Live Leaderboard for hackathons, competitions, and events.
          </p>
          <Button asChild>
            <Link href="/auth/signup">
              Create Your Free Account
            </Link>
          </Button>
        </Card>
      </div>
    </div>
  )
}
