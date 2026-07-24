# Admin Module — Developer Reference

## Environment Variables

All admin-module config is declared in `src/admin/config/admin.config.ts`.
The table below lists every variable the module reads. Add these to your `.env` file.

| Variable | Default | Description |
|---|---|---|
| `BCRYPT_SALT_ROUNDS` | `12` | bcrypt work factor. Higher = slower hash, more secure. Don't go below 10 in production. |
| `PASSWORD_MIN_LENGTH` | `8` | Minimum character length enforced on all password changes. |
| `PASSWORD_REQUIRE_UPPERCASE` | `true` | When `true`, passwords must contain at least one uppercase letter. |
| `PASSWORD_REQUIRE_NUMBER` | `true` | When `true`, passwords must contain at least one numeric digit. |
| `MAX_IMPORT_FILE_SIZE_MB` | `10` | Maximum allowed upload size for the Excel/CSV import endpoint, in megabytes. |
| `IMPORT_DUPLICATE_STRATEGY` | `skip` | How to handle rows whose roll number already exists. `skip` = preserve existing record and log it. `upsert` = overwrite existing record with incoming data. |

---

## Folder Structure

```
src/admin/
├── config/
│   └── admin.config.ts       ← single source for all runtime config
├── types/
│   ├── student.types.ts      ← Student interfaces & response shapes
│   ├── user.types.ts         ← User interfaces & response shapes
│   └── import.types.ts       ← ImportReport, ImportRowError
├── validators/
│   ├── student.validator.ts  ← Zod: create/update/list schemas
│   ├── user.validator.ts     ← Zod: user CRUD + password schemas
│   └── import.validator.ts   ← column mapping + row validation
├── repositories/
│   ├── student.repository.ts ← all Mongoose calls for students
│   └── user.repository.ts    ← all Mongoose calls for users
├── services/
│   ├── password.service.ts   ← hash, verify, enforce policy
│   ├── student.service.ts    ← uniqueness guards, pagination
│   ├── user.service.ts       ← last-admin guard, password reset
│   └── import.service.ts     ← Excel parse → validate → batch insert
├── controllers/
│   ├── student.controller.ts
│   ├── user.controller.ts
│   ├── password.controller.ts
│   └── import.controller.ts
├── routes/
│   ├── student.routes.ts
│   ├── user.routes.ts
│   ├── password.routes.ts
│   └── import.routes.ts
└── index.ts                  ← admin aggregate router, mounted at /api/admin
```

---

## API Endpoints

All endpoints require `Authorization: Bearer <token>`.
All endpoints except `PATCH /api/admin/users/me/password` require an admin-role JWT.

### Student CRUD

| Method | Path | Query Params | Description |
|---|---|---|---|
| `GET` | `/api/admin/students` | `page`, `pageSize`, `search`, `department`, `semester` | Paginated student list |
| `GET` | `/api/admin/students/:id` | — | Single student by userId |
| `POST` | `/api/admin/students` | — | Create student |
| `PUT` | `/api/admin/students/:id` | — | Update student fields |
| `DELETE` | `/api/admin/students/:id` | — | Soft-delete (sets `isActive=false`) |

### Bulk Import

| Method | Path | Body | Description |
|---|---|---|---|
| `POST` | `/api/admin/students/import` | `multipart/form-data` field: `file` | Import from `.xlsx` or `.csv` |

### User Management

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/admin/users` | List all active users |
| `POST` | `/api/admin/users` | Create user |
| `PUT` | `/api/admin/users/:id` | Update user |
| `DELETE` | `/api/admin/users/:id` | Soft-delete user (blocks if last admin) |

### Password Management

| Method | Path | Who | Body |
|---|---|---|---|
| `PATCH` | `/api/admin/users/me/password` | Any authenticated user | `{ currentPassword, newPassword }` |
| `PATCH` | `/api/admin/users/:id/password` | Admin only | `{ newPassword }` |

---

## Excel / CSV Import

### How to run it

```bash
curl -X POST http://localhost:3000/api/admin/students/import \
  -H "Authorization: Bearer <admin-token>" \
  -F "file=@students.xlsx"
```

### Expected Excel template

| Roll Number | Full Name | Email | Department | Semester | Gender | Avatar URL |
|---|---|---|---|---|---|---|
| 24B91A0701 | Arjun Sharma | 24b91a0701@college.edu | CSIT | 6 | Male | _(optional)_ |

- Column headers are matched **case-insensitively**.
- The expected column names come from `importConfig.excelColumnMap` in `admin.config.ts`. Change the map there — not in the code.
- The first worksheet in the workbook is always used.
- Completely empty rows are silently skipped.
- `Avatar URL` is optional; all other columns are required.
- `Semester` must be a number between 1 and 10.
- Default password for each imported student is their roll number (they should change it on first login).

### Error report shape

The endpoint always returns HTTP 200. Check the `failed` array to identify rows that weren't imported.

```json
{
  "import": {
    "inserted": 87,
    "skipped": 3,
    "upserted": 0,
    "failed": [
      {
        "row": 12,
        "rollNumber": "24B91A0799",
        "reason": "Duplicate roll number (skipped — existing record preserved)"
      },
      {
        "row": 45,
        "rollNumber": "",
        "reason": "rollNumber: Roll number cannot be empty; email: Must be a valid email address"
      }
    ]
  }
}
```

- `inserted`: rows successfully added to the DB.
- `skipped`: rows whose roll number already existed (strategy=`skip`).
- `upserted`: rows overwritten in-place (strategy=`upsert`).
- `failed[]`: all rows not inserted, including validation failures and skips. Each entry includes the 1-indexed `row` number (row 1 = header, so data rows start at 2), the `rollNumber` if parseable, and a human-readable `reason`.

---

## Soft Delete

Students and users are soft-deleted (`isActive: false`) — records are retained in MongoDB for audit purposes. All list queries automatically exclude inactive records. There is currently no restore endpoint; reactivate via the `PUT /api/admin/users/:id` endpoint by setting `isActive: true` directly in the DB if needed.

---

## Password Policy

Passwords are validated by the Zod schema in `user.validator.ts`, which reads policy from `passwordConfig` (from `admin.config.ts`). Change the env vars — don't touch the validator code — to adjust policy.

**Student default passwords**: each imported/created student's initial password is their roll number. They should change it on first login via `PATCH /api/admin/users/me/password`.
