# 🎓 CampusOS — City University Digital Hub

**CampusOS** is a comprehensive, all-in-one digital campus dashboard built for City University students, faculty, and staff. It brings together urgent notices, club events, academic resources, bus schedules, an AI assistant, and a lost & found system — all accessible from a single, beautiful web interface.

---

## ✨ Key Features

### 📢 Urgent Notices
- Post, edit, and delete department-specific notices
- Filter by department or search by keyword
- Save important notices to your personal account for later access
- Auto-expiry system keeps the board clean

### 🎭 Club Directory
- Browse all active student clubs and organizations
- View upcoming club events with dates, venues, and descriptions
- Generate QR-code entry passes for events

### 📚 Resource Hub
- Share and discover academic materials (notes, slides, past papers)
- Organized by department for easy browsing
- Upload resources with pictures and descriptions

### 🚌 Bus Schedule & Helpdesk
- Full university bus timetable with routes, stops, and driver contacts
- Smart FAQ section with instant answers to common campus questions
- Live "next bus" reminder bar at the top of every page
- **AI Search Assistant** — ask natural-language questions about shuttle timings, office locations, retake policies, and more

### 🤖 AI Assistant
- Client-side keyword-matching knowledge base
- Instant answers about bus schedules, office hours, exam policies, lost & found procedures, WiFi, clubs, and campus contacts
- No API key or internet dependency — works entirely offline

### 📦 Lost & Found
- Report lost or found items with descriptions and contact info
- Submit campus complaints through a structured form
- Only the original poster can delete their submissions

---

## 🔐 Account System
- Personal ID–based authentication (no university email required)
- Accounts sync saved notices across devices via Firebase
- Guest browsing supported — sign in only when you need to post or save

---

## 🛠️ Tech Stack

| Technology | Purpose |
|------------|---------|
| **HTML5** | Page structure and semantic markup |
| **CSS3** | Styling, animations (falling leaves, jellyfish, bamboo), light/dark themes |
| **JavaScript (Vanilla)** | Application logic, navigation, rendering, AI assistant |
| **Firebase** | Authentication (Email/Password), Firestore (real-time database), Storage (images) |
| **QRCode.js** | QR code generation for event entry passes |

---

## 📁 File Structure

```
CampusOS/
├── index.html          # Main HTML file — all sections and modals
├── app.js              # Core application logic (navigation, rendering, auth, AI assistant)
├── styles.css          # Primary stylesheet (layout, cards, navigation, modals)
├── sparkle.css         # Decorative animations (leaves, jellyfish, bamboo, bubbles)
├── theme.css           # Light/dark theme variables and overrides
├── firebase-config.js  # Firebase project configuration (fill in your own keys)
├── firestore.rules     # Firestore security rules
├── logo.jpeg           # CampusOS logo
└── README.md           # This file
```

---

## 🚀 How to Run

1. **Clone or download** this repository to your local machine.

2. **Configure Firebase** *(optional — needed only for real-time data sharing)*:
   - Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
   - Enable **Email/Password** authentication
   - Create a **Firestore** database
   - Paste your Firebase config into `firebase-config.js`

3. **Open `index.html`** in any modern web browser:
   - Double-click the file, **or**
   - Right-click → "Open with" → your browser, **or**
   - Use a local server: `npx serve .` or VS Code Live Server extension

4. **That's it!** The app works offline for browsing. Firebase is needed only for posting, saving, and syncing data across devices.

---

## 🌙 Light / Dark Mode

Toggle the theme using the 🌙/☀️ button in the header. Your preference is saved locally.

---

## 📄 License

This project is built for educational purposes at City University.

