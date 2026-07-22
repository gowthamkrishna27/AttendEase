# AttendEase

A premium, minimalist attendance permission web app for students, faculty, and heads of department — built with React, Vite, TypeScript, and Tailwind CSS.

---

## Features

### 🎓 Student Portal
- Submit attendance permission requests (Internship, Medical, Sports, Competition, etc.)
- Drag-and-drop document upload (PDF / Image)
- View request history with search & status filters
- Request details with approval timeline
- Profile page

### 👩‍🏫 Faculty Portal
- Inbox view of all pending student requests
- Search by name/reason, filter by department
- Hover-to-reveal **Approve / Reject** actions on desktop
- Full request detail view with confirmation modal before action

### 🛡️ HOD Portal
- Department-level overview across all faculty
- Summary counts (Total / Pending / Approved / Rejected)
- Faculty at-a-glance cards
- Full searchable & filterable request table

### 🔐 Login Portal
- Single unified **Login Portal** at `/login`
- Three-tab switcher: **Student · Faculty · HOD**
- Role-based protected routing — wrong-role access redirects automatically
- Password visibility toggle + demo credential hints

---

## Tech Stack

| Package | Purpose |
|---|---|
| [React 19](https://react.dev) + [Vite](https://vitejs.dev) | Core framework & dev server |
| [TypeScript](https://www.typescriptlang.org) | Type safety |
| [Tailwind CSS](https://tailwindcss.com) | Utility-first styling with custom design tokens |
| [Framer Motion](https://www.framer.com/motion) | Page transitions & micro-animations |
| [React Router DOM v7](https://reactrouter.com) | Client-side routing & protected routes |
| [React Hook Form](https://react-hook-form.com) + [Zod](https://zod.dev) | Form state & validation |
| [TanStack Query](https://tanstack.com/query) | Data-fetching layer (ready for API integration) |
| [Lucide React](https://lucide.dev) | Icons |
| [date-fns](https://date-fns.org) | Date formatting utilities |

---

## Project Structure

```
src/
├── components/
│   ├── ui/             # Button, Input, Textarea, Select
│   ├── layout/         # Navbar, PageWrapper, LoginLayout
│   ├── shared/         # StatusBadge, Avatar, Modal, Toast, Skeleton, EmptyState
│   └── forms/          # UploadArea
├── context/
│   └── AuthContext.tsx  # Auth state, useAuth hook, mock credentials
├── data/
│   └── mock.ts          # Mock students, faculty, HOD, requests
├── lib/
│   └── utils.ts         # cn(), date/time formatters, constants
├── pages/
│   ├── auth/            # LoginPortal (unified)
│   ├── student/         # Home, NewRequest, RequestSuccess, History, RequestDetails, Profile
│   ├── faculty/         # Dashboard, RequestDetails
│   └── hod/             # Dashboard, RequestDetails
├── types/
│   └── index.ts         # TypeScript interfaces
├── App.tsx              # Router, AuthProvider, ProtectedRoute
└── main.tsx
```

---

## Getting Started

### Prerequisites
- Node.js 18+
- npm 9+

### Install & Run

```bash
# Clone the repo
git clone <your-repo-url>
cd permitcs

# Install dependencies
npm install

# Start dev server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Build for Production

```bash
npm run build
```

Output goes to the `dist/` folder.

---

## Demo Credentials

> All credentials are mock — no real authentication is implemented in this version.

| Role | Field | Value | Password |
|---|---|---|---|
| **Student** | Roll Number | `21CS047` | `student123` |
| **Faculty** | Email | `priya.nair@college.edu` | `faculty123` |
| **HOD** | Email | `hod.cs@college.edu` | `hod123` |

---

## Design System

| Token | Value |
|---|---|
| Background | `#FAFAFA` |
| Surface | `#FFFFFF` |
| Primary Text | `#111111` |
| Secondary Text | `#6B7280` |
| Border | `#E5E7EB` |
| Success | `#22C55E` |
| Warning | `#F59E0B` |
| Danger | `#EF4444` |
| Font | Inter (Google Fonts) |
| Border radius | 16px |
| Max content width | 1200px |
| Spacing system | 8px grid |

---

## Routes

| Path | Role | Description |
|---|---|---|
| `/` | Public | Landing page |
| `/login` | Public | Unified Login Portal (Student / Faculty / HOD tabs) |
| `/student` | Student | Home — greeting + recent requests |
| `/student/new-request` | Student | Submit a new request |
| `/student/success` | Student | Submission confirmation |
| `/student/history` | Student | Full request history |
| `/student/request/:id` | Student | Request details + approval timeline |
| `/student/profile` | Student | Profile & logout |
| `/faculty` | Faculty | Pending requests inbox |
| `/faculty/request/:id` | Faculty | Review + approve/reject |
| `/hod` | HOD | Department overview |
| `/hod/request/:id` | HOD | Read-only request detail |

---

## Roadmap

- [ ] Backend API integration (REST / GraphQL)
- [ ] Real authentication (JWT / OAuth)
- [ ] Push / email notifications on status change
- [ ] HOD approve/override capability
- [ ] PDF export of approved requests
- [ ] Dark mode
- [ ] Mobile app (React Native)

---

## License

MIT © 2026 AttendEase
