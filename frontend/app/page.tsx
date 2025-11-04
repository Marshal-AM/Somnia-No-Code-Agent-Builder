"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth"

export default function Home() {
  const router = useRouter()
  const { ready, authenticated, user, login, loading } = useAuth()

  useEffect(() => {
    if (ready && authenticated) {
      router.replace("/my-agents")
    }
  }, [ready, authenticated, router])

  if (!ready || loading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </main>
    )
  }

  if (authenticated) {
    return null // Will redirect to /my-agents
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center">
      <div className="flex flex-col items-center justify-center gap-8 px-4 text-center">
        <div className="space-y-4">
          <h1 className="text-5xl font-bold tracking-tight sm:text-6xl">
            Somnia Agent Builder
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl">
            Build your own Somnia agents with ease. Create powerful workflows and automate your tasks.
          </p>
        </div>
        <div className="flex flex-col gap-4 sm:flex-row">
          <Button onClick={login} size="lg" className="text-lg px-8 py-6">
            Get Started
          </Button>
          <Button asChild size="lg" variant="outline" className="text-lg px-8 py-6">
            <Link href="/my-agents">
              View My Agents
            </Link>
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Connect with email, wallet, or social accounts
        </p>
      </div>
    </main>
  )
}
