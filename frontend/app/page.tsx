import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function Home() {
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
        <Button asChild size="lg" className="text-lg px-8 py-6">
          <Link href="/my-agents">
            View My Agents
          </Link>
        </Button>
      </div>
    </main>
  )
}
