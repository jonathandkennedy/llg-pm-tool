# LLG PM Tool — Internal Operations Platform

Internal project management tool for Legal Leads Group. Replaces Wrike as the team's daily operating system.

## Architecture

- **Frontend**: React + Vite
- **Backend/Auth/DB**: Supabase (shared with client portal at llgportal.com)
- **Hosting**: Vercel (subdomain e.g. ops.legalleadsgroup.com)
- **Fonts**: DM Serif Display + DM Sans

## Pages

| Route | Page | Purpose |
|-------|------|---------|
| `#dashboard` | Dashboard | Overview stats, quick actions |
| `#inbox` | Inbox | Notifications, approvals, alerts |
| `#launch` | Launch Board | Pre-live kanban for client onboarding |
| `#ongoing` | Ongoing Board | Post-live kanban for recurring work |
| `#projects` | Projects | Master client record table |
| `#tasks` | Tasks | All tasks with QA actions |
| `#workload` | Workload | Team capacity cards |
| `#reports` | Reports | Revenue + operations reporting |
| `#settings` | Settings | User management, roles, config |

## Setup

1. Clone this repo in GitHub Desktop
2. Copy `.env.example` to `.env.local` and add your Supabase anon key
3. Install dependencies: `npm install`
4. Run locally: `npm run dev`

## Deploy to Vercel

1. Push to GitHub
2. Create new project in Vercel → select this repo
3. Framework preset: Vite
4. Add environment variables:
   - `VITE_SUPABASE_URL` = `https://eifrudtwwojllvwzzryo.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = your key
5. Deploy
6. Add custom domain in Vercel Settings → Domains
7. Add CNAME record in IONOS pointing subdomain to `cname.vercel-dns.com`

## Shared Database

This tool shares the same Supabase project as the client portal. Row Level Security (RLS) keeps data separated:
- **Client portal users** see only their own project data
- **PM tool users** see all data filtered by their role (admin, manager, member)

## File Structure

```
src/
  App.jsx              # Main app with auth + routing
  main.jsx             # React entry point
  global.css           # Design system (single source of truth)
  supabaseClient.js    # Shared Supabase client
  components/
    Layout.jsx         # Shell (sidebar + topbar + content)
    Sidebar.jsx        # Navigation with sections
    TopBar.jsx         # Header bar with search, notifications
  hooks/
    useAuth.jsx        # Auth state, login, logout, role detection
    useHashRoute.jsx   # Hash-based routing
  pages/
    Login.jsx          # Magic link login
    Dashboard.jsx      # Home / overview
    LaunchBoard.jsx    # Pre-live kanban
    OngoingBoard.jsx   # Post-live kanban
    Projects.jsx       # Master project list
    Tasks.jsx          # Task table with QA
    Workload.jsx       # Team capacity
    Reports.jsx        # Revenue + ops
    Inbox.jsx          # Notifications
    Settings.jsx       # Users, roles, config
```
