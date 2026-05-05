# ◈ SolvIt v2.0 — AI Problem Solver + Auth + Community Chat

A complete full-stack platform with user authentication, AI-powered problem solving, and real-time community chat.

---

## 🚀 Quick Start

### Option 1: Run Both Frontend & Backend Together
```bash
# Install all dependencies (root, frontend, backend)
npm run install:all

# Run both servers concurrently
npm run dev
```

### Option 2: Run Separately
```bash
# Backend (Terminal 1)
cd backend
npm install
npm run dev

# Frontend (Terminal 2) 
cd frontend
npm install
npm run dev
```

Then open your browser:

| Service | URL |
|---|---|
| Backend API | http://localhost:3000 |
| Frontend App | http://localhost:8080 |
| Login / Register | http://localhost:8080/login.html |
| Main App | http://localhost:8080/ |

---

## 📁 Project Structure (Monorepo)

```
solvit/
├── frontend/                  ← Frontend application
│   ├── src/
│   │   ├── pages/           ← HTML pages (index.html, login.html)
│   │   ├── styles/          ← CSS styles
│   │   ├── utils/           ← JavaScript utilities
│   │   └── components/      ← Reusable components
│   ├── public/              ← Static assets (uploads)
│   └── package.json         ← Frontend dependencies
├── backend/                   ← Backend API
│   ├── src/
│   │   ├── controllers/     ← Route handlers
│   │   ├── middleware/      ← Express middleware
│   │   ├── routes/          ← API routes
│   │   ├── utils/           ← Helper functions
│   │   └── app.js           ← Express app config
│   ├── data/                ← JSON data storage
│   ├── server.js            ← Backend entry point
│   └── package.json         ← Backend dependencies
├── package.json              ← Root monorepo config
└── README.md                 ← This file
```

---

## ✨ Features

### 🔐 Authentication
- Register with name, email, password
- Password hashed with bcrypt (secure)
- JWT tokens (7-day sessions)
- Auto-redirect to login if not authenticated
- Logout button in header
- Password strength indicator on register

### 🤖 Problem Solver
- Submit problems with title, description, image, map location
- AI generates structured solutions (keyword-based, upgradeable to real AI)
- Category detection (Road, Water, Electricity, Garbage, Health, Pollution, Education, Flood)
- Authority guidance with exact ministry + portal + step-by-step process
- Duplicate/similar problem detection
- Browse all problems with search + filter
- Upvote problems (once per user)
- Update problem status (Open / In Progress / Resolved)
- Comment/discussion on each problem

### 💬 Community Chat
- 6 default chat rooms (General, Road Issues, Water & Utilities, etc.)
- Real-time polling every 5 seconds
- Messages grouped by author for clean UI
- Delete your own messages
- Date separators in chat
- Live indicator

---

## 🔌 Upgrade to Real AI

In `server.js`, replace `generateSolution()` with:

```javascript
// Hugging Face (Free)
async function generateSolution(text, cat) {
  const res = await fetch(
    "https://api-inference.huggingface.co/models/google/flan-t5-large",
    {
      method: "POST",
      headers: {
        Authorization: "Bearer YOUR_HF_TOKEN_HERE",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ inputs: `Solve this civic problem step by step: ${text}` }),
    }
  );
  const data = await res.json();
  return data[0]?.generated_text || "Solution not available.";
}
```

Get a free token at: https://huggingface.co/settings/tokens

---

## 🎓 Demo Script

1. Open http://localhost:3000/login.html
2. **Register** a new account — show the password strength indicator
3. Submit a **Road problem** with map pin + photo
4. Show the **AI solution** + authority guidance cards
5. Submit a **similar problem** — show duplicate detection
6. Go to **Browse** — search and filter problems
7. Open a problem — **add a comment**, change status
8. Go to **Community Chat** — join a room, send messages
9. Open a second browser window, login as another user — show live chat

---

## ⚙️ Troubleshooting

| Issue | Fix |
|---|---|
| `Cannot find module` | Run `npm install` inside the `solvit` folder |
| Port 3000 in use | Change `PORT = 3001` in server.js |
| Login page not loading | Make sure server is running (`node server.js`) |
| Map not showing | Check internet connection (uses OpenStreetMap CDN) |
| Images not saving | The `public/uploads/` folder must exist (it's included) |

---

## 🛠️ Optional Upgrades

| Feature | How to add |
|---|---|
| Real AI | Hugging Face or OpenAI API in `generateSolution()` |
| Real-time chat | Replace polling with Socket.IO |
| Profile pages | Add `/profile` route with user's submitted problems |
| Admin panel | Add admin role in JWT + protected `/admin` route |
| Email verification | Use Nodemailer on register |
| SMS alerts | Integrate Twilio for critical problem notifications |
| Database | Replace JSON files with SQLite (`better-sqlite3`) |
| PWA | Add `manifest.json` + service worker for mobile install |
