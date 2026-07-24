# AttendEase — Technical Design Document (TDD)

## 1. Executive Summary

**AttendEase** is an enterprise-grade digital Attendance & Duty Leave Approval Management System tailored for educational institutions. It digitizes, automates, and streamlines the process of submitting, tracking, reviewing, and auditing student duty leave and attendance adjustment requests.

The system replaces manual paper-based workflow with an automated multi-tier approval system connecting **Students**, **Faculty Members**, and **Heads of Department (HOD)** through a real-time web application.

---

## 2. System Architecture Overview

AttendEase follows a modern decoupled **Client-Server Architecture** utilizing a Single Page Application (SPA) frontend communicating with a RESTful Express.js backend API powered by TypeScript and Database.

### High-Level Architecture Diagram

```mermaid
graph TD
    subgraph Client Layer (Vite + React 19 + TypeScript)
        SP[Student Portal]
        FP[Faculty Portal]
        HP[HOD Portal]
        ClientAPI[Client API Service / TanStack Query]
    end

    subgraph API & Application Gateway (Express.js + Node.js)
        AuthMW[JWT Auth Middleware & RBAC Router]
        AuthRouter[/api/auth Router]
        ReqRouter[/api/requests Router]
        UserRouter[/api/users Router]
    end

    subgraph Data & Persistence Layer (Database / Prisma)
        UserCol[(Users Table)]
        ReqCol[(Requests Table)]
        SeedEngine[Database Seeder / Fallback Engine]
    end

    SP -->|HTTP/REST + JWT| ClientAPI
    FP -->|HTTP/REST + JWT| ClientAPI
    HP -->|HTTP/REST + JWT| ClientAPI

    ClientAPI -->|JSON Request| AuthMW
    AuthMW --> AuthRouter
    AuthMW --> ReqRouter
    AuthMW --> UserRouter

    AuthRouter --> UserCol
    ReqRouter --> ReqCol
    UserRouter --> UserCol
    SeedEngine -.->|Auto-Seeds Defaults| UserCol
```

---

## 3. Technology Stack

| Layer | Technology / Library | Description |
| :--- | :--- | :--- |
| **Frontend Core** | React 19 + TypeScript | UI Library with strict typing |
| **Build System** | Vite 8 | Fast ESM bundler & dev server |
| **Routing** | React Router v7 | Client-side routing with role-based layout protection |
| **State & Data Fetching** | TanStack Query v5 & React Context | Asynchronous state management, query caching & auth state |
| **Styling & UI Components** | Tailwind CSS v3 + Radix UI + Lucide Icons | Utility-first styling with accessible UI primitives & vector icons |
| **Animations** | Framer Motion | Smooth UI transitions and micro-interactions |
| **Forms & Validation** | React Hook Form + Zod | Schema-based client form validation |
| **Backend Core** | Node.js + Express 4 (TypeScript) | Web server framework with TS runtime execution via `tsx` |
| **Database & ORM** | PostgreSQL + Prisma | Relational database with schema enforcement |
| **Security & Auth** | `jsonwebtoken` + `bcryptjs` | JWT token authentication & bcrypt password hashing |

---

## 4. Data Models & Database Schemas

### 4.1 `User` Schema (`backend/src/models/User.ts`)

Defines all platform users across Student, Faculty, and HOD roles.

