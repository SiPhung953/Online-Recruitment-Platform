# Online Recruitment Platform

A full-stack web-based recruitment platform developed as part of a Bachelor's thesis project.

The system supports job discovery, user authentication, profile management, job applications, employer job management, and basic moderation/admin workflows.

## Tech Stack

### Frontend

* React
* Vite
* TypeScript
* React Router
* Axios
* shadcn/ui

### Backend

* Node.js
* Express.js
* TypeScript
* Prisma ORM
* PostgreSQL
* tsoa / OpenAPI
* Swagger UI
* JWT authentication
* bcrypt password hashing

### Tooling

* pnpm workspace
* ESLint
* Prettier

## Project Structure

```txt
bachelor-thesis-prj/
├── apps/
│   ├── web/      # Frontend application
│   └── api/      # Backend API
├── packages/     # Shared packages if needed
├── package.json
├── pnpm-workspace.yaml
└── README.md
```

## Main Modules

* Public job search
* Company profile viewing
* Authentication
* User profile management
* CV management
* Job application management
* Employer job posting management
* Application review
* Moderation/admin management

## Installation

Installation guide for reviewers and Defense Council members. It walks through running the platform locally from a clean environment.

### Prerequisites

* **Node.js** 20.19 or newer (LTS recommended)
* **pnpm** 11.x — enable Corepack (`corepack enable`) or install globally (`npm install -g pnpm`)
* **PostgreSQL** 14+ running locally

### 1. Extract the project

Unzip the project archive (e.g. `bachelor-thesis-prj.zip`) and open a terminal in the extracted folder:

```bash
cd bachelor-thesis-prj
```

### 2. Install dependencies

```bash
pnpm install
```

This installs the frontend (`apps/web`), the backend (`apps/api`) and all shared tooling in a single pnpm workspace.

### 3. Configure environment variables

The backend loads its configuration from `apps/api/.env`. Create the file:

```bash
touch apps/api/.env
```

and fill in the required variables:

```dotenv
DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/bachelor_thesis
JWT_SECRET=change-me-to-a-long-random-string
FRONTEND_URL=http://localhost:5173
PORT=3000
```

| Variable | Required | Description |
| :--- | :--- | :--- |
| `DATABASE_URL` | Yes | PostgreSQL connection string, used by both the API and Prisma |
| `JWT_SECRET` | Yes | Secret used to sign and verify login tokens |
| `FRONTEND_URL` | Yes | Web app origin (for CORS and password-reset links) |
| `PORT` | No | API port, defaults to `3000` |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM` | No | SMTP/Gmail credentials for password-reset emails |
| `PASSWORD_RESET_MESSAGE`, `PASSWORD_RESET_EXPIRY_TIME`, `JOB_EXPIRY_INTERVAL_MS` | No | Optional parameters (reset email text, token lifetime, job-expiry sweep interval) |

The frontend needs no environment variables — it talks to the API at `http://localhost:3000` by default.

### 4. Create the PostgreSQL database

Create an empty database for the project, then make sure `DATABASE_URL` in `apps/api/.env` points to it:

```sql
CREATE DATABASE bachelor_thesis;
```

(`createdb bachelor_thesis` or pgAdmin work too.)

### 5. Run database migrations

```bash
pnpm --filter api exec prisma migrate deploy
pnpm --filter api exec prisma generate
```

This applies all committed migrations and regenerates the Prisma client. For a scratch development database, `pnpm --filter api exec prisma migrate reset` re-creates everything from scratch instead.

### 6. Seed demo data (optional)

```bash
pnpm --filter api seed
```

Seeds the roles plus three demo employers with companies and `ACTIVE` job postings. All seeded accounts use the password `Password123!`:

| Email | Role |
| :--- | :--- |
| `hr@fptsoftware.demo` | Employer (FPT Software) |
| `talent@vnglab.demo` | Employer (VNG Lab) |
| `careers@hanoidata.demo` | Employer (Hanoi Data Collective) |

### 7. Start the backend

```bash
pnpm dev:api
```

Runs on http://localhost:3000. Interactive API documentation (Swagger UI) is available at http://localhost:3000/docs.

### 8. Start the frontend

In a second terminal:

```bash
pnpm dev:web
```

Runs on http://localhost:5173. Open it in a browser and register a Job Seeker account, or log in with one of the seeded employer accounts above.

## API Documentation

The backend uses `tsoa` to generate OpenAPI documentation from TypeScript controllers and DTOs.

Swagger UI is used to inspect and test available API endpoints during development.

## Development Notes

This project is structured as a monorepo with separate frontend and backend applications.

The backend follows a controller-service structure and uses Prisma for database access. API contracts are documented through OpenAPI generation.

The frontend communicates with the backend through HTTP APIs and is implemented as a React single-page application.

## Naming Conventions

### `api-external` vs `api-internal` (Backend)

The `apps/api/src/` directory uses two top-level modules to separate API endpoints by audience:

- **`api-external/`** - Endpoints consumed by the **web frontend** (i.e., the Job Seeker and Employer personas). This includes both public endpoints (no auth) and authenticated endpoints (JWT required).
- **`api-internal/`** - Endpoints consumed by **internal/back-office tooling** (i.e., the Admin/Moderator persona). This includes moderation, user management, and system administration endpoints.

Both modules may contain public and authenticated routes - the distinction is **which human actor** the API serves, not whether authentication is required.

### `ui-external` vs `ui-internal` (Frontend)

The `apps/web/src/` directory uses the **same axis as the backend**: which human actor the UI serves.

- **`ui-external/`** - Pages for the **end-user personas** (Job Seeker and Employer). Contains both public pages (landing, job search, job detail, auth) and authenticated pages (dashboard, profile, applications, employer job management).
- **`ui-internal/`** - Pages for the **Admin/Moderator persona** (moderation, user management). Not yet implemented, mirroring the empty `api-internal/`.
- **`ui-shared/`** - Components used by both: `components/ui/` for shadcn primitives, `components/` for shared app components.

Authentication is **not** the axis. Whether a page requires login is enforced by route guards in `App.tsx`, not by which folder it lives in.

### Feature folders

Inside `ui-external/`, feature folders mirror the backend folder names wherever the same use cases are involved, so a feature can be traced end to end:

| Backend | Frontend |
| :--- | :--- |
| `api-external/employer-company/` | `ui-external/employer-company/` |
| `api-external/employer-job-management/` | `ui-external/employer-job-management/` |
| `api-external/employer-application-management/` | `ui-external/employer-application-management/` |
| `api-external/job-application/` | `ui-external/applications/` |
| `api-external/job-discovery/` | `ui-external/public/` |

Page components sit at the folder root (`MyJobPostingsPage.tsx`); components used only by that feature go in its `components/` subfolder.

<!-- ### Client-side guards are not access control

Route guards decide **what is rendered**, not what a user is allowed to do. Every request is independently authorized server-side by `expressAuthentication` (JWT + ban check), the tsoa `@Security` scope, and `assertRole` in the service. A user who edits client state in DevTools reaches a page whose API calls return 401 or 403. -->

## Academic Scope

This project is intended for thesis demonstration and evaluation. Some advanced production features may be simplified or treated as future work.

## Author

Phung Dam Tien Si
