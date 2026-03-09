# Role-Based Application Approval System (AJK PSC)

## 1. Objective
Implement a role-based workflow for recruitment applications/jobs with this approval chain:
1. Director
2. Secretary
3. Chairman

Admin can view complete tracking of each case from submission to final decision.

## 2. Roles and Access Model

### Roles
- admin
- director
- secretary
- chairman

### Access Rules
- `director` sees only items currently assigned to Director stage.
- `secretary` sees only items currently assigned to Secretary stage.
- `chairman` sees only items currently assigned to Chairman stage.
- `admin` sees all items and full history.

### Action Rules
- Director can only act when current stage = Director.
- Secretary can only act when current stage = Secretary.
- Chairman can only act when current stage = Chairman.
- Admin should not bypass by default. Optional override requires reason and audit log.

## 3. Database Design

Use two-level persistence:
- Master table for current status (fast dashboard queries)
- History table for immutable approval audit trail

### 3.1 `applications` (or reuse `advertisements`/`jobs` as parent)
This is your existing business entity table.

Suggested minimal workflow columns to add:
- `workflow_status` enum('pending','in_progress','approved','rejected') default 'pending'
- `current_stage` enum('director','secretary','chairman','completed') default 'director'
- `final_decision` enum('approved','rejected', null)
- `final_decided_at` datetime null
- `final_decided_by` bigint null (FK users.id)
- `workflow_started_at` datetime null

### 3.2 `application_approval_steps`
Stores stage-wise state for each application.

Columns:
- `id` bigint PK
- `application_id` bigint not null FK -> applications.id
- `stage` enum('director','secretary','chairman') not null
- `approver_user_id` bigint null FK -> users.id (optional if role pool based)
- `status` enum('pending','accepted','rejected','skipped') default 'pending'
- `remarks` text null
- `acted_at` datetime null
- `acted_by_user_id` bigint null FK -> users.id
- `sequence_no` int not null (1,2,3)
- `is_current` boolean default false
- `created_at`, `updated_at`

Indexes:
- `(application_id, stage)` unique
- `(stage, status, is_current)` for role dashboards
- `(application_id, sequence_no)`

### 3.3 `application_workflow_logs`
Immutable event log for compliance and troubleshooting.

Columns:
- `id` bigint PK
- `application_id` bigint not null
- `event_type` varchar(50) not null
  - examples: 'submitted', 'forwarded', 'accepted', 'rejected', 'override', 'reopened'
- `from_stage` varchar(30) null
- `to_stage` varchar(30) null
- `actor_user_id` bigint null
- `actor_role` varchar(30) null
- `remarks` text null
- `metadata` json null
- `created_at` datetime

Indexes:
- `(application_id, created_at)`
- `(event_type, created_at)`

### 3.4 Optional: `workflow_templates`
If different job types need different chains.

`workflow_templates`
- `id`, `name`, `job_type`, `department_id`, `is_active`

`workflow_template_steps`
- `id`, `template_id`, `sequence_no`, `role_code`, `is_mandatory`

This enables variants such as finance/admin extra approvals.

## 4. State Machine (Core Logic)

### Initial Submission
When application is submitted:
- Set `applications.workflow_status = 'in_progress'`
- Set `applications.current_stage = 'director'`
- Insert 3 rows in `application_approval_steps`:
  - Director: `pending`, `is_current = true`, `sequence_no=1`
  - Secretary: `pending`, `is_current = false`, `sequence_no=2`
  - Chairman: `pending`, `is_current = false`, `sequence_no=3`
- Insert workflow log event: `submitted`

### Director Action
If Director accepts:
- Director step -> `accepted`, save `remarks`, `acted_at`, `acted_by_user_id`
- Secretary step -> `is_current = true`
- Application `current_stage = 'secretary'`
- Log: `accepted` + `forwarded`

If Director rejects:
- Director step -> `rejected` with remarks
- Application:
  - `workflow_status = 'rejected'`
  - `current_stage = 'completed'`
  - `final_decision = 'rejected'`
  - `final_decided_at/by`
- Log: `rejected`

### Secretary Action
If Secretary accepts:
- Secretary step -> `accepted`
- Chairman step -> `is_current = true`
- Application `current_stage = 'chairman'`
- Log: `accepted` + `forwarded`

If Secretary rejects:
- Secretary step -> `rejected`
- Application finalized as rejected
- Log: `rejected`

