# Results Module: Frontend Implementation Plan
**Project:** AJK PSC Admin Portal  
**Architecture:** ReactJS + TypeScript + TailwindCSS  
**Version:** 1.0.0

---

## 1. Module Overview
The Results Module is a mission-critical component of the AJK PSC Admin Portal, responsible for the end-to-end lifecycle of candidate evaluations. It bridges the gap between written examinations and final merit recommendations.

### Business Objectives:
- **Accuracy:** Zero-tolerance for data entry errors via multi-stage validation.
- **Transparency:** Full audit trail for every mark change.
- **Efficiency:** Streamlined bulk imports for thousands of candidate results.
- **Compliance:** Strict adherence to quota and merit rotation rules.

### User Roles:
- **Admin (Data Entry):** Manual mark entry and CSV uploads.
- **Secretary (Interview):** Management of Award Lists and interview scoring.
- **Director (Publication):** Final result publication and notification triggering.
- **Chairman:** Oversight and final merit approval.

---

## 2. Frontend Folder Structure
We will follow the existing modular structure located in `src/`.

```text
src/
├── api/
│   └── resultsApi.ts              # Axios service layer for results
├── components/
│   └── results/
│       ├── MarkEntry/             # Manual/Bulk entry components
│       ├── AwardList/             # Interview award components
│       ├── MeritRotation/         # Merit management UI
│       └── Shared/                # Result-specific UI (Status badges, etc)
├── pages/
│   └── results/
│       ├── ResultsDashboard.tsx   # Main landing for results
│       ├── MarkEntryPage.tsx      # Manual entry view
│       ├── ImportResultsPage.tsx  # CSV upload workflow
│       ├── AwardListPage.tsx      # Interview scoring view
│       └── MeritManagementPage.tsx # Merit & Replacement view
├── hooks/
│   └── useResults.ts              # Custom hooks for result state/mutations
├── types/
│   └── results.ts                 # TypeScript interfaces (DTO mirrors)
├── validation/
│   └── resultsSchema.ts           # Zod/Yup schemas for forms
└── constants/
    └── resultsConstants.ts        # Status enums and quota types
```

---

## 3. Route Planning
Routes will be protected by the existing `RoleGuard` middleware.

| Route | Responsibility | Permission (Role) |
| :--- | :--- | :--- |
| `/results/entry` | Manual mark entry for single candidates | `admin` |
| `/results/import` | CSV Import workflow with dry-run/preview | `admin` |
| `/results/view/:jobId` | Searchable grid of all candidate results | `any` |
| `/results/awards/:jobId` | Interview Award List (Part-A & Part-B) | `secretary`, `admin` |
| `/results/merit/:jobId` | Merit list generation and replacement logic | `admin`, `chairman` |
| `/results/publish/:jobId` | Final publication control and history | `director`, `admin` |

---

## 4. UI Architecture & Patterns

### Reusable Table Strategy
- **Base:** Utilize the existing `DataTable` component.
- **Features:** Server-side pagination, multi-column sorting, and custom status renderers.
- **Inline Editing:** Implementation of `EditableCell` for fast mark corrections in the Award List.

### CSV Import UX
- **Phase 1: Upload:** Drag-and-drop zone with immediate file type validation.
- **Phase 2: Preview:** Grid display of the first 50 rows showing "Ready" or "Error" status.
- **Phase 3: Validation:** Backend-driven dry-run showing logic errors (e.g., Roll No mismatch).
- **Phase 4: Commit:** Final submission with real-time progress bar.

### PDF Handling
- Integration with the backend streaming API.
- Use of `blob` URLs for secure preview in a modal before download.

---

## 5. Component Breakdown

### Merit Management Interface
- **Parent:** `MeritManagementPage`
- **Children:**
    - `QuotaSummaryCard`: Displays remaining seats vs candidates.
    - `MeritRotationTable`: Draggable/Sortable list of recommended candidates.
    - `ReplacementModal`: Triggered when a candidate declines; handles the logic of promoting the next-in-line.

### Award List Entry
- **Logic:** Splitting entry into `Part-A` (Academic) and `Part-B` (Interview).
- **Validation:** Real-time summation of scores to ensure total doesn't exceed 100.

---

## 6. State Management & API Integration
- **React Query:** Used for all server-state caching.
- **Query Invalidation:** Automatically refresh the `AwardList` when a `MarkUpdate` is successful.
- **Optimistic Updates:** Applied to "Published" toggles for instant UI feedback.

---

## 7. Security & UX Standards
- **CNIC Masking:** CNICs will be masked (`*****`) by default, with a "Reveal" icon available only for `Senior Admin` roles.
- **Debounced Saving:** Marks entered manually will be saved automatically using a 500ms debounce to reduce server load.
- **Skeleton Loaders:** Each results page will implement the project-standard skeleton layout to reduce perceived latency.

---

## 8. Frontend Development Order
1. **Phase 1:** Core Result Viewers and Search filters.
2. **Phase 2:** Manual Mark Entry and Validation logic.
3. **Phase 3:** CSV Import pipeline (Preview -> Commit).
4. **Phase 4:** Award List (Interview) management.
5. **Phase 5:** Merit Rotation and Replacement workflows.
6. **Phase 6:** Publication and Notification triggers.
