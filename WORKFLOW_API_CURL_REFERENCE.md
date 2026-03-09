# Role-Based Approval Backend API - Complete cURL Reference

This file gives a full cURL set for implementing and testing the backend workflow.

Approval chain:
1. Director
2. Secretary
3. Chairman

Admin has full tracking and optional override controls.

## 1. Environment Setup

```bash
# Base
export BASE_URL="http://localhost:8000/api/v1"

# Common headers
export API_KEY="YOUR_API_KEY"
export ADMIN_TOKEN="YOUR_ADMIN_JWT"
export DIRECTOR_TOKEN="YOUR_DIRECTOR_JWT"
export SECRETARY_TOKEN="YOUR_SECRETARY_JWT"
export CHAIRMAN_TOKEN="YOUR_CHAIRMAN_JWT"
```

Windows PowerShell style:

```powershell
$BASE_URL="http://localhost:8000/api/v1"
$API_KEY="YOUR_API_KEY"
$ADMIN_TOKEN="YOUR_ADMIN_JWT"
$DIRECTOR_TOKEN="YOUR_DIRECTOR_JWT"
$SECRETARY_TOKEN="YOUR_SECRETARY_JWT"
$CHAIRMAN_TOKEN="YOUR_CHAIRMAN_JWT"
```

## 2. Auth and Role Identity

Use your existing auth endpoints. These help backend testing for role-based access.

### 2.1 Login

```bash
curl -X POST "$BASE_URL/login" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "X-API-KEY: $API_KEY" \
  -d '{
    "cnic": "1234512345671",
    "password": "Secret@123"
  }'
```

### 2.2 Verify OTP (if enabled)

```bash
curl -X POST "$BASE_URL/verify-otp" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "X-API-KEY: $API_KEY" \
  -d '{
    "user_id": 12,
    "otp": "1234"
  }'
```

## 3. Workflow Template APIs (Optional but Recommended)

Use these if you support different approval routes by job type/department.

### 3.1 Create Template

```bash
curl -X POST "$BASE_URL/workflow-templates" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "X-API-KEY: $API_KEY" \
  -d '{
    "name": "Default Recruitment Chain",
    "job_type": "regular",
    "department_id": 5,
    "is_active": true,
    "steps": [
      { "sequence_no": 1, "role_code": "director", "is_mandatory": true },
      { "sequence_no": 2, "role_code": "secretary", "is_mandatory": true },
      { "sequence_no": 3, "role_code": "chairman", "is_mandatory": true }
    ]
  }'
```

### 3.2 List Templates

```bash
curl -X GET "$BASE_URL/workflow-templates?job_type=regular&department_id=5" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "X-API-KEY: $API_KEY"
```

### 3.3 Get Template Detail

```bash
curl -X GET "$BASE_URL/workflow-templates/1" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "X-API-KEY: $API_KEY"
```

### 3.4 Update Template

```bash
curl -X PUT "$BASE_URL/workflow-templates/1" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "X-API-KEY: $API_KEY" \
  -d '{
    "name": "Default Recruitment Chain v2",
    "is_active": true,
    "steps": [
      { "sequence_no": 1, "role_code": "director", "is_mandatory": true },
      { "sequence_no": 2, "role_code": "secretary", "is_mandatory": true },
      { "sequence_no": 3, "role_code": "chairman", "is_mandatory": true }
    ]
  }'
```

### 3.5 Deactivate Template

```bash
curl -X PATCH "$BASE_URL/workflow-templates/1/deactivate" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "X-API-KEY: $API_KEY"
```

## 4. Application / Job Workflow APIs

## 4.1 Create Application and Auto-Start Workflow

```bash
curl -X POST "$BASE_URL/applications" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "X-API-KEY: $API_KEY" \
  -d '{
    "application_no": "ADV-2026-14",
    "title": "Assistant Director Recruitment",
    "department_id": 5,
    "job_type": "regular",
    "workflow_template_id": 1,
    "payload": {
      "adv_date": "2026-03-09",
      "closing_date": "2026-03-25"
    }
  }'
```