### Chairman Action
If Chairman accepts:
- Chairman step -> `accepted`
- Application finalized:
  - `workflow_status = 'approved'`
  - `current_stage = 'completed'`
  - `final_decision = 'approved'`
  - `final_decided_at/by`
- Log: `approved`

If Chairman rejects:
- Chairman step -> `rejected`
- Application finalized as rejected
- Log: `rejected`

## 5. Backend API Contract

### 5.1 Submit/Create Application
`POST /applications`
- Creates application and initializes workflow.

Response includes:
- `id`
- `workflow_status`
- `current_stage`
- `steps[]`

### 5.2 Role Dashboard List
`GET /applications/my-approvals`

Filters by logged-in role automatically:
- Director -> current pending Director items
- Secretary -> current pending Secretary items
- Chairman -> current pending Chairman items

Query params:
- `status=pending|accepted|rejected|all`
- `search=...`
- `page`, `per_page`

### 5.3 Admin Full Tracking
`GET /applications/workflow-tracking`
Returns all applications with stage summary and final decision.

### 5.4 Workflow Detail
`GET /applications/:id/workflow`
Returns:
- parent application
- all steps with remarks and timestamps
- full audit events

### 5.5 Role Action Endpoint
`POST /applications/:id/approve`

Payload:
{
  "action": "accept" | "reject",
  "remarks": "string (required)",
  "expected_stage": "director|secretary|chairman"
}

Server must validate:
- user role matches current stage
- step still pending
- optimistic locking (expected stage check)

### 5.6 Optional Admin Override
`POST /applications/:id/override`
Payload: `to_stage`, `reason`, `delegate_user_id?`
Always add workflow log with actor `admin`.

## 6. Transaction and Concurrency Rules

All approve/reject actions should run in a DB transaction:
1. Lock application row (`SELECT ... FOR UPDATE`)
2. Verify current stage and pending step
3. Update current step
4. Update next step/application master row
5. Insert log events
6. Commit

This prevents double-approval and race conditions.

## 7. UI/UX Flow

## 7.1 Shared Status Model (for chips/badges)
- Pending
- Accepted
- Rejected
- Current Stage: Director/Secretary/Chairman/Completed

Color suggestion:
- Pending: amber
- Accepted: green
- Rejected: red
- Current stage badge: blue

## 7.2 Director Dashboard
Screen: `Approval Inbox - Director`

Columns:
- Application/Advertisement Number
- Department
- Submitted Date
- Current Stage
- Status
- Actions

Actions on row click/open drawer:
- Accept (remarks required)
- Reject (remarks required)

Only Director-assigned pending records appear.

## 7.3 Secretary Dashboard
Same as Director dashboard, but data source is Secretary queue only.

## 7.4 Chairman Dashboard
Same pattern; decision here finalizes workflow.

## 7.5 Admin Tracking Dashboard
Admin sees all applications with expanded workflow timeline.

Columns:
- Application Number
- Current Stage
- Overall Status
- Director Decision + remarks + time
- Secretary Decision + remarks + time
- Chairman Decision + remarks + time
- Final Decision

Detail view:
- Vertical timeline of workflow events
- Override logs (if any)

## 8. Mapping to Your Current Frontend Code

Current files to extend:
- `src/context/AuthContext.jsx`: ensure `user.role` is available globally.
- `src/middlewares/ProtectedRoute.jsx`: add role-aware guard support (optional `allowedRoles`).
- `src/App.jsx`: add role-specific routes.
- `src/Components/layouts/Sidebar.jsx`: show menu items by role.
- `src/pages/advertisement/AdvertisementRecords.jsx`: add workflow columns and role actions.

Recommended new pages:
- `src/pages/approvals/DirectorApprovals.jsx`
- `src/pages/approvals/SecretaryApprovals.jsx`
- `src/pages/approvals/ChairmanApprovals.jsx`
- `src/pages/approvals/AdminWorkflowTracking.jsx`

Recommended shared components:
- `src/Components/workflow/StatusBadge.jsx`
- `src/Components/workflow/WorkflowTimeline.jsx`
- `src/Components/workflow/ApprovalActionDialog.jsx` (accept/reject + mandatory remarks)

## 9. Frontend Role-Routing Pattern

At login/OTP success, store role in localStorage user object.

Example role codes:
- `admin`
- `director`
- `secretary`
- `chairman`

