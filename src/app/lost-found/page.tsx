"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { format } from "date-fns"
import { 
  Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle 
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { 
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger 
} from "@/components/ui/dialog"
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MapPin, CalendarDays, Search, Image as ImageIcon, Plus } from "lucide-react"

const MOCK_ITEMS = [
  {
    id: "1",
    type: "lost",
    title: "Black Leather Wallet",
    description: "Lost my black leather wallet containing my student ID (ID: 123456) and some cash. It has a small scratch on the front.",
    location: "Library 2nd Floor",
    date: new Date(2026, 9, 5),
    status: "active",
    contact: "student@city.edu"
  },
  {
    id: "2",
    type: "found",
    title: "Casio Scientific Calculator",
    description: "Found a Casio calculator fx-991EX left on a desk after the PHY101 midterm.",
    location: "Exam Hall A",
    date: new Date(2026, 9, 6),
    status: "active",
    contact: "admin@city.edu"
  },
  {
    id: "3",
    type: "lost",
    title: "Blue Water Bottle",
    description: "Hydroflask with several stickers on it (GitHub, Vercel). Left it during lunch.",
    location: "Cafeteria",
    date: new Date(2026, 9, 7),
    status: "active",
    contact: "john@city.edu"
  }
]

const formSchema = z.object({
  type: z.enum(["lost", "found"]),
  title: z.string().min(3, "Title must be at least 3 characters."),
  description: z.string().min(10, "Description must be at least 10 characters."),
  location: z.string().min(3, "Location is required."),
  contact: z.string().email("Invalid email address.")
})

export default function LostAndFoundPage() {
  const [items, setItems] = useState(MOCK_ITEMS)
  const [search, setSearch] = useState("")
  const [isOpen, setIsOpen] = useState(false)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: "lost",
      title: "",
      description: "",
      location: "",
      contact: "",
    },
  })

  function onSubmit(values: z.infer<typeof formSchema>) {
    const newItem = {
      id: Math.random().toString(36).substr(2, 9),
      ...values,
      date: new Date(),
      status: "active"
    }
    setItems([newItem, ...items])
    setIsOpen(false)
    form.reset()
  }

  const filteredItems = items.filter(item => 
    item.title.toLowerCase().includes(search.toLowerCase()) || 
    item.description.toLowerCase().includes(search.toLowerCase()) ||
    item.location.toLowerCase().includes(search.toLowerCase())
  )

  const lostItems = filteredItems.filter(item => item.type === "lost")
  const foundItems = filteredItems.filter(item => item.type === "found")

  const ItemCard = ({ item }: { item: typeof MOCK_ITEMS[0] }) => (
    <Card className="glass-card border-border/50 hover:border-border transition-all flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start mb-2">
          <Badge variant={item.type === "lost" ? "destructive" : "default"} className={item.type === "found" ? "bg-green-500 hover:bg-green-600" : ""}>
            {item.type.toUpperCase()}
          </Badge>
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <CalendarDays className="h-3 w-3" />
            {format(item.date, "MMM d, yyyy")}
          </span>
        </div>
        <CardTitle className="text-xl">{item.title}</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 space-y-4 text-sm">
        <div className="bg-muted/50 rounded-lg flex items-center justify-center h-32 border border-dashed">
          <div className="flex flex-col items-center text-muted-foreground">
            <ImageIcon className="h-8 w-8 mb-2 opacity-50" />
            <span className="text-xs">No image provided</span>
          </div>
        </div>
        <p className="text-muted-foreground line-clamp-3">{item.description}</p>
        <div className="flex items-center gap-2 text-foreground/80 font-medium">
          <MapPin className="h-4 w-4 text-primary" />
          <span>{item.location}</span>
        </div>
      </CardContent>
      <CardFooter>
        <Button variant="outline" className="w-full" onClick={() => alert(`Contact: ${item.contact}`)}>
          Contact Reporter
        </Button>
      </CardFooter>
    </Card>
  )

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-2">Lost & Found Box</h1>
          <p className="text-muted-foreground">Report lost items or help return found items to their owners.</p>
        </div>
        
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 shrink-0 rounded-full shadow-lg">
              <Plus className="h-4 w-4" /> Report Item
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Report an Item</DialogTitle>
              <DialogDescription>
                Fill out the details below. This will be posted immediately for others to see.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>I have...</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="lost">Lost something</SelectItem>
                          <SelectItem value="found">Found something</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Item Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Black Leather Wallet" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Provide any identifying details..." 
                          className="resize-none"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location</FormLabel>
                        <FormControl>
                          <Input placeholder="Where was it?" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="contact"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact Email</FormLabel>
                        <FormControl>
                          <Input placeholder="your@email.com" type="email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="pt-4 flex justify-end">
                  <Button type="submit" className="w-full sm:w-auto">Post Report</Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mb-6 relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input 
          placeholder="Search items, descriptions, or locations..." 
          className="pl-9 h-11 bg-card border-border/50 shadow-sm rounded-xl"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="mb-6 bg-card border shadow-sm p-1">
          <TabsTrigger value="all" className="rounded-md">All Items ({filteredItems.length})</TabsTrigger>
          <TabsTrigger value="lost" className="rounded-md">Lost ({lostItems.length})</TabsTrigger>
          <TabsTrigger value="found" className="rounded-md">Found ({foundItems.length})</TabsTrigger>
        </TabsList>
        
        <TabsContent value="all" className="mt-0">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredItems.map(item => <ItemCard key={item.id} item={item} />)}
            {filteredItems.length === 0 && <p className="col-span-full text-center py-12 text-muted-foreground">No items found.</p>}
          </div>
        </TabsContent>
        
        <TabsContent value="lost" className="mt-0">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {lostItems.map(item => <ItemCard key={item.id} item={item} />)}
            {lostItems.length === 0 && <p className="col-span-full text-center py-12 text-muted-foreground">No lost items reported.</p>}
          </div>
        </TabsContent>
        
        <TabsContent value="found" className="mt-0">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {foundItems.map(item => <ItemCard key={item.id} item={item} />)}
            {foundItems.length === 0 && <p className="col-span-full text-center py-12 text-muted-foreground">No found items reported.</p>}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
