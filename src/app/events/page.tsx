"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { format } from "date-fns"
import { CalendarDays, MapPin, Search, Users, QrCode } from "lucide-react"
import { QRCodeSVG } from "qrcode.react"

// Mock data
const MOCK_EVENTS = [
  {
    id: "1",
    title: "AI & Web3 Hackathon Prep",
    club: "Computer Science Club",
    date: new Date(2026, 9, 15, 14, 0),
    location: "Lab 301, Building B",
    type: "Workshop",
    spots: 50,
    registered: 34
  },
  {
    id: "2",
    title: "Annual Debate Championship",
    club: "Debate Society",
    date: new Date(2026, 9, 18, 10, 0),
    location: "Main Auditorium",
    type: "Contest",
    spots: 200,
    registered: 180
  },
  {
    id: "3",
    title: "Robotics Workshop: Arduino Basics",
    club: "Robotics Club",
    date: new Date(2026, 9, 22, 15, 30),
    location: "Hardware Lab, Building C",
    type: "Workshop",
    spots: 30,
    registered: 30
  },
  {
    id: "4",
    title: "Photography Walk",
    club: "Photography Club",
    date: new Date(2026, 9, 25, 16, 0),
    location: "Campus Lake",
    type: "Social",
    spots: 40,
    registered: 12
  }
]

export default function EventsPage() {
  const [search, setSearch] = useState("")
  const [filterClub, setFilterClub] = useState("All")
  const [filterType, setFilterType] = useState("All")
  const [rsvpState, setRsvpState] = useState<Record<string, boolean>>({})

  const clubs = ["All", ...Array.from(new Set(MOCK_EVENTS.map(e => e.club)))]
  const types = ["All", ...Array.from(new Set(MOCK_EVENTS.map(e => e.type)))]

  const filteredEvents = MOCK_EVENTS.filter(event => {
    const matchesSearch = event.title.toLowerCase().includes(search.toLowerCase()) || 
                          event.club.toLowerCase().includes(search.toLowerCase())
    const matchesClub = filterClub === "All" || event.club === filterClub
    const matchesType = filterType === "All" || event.type === filterType
    
    return matchesSearch && matchesClub && matchesType
  })

  const handleRsvp = (id: string) => {
    setRsvpState(prev => ({ ...prev, [id]: true }))
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-2">Club & Event Engine</h1>
          <p className="text-muted-foreground">Discover and register for campus events in one place.</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card border rounded-2xl p-4 mb-8 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search events or clubs..." 
            className="pl-9 h-11 bg-background"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-4">
          <Select value={filterClub} onValueChange={setFilterClub}>
            <SelectTrigger className="w-[180px] h-11 bg-background">
              <SelectValue placeholder="Club" />
            </SelectTrigger>
            <SelectContent>
              {clubs.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[150px] h-11 bg-background">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              {types.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Events Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredEvents.length > 0 ? filteredEvents.map(event => {
          const isFull = event.registered >= event.spots
          const isRegistered = rsvpState[event.id]
          
          return (
            <Card key={event.id} className="flex flex-col glass-card border-border/50 hover:border-primary/30 transition-all overflow-hidden group">
              <div className="h-2 w-full bg-gradient-to-r from-primary to-purple-500 opacity-70 group-hover:opacity-100 transition-opacity" />
              <CardHeader className="pb-4">
                <div className="flex justify-between items-start mb-2">
                  <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20">
                    {event.type}
                  </Badge>
                  <Badge variant="outline" className={isFull ? "text-destructive border-destructive" : ""}>
                    {event.registered} / {event.spots} spots
                  </Badge>
                </div>
                <CardTitle className="text-xl line-clamp-2">{event.title}</CardTitle>
                <CardDescription className="font-medium text-foreground/80">{event.club}</CardDescription>
              </CardHeader>
              
              <CardContent className="flex-1 space-y-3 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <CalendarDays className="h-4 w-4 shrink-0" />
                  <span>{format(event.date, "EEEE, MMMM d • h:mm a")}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4 shrink-0" />
                  <span className="truncate">{event.location}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Users className="h-4 w-4 shrink-0" />
                  <span>{isFull ? "Event is fully booked" : `${event.spots - event.registered} spots remaining`}</span>
                </div>
              </CardContent>
              
              <CardFooter className="pt-2">
                {isRegistered ? (
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="secondary" className="w-full gap-2 bg-green-500/10 text-green-600 hover:bg-green-500/20 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 border border-green-500/20">
                        <QrCode className="h-4 w-4" /> View Ticket
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>Your Event Ticket</DialogTitle>
                        <DialogDescription>
                          Scan this QR code at the door to check in.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="flex flex-col items-center justify-center p-6 space-y-6">
                        <div className="bg-white p-4 rounded-xl shadow-sm">
                          <QRCodeSVG 
                            value={`{"eventId":"${event.id}","studentId":"DEMO123"}`} 
                            size={200}
                            level="H"
                            includeMargin={false}
                          />
                        </div>
                        <div className="text-center space-y-1">
                          <h3 className="font-semibold text-lg">{event.title}</h3>
                          <p className="text-muted-foreground text-sm">{format(event.date, "MMM d, yyyy • h:mm a")}</p>
                          <p className="text-sm font-medium">{event.location}</p>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                ) : (
                  <Button 
                    className="w-full" 
                    disabled={isFull}
                    onClick={() => handleRsvp(event.id)}
                  >
                    {isFull ? "Waitlist Full" : "RSVP Now"}
                  </Button>
                )}
              </CardFooter>
            </Card>
          )
        }) : (
          <div className="col-span-full py-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
              <Search className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold">No events found</h3>
            <p className="text-muted-foreground">Try adjusting your filters or search query.</p>
          </div>
        )}
      </div>
    </div>
  )
}