```typescript
export interface IUser {
  id: string;
  userId: string;          // Human-readable identifier (e.g., 'stu-001', 'fac-001', 'hod-001')
  name: string;
  email: string;
  role: 'student' | 'faculty' | 'hod';
  department: string;
  password: string;
  rollNumber?: string;     // Student-specific
  semester?: number;       // Student-specific
  avatarUrl?: string;
  designation?: string;    // Faculty/HOD-specific
  phone?: string;
  dob?: string;
  gender?: string;
  address?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

#### Field Constraints & Indexes
- `userId`: String, Unique, Required. Indexed for fast lookup.
- `email`: String, Unique, Lowercase, Required.
- `role`: Enum `['student', 'faculty', 'hod']`.

---

### 4.2 `Request` Schema (`backend/src/models/Request.ts`)

Captures student duty leave/attendance approval requests including snapshots of applicant and assigned faculty details to maintain historical immutability.

```typescript
export interface IRequest extends Document {
  requestId: string;       // Human-readable identifier (e.g., 'req-001')
  studentId: string;       // References User.userId
  student: StudentSnapshot;
  reason: 'medical' | 'duty_leave' | 'sports' | 'seminar' | 'personal' | 'other';
  reasonLabel: string;
  date: string;            // ISO Date string (YYYY-MM-DD)
  startTime: string;       // Format: "HH:mm"
  endTime: string;         // Format: "HH:mm"
  description: string;
  documentName?: string;   // Attached proof filename
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
  facultyId?: string;      // Assigned faculty ID
  faculty?: FacultySnapshot;
  facultyIds?: string[];   // Multi-faculty reviewer support
  faculties?: FacultySnapshot[];
  reviewedAt?: string;
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

#### Performance Indexes
- `{ studentId: 1 }`: Accelerated fetching of student request history.
- `{ status: 1 }`: Optimized filtering by pending/approved/rejected state.
- `{ submittedAt: -1 }`: Efficient chronological sorting.

---

## 5. API Endpoint Specifications

### 5.1 Authentication (`/api/auth`)

| Method | Endpoint | Auth | Description | Payload / Response |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/login` | None | Authenticates user via email/rollNumber and role | **Body**: `{ identifier, password, role }`<br>**Response**: `{ token, user }` |
| `POST` | `/api/auth/logout` | JWT | Stateless logout acknowledgement | **Response**: `{ message: 'Logged out successfully' }` |

### 5.2 Attendance Requests (`/api/requests`)

| Method | Endpoint | Auth | Description | Payload / Response |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/requests` | JWT | Fetch requests (filtered by role & department) | **Query**: `?department=CS`<br>**Response**: `{ requests: [...] }` |
| `POST` | `/api/requests` | Student | Create a new attendance request | **Body**: `{ reason, date, startTime, endTime, description, documentName, facultyIds }`<br>**Response**: `{ request }` |
| `GET` | `/api/requests/:id` | JWT | Fetch single request details by ID | **Response**: `{ request }` |
| `PATCH` | `/api/requests/:id` | Faculty/HOD | Approve or reject a request | **Body**: `{ action: 'approve' \| 'reject', rejectionReason?: string }`<br>**Response**: `{ request }` |
| `DELETE` | `/api/requests/:id` | Student/Admin | Cancel/delete request | **Response**: `{ message: 'Request deleted' }` |

### 5.3 User Profiles (`/api/users`)

| Method | Endpoint | Auth | Description | Payload / Response |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/users/me` | JWT | Get current authenticated user details | **Response**: `{ user }` |
| `PUT` | `/api/users/me` | JWT | Update current user profile details | **Body**: `Partial<IUser>`<br>**Response**: `{ user }` |
| `GET` | `/api/users/faculty` | JWT | Fetch list of faculty members | **Response**: `{ faculty: [...] }` |
| `GET` | `/api/users` | HOD | Fetch all department users | **Response**: `{ users: [...] }` |

---

## 6. Authentication & Authorization Security Architecture

1. **JSON Web Tokens (JWT)**: Upon login, backend issues a signed JWT containing basic user claims (`id`, `email`, `role`, `department`).
2. **Bearer Token Transmission**: Frontend attaches token in the header: `Authorization: Bearer <token>`.
3. **Role-Based Access Control (RBAC Middleware)**:
   - `authMiddleware`: Decodes and verifies token signature via secret key.
   - `requireRole(['faculty', 'hod'])`: Enforces endpoint-level permissions preventing unauthorized actions.
4. **Client-Side Guarding**: React Router layout wrappers check authenticated status and user role before rendering sub-tree components.

---

## 7. Frontend Module Breakdown

### 7.1 Portals & Roles Architecture

- **Student Portal** (`frontend/src/pages/student/`):
  - **Home**: Quick metrics, recent request timeline, status indicators.
  - **New Request**: Multi-field form for duty leave submission with document upload UI.
  - **History**: Searchable and filterable table of past requests.
  - **Profile**: Account details and notification preference management.
  - *(Note: Student portal source files are locked and protected per project governance guidelines).*

- **Faculty Portal** (`frontend/src/pages/faculty_portal/`):
  - **Dashboard**: Actionable summary of pending requests requiring review.
  - **Requests**: Review queue supporting single-click approval or rejection with mandatory feedback reason on rejection.
  - **Students**: Student directory with attendance record lookups.
  - **Reports**: Analytical summaries and export capabilities.

- **HOD Portal** (`frontend/src/pages/hod/`):
  - **Dashboard**: High-level department overview (total requests, approval rates, active faculty).
  - **All Requests**: Department-wide request audit log across all faculty and students.
  - **Faculty**: Faculty roster management and review load distribution.
  - **Reports & Settings**: Policy configuration and department export metrics.

---

## 8. Development & Resilience Features

1. **Automated Port Resolution**: If default port `3000` is occupied, the Express server gracefully fails over to `3001` or subsequent open ports.
2. **Client Fallback Logic**: Client API wrapper automatically attempts fallback ports if primary connection fails.
3. **Database Seeding**: On launch, backend database seeder populates default accounts for testing (Students, Faculty, HOD) if collections are empty.
4. **Production Asset Integration**: Express backend serves bundled Vite static assets (`frontend/dist`) with single-page app wildcard routing fallbacks when running in production environment.

---

## 9. Verification & Quality Assurance Plan

- **Automated API Testing**: Health check endpoint `/health` validates uptime and DB readiness.
- **Form Schema Validation**: Zod validators enforce valid date ranges, standard time formats, and mandatory fields.
- **Type Safety**: End-to-end TypeScript interfaces shared logically between backend domain models and frontend API client types.
