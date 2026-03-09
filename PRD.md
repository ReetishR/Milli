# Product Requirements Document (PRD): Runtime Content Generation Platform

## 1. Executive Summary
Build a web platform that delivers unique, educational profiles of "Billionaires" and "Companies" on every page refresh. The content is dynamically retrieved or generated at runtime, persisted to a database for reuse, and served via specific routes (e.g., `/billionaires`, `/companies`).

## 2. Core Philosophy
- **Runtime Generation + Persistence:** Content is not static static; it is served dynamically. If a profile doesn't exist, it's generated (via AI) and saved.
- **Single URL, Changing Content:** Users visit a persistent URL to see new content.
- **Premium Design:** Dark mode, clean typography, high-quality reading experience.

## 3. Architecture
### Tech Stack (Proposed for Code Implementation)
- **Frontend:** Next.js (React) - Replaces Webflow.
- **Backend:** Next.js API Routes - Replaces Xano.
- **Database:** Prisma + SQLite (Local MVP) or Supabase (PostgreSQL) - Replaces Airtable/Supabase.
- **AI/Generation:** OpenAI API (or similar) - Content generation engine.

### Data Flow
1. **User Request:** User visits `/billionaires`.
2. **Backend Logic:**
   - Query `Entities` table for a candidate (e.g., "Elon Musk") that hasn't been served recently.
   - Check `GeneratedProfiles` for an existing compiled profile.
   - **Branch A (Existing):** Return JSON.
   - **Branch B (New/Refresh):** Call AI to generate content -> Save to `GeneratedProfiles` -> Return JSON.
   - Update `last_served_at` in `Entities`.

## 4. Data Schema

### 4.1. Table: Entities (The Seed List)
| Field | Type | Description |
|-------|------|-------------|
| id | String (UUID) | Unique ID |
| type | Enum | `billionaire`, `company` |
| name | String | e.g., "Elon Musk", "Stripe" |
| source_hints | JSON | URLs to Wikipedia, etc. |
| tags | JSON/Array | `['YC', 'Tech', 'AI']` |
| last_served_at | DateTime | Timestamp of last serve |
| status | String | `active`, `paused` |

### 4.2. Table: GeneratedProfiles (The Content)
| Field | Type | Description |
|-------|------|-------------|
| id | String (UUID) | Unique ID |
| entity_id | String (FK) | Link to Entity |
| title | String | Generated title |
| content_json | JSON | Structured content (Hero, Story, Playbook, etc.) |
| created_at | DateTime | When it was generated |
| version | Integer | For updates |

## 5. Routes & API
- **Pages:**
  - `/billionaires`: Loads random/next billionaire profile.
  - `/companies`: Loads random/next company profile (supports `?tag=yc`).
- **API:**
  - `GET /api/serve?type=billionaire`
  - `GET /api/serve?type=company&tag=yc`

## 6. MVP Scope
1. **Setup:** Next.js project with Tailwind CSS.
2. **Database:** Prisma + SQLite.
3. **Seeding:** Script to add initial list of Billionaires/Companies.
4. **Mock Generation:** Initially return dummy data or simple templates until AI API key is configured.
5. **UI:** "Premium" dark theme card displaying the profile.
