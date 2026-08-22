# ReachInbox Full-Stack Email Job Scheduler

A highly reliable, concurrent email scheduling monorepo built using Next.js, Express, BullMQ, Redis, PostgreSQL, Prisma ORM, and Nodemailer (Ethereal Email).

---

## 1. Project Overview

The **ReachInbox Email Job Scheduler** allows users to log in securely with Google, parse lists of email recipients from CSV or TXT documents, and schedule customizable bulk outreach campaigns. The system provides strict spacing between emails (minimum delay), Redis-backed hourly rate limiting, and idempotent email processing designed to prevent duplicate sends even across multiple worker instances. It survives backend crashes and system restarts by using Redis-backed persistent delayed queues.

---

## 2. System Architecture

```
                             +------------------------+
                             |   Next.js Frontend     |
                             |  (NextAuth Google)     |
                             +-----------+------------+
                                         |
                                         | HTTP / Rest
                                         v
                             +------------------------+
                             |  Express.js Backend    |
                             |  (Auth middleware)     |
                             +-----+-------------+----+
                                   |             |
                        Prisma ORM |             | BullMQ Client (ioredis)
                                   v             v
                             +-----+----+   +----+----+
                             | Postgres |   |  Redis  | <--- Persistent Storage
                             |    DB    |   +----+----+
                             +-----+----+        |
                                   ^             | Job Events
                        Lock Check |             v
                             +-----+-------------+----+
                             |    BullMQ Workers      |
                             |  (processEmailJob)     |
                             +-----------+------------+
                                         |
                                         | SMTP (Nodemailer)
                                         v
                             +------------------------+
                             |  Ethereal Email SMTP   |
                             | (Test Account Cached)  |
                             +------------------------+
```

---

## 3. Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS, NextAuth.js, Google OAuth, Lucide React, react-hot-toast.
- **Backend**: Node.js, TypeScript, Express.js, Prisma ORM, BullMQ, Redis (ioredis), Nodemailer (Ethereal test mailer), Zod (config/payload validation).
- **Infrastructure**: PostgreSQL, Redis, Docker Compose.

---

## 4. Folder Structure

```
reachinbox-email-scheduler/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma    # PostgreSQL Prisma models
│   ├── src/
│   │   ├── config/          # Zod env schemas, Prisma & Redis connections
│   │   ├── controllers/     # Route request-response handlers
│   │   ├── middleware/      # Auth & global error handler
│   │   ├── queues/          # BullMQ queue definitions
│   │   ├── routes/          # Express route declarations
│   │   ├── services/        # Campaign logic, Ethereal mailer, Rate-limiting
│   │   ├── tests/           # Custom unit & integration test runner
│   │   ├── utils/           # CSV parser helpers
│   │   ├── workers/         # BullMQ Workers setup
│   │   ├── app.ts           # Express app instance
│   │   └── server.ts        # Bootstrapper & Graceful Shutdown
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
├── frontend/
│   ├── app/                 # Next.js App Router Pages
│   │   ├── api/auth/        # NextAuth Google Auth routes
│   │   ├── globals.css      # Core Tailwind CSS styles
│   │   ├── layout.tsx       # Root layout configuration
│   │   └── page.tsx         # Login Landing Page & Auth redirector
│   ├── components/          # Reusable dashboard parts
│   │   ├── ComposeModal.tsx # Recipient parses & campaign options form
│   │   ├── Dashboard.tsx    # Tables, Stats, and tabs toggle
│   │   └── ui/              # Reusable Button, Input, Table, Badge elements
│   ├── services/            # Client API integrations helper
│   ├── utils/               # Client-side email list parser
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
├── docker-compose.yml       # Dev database and queue services
├── .gitignore
└── README.md
```

---

## 5. Prerequisites

Ensure you have the following installed on your machine:
- Node.js (v18 or higher)
- npm (v9 or higher)
- Docker & Docker Compose (optional but recommended for starting PostgreSQL/Redis)

---

## 6. Infrastructure Setup (Docker, Postgres, Redis)

### Docker setup
Start the PostgreSQL and Redis containers with persistent volumes in the background:
```bash
docker compose up -d
```

### PostgreSQL Manual Setup (Without Docker)
If running databases locally on Windows:
1. Install PostgreSQL and create a database named `reachinbox_db`.
2. Configure the database port to `5432` and update the connection URL in `backend/.env`.

### Redis Manual Setup (Without Docker)
1. Install Redis and run the server locally on port `6379`.

---

## 7. Installation & Startup

### Step 1: Install Dependencies
Run npm installations in both frontend and backend directories:
```bash
# In backend/
cd backend
npm install

# In frontend/
cd ../frontend
npm install
```

### Step 2: Prisma Migration & Client Generation
Build your PostgreSQL schema and initialize tables:
```bash
cd ../backend
npm run db:generate
# To run migrations:
npm run db:migrate
```

### Step 3: Run the Backend & Workers
Start the Express server along with the BullMQ email processor:
```bash
npm run dev
```

### Step 4: Run the Frontend
In another terminal, start the Next.js development server:
```bash
cd ../frontend
npm run dev
```
Open `http://localhost:3000` in your browser.

