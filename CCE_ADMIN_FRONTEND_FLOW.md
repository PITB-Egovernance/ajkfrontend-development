# CCE (Combined Competitive Exams) — Admin Frontend Flow

**Status: Phase 1 implemented.** Steps 3-8 sections below are marked **Planned — later phase**.

**Workspaces involved in the CCE module overall:**
- Admin backend — `ajkBackend-Development`
- Admin frontend (this repo) — `ajkfrontend-development`
- Candidate backend — `candidate-ajkpsc-backend-development`
- Candidate frontend — `candidate-ajkpsc-frontend-development`

All APIs referenced in this document are **Admin Backend APIs**, called by this admin frontend only. See `CCE_CANDIDATE_FRONTEND_FLOW.md` (candidate frontend repo) for the parallel candidate-facing flow.

---

## Module Overview

CCE reuses the existing Roll Number Slip wizard for its screening stage, then adds admin-only screens for results and (in later phases) subject-selection oversight and date-sheet management.

---

## Roll Number Slip Page — CCE Option Flow *(shipped, pre-existing)*

`cce-exams` was already wired into `src/pages/roll-numbers/RollNumberExamFlow.jsx`'s `examTypeMeta` before this module — CCE appears as a selectable exam type exactly like One Paper MCQs, Two Paper MCQs, and Written Exams, reached via the sidebar (`Roll Number Management → CCE Screening Roll Numbers`, `src/config/sidebarMenu.js`) and routed at `/dashboard/roll-numbers/exam/cce-exams`.

**This phase's changes here:**
1. Relabeled the CCE entry from generic "CCE Exam" to "Screening Exam" terminology (title, badge, description, paper label) so the UI clearly frames this as *Stage 1: Screening* rather than a standalone CCE exam.
2. Fixed the "no test-type match" fallback in `fetchData()` — it used to fall back to showing *every* advertisement/post (of any exam type) if none were tagged with the current exam type's test type, to avoid locking out admins whose data wasn't tagged yet. That fallback is now disabled specifically for `cce-exams`, so the CCE Screening Roll Numbers section only ever lists posts/advertisements explicitly tagged with a CCE test type — never posts belonging to One Paper MCQs, Two Paper MCQs, or Written Exams. Other exam types keep the fallback unchanged.

Roll number **prefix** support for CCE required no new routes — `src/config/sidebarMenu.js` / `src/App.jsx` already route CCE screening through the shared `RollNumberExamFlow.jsx` (prefix input + `DEFAULT_ROLL_PREFIXES['cce-exams'] = 'CCE'`), and `src/pages/settings/RollNumberPrefixes/RollNumberPrefixes.jsx` already lists/edits a `cce-exams` row generically (backed by the admin API's `RollNumberExamTypeConfig`/`CandidateRollNumberAllocator::EXAM_TYPES`, which already includes `cce-exams`).

**Known limitation:** this filter only works once an advertisement's job posts have actually been tagged with a Test Type whose `exam_category` is `combined_competitive_exam` (set per-post in `AdvertisementCreateForm.jsx`'s "Test Type" dropdown at advertisement-creation time). If no post has ever been tagged this way, the CCE Screening section will correctly show an empty state rather than falling back to other exam types' posts — that is the intended (fixed) behavior, not a bug.

## Candidate Listing Flow, Center Allocation, Screening Roll Number Generation *(shipped, pre-existing)*

Entirely unchanged — CCE candidates flow through the exact same stage-1 (select posts/candidates) → stage-2 (center allocation, date/time, prefix, Generate) → stage-3 (success summary) wizard already documented for One Paper MCQs, including the queue-job-backed generation (`RollNumberApi.generateSlips` → poll `getGenerationStatus` → same result shape) and the navigation-lock/`fieldset disabled` behavior built for that flow. No CCE-specific frontend code was needed for this part.

---

## Screening Result Pass/Fail Flow *(shipped)*

**Page:** `src/pages/cce/CceScreeningResults.jsx`, routed at `/dashboard/cce/screening` (`src/App.jsx`), reached via sidebar entry `Roll Number Management → CCE Screening Results` (`src/config/sidebarMenu.js`).

