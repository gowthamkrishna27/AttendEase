# AttendEase — Pre-Implementation Codebase & Database Audit Report

**Date:** September 1, 2026  
**Auditor:** Antigravity AI Assistant  
**Status:** Read-Only Audit Completed (Zero Code / DB Modifications Applied)

---

## A. Application Architecture

### 1. Technology Stack
* **Frontend Framework:** React 19 (`react` 19.2.0) with TypeScript, bundled with Vite 8.1.5.
* **Styling & Animation:** TailwindCSS, Tailwind Typography, Framer Motion (`framer-motion` 12.4.7), and Lucide React icons (`lucide-react` 1.16.0).
* **Data Fetching & Cache:** TanStack React Query (`@tanstack/react-query` 5.66.7).
* **Routing:** React Router v7 (`react-router-dom` 7.2.0).
* **Backend Framework:** Node.js (ESM), Express 4.21.2 with TypeScript (`tsx` for dev, `tsc` for production build).
* **Database & ORM:** PostgreSQL (hosted on Supabase / Cloud Postgres) connected via Prisma ORM (`@prisma/client` 7.9.0).
* **Authentication:** JSON Web Tokens (`jsonwebtoken`), password hashing via `bcryptjs`, and WebAuthn Passkeys (`@simplewebauthn/server`).
* **External Integrations:** Nodemailer (SMTP/Gmail for decision emails), WhatsApp URL deep-linking / messaging service.

### 2. Project Directory Structure
```text
AttendEase/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma              # Database schema definitions
│   │   └── migrations/                # Prisma migration history
│   ├── src/
│   │   ├── index.ts                   # Backend entry point, Express configuration
│   │   ├── constants/                 # Canonical sections & system constants
│   │   ├── db/
│   │   │   └── prisma.ts              # PrismaClient singleton instance
│   │   ├── middleware/                # Auth (JWT), rate limiting, error handlers
│   │   ├── routes/                    # Domain API routes (auth, requests, attendance, invigilation, users)
│   │   ├── services/                  # Business logic (rosterService, emailService, whatsappService)
│   │   └── admin/                     # Modular Admin & HOD subsystem
│   │       ├── controllers/           # Controllers for users, students, invigilation, config
│   │       ├── routes/                # Admin route definitions
│   │       ├── services/              # Admin services (invigilation.service, student.service)
│   │       ├── repositories/          # Prisma database abstraction layer
│   │       └── validators/            # Zod validation schemas
│   └── package.json
└── frontend/
    ├── src/
    │   ├── main.tsx                   # React root mount point
    │   ├── App.tsx                    # Route tree & authentication gatekeeper
    │   ├── lib/
    │   │   ├── api.ts                 # Centralized frontend API client
    │   │   └── utils.ts               # Date, time, roll number, format utilities
    │   ├── components/                # Shared layout, modals, headers, icons
    │   └── pages/
    │       ├── Login.tsx              # Student / Faculty / Admin login
    │       ├── Permissions.tsx        # Public Attendance & Permission Slips Viewer
    │       ├── faculty_portal/        # Faculty Attendance, Dashboard, Invigilation Widget
    │       ├── student/               # Student Portal (LOCKED / PROTECTED)
    │       └── admin/                 # HOD / Admin Invigilation, Users, Requests
    └── package.json
```

