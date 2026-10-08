// Invigilation Hours — isolated data layer (frontend placeholder)
//
// This file is the single source of truth for invigilation-related types and
// data access. The page and components only depend on the typed functions
// exported here.
//
// The current implementation is a *placeholder* — no data is shipped with the
// frontend, no mock list is maintained here, and the mutating helpers throw
// until the backend team wires the real endpoints. When the API is ready,
// replace each function body with a `fetch` / `apiFetch` call to the
// corresponding route. Call-sites in the page and components will not need to
// change.

// ─── Branches (UI-only filter / form values) ───────────────────────────────
//
// These are the labels shown in the Branch dropdown. CSD and CSIT are the only
// branches exposed for invigilation in this version; the backend may return a
// richer list of branches later.
export const INVIGILATION_BRANCHES = ['CSD', 'CSIT'] as const;
export type InvigilationBranch = (typeof INVIGILATION_BRANCHES)[number];

// ─── Invigilation types ────────────────────────────────────────────────────
export const INVIGILATION_TYPES = ['MID', 'SEM', 'Other Duties'] as const;
export type InvigilationType = (typeof INVIGILATION_TYPES)[number];

// ─── Faculty record (the dropdown data) ────────────────────────────────────
export interface InvigilationFaculty {
  id: string;
  name: string;
  branch: InvigilationBranch;
  email?: string;
  designation?: string;
  avatarUrl?: string;
}

// ─── Assignment record (the table row) ─────────────────────────────────────
export interface InvigilationAssignment {
  id: string;
  facultyId: string;
  facultyName: string;
  branch: InvigilationBranch;
  type: InvigilationType;
  /** Required only when `type === 'Other Duties'`. */
  otherDutyDescription?: string;
  date: string;       // YYYY-MM-DD
  startTime: string;  // HH:mm
  endTime: string;    // HH:mm
  roomNo?: string;
  block?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AssignmentInput {
  facultyId: string;
  branch: InvigilationBranch;
  type: InvigilationType;
  otherDutyDescription?: string;
  date: string;
  startTime: string;
  endTime: string;
  roomNo?: string;
  block?: string;
}

// ─── Read endpoints (placeholders) ──────────────────────────────────────────

/** Placeholder — will hit the backend's faculty list endpoint. */
export async function listInvigilationFaculty(): Promise<InvigilationFaculty[]> {
  // TODO(invigilation-api): replace with real API call.
  return [];
}

/** Placeholder — will hit the backend's assignments endpoint. */
export async function listInvigilationAssignments(): Promise<InvigilationAssignment[]> {
  // TODO(invigilation-api): replace with real API call.
  return [];
}

/** Placeholder — will hit the backend's faculty-scoped assignments endpoint. */
export async function listInvigilationAssignmentsForFaculty(
  _facultyId: string
): Promise<InvigilationAssignment[]> {
  // TODO(invigilation-api): replace with real API call.
  return [];
}

// ─── Mutating endpoints (placeholders) ──────────────────────────────────────

/** Throws until the backend endpoint is wired. */
export async function createInvigilationAssignment(
  _input: AssignmentInput
): Promise<InvigilationAssignment> {
  throw new Error('Invigilation API not implemented yet. Please wire the backend endpoint first.');
}

/** Throws until the backend endpoint is wired. */
export async function deleteInvigilationAssignment(_id: string): Promise<boolean> {
  throw new Error('Invigilation API not implemented yet. Please wire the backend endpoint first.');
}

// ─── Pure utilities (no data, safe to keep) ─────────────────────────────────

export function formatDate(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso + 'T00:00:00');
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}