**Modeled on:** `src/pages/results/VerificationPage.jsx` for the pass/fail pill semantics and status-toggle filter bar, and `src/pages/award-list/AwardListDetail.jsx` for the publish confirmation gate (`components/ui/ConfirmDelete.jsx`'s `confirmDelete()` helper, repurposed for a non-destructive "Publish" confirmation rather than delete).

**Behavior:**
1. Admin picks an advertisement from a dropdown (`RollNumberApi.getAdvertisements`).
2. Table lists that advertisement's CCE screening candidates (candidate name, CNIC, application number, roll number, status pill, published timestamp) — auto-synced server-side from already-roll-numbered candidates on every load (no separate "sync" button needed).
3. Row checkboxes (disabled once a row is published — a published row is locked) feed a bulk-action bar: **Mark Pass** / **Mark Fail** / **Mark Pending**, and **Publish Selected**.
4. **Publish Selected** opens a `confirmDelete()`-style modal ("This action cannot be undone") before calling the publish API — publishing locks the selected rows and triggers candidate notification/email/SMS server-side.

**API file:** `src/api/cceScreeningApi.js` — `list(advertisementId, {status, search, per_page, page})`, `bulkSetStatus(ids, status)`, `publish(ids)`. Follows `src/api/rollNumberApi.js`'s exact conventions (`fetch`, `getAdminHeaders`/`handleResponse`, same 404-hints-at-stale-route-cache message).

### API integration details

| Method | Endpoint | Used for |
|---|---|---|
| `GET` | `/cce/screening?advertisement_id={hash}&status=&search=&per_page=` | Load the table |
| `POST` | `/cce/screening/bulk-status` `{ids, status}` | Mark Pass/Fail/Pending |
| `POST` | `/cce/screening/publish` `{ids}` | Publish |

All three require the same admin auth headers (`Authorization: Bearer`, `X-API-KEY`) as every other admin-frontend API call — no new auth pattern introduced.

### State management

Plain `useState`/`useEffect`/`useCallback` — matches this codebase's convention everywhere (no Redux/React Query anywhere in the app). `rows`, `selectedIds`, `statusFilter`, `search`, `advertisementId`, `loading`, `busy` are all local component state; nothing is shared globally.

### Button enable/disable conditions

- Row checkbox: disabled when `row.published_at` is set (published rows are immutable).
- Bulk-action bar: only rendered when `selectedIds.length > 0`.
- Set Pass/Fail/Pending and Publish buttons: disabled while a request (`busy`) is in flight.

### Error/success message handling

`react-hot-toast`, matching every other admin page — `toast.success(...)` on successful bulk-status/publish, `toast.error(err?.message || '...')` on failure, consistent with `RollNumberExamFlow.jsx`'s error handling.

---

## Subject Selection Submitted Candidates List *(Planned — Phase 3)*

Will follow `src/pages/roll-numbers/RollNumberManagement.jsx`'s pattern (MUI `TooltipDataGrid` + `AdvancedFilter`) rather than the plain-`<table>` approach used for Screening Results, since this listing is expected to need richer column filtering (screening status, subject-selection status, submission date range) — closer in shape to `ApplicationsList.jsx`'s status-pill columns.

## Master Date Sheet Create/Edit Screen *(Planned — Phase 4)*

Will extract the written-exam per-subject scheduler UI already embedded in `RollNumberExamFlow.jsx` (subject dropdown + date/start-time/duration inputs + committed-rows table, `writtenExamSchedules` state) into a standalone, reusable "schedule builder" component, extended with a Day column (derived from the picked date) and a Compulsory/Optional type selector per row.

## Date Sheet Publish Screen *(Planned — Phase 4)*

Will follow `src/pages/award-list/AwardListDetail.jsx`'s `published_at` + `Chip` Draft/Published pattern, optionally layered with `src/pages/results/PublicationPage.jsx`'s pre-publish checklist gate (e.g. "every scheduled subject has a date and time").

## Schedule Change Request Screen *(Planned — Phase 5)*

Will follow `src/pages/results/PublicationPage.jsx`'s "mandatory typed reason" withdrawal-style confirmation pattern for the change-request justification field.

---

## Components Reused from Existing MCQs/Written Roll Number Flow

- `components/ui/Button.jsx`, `Card.jsx`/`CardContent`, `Loader.jsx` (`InlineLoader`), `ConfirmDelete.jsx` — used as-is in `CceScreeningResults.jsx`.
- `RollNumberApi.getAdvertisements()` — reused for the advertisement picker, no new endpoint needed.
- Sidebar permission auto-derivation (`config/permissionRegistry.js`'s `buildSidebarModules()`) — the new "CCE Screening Results" sidebar entry automatically gets a full permission-matrix entry with no manual wiring, exactly like every other sidebar item.

## New Components/Pages Added

- `src/pages/cce/CceScreeningResults.jsx`
- `src/api/cceScreeningApi.js`
- Sidebar entries + one new route in `src/App.jsx` / `src/config/sidebarMenu.js`
- Relabel-only edit in `src/pages/roll-numbers/RollNumberExamFlow.jsx`

## Note on this document's history

An earlier session wrote this document and the files it describes, but a subsequent `git reset`/pull from a teammate's concurrent commit discarded the uncommitted frontend files (this doc included) while leaving the corresponding admin/candidate backend work untouched. Everything described above has since been rebuilt to match this document exactly. **Commit this work promptly** to avoid losing it to the same issue again.
