# CivicPulse — AI-Powered Local Government Resource Dashboard

**Problem Statement G9 • Hackathon Production Build**

CivicPulse is a full-stack municipal governance application designed to empower local municipal officers with unified oversight across territorial wards, citizen complaints, civic works and development projects, public utilities and services, department financial resources, and operational AI decision support.

---

## 🏛️ Application Architecture & Tech Stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS v4, Lucide React Icons, React Router v7.
- **Backend:** Node.js, Express, TypeScript (TSX), Zod schema validation.
- **Database & Auth:** Supabase PostgreSQL, Supabase Auth, Row Level Security (RLS) policies.
- **AI Decision Support:** Google Gemini API (`@google/genai` with `gemini-3.8-flash`), strictly executed server-side.
- **Disclaimers:** *"AI-generated decision support. Officers should verify information and use their judgement."*

---

## 🗄️ Database Schema & Migrations

All database tables, foreign keys, and Row Level Security (RLS) policies are defined in:
- `schema.sql` (Root migration script)
- `supabase/migrations/20260101_init_civicpulse.sql`

### Tables Created:
1. `profiles` — Municipal officer profiles linked to `auth.users(id)`
2. `wards` — Territorial wards and administrative boundaries
3. `complaints` — Public grievances with category, priority, status, and ward linkage
4. `projects` — Civic infrastructure works with budget, expenditure, and completion %
5. `services` — Public utility delivery metrics (coverage %, satisfaction %, status)
6. `resources` — Departmental budget allocations and expenditure (INR formatting)
7. `ai_insights` — Grounded AI operational recommendations and risk alerts
8. `activity_events` — Audit logs of civic transactions and updates
9. `ai_runs` — Context and telemetry audit trail for AI inferences
10. `ai_usage_windows` — Usage rate controls and window tracking

### Executing the Migration:
1. Log in to your [Supabase Dashboard](https://supabase.com).
2. Go to the **SQL Editor**.
3. Copy the contents of `schema.sql` and run it.

---

## ⚙️ Environment Variables

Create a `.env` file in the root directory (refer to `.env.example`):

```bash
# Server & Port
PORT=3000
NODE_ENV=development

# Google Gemini API (Server-side only)
GEMINI_API_KEY=AIzaSy...

# Supabase PostgreSQL & Auth
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOi...

# App URL
APP_URL=http://localhost:3000
FRONTEND_URL=http://localhost:3000
```

*Note: Never expose `GEMINI_API_KEY` or Supabase service-role keys in frontend code.*

---

## 🚀 Development & Production Commands

### Install Dependencies
```bash
npm install
```

### Start Development Server
Runs Express on `http://localhost:3000` with integrated Vite SPA middleware:
```bash
npm run dev
```

### Build for Production
```bash
npm run build
```

### Start in Production Mode
```bash
npm start
```

### Type Checking & Linting
```bash
npm run lint
```

---

## 🛡️ Security & Row Level Security (RLS)

- Every municipal table has RLS enabled.
- Data access is strictly scoped to `auth.uid() = user_id`.
- The Express backend extracts the user's Supabase session JWT from the `Authorization: Bearer <token>` header and verifies it via `supabase.auth.getUser(token)`.
- Foreign-key relationships (such as `ward_id`) are validated to ensure users cannot reference another officer's private ward records.