---

## 8. Google OAuth & Ethereal Configuration

### Google OAuth setup
To authenticate users via Google login:
1. Visit the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project, go to APIs & Services -> OAuth Consent Screen, and configure it.
3. Under Credentials, create a Client ID for Web Applications:
   - Authorized JavaScript origins: `http://localhost:3000`
   - Authorized redirect URIs: `http://localhost:3000/api/auth/callback/google`
4. Paste the generated client ID and client secret into `frontend/.env`.

### Ethereal configuration
No manual SMTP credentials are required! The backend uses `nodemailer.createTestAccount()` to dynamically provision a free Ethereal SMTP account. The transporter is cached in memory on the first send to optimize delivery times. All emails will generate a real Ethereal preview link, which is stored in the database and visible directly in the frontend dashboard.

---

## 9. Environment Variables

### Backend (`backend/.env`)
```env
PORT=4000
DATABASE_URL="postgresql://reachinbox_user:reachinbox_password@localhost:5432/reachinbox_db?schema=public"
REDIS_URL="redis://localhost:6379"
WORKER_CONCURRENCY=5
MAX_EMAILS_PER_HOUR=200
NEXTAUTH_SECRET="your-nextauth-secret-minimum-32-characters"
```

### Frontend (`frontend/.env`)
```env
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-nextauth-secret-minimum-32-characters"
GOOGLE_CLIENT_ID="your-google-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
NEXT_PUBLIC_API_URL="http://localhost:4000"
```

---

## 10. Core Scheduler & Architecture Decisions

### How Scheduling Works
Scheduling does **NOT** use polling, cron jobs, or database scanning. We rely on **BullMQ delayed jobs**.
When a user schedules a campaign for $T_{start}$ with delay spacing $D$, and has list of emails $E_0, E_1, ..., E_N$:
1. A transaction inserts the Campaign and all Email records (with unique IDs pre-generated as UUIDs) into PostgreSQL.
2. For each email $E_i$, the delay is calculated:
   $$\text{Delay}_i = (T_{start} - T_{current}) + (i \times D) \text{ seconds}$$
3. A job is added to the BullMQ queue with `jobId = emailRecord.id` and `{ delay: Delay_i * 1000 }`.

### Server Restart Persistence
Delayed job queues are persisted directly inside Redis. If the backend process crashes or restarts:
- Active jobs remain in Redis.
- Upon worker restart, it re-connects to Redis and immediately executes any jobs that became due during the offline period.
- No jobs are lost or duplicate-scheduled.

### Idempotency Strategy
Before sending any email, the worker runs an atomic SQL lock statement:
```typescript
const affected = await prisma.email.updateMany({
  where: { id: emailId, status: { in: ['SCHEDULED', 'RATE_LIMITED'] } },
  data: { status: 'PROCESSING', attempts: { increment: 1 } }
});
```
If `affected.count` is 0, the job is immediately skipped, preventing double sends across concurrent workers or accidental double triggers from BullMQ.

### Redis-Backed Hourly Rate Limiting
- Key Structure: `rate-limit:<userId>:<YYYY-MM-DD-HH>`
- On processing, the worker increments (`INCR`) the key.
- If it exceeds `hourlyLimit`, the worker decrements the key, resets the database email status to `RATE_LIMITED`, deletes the current job, and schedules a **new delayed job** to run at the start of the next hour.

---

### Worker Concurrency & Email Delay

Worker concurrency is configurable using the `WORKER_CONCURRENCY`
environment variable. The BullMQ worker uses this value to control how
many email jobs can be processed concurrently.

The minimum delay between emails is configurable per campaign using
`delaySeconds`. Each recipient is assigned a scheduled time based on
the campaign start time and its position in the recipient list.

For example, with a 5-second delay:

- Email 1 → start time
- Email 2 → start time + 5 seconds
- Email 3 → start time + 10 seconds

This prevents emails from being sent continuously without spacing.

When a large number of emails are scheduled at the same time, BullMQ
stores the delayed jobs in Redis and processes them according to their
scheduled times. If the hourly rate limit is reached, remaining jobs
are rescheduled for the next available hour instead of being dropped.

## 11. Testing Instructions

To run the custom test suite:
```bash
cd backend
npm run test
```
The test suite will check:
- Email list CSV/TXT parsing and deduplication.
- Redis-backed sliding rate limiter.
- Database idempotency state-transition locking.
*Note: Redis and PostgreSQL tests will be skipped automatically with a warning if the databases are not online.*

---

## 12. Assumptions, Trade-Offs, & Limitations

### Assumptions
- Next.js acts as the authentication boundary, forwarding authenticated user headers (`x-user-id`, `x-user-email`) securely to the Express backend.

### Trade-offs
- **Google Client ID in Frontend**: Keeping client secrets in `.env` is secure as NextAuth executes OAuth exchanges on the Next.js backend server side.

### Known Limitations
- Rate limiting is scoped per user, which handles general SMTP restrictions. In a production multi-tenant system, rate limits would also be split per sending domain.
