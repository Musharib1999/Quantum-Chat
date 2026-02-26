# Quantum Guru Chat — Feature List

> **Repository:** [Musharib1999/Quantum-Chat](https://github.com/Musharib1999/Quantum-Chat)  
> **Stack:** Next.js 15, TypeScript, MongoDB, Groq AI, TailwindCSS v4

---

## 🏠 Landing Page

| Feature | Details |
|---|---|
| Module selector | Three feature cards: Quantum Industry, Market Intelligence, Analyze Quantum Information |
| Dark / Light mode toggle | System-aware with manual toggle, persisted via state |
| Animated background | Particle/quantum background effect |
| Card status badges | Unlocked / Locked indicator per card |
| Responsive layout | Mobile menu with hamburger, desktop 3-column grid |

---

## 🔐 Authentication

| Feature | Details |
|---|---|
| Shared Login Page (`/login`) | Mirrors the IndustryLogin design — glassmorphic card, Atom icon, background glow |
| Redirect support | `?redirect=` query param — returns user to original page after login |
| Session persistence | User session stored in `localStorage` (key: `quantum_session`) |
| Full user profile | Stores `email`, `firstName`, `lastName`, `phone`, `plan`, `role` |
| Auth Context | Global `AuthContext` with `login`, `logout`, `isAuthenticated`, `isInitializing` |
| Show/hide password | Eye icon toggle on password field |
| Auth guard | Industry, Market, Article pages check `isAuthenticated` before rendering |
| Admin login | Separate admin login at `/admin/login` (role-based) |

---

## ⚛️ Quantum Industry Module (`/industry`)

| Feature | Details |
|---|---|
| Guided Wizard | 4-step wizard: Industry → Service → Problem → Hardware selection |
| Dynamic metadata | Industries, services, problems fetched from `/api/quantum-forms/metadata` |
| Hardware selection | IBM Brisbane, IonQ Aria, Rigetti Aspen-M-3, D-Wave Advantage |
| Quantum Form | Dynamic form based on selected industry/service/problem combination |
| Industry Chat | Dedicated chat interface with context: industry, service, problem, hardware |
| Experiment History | Right sidebar lists past experiments with timestamp, industry, problem |
| Experiment Details Modal | Full experiment detail view with re-run capability |
| Re-run experiments | Pre-fills wizard config from a past experiment and launches chat |
| Left sidebar (chat mode) | Shows current Industry, Service, Problem, Hardware — clickable to modify |
| Session isolation | Each chat session tied to a specific experiment config |

---

## 📈 Market Intelligence Module (`/market`)

| Feature | Details |
|---|---|
| Stock list sidebar | Left sidebar with searchable list of 17+ quantum/tech company stocks |
| Stock search | Real-time filter by company name |
| Active stock indicator | Green pulsing dot on the selected stock |
| AI Market Chat | Chat interface grounded in selected stock context |
| Quantum News feed | Right sidebar with paginated news articles from the DB |
| Infinite scroll news | Intersection Observer-based auto-load on scroll |
| News article modal | Click any news item to read full summary + link to source |
| Markdown rendering | Full markdown support in chat responses |

---

## 📚 Article & Learn Module (`/article-learn`)

| Feature | Details |
|---|---|
| Article sidebar | Left sidebar listing available quantum articles/papers |
| Article search | Filter articles by title/topic |
| Article chat | Context-aware chat based on selected article |
| Article management | Admin can add/edit/delete articles via the admin dashboard |

---

## 🖥️ Shared App Layout

| Feature | Details |
|---|---|
| Left sidebar | Collapsible, with module-specific content (stocks, articles, industry wizard nav) |
| Right sidebar | Collapsible, houses TokenUsageIndicator + module-specific content |
| Responsive mobile | Mobile-specific toggle buttons, fixed sidebar overlay |
| Mode switcher | Switch between Industry / Market / Article modules from nav |
| Logo link | Quantum Guru logo links to `https://www.quantumcomputers.guru/` |

---

## 👤 User Account Dropdown (☰ Button)

| Feature | Details |
|---|---|
| Dropdown position | Anchored top-right below the ☰ burger button |
| Session info | Shows user name + plan (or "Guest Session / Limited Access" if logged out) |
| Login button | Redirects to `/login?redirect=<current-path>` |
| Sign Out button | Clears `AuthContext` + `localStorage` session |
| Click-outside close | `document.mousedown` listener (capture phase) — closes on any outside click |
| Hover style | `ring-1 ring-ring` outline matching right sidebar item hover style |

---

## ⚡ Token Usage Indicator

| Feature | Details |
|---|---|
| Session token counter | Tracks tokens used in current browser session via `sessionStorage` |
| Token limit | 10,000 tokens per session |
| Live progress bar | Visual fill bar showing used/remaining tokens |
| Warning states | Orange warning at ≤10% remaining, red critical at ≤5% |
| Custom event | Listens to `qg:token-update` window events dispatched by chat interfaces |
| Sticky position | Fixed at top of right sidebar — does not scroll with news list |

---

## 🤖 AI Chat Engine

| Feature | Details |
|---|---|
| Groq AI backend | Uses Groq LLM API for fast inference |
| Streaming responses | Server-Sent Events (SSE) stream for real-time token-by-token display |
| Markdown renderer | Full markdown rendered responses (code blocks, tables, lists, bold etc.) |
| Context injection | System prompts include module-specific context (stock, article, industry config) |
| System prompt editor | Admin can manage system prompts per module from the dashboard |
| Token counting | Prompt + completion tokens tracked and dispatched via custom events |
| Fallback handling | Graceful error messages on API failures |

---

## 🛡️ Admin Dashboard (`/admin/dashboard`)

| Feature | Details |
|---|---|
| User Manager | Create, view, edit, delete users; set role (user/admin) and plan |
| Stock Manager | CRUD for stocks — name, symbol, URL |
| News Manager | View, refresh, scrape quantum news from external sources |
| Article Manager | Upload and manage quantum articles and papers |
| Form Architect | Build and manage dynamic quantum forms (fields, types, validations) |
| System Prompt Editor | View and edit AI system prompts per module (Industry, Market, Article) |
| Knowledge Base | Q&A pairs and source mappings injected into AI system prompts |

---

## 🔌 API Endpoints

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/auth/login` | POST | Authenticate user, return full profile |
| `/api/stocks` | GET | List all stocks |
| `/api/news` | GET | Paginated news articles |
| `/api/articles` | GET/POST/DELETE | Manage articles |
| `/api/quantum-forms` | GET/POST | Manage quantum forms |
| `/api/quantum-forms/metadata` | GET | Industry/service/problem metadata |
| `/api/admin/users` | GET/POST/PUT/DELETE | User management |
| `/api/admin/news/refresh` | POST | Trigger news scrape |
| `/api/admin/scrape` | POST | Scrape articles from URLs |
| `/api/admin/prompts` | GET/POST/PUT | System prompt management |

---

## 🎨 Design System

| Feature | Details |
|---|---|
| Theme | Monochromatic dark/light, Zinc/Black/White palette |
| Typography | Inter / system sans-serif, `font-mono` for data values |
| CSS variables | `--background`, `--foreground`, `--card`, `--border`, `--ring`, `--primary` |
| Glassmorphism | `bg-card/40 backdrop-blur-xl` used in login and modals |
| Animations | `animate-in`, `fade-in`, `zoom-in-95`, pulse, spin-slow |
| Custom scrollbar | `.custom-scrollbar` class for styled thin scrollbars |

---

## 🚀 Embedding & Demos

| Feature | Details |
|---|---|
| Embeddable chat widget | `/embed/chat` — iframe-embeddable chat for external sites |
| Demo mode | `/demo` route for a standalone demonstration experience |
