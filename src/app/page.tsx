import { CampusHero } from "@/components/3d/CampusHero"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { CalendarDays, PackageSearch, ArrowRight, ShieldCheck, Map, Users } from "lucide-react"

export default function Home() {
  return (
    <div className="flex flex-col gap-12 pb-12">
      {/* Hero Section */}
      <section className="container mx-auto px-4 pt-8">
        <CampusHero />
      </section>

      {/* Modules Overview */}
      <section className="container mx-auto px-4">
        <div className="mb-10 text-center space-y-4">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Everything in one place</h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Say goodbye to scattered Facebook groups and messy Messenger chats. CampusOS centralizes City University's daily life.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {/* Club & Event Engine */}
          <Card className="glass-card border-primary/20 hover:border-primary/50 transition-colors group">
            <CardHeader>
              <div className="bg-primary/10 w-14 h-14 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <CalendarDays className="h-7 w-7 text-primary" />
              </div>
              <CardTitle className="text-2xl">Club & Event Engine</CardTitle>
              <CardDescription className="text-base">
                A unified feed covering all club and department events across campus. RSVP, check schedules, and get your event QR codes.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/events">
                <Button className="w-full gap-2 rounded-xl h-12 text-md">
                  Explore Events <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Lost & Found */}
          <Card className="glass-card border-secondary/20 hover:border-secondary/50 transition-colors group">
            <CardHeader>
              <div className="bg-secondary/50 w-14 h-14 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-secondary/70 transition-colors">
                <PackageSearch className="h-7 w-7 text-secondary-foreground" />
              </div>
              <CardTitle className="text-2xl">Lost & Found Box</CardTitle>
              <CardDescription className="text-base">
                A structured system for reporting and recovering lost items. Don't let your lost ID card scroll out of view on a Facebook post.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/lost-found">
                <Button variant="secondary" className="w-full gap-2 rounded-xl h-12 text-md">
                  Find an Item <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Features Grid */}
      <section className="bg-muted/30 py-16 mt-8">
        <div className="container mx-auto px-4 max-w-5xl">
          <h3 className="text-2xl font-semibold mb-8 text-center">Why use CampusOS?</h3>
          <div className="grid sm:grid-cols-3 gap-8 text-center">
            <div className="flex flex-col items-center gap-3">
              <div className="bg-background p-4 rounded-full shadow-sm border">
                <ShieldCheck className="h-6 w-6 text-green-500" />
              </div>
              <h4 className="font-semibold text-lg">Single Source of Truth</h4>
              <p className="text-sm text-muted-foreground">Reliably updated, browsable platform for real CU students.</p>
            </div>
            <div className="flex flex-col items-center gap-3">
              <div className="bg-background p-4 rounded-full shadow-sm border">
                <Users className="h-6 w-6 text-blue-500" />
              </div>
              <h4 className="font-semibold text-lg">Community Driven</h4>
              <p className="text-sm text-muted-foreground">Built around how you actually move through your day on campus.</p>
            </div>
            <div className="flex flex-col items-center gap-3">
              <div className="bg-background p-4 rounded-full shadow-sm border">
                <Map className="h-6 w-6 text-orange-500" />
              </div>
              <h4 className="font-semibold text-lg">Map the Chaos</h4>
              <p className="text-sm text-muted-foreground">No more missing things that were only posted in a channel you don't follow.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