## 4.2 Start Workflow for Existing Advertisement/Job

Use this if application and advertisement are separate entities.

```bash
curl -X POST "$BASE_URL/applications/1024/workflow/start" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "X-API-KEY: $API_KEY" \
  -d '{
    "workflow_template_id": 1,
    "start_remarks": "Workflow initiated after ad creation"
  }'
```

## 4.3 List My Approval Queue (Role-Based)

Director/Secretary/Chairman call same endpoint; backend derives role from token.

```bash
curl -X GET "$BASE_URL/applications/my-approvals?status=pending&page=1&per_page=20" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $DIRECTOR_TOKEN" \
  -H "X-API-KEY: $API_KEY"
```

Secretary version:

```bash
curl -X GET "$BASE_URL/applications/my-approvals?status=pending&page=1&per_page=20" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $SECRETARY_TOKEN" \
  -H "X-API-KEY: $API_KEY"
```

Chairman version:

```bash
curl -X GET "$BASE_URL/applications/my-approvals?status=pending&page=1&per_page=20" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $CHAIRMAN_TOKEN" \
  -H "X-API-KEY: $API_KEY"
```

## 4.4 Application Workflow Detail (All Steps + Logs)

```bash
curl -X GET "$BASE_URL/applications/1024/workflow" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "X-API-KEY: $API_KEY"
```

## 4.5 Role Action - Accept/Reject with Remarks

### Director Accept

```bash
curl -X POST "$BASE_URL/applications/1024/approve" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $DIRECTOR_TOKEN" \
  -H "X-API-KEY: $API_KEY" \
  -d '{
    "action": "accept",
    "remarks": "Eligibility verified and approved.",
    "expected_stage": "director"
  }'
```

### Director Reject

```bash
curl -X POST "$BASE_URL/applications/1024/approve" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $DIRECTOR_TOKEN" \
  -H "X-API-KEY: $API_KEY" \
  -d '{
    "action": "reject",
    "remarks": "Missing required departmental documents.",
    "expected_stage": "director"
  }'
```

### Secretary Accept

```bash
curl -X POST "$BASE_URL/applications/1024/approve" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $SECRETARY_TOKEN" \
  -H "X-API-KEY: $API_KEY" \
  -d '{
    "action": "accept",
    "remarks": "Administrative approval granted.",
    "expected_stage": "secretary"
  }'
```

### Secretary Reject

```bash
curl -X POST "$BASE_URL/applications/1024/approve" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $SECRETARY_TOKEN" \
  -H "X-API-KEY: $API_KEY" \
  -d '{
    "action": "reject",
    "remarks": "Budget concurrence pending.",
    "expected_stage": "secretary"
  }'
```

### Chairman Accept (Final Approval)

```bash
curl -X POST "$BASE_URL/applications/1024/approve" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $CHAIRMAN_TOKEN" \
  -H "X-API-KEY: $API_KEY" \
  -d '{
    "action": "accept",
    "remarks": "Final approval granted for publication.",
    "expected_stage": "chairman"
  }'
```

### Chairman Reject (Final Rejection)

```bash
curl -X POST "$BASE_URL/applications/1024/approve" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $CHAIRMAN_TOKEN" \
  -H "X-API-KEY: $API_KEY" \
  -d '{
    "action": "reject",
    "remarks": "Policy review required before approval.",
    "expected_stage": "chairman"
  }'
```

## 4.6 Admin Tracking Dashboard Data

```bash
curl -X GET "$BASE_URL/applications/workflow-tracking?status=all&stage=all&page=1&per_page=50&search=ADV-2026" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "X-API-KEY: $API_KEY"
```

## 4.7 Workflow Logs Only

```bash
curl -X GET "$BASE_URL/applications/1024/workflow-logs" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "X-API-KEY: $API_KEY"
```

## 4.8 Admin Override (Exceptional Cases)

For absence/delegation/bypass with strict logging.

