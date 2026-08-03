# AttendEase Backend Audit & Bug Fix Report: C3, H1, H2, H3 & Permission Filtering Resolutions

## 1. Executive Summary

This report documents the resolution and verification of **Bug C3**, **Bug H1**, **Bug H2**, **Bug H3**, and the **Permission Pass Isolation & Section/Year Filtering Bug** in the **AttendEase Service**.

- **Reference Architecture Document**: Created [ATTENDANCE_END_TO_END_FLOW.md](file:///c:/Users/chand/Desktop/New%20folder/AttendEase/ATTENDANCE_END_TO_END_FLOW.md) tracing the complete 13-step attendance lifecycle from Faculty Login to Frontend Rendering.
- **Permission Pass Filtering Bug**: Fixed cross-section and cross-department permission leaks where approved permission banners (`X Student(s) have approved permissions...`) and yellow pre-highlights displayed on sections/years with zero matching permissions.
- **Bug C3**: Enforces strict Period Overlap rules at the domain validation level inside serializable database transactions.
- **Bug H1**: Fixes period string parsing robustness (`parsePeriods` handling mixed ranges, comma-separated strings, array inputs, and invalid numbers) and case-insensitive record status sanitization.
- **Bug H2**: Resolves date format validation, prevents future date attendance submissions for all roles, restricts past date attendance submissions to `HOD` and `Admin` roles, and fixes target date parameter propagation in Prisma lock-read and upsert queries.
- **Bug H3**: Scopes attendance lock-reads, ownership checks, and header updates/creations by `year`. Enables `Year 1 + CSIT-A + Period 1`, `Year 2 + CSIT-A + Period 1`, and `Year 3 + CSIT-A + Period 1` to coexist completely independently without database schema changes or data loss.

---

## 2. Permission Pass Filtering Bug Analysis & Resolution

### 2.1 Problem Statement
When an approved permission existed for a student in **Section CSIT-B, 3rd Year**, switching the Faculty Attendance page to **Section CSIT-A** or **2nd Year** (where zero approved permissions existed) continued to display the notification banner:
> *"X Student(s) have approved permissions for Period(s) 1 today..."*
and falsely pre-highlighted unrelated roll numbers in yellow.

### 2.2 Empirical Root Cause
1. **Unfiltered SQL Query**: `/api/requests/public-approved` in `requests.ts` queried `where: { status: 'approved' }` without filtering by `date` or `department`.
2. **Static React Query Key**: In `Attendance.tsx`, `useQuery` relied on a static key `['public-approved-requests-for-attendance']` and called `api.getPublicApprovedRequests()` without passing parameters. Changing Section, Year, or Period never invalidated the React Query cache.
3. **Local Memo Suffix Inflation & Missing Filters**: In `Attendance.tsx`, `permissionStudentsSet` checked `req.date === selectedDate` and period overlap, but failed to filter by `section` or `year`. Furthermore, adding 4 roll number variations per student inflated `permissionStudentsSet.size` and bled into other sections' roll numbers.

### 2.3 Applied Fix
- **Backend (`requests.ts`)**: Updated `GET /api/requests/public-approved` to accept `date` and `department` query parameters and filter results in SQL/memory.
- **API Wrapper (`api.ts`)**: Updated `getPublicApprovedRequests(params)` signature to construct URL query strings for `date`, `section`, `year`, and `department`.
- **Frontend (`Attendance.tsx`)**: Updated React Query key to `['public-approved-requests-for-attendance', selectedDate, sectionFilter, selectedYear, user?.department]`, passed arguments to `api.getPublicApprovedRequests()`, and cleaned roll number parsing.

---

## 3. Regression Test Suite Results

```text
> attendease-backend@1.0.0 test
> tsx --test src/**/*.test.ts

▶ parsePeriods & normalizePeriods (H1 regression)
  ✔ parses single numbers, comma strings, and ranges (2.9551ms)
  ✔ parses mixed ranges and comma-separated period strings (H1) (0.5684ms)
  ✔ parses arrays of mixed formats (0.2983ms)
  ✔ handles empty or invalid inputs gracefully (0.2211ms)
✔ parsePeriods & normalizePeriods (H1 regression) (5.377ms)
▶ assertNoOverlappingPeriodConflict (C3 regression)
  ✔ allows non-overlapping period submissions (0.9126ms)
  ✔ allows owner to update the same periods key (1,2) (0.1787ms)
  ✔ allows owner to update when incoming periods are differently ordered (2,1) (0.2046ms)
  ✔ allows HOD to update the same periods key (0.1889ms)
  ✔ rejects owner submitting a subset period (1) when 1,2 exists (1.2002ms)
  ✔ rejects HOD submitting a single overlapping period (2) when 1,2 exists (0.2995ms)
  ✔ rejects admin submitting a single overlapping period (2) when 1,2 exists (0.1861ms)
  ✔ rejects owner submitting expanded overlap (1,3) when 1,2 exists (0.1534ms)
  ✔ rejects other faculty even when using the exact same periods key (0.2785ms)
  ✔ rejects other faculty submitting a partial overlapping period before ownership is considered (0.1303ms)
  ✔ rejects when two existing submissions would both overlap a combined submit (0.2059ms)
  ✔ handles missing markedBy on existing submission without crashing (0.2394ms)
✔ assertNoOverlappingPeriodConflict (C3 regression) (5.3045ms)
▶ Academic Year Scoping & Coexistence (H3 regression)
  ✔ allows Year 1, Year 2, and Year 3 for CSIT-A + Period 1 to coexist independently (0.3009ms)
✔ Academic Year Scoping & Coexistence (H3 regression) (0.4189ms)

ℹ tests 17 | pass 17 | fail 0
```

### Type Checking
- `backend`: `npx tsc --noEmit` -> Passed (0 errors).
- `frontend`: `npx tsc --noEmit` -> Passed (0 errors).

---

## 4. Summary of Touched Files

- `backend/src/routes/requests.ts` (Added query parameter filtering to `/public-approved`)
- `frontend/src/lib/api.ts` (Updated `getPublicApprovedRequests` parameter signature)
- `frontend/src/pages/faculty_portal/Attendance.tsx` (Dynamic queryKey, query parameters, and roll number set cleanup)
- `backend/src/routes/attendance.ts` (C3, H1, H2, and H3 fixes)
- `backend/src/routes/attendance.overlap.test.ts` (Test suite)
- `ATTENDANCE_END_TO_END_FLOW.md` (Reference Architecture)
- `BACKEND_AUDIT_REPORT.md` (Updated report)

No student portal files (`frontend/src/pages/student/*`) were touched.