### 3. Entry Points & Communication Flow
* **Frontend Entry Point:** [frontend/src/main.tsx](file:///c:/Users/chand/Desktop/New%20folder/AttendEase/frontend/src/main.tsx) mounts `App` with `QueryClientProvider` and `BrowserRouter`.
* **Backend Entry Point:** [backend/src/index.ts](file:///c:/Users/chand/Desktop/New%20folder/AttendEase/backend/src/index.ts) initializes Express with security headers (`helmet` style, CORS whitelist), JSON parsers, and mounts route handlers on `/api/*`.
* **Frontend-Backend Communication:** HTTP REST requests using native `fetch` inside [frontend/src/lib/api.ts](file:///c:/Users/chand/Desktop/New%20folder/AttendEase/frontend/src/lib/api.ts). Protected requests automatically attach `Authorization: Bearer <token>` read from `localStorage.getItem('attendease_token')`.
* **Backend-Database Communication:** Prisma ORM via connection pool defined in `DATABASE_URL` / `DIRECT_URL`.

### 4. Authentication & Role Flow
```text
User Submits Credentials (Email / Roll / Faculty ID + Password)
  │
  ▼
POST /api/auth/login (backend/src/routes/auth.ts)
  │
  ├─► Finds user in PostgreSQL `User` table (case-insensitive email OR userId OR rollNumber)
  ├─► Compares password hash via bcrypt (or matches default student/faculty password)
  ├─► Generates signed JWT payload: { id, userId, role, email, department, name }
  └─► Returns JSON: { token, user: { id, userId, name, role, department, designation } }
  │
  ▼
Frontend stores in localStorage: 'attendease_token' & 'attendease_user'
  │
  ├─► If role === 'student'  ──► Redirects to /student
  ├─► If role === 'faculty'  ──► Redirects to /faculty/dashboard
  ├─► If role === 'hod'      ──► Redirects to /faculty/dashboard (with HOD override & review tools)
  └─► If role === 'admin'    ──► Redirects to /admin/dashboard
```

### 5. High-Level Text Data-Flow Diagram
```text
[ User / Browser ]
       │
  (HTTP Requests with Bearer Token)
       ▼
[ Vite React Frontend: lib/api.ts ]
       │
  (REST API /api/*)
       ▼
[ Express Router & Rate Limiter ]
       │
  (verifyToken Middleware)
       ▼
[ Controller / Service Logic (e.g. rosterService, invigilation.service) ]
       │
  (Type-safe Prisma Queries)
       ▼
[ PostgreSQL Database (Supabase) ]
       │
  (Data Rows / Relations)
       ▼
[ Service Formatter / DTO ]
       │
  (JSON Response)
       ▼
[ React Query Cache -> Component State -> DOM Rendering ]
```

---

## B. Database Architecture

### 1. Tables & Models
* **`User`**: Core user entity for all roles (`student`, `faculty`, `hod`, `admin`). Key attributes: `id` (cuid PK), `userId` (unique slug e.g. `stu-23B91A6262`), `name`, `email` (unique), `role` (enum), `department`, `rollNumber`, `year`, `section`, `semester`, `isActive`.
* **`Request`**: Attendance exemption / permission requests submitted by students.
* **`RequestFaculty`**: Join table mapping permission requests to designated faculty reviewers.
* **`RequestAction`**: Immutable audit log of every approval, rejection, or edit on a request.
* **`AttendanceSubmission`**: Record of attendance marked by faculty for a specific section, year, date, and period block.
* **`AttendanceRecord`**: Individual roll status (`present` or `absent`) within an `AttendanceSubmission`.
* **`InvigilationDuty`**: Exam session record created by Admin/HOD.
* **`InvigilationAssignment`**: Join table assigning a specific faculty member (`facultyId` -> `User.id`) to an `InvigilationDuty`.
* **`PermissionRequestShareLink`**: Cryptographically secure token links for read-only request sharing.
* **`UserPasskey`**: FIDO2 / WebAuthn credentials for biometric authentication.
* **`Notification`**: Real-time user notification records.

### 2. Entity Relationships Diagram
```text
┌──────────────┐          1:N          ┌───────────────────────────┐
│     User     │───────────────────────┤   AttendanceSubmission    │
│  (Faculty)   │                       └─────────────┬─────────────┘
└──────┬───────┘                                     │ 1:N
       │                                             ▼
       │ 1:N                           ┌───────────────────────────┐
       ├───────────────────────────────┤     AttendanceRecord      │
       │                               └───────────────────────────┘
       │ 1:N                           ┌───────────────────────────┐
       ├───────────────────────────────┤   InvigilationAssignment  │
       │                               └─────────────┬─────────────┘
       │                                             │ N:1
       │                                             ▼
       │                               ┌───────────────────────────┐
       │                               │     InvigilationDuty      │
       │                               └───────────────────────────┘
       │ 1:N                           ┌───────────────────────────┐
       ├───────────────────────────────┤          Request          │
       │                               └───────────────────────────┘
```

---

## C. Student Grid Investigation

### Student Profile
* **Target Student Registration ID:** `23b91a6262` (stored as uppercase `23B91A6262`)
* **Full Name:** THIRUMALARAJU VENKATA SATYA PAVAN RAJU
* **Database User ID:** `stu-23B91A6262`
* **Department / Branch:** `CSD` (Computer Science & Design)
* **Assigned Section in DB:** `Section A`
* **Assigned Year in DB:** `3rd Year`
* **Assigned Semester in DB:** `6`
* **Active Status:** `isActive: true`
* **Password / Auth:** Active default student credentials present

---

### Root Cause Analysis

Student `23b91a6262` is **not displayed** in both the 3rd Year CSD grid and the 4th Year CSD grid due to **two separate, distinct architectural bottlenecks**:

#### 1. Why `23b91a6262` is excluded from 4th Year CSD Grid
* **Observed Fact:** The student was admitted in 2023 (`23B91A...`). Regular students from the 2023 batch are currently in the **4th Year** (Semesters 7 & 8).
* **Observed Fact:** Student `23b91a6262` was **detained in 3rd Year**. Consequently, in the PostgreSQL `User` table, his record has:
  * `year = "3rd Year"`
  * `semester = 6`
* **The Filtering Logic ([backend/src/services/rosterService.ts](file:///c:/Users/chand/Desktop/New%20folder/AttendEase/backend/src/services/rosterService.ts#L86-L105)):**
  ```typescript
  const yearStudents = allStudents.filter(s => {
    if (s.year) {
      const match = s.year.match(/([1-4])/);
      if (match) return match[1] === targetDigit;
    }
    // ...
  ```
* **Execution for 4th Year (`targetDigit = '4'`):**
  * `s.year` is `"3rd Year"`.
  * `match[1]` is `'3'`.
  * `'3' === '4'` is **`false`**.
  * The condition immediately terminates and excludes `23B91A6262` from the 4th Year student array.
  * In 4th Year CSD-A, the roll list is `['1', '2', ..., '60', '61', '63', '64', 'LE1'...]` — **roll 62 is completely absent**.

#### 2. Why `23b91a6262` is not displayed in 3rd Year CSD Grid
* **Observed Fact:** Because `s.year = "3rd Year"`, the backend roster service **does include** `23B91A6262` in the 3rd Year CSD student query result.
* **The Collision:** In the 3rd Year CSD regular 2024 batch, there is **another student** whose roll number ends in `62`:
  * Student A: `24B91A6262` (YENUGAPALLI DIVYA MADHURI), `3rd Year`, `CSD`, `A`
  * Student B: `23B91A6262` (THIRUMALARAJU VENKATA SATYA PAVAN RAJU), `3rd Year`, `CSD`, `Section A`
* **Suffix Extraction & Collapsing ([backend/src/services/rosterService.ts](file:///c:/Users/chand/Desktop/New%20folder/AttendEase/backend/src/services/rosterService.ts#L137-L148)):**
  ```typescript
  const rawRoll = (s.rollNumber || s.userId || '').trim();
  const suffix = extractRollSuffix(rawRoll); // Both yield "62"
  if (suffix) {
    entry.rollNumbers.add(suffix); // Set<string> deduplicates "62"!
  }
  ```
* **Frontend Keying & Overwrite:**
  * The API returns `rollNumbers: ['1', ..., '61', '62', 'LE1', ...]`. There is only **one** entry for `"62"`.
  * On the frontend ([Permissions.tsx](file:///c:/Users/chand/Desktop/New%20folder/AttendEase/frontend/src/pages/Permissions.tsx) and [Attendance.tsx](file:///c:/Users/chand/Desktop/New%20folder/AttendEase/frontend/src/pages/faculty_portal/Attendance.tsx)), the roll grid renders buttons strictly by the `rollNumbers` array:
    ```tsx
    {currentRollNumbers.map(roll => { ... })}
    ```
  * Only a **single button `62`** is ever rendered on screen.
  * When resolving student names and tooltip info, the frontend uses:
    ```tsx
    studentInfoMap.get(roll.toUpperCase())
    ```
    Where `studentInfoMap` is constructed by iterating `allStudents`:
    ```tsx
    allStudents.forEach(s => {
      const suffix = extractRollSuffix(s.rollNumber);
      map.set(suffix, s); // Overwritten by whichever student is processed last
    });
    ```
  * As a result, button `62` represents only `24B91A6262`. Detained student `23B91A6262` is **shadowed and rendered invisible**.

---

### Evidence from Audit Execution
* Querying PostgreSQL `User` table for `6262`:
  1. `stu-24B91A6262` (YENUGAPALLI DIVYA MADHURI): `year = "3rd Year"`, `department = "CSD"`, `section = "A"`.
  2. `stu-23B91A6262` (THIRUMALARAJU VENKATA SATYA PAVAN RAJU): `year = "3rd Year"`, `department = "CSD"`, `section = "Section A"`.
* Backend Roster API output for 3rd Year CSD-A:
  * `studentCount`: **73**
  * `rollNumbers.length`: **72** (exactly 1 missing due to `Set` collapse on `"62"`)
  * `students` array contains both `23B91A6262` and `24B91A6262` with `suffix: "62"`.
* Backend Roster API output for 4th Year CSD-A:
  * `studentCount`: **70**
  * `rollNumbers`: `['1', ..., '61', '63', '64', ...]` (Roll 62 does not exist).

---

### Does This Issue Affect Other Students?
* Ran full database anomaly scan on all 557 students:
  * **Only 3 students** have roll prefixes that diverge from standard batch years:
    1. `23B91A6262`: CSD (Detained student in 3rd Year)
    2. `25B91A07C7`: CSIT (Enrolled in 3rd Year, prefix 25B)
    3. `25B91A07D0`: CSIT (Enrolled in 3rd Year, prefix 25B)
  * In CSIT, suffixes `C7` and `D0` do NOT collide with any regular 24B student because 24B CSIT ends at `LE13` and has distinct numeric/alpha ranges.
  * Therefore, **`23B91A6262` is currently the ONLY student suffering from a direct roll-button collision**.

---

### Safest Proposed Fix (For Approval)
1. **Clarify Academic Placement:**
   * Student `23B91A6262` is actively enrolled and studying in **3rd Year CSD**. Therefore, his presence belongs in the **3rd Year CSD grid** (his current academic year), NOT 4th Year.
2. **Disambiguate Roll Suffix for Detained / Re-admitted Students:**
   * When generating roll buttons in `rosterService.ts`, check if a student belongs to an earlier batch (e.g. `23B` in 3rd Year).
   * Format his roll token with his batch indicator, e.g. **`23-62`** (or **`D-62`** / `23B62`).
   * This gives student `23B91A6262` his own distinct, clickable button on both the Attendance and Permissions grids, while leaving regular student `24B91A6262` as button `62`.
   * Neither student shadows or overwrites the other, and attendance/permissions can be marked independently.

---

## D. Current Invigilation Schema

### Detailed Field Inspection Table

| Field Name | Current Purpose | Used By | Required Currently? | Proposed Action | Rationale |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `InvigilationDuty.id` | Primary Key (cuid) | All routes & relations | **Yes** | **Keep** | Standard immutable entity ID. |
| `InvigilationDuty.examType` | Enum: `MID`, `SEM`, `LAB`, `SUPPLEMENTARY` | Frontend filters & badges | **Yes** | **Keep / Simplify** | Directly maps to required `Mid/Sem`. |
| `InvigilationDuty.examName` | Freeform title (e.g. "MID-1") | Admin UI, Duty header | No | **Remove / Optional** | Redundant when `examType` is already specified. |
| `InvigilationDuty.subjectName` | Academic subject string | Admin UI, Faculty Card | No | **Remove / Optional** | User requested conceptual reduction. |
| `InvigilationDuty.startDateTime` | Full timestamp (Date + Time) | Calendar bounds, sorting | **Yes** | **Transform / Split** | Convert or map to `Date` and `Morning/Afternoon`. |
| `InvigilationDuty.endDateTime` | Full timestamp (Date + Time) | Expired duty exclusion | **Yes** | **Derive / Transform** | Session determines time window. |
| `InvigilationDuty.blockName` | Building/Block (e.g. "CS Block") | Admin form, Faculty Card | No | **Remove / Optional** | Redundant in minimal schema. |
| `InvigilationDuty.roomNumber` | Room string (e.g. "LH-201") | Admin form, Faculty Card | No | **Remove / Optional** | Redundant in minimal schema. |
| `InvigilationDuty.createdAt` | Audit timestamp | DB metadata | **Yes** | **Keep** | System timestamp. |
| `InvigilationDuty.updatedAt` | Audit timestamp | DB metadata | **Yes** | **Keep** | System timestamp. |
| `InvigilationAssignment.id` | PK of join record | Service, Admin UI | **Yes** | **Keep** | Unique assignment identifier. |
| `InvigilationAssignment.dutyId` | Foreign key -> `InvigilationDuty.id` | Relational join | **Yes** | **Keep** | Connects duty to faculty. |
| `InvigilationAssignment.facultyId` | Foreign key -> `User.id` | Relational join | **Yes** | **Keep** | Links directly to Faculty Master record. |
| `InvigilationAssignment.dutyType` | Role e.g. "Chief Invigilator" | Admin UI modal | No | **Remove / Optional** | Not required in minimal conceptual schema. |

---

## E. Proposed Invigilation Schema

### Minimal Conceptual Target Model

| Field Name | Conceptual Purpose | Target Database Type | Source / Resolution |
| :--- | :--- | :--- | :--- |
| **`date`** | Date of examination duty | `Date` or `String` (`YYYY-MM-DD`) | Stored in `InvigilationDuty` |
| **`examType` (Mid/Sem)** | Examination category (`MID` vs `SEM`) | `ExamType` enum (`MID`, `SEM`) | Stored in `InvigilationDuty` |
| **`session` (Morning/Afternoon)** | Exam timing slot | `SessionType` enum (`MORNING`, `AFTERNOON`) | Stored in `InvigilationDuty` |
| **`facultyCode(s)`** | Assigned Faculty Code(s) | `String` referencing `User.userId` | Linked via `InvigilationAssignment` |
| **`facultyName`** | Faculty Full Name | Dynamically resolved | **Dynamically fetched from `User.name`** (Never stored redundantly in duty tables) |

```text
┌─────────────────────────────────────────────────────────┐
│                    InvigilationDuty                     │
├─────────────────────────────────────────────────────────┤
│ id        : String (cuid, PK)                           │
│ date      : String / Date ("2026-09-02")                │
│ examType  : Enum ("MID", "SEM")                         │
│ session   : Enum ("MORNING", "AFTERNOON")               │
│ createdAt : DateTime                                    │
│ updatedAt : DateTime                                    │
└────────────────────────────┬────────────────────────────┘
                             │ 1:N
                             ▼
┌─────────────────────────────────────────────────────────┐
│                 InvigilationAssignment                  │
├─────────────────────────────────────────────────────────┤
│ id          : String (cuid, PK)                         │
│ dutyId      : String (FK -> InvigilationDuty.id)        │
│ facultyCode : String (FK -> User.userId e.g. fac-001)   │
└────────────────────────────┬────────────────────────────┘
                             │ N:1
                             ▼
┌─────────────────────────────────────────────────────────┐
│                    User (Faculty)                       │
├─────────────────────────────────────────────────────────┤
│ userId      : String ("fac-csit-006")                   │
│ name        : String ("P Manoj")                        │
│ department  : String ("CSIT")                           │
└─────────────────────────────────────────────────────────┘
```

---

## F. Data Migration Plan (Non-Destructive)

### Phase 1: Pre-Migration Database State
* **Current Active Records:**
  * Exactly **1 record** exists in `InvigilationDuty` (`id: "cmtig5owq00ib1vbsws58zrjt"`).
  * Exactly **1 record** exists in `InvigilationAssignment` (`id: "cmtig5p1z00ic1vbsi52kffm4"`).
* **Risk of Data Loss:** Exceptionally low due to minimal existing production records.

### Phase 2: Recommended Safe Migration Steps
1. **Additive Schema Migration:**
   * Add new optional columns:
     * `date` (String or Date)
     * `session` (Enum: `MORNING`, `AFTERNOON`)
     * `facultyCode` on `InvigilationAssignment` (referencing `User.userId`)
   * Retain old columns (`startDateTime`, `endDateTime`, `subjectName`, `roomNumber`, `blockName`) temporarily.
2. **Backfill Existing Data:**
   * Script computes:
     * `date = formatKolkataDate(startDateTime)`
     * `session = startHour < 12 ? 'MORNING' : 'AFTERNOON'`
     * `facultyCode = User.userId` resolved from `facultyId`.
3. **Application & API Update:**
   * Update backend controllers, services, and frontend pages to read and write the new minimal fields.
   * Verify dynamic faculty name resolution works across both Faculty and HOD portals.
4. **Final Deprecation:**
   * After verification, drop obsolete columns in a separate subsequent migration.

---

## G. Files Requiring Changes

### Category 1: Student Grid Collision Fix
1. [backend/src/services/rosterService.ts](file:///c:/Users/chand/Desktop/New%20folder/AttendEase/backend/src/services/rosterService.ts):
   * **Reason:** Disambiguate roll suffix extraction when earlier batch students (e.g. `23B`) exist in the same section as current batch students (`24B`), preventing `Set<string>` deduplication collapse.
2. [frontend/src/pages/Permissions.tsx](file:///c:/Users/chand/Desktop/New%20folder/AttendEase/frontend/src/pages/Permissions.tsx):
   * **Reason:** Ensure `studentInfoMap` keys on the full disambiguated roll token rather than purely the 2-digit suffix.
3. [frontend/src/pages/faculty_portal/Attendance.tsx](file:///c:/Users/chand/Desktop/New%20folder/AttendEase/frontend/src/pages/faculty_portal/Attendance.tsx):
   * **Reason:** Ensure faculty roll grid buttons correctly render and map to the detained student.

### Category 2: Invigilation Schema Reduction
1. [backend/prisma/schema.prisma](file:///c:/Users/chand/Desktop/New%20folder/AttendEase/backend/prisma/schema.prisma):
   * **Reason:** Update `InvigilationDuty` and `InvigilationAssignment` models to minimal conceptual structure (`date`, `session`, `examType`, `facultyCode`).
2. [backend/src/admin/types/invigilation.types.ts](file:///c:/Users/chand/Desktop/New%20folder/AttendEase/backend/src/admin/types/invigilation.types.ts):
   * **Reason:** Simplify TypeScript types and DTO interfaces to match minimal fields.
3. [backend/src/admin/validators/invigilation.validator.ts](file:///c:/Users/chand/Desktop/New%20folder/AttendEase/backend/src/admin/validators/invigilation.validator.ts):
   * **Reason:** Update Zod validation schemas for duty creation and updates.
4. [backend/src/admin/services/invigilation.service.ts](file:///c:/Users/chand/Desktop/New%20folder/AttendEase/backend/src/admin/services/invigilation.service.ts):
   * **Reason:** Update query and creation logic; dynamically resolve faculty names from `User.userId`.
5. [backend/src/admin/controllers/invigilation.controller.ts](file:///c:/Users/chand/Desktop/New%20folder/AttendEase/backend/src/admin/controllers/invigilation.controller.ts):
   * **Reason:** Adapt controller requests and responses.
6. [backend/src/routes/invigilation.ts](file:///c:/Users/chand/Desktop/New%20folder/AttendEase/backend/src/routes/invigilation.ts):
   * **Reason:** Update `GET /api/invigilation/my-duties` to return `{ date, examType, session }`.
7. [frontend/src/lib/api.ts](file:///c:/Users/chand/Desktop/New%20folder/AttendEase/frontend/src/lib/api.ts):
   * **Reason:** Update frontend API contracts and types.
8. [frontend/src/pages/admin/Invigilation.tsx](file:///c:/Users/chand/Desktop/New%20folder/AttendEase/frontend/src/pages/admin/Invigilation.tsx):
   * **Reason:** Simplify HOD assignment form (Date, Mid/Sem, Morning/Afternoon, Faculty Code selector).
9. [frontend/src/pages/faculty_portal/components/UpcomingInvigilationWidget.tsx](file:///c:/Users/chand/Desktop/New%20folder/AttendEase/frontend/src/pages/faculty_portal/components/UpcomingInvigilationWidget.tsx):
   * **Reason:** Simplify widget display to show Date, Mid/Sem, Morning/Afternoon.

---

## H. API Changes

### 1. Duty Creation (`POST /api/admin/invigilation`)

#### Current Payload
```json
{
  "examType": "MID",
  "examName": "MID-1 Examination",
  "subjectName": "Machine Learning",
  "startDateTime": "2026-09-02T04:00:00.000Z",
  "endDateTime": "2026-09-02T06:30:00.000Z",
  "blockName": "CS Block",
  "roomNumber": "LH-201",
  "assignedFaculty": [
    { "facultyId": "fac-csit-006", "dutyType": "Room Invigilator" }
  ]
}
```

#### Proposed Minimal Payload
```json
{
  "date": "2026-09-02",
  "examType": "MID",
  "session": "MORNING",
  "facultyCodes": ["fac-csit-006"]
}
```

---

### 2. Faculty Duties Query (`GET /api/invigilation/my-duties`)

#### Current Response
```json
{
  "duties": [
    {
      "id": "cmtig5owq00ib1vbsws58zrjt",
      "examType": "MID",
      "examName": "MID-1 Examination",
      "subjectName": "Machine Learning",
      "startDateTime": "2026-09-02T04:00:00.000Z",
      "endDateTime": "2026-09-02T06:30:00.000Z",
      "blockName": "CS Block",
      "roomNumber": "LH-201",
      "dutyType": "Room Invigilator",
      "status": "UPCOMING"
    }
  ]
}
```

#### Proposed Minimal Response
```json
{
  "duties": [
    {
      "id": "cmtig5owq00ib1vbsws58zrjt",
      "date": "2026-09-02",
      "examType": "MID",
      "session": "MORNING",
      "status": "UPCOMING"
    }
  ]
}
```

---

### 3. HOD Duty List Query (`GET /api/admin/invigilation`)

#### Proposed Minimal Response
```json
{
  "duties": [
    {
      "id": "cmtig5owq00ib1vbsws58zrjt",
      "date": "2026-09-02",
      "examType": "MID",
      "session": "MORNING",
      "assignedFaculty": [
        {
          "facultyCode": "fac-csit-006",
          "name": "P Manoj",
          "department": "CSIT"
        }
      ]
    }
  ]
}
```
*(Note: Faculty name `P Manoj` is fetched dynamically from the `User` table on query, never stored redundantly in `InvigilationDuty`)*

---

## I. Database Changes

### Current vs Proposed Prisma Schema

```diff
 enum ExamType {
   MID
   SEM
   LAB
   SUPPLEMENTARY
 }
 
+enum SessionType {
+  MORNING
+  AFTERNOON
+}
 
 model InvigilationDuty {
   id            String                    @id @default(cuid())
-  examName      String
-  subjectName   String
-  startDateTime DateTime
-  endDateTime   DateTime
-  blockName     String
-  roomNumber    String
+  date          String                    // YYYY-MM-DD
+  examType      ExamType                  // MID or SEM
+  session       SessionType               // MORNING or AFTERNOON
   createdAt     DateTime                  @default(now())
   updatedAt     DateTime                  @updatedAt
 
   assignments   InvigilationAssignment[]
 
-  @@index([startDateTime])
-  @@index([endDateTime])
+  @@index([date])
+  @@index([examType, session])
 }
 
 model InvigilationAssignment {
   id          String            @id @default(cuid())
   dutyId      String
-  facultyId   String            // references User.id
-  dutyType    String?
+  facultyCode String            // references User.userId (Faculty Code)
   createdAt   DateTime          @default(now())
   updatedAt   DateTime          @updatedAt
 
   duty        InvigilationDuty  @relation(fields: [dutyId], references: [id], onDelete: Cascade)
-  faculty     User              @relation(fields: [facultyId], references: [id], onDelete: Restrict)
+  faculty     User              @relation(fields: [facultyCode], references: [userId], onDelete: Restrict)
 
-  @@unique([dutyId, facultyId])
-  @@index([facultyId])
+  @@unique([dutyId, facultyCode])
+  @@index([facultyCode])
   @@index([dutyId])
 }
```

---

## J. Risk Assessment

| Proposed Change Area | Risk Level | Rationale | Mitigation Strategy |
| :--- | :---: | :--- | :--- |
| **Student Suffix Disambiguation (`23-62`)** | **LOW** | Pure algorithmic change in suffix derivation; does not modify DB records or affect any other regular student. | Verified via automated regression suite before merge. |
| **Invigilation Schema Reduction** | **MEDIUM** | Touches database schema, admin controllers, faculty widgets, and validation schemas. | Two-phase non-destructive migration; existing 1 record safely backfilled. |
| **Faculty Login API Adaptation** | **LOW** | Simplified response format; straightforward payload reduction. | Local build verification and test suite execution. |

---

## K. Verification Checklist

Before deploying any changes to production, the following verification suite must pass:

- [ ] **Student 23b91a6262 Visibility:**
  - [ ] 3rd Year CSD grid displays both button `62` (for `24B91A6262`) and button `23-62` (for `23B91A6262`).
  - [ ] Clicking button `23-62` reveals student `THIRUMALARAJU VENKATA SATYA PAVAN RAJU`.
  - [ ] Attendance marking on `23-62` does not affect `62` or vice versa.
  - [ ] 4th Year CSD grid remains stable with its canonical 70 students without errors.
- [ ] **Invigilation Assignment (HOD):**
  - [ ] HOD can assign an invigilation duty by selecting Date, Mid/Sem, Morning/Afternoon, and Faculty Code(s).
  - [ ] Submission succeeds and duty is persisted with relational foreign key to `User.userId`.
  - [ ] HOD table displays the assigned faculty code and dynamically joined faculty name.
- [ ] **Invigilation Display (Faculty):**
  - [ ] Logged-in faculty portal (`/faculty/dashboard`) displays Date, Mid/Sem, and Morning/Afternoon.
  - [ ] No redundant room/block/subject errors appear.
- [ ] **Data Integrity & Build:**
  - [ ] `npm run build` passes with 0 TypeScript errors in `backend`.
  - [ ] `npm run build` passes with 0 Vite errors in `frontend`.
  - [ ] All database foreign key constraints remain intact.

---

## L. Questions / Missing Information

The following items cannot be determined automatically and should be confirmed by you before execution:

1. **Roll Button Label Preference:**  
   For detained student `23B91A6262` in the 3rd Year CSD grid, which visual label is preferred for his button?
   * Option A: **`23-62`** (Indicates 2023 batch, roll 62)
   * Option B: **`D-62`** (Indicates Detained, roll 62)
   * Option C: **`23B62`** (Shortened registration string)
2. **Session Times Mapping:**  
   For the Morning/Afternoon sessions, should the application define standard fixed time windows for calendar boundaries (e.g., Morning = 9:30 AM – 12:30 PM, Afternoon = 1:30 PM – 4:30 PM)?