```bash
curl -X POST "$BASE_URL/applications/1024/override" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "X-API-KEY: $API_KEY" \
  -d '{
    "to_stage": "chairman",
    "reason": "Secretary on approved leave. Urgent processing approved by admin.",
    "delegate_user_id": null
  }'
```

## 4.9 Reopen Rejected Case (Optional)

```bash
curl -X POST "$BASE_URL/applications/1024/reopen" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "X-API-KEY: $API_KEY" \
  -d '{
    "restart_stage": "director",
    "reason": "Documents corrected and resubmitted."
  }'
```

## 4.10 Assign Specific Approver (Optional)

If stage can target a specific user (not just role pool):

```bash
curl -X POST "$BASE_URL/applications/1024/assign-approver" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "X-API-KEY: $API_KEY" \
  -d '{
    "stage": "secretary",
    "approver_user_id": 44,
    "reason": "Primary secretary assignment"
  }'
```

## 5. Response Contracts (Recommended)

## 5.1 Success - Approve/Reject

```json
{
  "success": true,
  "message": "Decision recorded",
  "data": {
    "application_id": 1024,
    "workflow_status": "in_progress",
    "current_stage": "secretary",
    "final_decision": null,
    "updated_step": {
      "stage": "director",
      "status": "accepted",
      "remarks": "Eligibility verified and approved.",
      "acted_at": "2026-03-09T10:41:22Z"
    }
  }
}
```

## 5.2 Validation Error (422)

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": {
    "remarks": ["The remarks field is required."]
  }
}
```

## 5.3 Stage Conflict (409)

```json
{
  "success": false,
  "message": "Workflow stage changed. Please refresh and retry.",
  "code": "STAGE_CONFLICT"
}
```

## 5.4 Unauthorized Role (403)

```json
{
  "success": false,
  "message": "You are not allowed to approve at this stage.",
  "code": "ROLE_NOT_ALLOWED"
}
```

## 6. End-to-End Test Script (Quick Sequence)

1. Admin creates application.
2. Director queue should show that application.
3. Director accepts.
4. Secretary queue should show same application.
5. Secretary accepts.
6. Chairman queue should show same application.
7. Chairman accepts.
8. Admin tracking should show final decision = approved and all remarks.

## 7. Minimal Endpoint Checklist for Backend

Mandatory:
- `POST /applications`
- `GET /applications/my-approvals`
- `POST /applications/:id/approve`
- `GET /applications/:id/workflow`
- `GET /applications/workflow-tracking`

Recommended:
- `GET /applications/:id/workflow-logs`
- `POST /applications/:id/override`
- `POST /applications/:id/reopen`
- Template APIs under `/workflow-templates`

## 8. Laravel Route Example (If useful)

```php
Route::middleware(['auth:sanctum'])->group(function () {
    Route::post('/applications', [ApplicationController::class, 'store']);
    Route::post('/applications/{id}/workflow/start', [ApplicationWorkflowController::class, 'start']);

    Route::get('/applications/my-approvals', [ApplicationWorkflowController::class, 'myApprovals']);
    Route::post('/applications/{id}/approve', [ApplicationWorkflowController::class, 'approve']);

    Route::get('/applications/{id}/workflow', [ApplicationWorkflowController::class, 'showWorkflow']);
    Route::get('/applications/{id}/workflow-logs', [ApplicationWorkflowController::class, 'workflowLogs']);

    Route::get('/applications/workflow-tracking', [ApplicationWorkflowController::class, 'tracking']);

    Route::post('/applications/{id}/override', [ApplicationWorkflowController::class, 'override']);
    Route::post('/applications/{id}/reopen', [ApplicationWorkflowController::class, 'reopen']);
    Route::post('/applications/{id}/assign-approver', [ApplicationWorkflowController::class, 'assignApprover']);

    Route::apiResource('/workflow-templates', WorkflowTemplateController::class);
    Route::patch('/workflow-templates/{id}/deactivate', [WorkflowTemplateController::class, 'deactivate']);
});
```

---

If your backend uses different entity names (`advertisements`, `requisitions`, `jobs`), keep payload/flow same and only rename the route prefixes.
