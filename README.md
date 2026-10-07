# CampusOS for City University

**CampusOS** is a Smart Digital Campus Hub designed exclusively for City University. It centralizes fragmented information such as club events, schedules, and lost-and-found items into a single, highly interactive, and easily browsable web application.

## Problem Solved

City University currently relies on a chaotic mix of Facebook groups, Messenger chats, and ad-hoc Google Forms for daily operations. This causes students to constantly miss out on events, lose track of important notices, and struggle to find lost items. CampusOS solves this by being a unified **Single Source of Truth** for the campus.

## Modules Built

This platform fully implements two core modules described in the Hackathon requirements:

### 1. Club & Event Engine
A centralized feed replacing scattered Facebook groups.
- **Unified Event Feed:** See all upcoming events across all clubs in one place.
- **Rich Filtering & Search:** Filter events by Club or Event Type, or search for specific terms.
- **RSVP & Ticketing System:** Students can easily RSVP to events and generate a unique QR code ticket for scanning at the door.

### 2. Lost & Found Box
A structured system replacing fleeting Facebook posts.
- **Report & Recover:** Post details about lost or found items with categorical tags, locations, and descriptions.
- **Browse & Match:** A tabbed interface allows students to efficiently browse through all reported Lost or Found items.
- **Direct Contact Integration:** Immediately contact the reporter directly via the integrated UI.

### Bonus: 3D Interactive Hero
- We built a **3D Interactive Hero Section** using `@react-three/fiber` and `@react-three/rapier` physics engine. Interactive objects fall into a contained canvas on the homepage—users can throw the objects around using their cursor, demonstrating a unique web experience that breaks the mold of standard dashboards.

## Technology Stack

- **Framework:** Next.js (App Router)
- **Styling:** Tailwind CSS with custom vibrant Glassmorphism UI
- **Components:** Shadcn UI, lucide-react
- **3D & Physics:** three, @react-three/fiber, @react-three/drei, @react-three/rapier
- **Form Handling:** react-hook-form, zod
- **Date Management:** date-fns
- **QR Code:** qrcode.react

## How to Run Locally

1. **Clone the repository:**
   ```bash
   git clone <repo-url>
   cd <repo-name>
   ```

2. **Install dependencies:**
   Make sure you are using Node 20 or higher.
   ```bash
   npm install
   ```

3. **Run the development server:**
   ```bash
   npm run dev
   ```

4. **Open your browser:**
   Navigate to `http://localhost:3000` to interact with CampusOS.

## Real-World Usability

Imagine a **first-year CU student** who just started. Currently, they have no idea which Facebook groups or Messenger chats contain their class info.
With CampusOS:
- They log in (future scope with Supabase Auth) and land on the dynamic homepage.
- They click **"Explore Events"** and instantly see that the Robotics Club has a workshop this afternoon. They RSVP and receive a QR ticket immediately.
- Later that day, they lose their calculator. Instead of desperately asking 5 different group chats, they navigate to the **"Lost & Found Box"** tab, see someone already posted it an hour ago, and hit "Contact Reporter" to retrieve it!