Route policy examples:
- Director: `/dashboard/approvals/director`
- Secretary: `/dashboard/approvals/secretary`
- Chairman: `/dashboard/approvals/chairman`
- Admin: `/dashboard/workflow-tracking`

If unauthorized access, show 403 page or redirect to user default dashboard.

## 10. Validation and Business Rules

- Remarks are mandatory for both accept/reject.
- A role cannot act twice on same stage.
- Once rejected, workflow is terminal unless admin reopens/overrides.
- Chairman accept means final approval.
- Every state change must write to `application_workflow_logs`.

## 11. Migration Plan (Safe Rollout)

1. Add DB columns/tables with backward-compatible defaults.
2. Backfill existing records:
   - old records without workflow can be marked `approved` or `completed` based on existing data.
3. Deploy read endpoints for dashboards.
4. Deploy action endpoint with transaction lock.
5. Release role-specific UI pages.
6. Enable admin tracking timeline.
7. Enable optional override with strict logging.

## 12. Test Cases (Must Have)

Functional:
- Submit application -> appears only in Director queue.
- Director accept -> appears in Secretary queue.
- Secretary accept -> appears in Chairman queue.
- Chairman accept -> final approved.
- Any role reject -> final rejected.

Security:
- Director cannot action Secretary stage.
- Secretary cannot access Chairman queue.
- Chairman cannot edit previous step.

Audit:
- Each action writes timestamp, remarks, actor.
- Admin can view full decision history.

Concurrency:
- Two users trying to approve same item simultaneously: only one succeeds.

## 13. Example SQL (MySQL style)

```sql
ALTER TABLE applications
  ADD COLUMN workflow_status ENUM('pending','in_progress','approved','rejected') DEFAULT 'pending',
  ADD COLUMN current_stage ENUM('director','secretary','chairman','completed') DEFAULT 'director',
  ADD COLUMN final_decision ENUM('approved','rejected') NULL,
  ADD COLUMN final_decided_at DATETIME NULL,
  ADD COLUMN final_decided_by BIGINT NULL,
  ADD COLUMN workflow_started_at DATETIME NULL;

CREATE TABLE application_approval_steps (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  application_id BIGINT NOT NULL,
  stage ENUM('director','secretary','chairman') NOT NULL,
  approver_user_id BIGINT NULL,
  status ENUM('pending','accepted','rejected','skipped') NOT NULL DEFAULT 'pending',
  remarks TEXT NULL,
  acted_at DATETIME NULL,
  acted_by_user_id BIGINT NULL,
  sequence_no INT NOT NULL,
  is_current TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_app_stage (application_id, stage),
  KEY idx_stage_status_current (stage, status, is_current),
  KEY idx_app_sequence (application_id, sequence_no)
);

CREATE TABLE application_workflow_logs (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  application_id BIGINT NOT NULL,
  event_type VARCHAR(50) NOT NULL,
  from_stage VARCHAR(30) NULL,
  to_stage VARCHAR(30) NULL,
  actor_user_id BIGINT NULL,
  actor_role VARCHAR(30) NULL,
  remarks TEXT NULL,
  metadata JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_app_created (application_id, created_at),
  KEY idx_event_created (event_type, created_at)
);
```

## 14. Suggested API Response Shape for UI

```json
{
  "id": 1024,
  "application_no": "ADV-2026-14",
  "workflow_status": "in_progress",
  "current_stage": "secretary",
  "final_decision": null,
  "steps": [
    {
      "stage": "director",
      "status": "accepted",
      "remarks": "Eligible and complete.",
      "acted_at": "2026-03-09T10:41:22Z",
      "acted_by": { "id": 8, "name": "Director Recruitment" }
    },
    {
      "stage": "secretary",
      "status": "pending",
      "remarks": null,
      "acted_at": null,
      "acted_by": null
    },
    {
      "stage": "chairman",
      "status": "pending",
      "remarks": null,
      "acted_at": null,
      "acted_by": null
    }
  ]
}
```

## 15. Practical Recommendation for Your Current Module

Because your current implementation already has `AdvertisementRecords` and uses DataGrid:
- Keep `AdvertisementRecords` for Admin full tracking.
- Build 3 role-specific pages using the same table component with role-specific API filters.
- Reuse one common `ApprovalActionDialog` for remarks + action submit.

This keeps UI consistent and reduces development time.
