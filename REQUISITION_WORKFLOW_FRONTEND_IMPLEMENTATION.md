# Requisition Assignment & Approval Workflow — FRONTEND Implementation

**Project:** AJK PSC Admin Portal (admin frontend — runs at `http://localhost:3000`)
**Module:** Employee work-queue + approval actions + approval tracking
**Pairs with:** `REQUISITION_WORKFLOW_BACKEND_IMPLEMENTATION.md` (in the backend repo)

---

## 0. TL;DR

After a department submits a requisition, the backend snapshots the configured approval flow and assigns step 1 to an employee. The frontend must:

1. Give each logged-in **employee a personal work queue** — they see **only requisitions assigned to them**.
2. Let the current approver **Approve** (remarks optional) or **Reject** (remarks mandatory).
3. Show a complete **approval-tracking timeline** (already routed, needs to consume the real API).
4. Hide/disable actions for anyone who is **not** the current approver (backend re-checks anyway).

**Good news:** the API client and the tracking page already exist. Most of the work is wiring + one new "My Requisitions" queue page. The backend endpoints are new — see §8 deployment note.

---

## 1. What ALREADY exists (reuse, don't rebuild)

| Item | File | State |
|---|---|---|
| API client | `src/api/requisitionApprovalApi.js` | ✅ Done — already calls `/requisition-approvals/*` |
| Tracking page | `src/pages/requisition/RequisitionApprovalTrackPage.jsx` | ⚠️ Exists, route active at `/dashboard/requisitions/:id/approval-tracking` — verify it consumes the real response shape |
| Approve/Reject dialog | `src/components/workflow/ApprovalActionDialog.jsx` | ⚠️ Reuse for approve/reject |
| Role inbox | `src/pages/approvals/RoleApprovalInbox.jsx` | ℹ️ Legacy (director/secretary/chairman) — leave as-is |
| Workflow service | `src/services/ApprovalWorkflowService.js` | ℹ️ Check before adding new calls |
| Auth context | `src/context/AuthContext.jsx` | ✅ Provides `user` (role, permissions) |
| Protected route w/ roles | used in `src/App.jsx` (`<ProtectedRoute allowedRoles={[...]}>`) | ✅ Reuse |

> **Do not touch** the legacy `approvals/director|secretary|chairman` pages/routes — the new employee queue is additive.

---

## 2. API client — confirm it matches backend

`src/api/requisitionApprovalApi.js` already defines everything. The backend implements this exact contract. Add the work-queue call if missing:

```js
// add to RequisitionApprovalApi
myQueue: (tab = 'assigned') =>
  fetch(`${API_BASE}/requisition-approvals/my-queue?tab=${tab}`, {
    method: 'GET',
    headers: getHeaders(false),
  }).then(handleResponse),
```

Response shapes the UI relies on (from backend `detailPayload`):

```jsonc
// GET /requisition-approvals/{id}
{
  "data": {
    "requisition":   { "id", "designation", "department", "case_number",
                       "requisition_status", "workflow_status", "created_at" },
    "workflow_steps": [ { "step", "wing", "designation", "employee",
                          "status": "approved|current|pending|rejected",
                          "remarks", "acted_at" } ],
    "timeline":      [ { "step", "action": "assigned|approved|rejected",
                         "role", "by", "remarks", "at" } ],
    "workflow_info": { "current_step", "current_approver", "total_steps" },
    "can_approve":   true,   // UI hint only — backend re-verifies
    "can_reject":    true
  }
}
```

---

## 3. NEW page — Employee Work Queue ("My Requisitions")

`src/pages/requisition/MyRequisitionsQueue.jsx`

A personal queue with 4 tabs, restricted server-side to the logged-in employee:

```
[ My Assigned ] [ Pending Actions ] [ Returned Cases ] [ Completed Cases ]
```

Behavior:
- On mount + tab change → `RequisitionApprovalApi.myQueue(tab)`.
- Render a `TooltipDataGrid` (same component used in `RequisitionList.jsx`): columns Ref ID, Department, Designation, Current Step, Status, Received date, Actions.
- Row click / "Open" → navigate to `/dashboard/requisitions/{id}/approval-tracking`.
- **Assigned/Pending tabs** show Approve / Reject buttons (only when `workflow_status === 'in_progress'` and the row is theirs — it always is for these tabs).
- **Returned/Completed** are read-only history.

Skeleton:

```jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import RequisitionApprovalApi from 'api/requisitionApprovalApi';
import toast from 'react-hot-toast';

const TABS = [
  { key: 'assigned',  label: 'My Assigned' },
  { key: 'pending',   label: 'Pending Actions' },
  { key: 'returned',  label: 'Returned Cases' },
  { key: 'completed', label: 'Completed Cases' },
];

export default function MyRequisitionsQueue() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('assigned');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await RequisitionApprovalApi.myQueue(tab);
        setRows(res?.data?.data ?? res?.data ?? []);
      } catch (e) {
        toast.error(e.message || 'Failed to load queue');
      } finally {
        setLoading(false);
      }
    })();
  }, [tab]);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">My Requisitions</h1>
      <div className="flex gap-2 mb-4">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded ${tab === t.key
              ? 'bg-emerald-700 text-white' : 'bg-slate-100 text-slate-700'}`}>
            {t.label}
          </button>
        ))}
      </div>
      {/* TooltipDataGrid here — mirror RequisitionList.jsx columns/handlers */}
      {/* onRowClick → navigate(`/dashboard/requisitions/${row.hash_id}/approval-tracking`) */}
    </div>
  );
}
```

Register the route in `src/App.jsx` inside the `/dashboard` group:

```jsx
<Route path="my-requisitions" element={<MyRequisitionsQueue />} />
```

Add to the sidebar (`src/config/sidebarMenu.js`) — show for employee roles (assistant_director / deputy_director / director / secretary, or whatever roles your employees carry):

```js
{ label: 'My Requisitions', path: '/dashboard/my-requisitions', icon: 'Inbox',
  roles: ['assistant_director','deputy_director','director','secretary'] }
```

> If your sidebar filters by `user.role` / permissions, gate this item the same way the existing items are gated. The backend `my-queue` is the real guard — the menu is convenience only.

---

## 4. Approval tracking page — verify/align

`src/pages/requisition/RequisitionApprovalTrackPage.jsx` (route already active).

It must render from the `GET /requisition-approvals/{id}` payload (§2):

1. **Header** — requisition designation, department, case number, current status badge.
2. **Stepper / timeline** — iterate `workflow_steps`:
   - ✔ approved (green), ➜ current (amber/“Pending with …”), ○ pending (grey), ✗ rejected (red).
   - Each shows: step #, **employee name**, **designation**, **wing**, remarks, `acted_at`.
3. **Activity timeline** — iterate `timeline` (assigned/approved/rejected, by whom, when, remarks).
4. **Action bar** — render **Approve** / **Reject** buttons **only when `can_approve` / `can_reject` are true**. Use `ApprovalActionDialog.jsx`:
   - Approve → `RequisitionApprovalApi.approve(id, remarks)` (remarks optional).
   - Reject → `RequisitionApprovalApi.reject(id, remarks)` (**remarks required, min 10 chars** — validate client-side, but expect 422 from server too).
   - On success → toast + refetch detail.
5. **Comments** (optional / Phase 2) — `getComments` / `addComment` / `deleteComment`.

Handle backend responses:
- `403` → toast "You are not the current approver" and hide action buttons.
- `422` → show field errors (e.g., remarks required).

---

## 5. Approve / Reject dialog

Reuse `src/components/workflow/ApprovalActionDialog.jsx`. Required props/behavior:

- `mode: 'approve' | 'reject'`.
- Reject: remarks `required`, min 10 chars, disable submit until valid.
- Approve: remarks optional.
- Loading state on submit; close + refetch on success.

If the existing component doesn't fit, build a small one with the project's `Dialog` (`src/components/ui/Dialog.jsx`) mirroring the department portal's submit modal pattern.

---

## 6. Status badges (consistency)

Map workflow values to badges (extend the existing badge helper in `RequisitionList.jsx`):

| `workflow_status` / step status | Badge |
|---|---|
| `in_progress` | amber — "In Progress" |
| `approved` | emerald — "Approved" |
| `rejected` | red — "Rejected" |
| step `current` | amber — "Pending with {employee}" |
| step `approved` | emerald | 
| step `pending` | slate |

Also surface the requisition-level `requisition_status` ("Received from Department", "Rejected by PSC", etc.) where the list already shows status.

---

## 7. Access control (frontend layer)

- Gate the **My Requisitions** route/menu to employee roles via the existing `ProtectedRoute allowedRoles={[...]}` pattern (see `src/App.jsx`).
- **Never trust the frontend for authorization** — Approve/Reject visibility uses `can_approve`/`can_reject`, but the backend enforces "is current approver" on every call. Treat `403` as the source of truth and reconcile UI on error.
- An employee must not be able to open another employee's requisition: even if they guess a URL, the tracking `show` call returns data with `can_approve=false` (and the backend blocks the action). Optionally hide sensitive detail when not the assignee/admin.

---

## 8. Backend dependency / environment note

The backend (`/requisition-approvals/*`) is **new and not yet on live**. The admin frontend currently points at the live backend, so these pages will 404 until the backend is deployed (see backend doc §11).

Two ways to develop/test:
- **Point the frontend at a local backend** running the new endpoints — set `Config.apiUrl` (`src/config/baseUrl`) to the local API, run backend + `php artisan migrate`, then test end-to-end.
- **Or** wait for the backend deploy, then this frontend works against live unchanged.

No frontend code depends on *where* the backend runs — only on the contract in §2.

---

## 9. Build checklist

- [ ] Add `myQueue` to `requisitionApprovalApi.js` (§2).
- [ ] Create `MyRequisitionsQueue.jsx` + route + sidebar item (§3).
- [ ] Verify `RequisitionApprovalTrackPage.jsx` consumes the §2 shape; wire Approve/Reject (§4).
- [ ] Reuse/finish `ApprovalActionDialog.jsx` with reject-remarks validation (§5).
- [ ] Extend status badges (§6).
- [ ] Role-gate the queue route/menu (§7).
- [ ] Handle `403`/`422` gracefully everywhere.
- [ ] Smoke test: log in as the step-1 employee → see the requisition → approve → it disappears from queue and moves to the next employee; reject → it leaves the queue and the department is notified.

---

## 10. End-to-end flow (what the user sees)

```
Department submits requisition
   → requisition_status = "Received from Department"  (backend snapshots flow, assigns step 1)
Employee A (step 1) logs in
   → /dashboard/my-requisitions → "My Assigned" shows it
   → opens approval-tracking → Approve (optional remarks)
   → moves to Employee B (step 2); leaves A's queue, appears in A's "Completed"
Employee B → Approve … → … → Secretary (final) → Approve → workflow_status = "approved"
   (any step) Reject (remarks required) → workflow_status = "rejected"
       → leaves queue, department notified, tracking shows who rejected + why
```
