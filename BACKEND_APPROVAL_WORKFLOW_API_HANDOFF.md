# Backend Handoff - Approval Workflow APIs (Complete)

This document is the complete backend API handoff for the current frontend implementation.
It includes required endpoints, curl samples, response shapes, and status APIs.

## 1. Base Setup

Base URL:
- `https://api-admin-ajkpsc.punjab.gov.pk/api/v1`

Common headers:
- `Accept: application/json`
- `Content-Type: application/json` (for POST/PATCH/PUT)
- `Authorization: Bearer <TOKEN>`
- `X-API-KEY: 9kX7pL2mQ8rT5vY3nZ6bJ1hF4gD0eA9cU8iO2sV7tE5rW`

## 2. Status/Role Constants

Roles:
- `admin`
- `director`
- `secretary`
- `chairman`

Workflow status:
- `in_progress`
- `approved`
- `rejected`

Stage:
- `director`
- `secretary`
- `chairman`
- `completed`

Decision values:
- `accepted`
- `rejected`
- `pending`

## 3. Auth APIs

### 3.1 Login

```bash
curl -X POST "https://api-admin-ajkpsc.punjab.gov.pk/api/v1/login" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -H "X-API-KEY: 9kX7pL2mQ8rT5vY3nZ6bJ1hF4gD0eA9cU8iO2sV7tE5rW" \
  -d '{
    "cnic": "3520200000008",
    "password": "Demo@12345"
  }'
```

Success response:

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "otp_required": true,
    "user_id": 32,
    "token": "optional-may-be-null-before-otp",
    "token_type": "Bearer",
    "user": {
      "id": 32,
      "username": "admin_probe_ajk2",
      "cnic": "3520200000008",
      "role": "admin"
    }
  }
}
```

### 3.2 Register

```bash
curl -X POST "https://api-admin-ajkpsc.punjab.gov.pk/api/v1/register" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -H "X-API-KEY: 9kX7pL2mQ8rT5vY3nZ6bJ1hF4gD0eA9cU8iO2sV7tE5rW" \
  -d '{
    "username": "director_demo_ajk",
    "cnic": "3520200000002",
    "password": "Demo@12345",
    "password_confirmation": "Demo@12345",
    "role": "director"
  }'
```

Success response:

```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": 29,
      "username": "director_demo_ajk",
      "cnic": "3520200000002",
      "role": "director"
    },
    "token": "...",
    "token_type": "Bearer"
  }
}
```

Validation error response (example):

```json
{
  "message": "The given data was invalid.",
  "errors": {
    "cnic": ["The cnic has already been taken."]
  }
}
```

### 3.3 Verify OTP

```bash
curl -X POST "https://api-admin-ajkpsc.punjab.gov.pk/api/v1/verify-otp" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -H "X-API-KEY: 9kX7pL2mQ8rT5vY3nZ6bJ1hF4gD0eA9cU8iO2sV7tE5rW" \
  -d '{
    "user_id": 29,
    "otp": "1234"
  }'
```

Success response (must include token for frontend auth):

```json
{
  "success": true,
  "message": "OTP verified successfully",
  "data": {
    "token": "...",
    "token_type": "Bearer",
    "user": {
      "id": 29,
      "username": "director_demo_ajk",
      "cnic": "3520200000002",
      "role": "director"
    }
  }
}
```

## 4. Role Inbox APIs (Current tab)

Frontend uses these already.

### 4.1 Director Pending

```bash
curl -X GET "https://api-admin-ajkpsc.punjab.gov.pk/api/v1/pending/director" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <DIRECTOR_TOKEN>" \
  -H "X-API-KEY: 9kX7pL2mQ8rT5vY3nZ6bJ1hF4gD0eA9cU8iO2sV7tE5rW"
```

### 4.2 Secretary Pending

```bash
curl -X GET "https://api-admin-ajkpsc.punjab.gov.pk/api/v1/pending/secretary" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <SECRETARY_TOKEN>" \
  -H "X-API-KEY: 9kX7pL2mQ8rT5vY3nZ6bJ1hF4gD0eA9cU8iO2sV7tE5rW"
```

### 4.3 Chairman Pending

```bash
curl -X GET "https://api-admin-ajkpsc.punjab.gov.pk/api/v1/pending/chairman" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <CHAIRMAN_TOKEN>" \
  -H "X-API-KEY: 9kX7pL2mQ8rT5vY3nZ6bJ1hF4gD0eA9cU8iO2sV7tE5rW"
```

Required item shape (minimum):

```json
{
  "success": true,
  "data": [
    {
      "hash_id": "xyz123",
      "adv_number": "Advertisement 15-26",
      "title": "Assistant Director",
      "created_at": "2026-03-15T10:00:00Z",
      "current_stage": "director",
      "workflow_status": "in_progress"
    }
  ]
}
```

## 5. Role Action APIs (Accept/Reject)

### 5.1 Director Approve

```bash
curl -X POST "https://api-admin-ajkpsc.punjab.gov.pk/api/v1/director/xyz123/approve" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <DIRECTOR_TOKEN>" \
  -H "X-API-KEY: 9kX7pL2mQ8rT5vY3nZ6bJ1hF4gD0eA9cU8iO2sV7tE5rW" \
  -d '{
    "remarks": "Looks good, moving to Secretary"
  }'
```

### 5.2 Director Reject

```bash
curl -X POST "https://api-admin-ajkpsc.punjab.gov.pk/api/v1/director/xyz123/reject" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <DIRECTOR_TOKEN>" \
  -H "X-API-KEY: 9kX7pL2mQ8rT5vY3nZ6bJ1hF4gD0eA9cU8iO2sV7tE5rW" \
  -d '{
    "remarks": "Incomplete eligibility criteria"
  }'
```

### 5.3 Secretary Approve/Reject

```bash
curl -X POST "https://api-admin-ajkpsc.punjab.gov.pk/api/v1/secretary/xyz123/approve" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <SECRETARY_TOKEN>" \
  -H "X-API-KEY: 9kX7pL2mQ8rT5vY3nZ6bJ1hF4gD0eA9cU8iO2sV7tE5rW" \
  -d '{"remarks":"Approved by Secretary"}'
```

```bash
curl -X POST "https://api-admin-ajkpsc.punjab.gov.pk/api/v1/secretary/xyz123/reject" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <SECRETARY_TOKEN>" \
  -H "X-API-KEY: 9kX7pL2mQ8rT5vY3nZ6bJ1hF4gD0eA9cU8iO2sV7tE5rW" \
  -d '{"remarks":"Rejected by Secretary"}'
```

### 5.4 Chairman Approve/Reject

```bash
curl -X POST "https://api-admin-ajkpsc.punjab.gov.pk/api/v1/chairman/xyz123/approve" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <CHAIRMAN_TOKEN>" \
  -H "X-API-KEY: 9kX7pL2mQ8rT5vY3nZ6bJ1hF4gD0eA9cU8iO2sV7tE5rW" \
  -d '{"remarks":"Final approval granted"}'
```

```bash
curl -X POST "https://api-admin-ajkpsc.punjab.gov.pk/api/v1/chairman/xyz123/reject" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <CHAIRMAN_TOKEN>" \
  -H "X-API-KEY: 9kX7pL2mQ8rT5vY3nZ6bJ1hF4gD0eA9cU8iO2sV7tE5rW" \
  -d '{"remarks":"Final rejection"}'
```

Action success response (recommended):

```json
{
  "success": true,
  "message": "Decision recorded",
  "data": {
    "hash_id": "xyz123",
    "current_stage": "secretary",
    "workflow_status": "in_progress",
    "final_decision": null,
    "director_status": "accepted",
    "director_remarks": "Looks good, moving to Secretary",
    "director_acted_at": "2026-03-15T11:10:00Z"
  }
}
```

Error response (role mismatch):

```json
{
  "success": false,
  "message": "Unauthorized: You do not have permission to access this resource.",
  "code": "ROLE_NOT_ALLOWED"
}
```

## 6. Role Completed APIs (Needed for Completed tab)

Frontend now supports these and will consume first available:
- `GET /completed/{role}`
- `GET /history/{role}`
- `GET /processed/{role}`

You can implement one endpoint only; preferred:
- `GET /completed/{role}`

### 6.1 Director Completed

```bash
curl -X GET "https://api-admin-ajkpsc.punjab.gov.pk/api/v1/completed/director" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <DIRECTOR_TOKEN>" \
  -H "X-API-KEY: 9kX7pL2mQ8rT5vY3nZ6bJ1hF4gD0eA9cU8iO2sV7tE5rW"
```

### 6.2 Secretary Completed

```bash
curl -X GET "https://api-admin-ajkpsc.punjab.gov.pk/api/v1/completed/secretary" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <SECRETARY_TOKEN>" \
  -H "X-API-KEY: 9kX7pL2mQ8rT5vY3nZ6bJ1hF4gD0eA9cU8iO2sV7tE5rW"
```

### 6.3 Chairman Completed

```bash
curl -X GET "https://api-admin-ajkpsc.punjab.gov.pk/api/v1/completed/chairman" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <CHAIRMAN_TOKEN>" \
  -H "X-API-KEY: 9kX7pL2mQ8rT5vY3nZ6bJ1hF4gD0eA9cU8iO2sV7tE5rW"
```

Completed response example:

```json
{
  "success": true,
  "data": [
    {
      "hash_id": "xyz123",
      "adv_number": "Advertisement 15-26",
      "workflow_status": "approved",
      "final_decision": "approved",
      "current_stage": "completed",
      "director_status": "accepted",
      "director_remarks": "Looks good",
      "director_acted_at": "2026-03-15T11:10:00Z",
      "secretary_status": "accepted",
      "secretary_remarks": "Approved by Secretary",
      "secretary_acted_at": "2026-03-15T12:20:00Z",
      "chairman_status": "accepted",
      "chairman_remarks": "Final approval granted",
      "chairman_acted_at": "2026-03-15T13:40:00Z"
    }
  ]
}
```

## 7. Admin Tracking APIs (Main requirement for real status updates)

Frontend currently tries these endpoints in order:
1. `GET /workflow-tracking`
2. `GET /applications/workflow-tracking`
3. fallback merge of `/advertisements` + `/approval-history/{id}`

Preferred implementation: `GET /workflow-tracking`

```bash
curl -X GET "https://api-admin-ajkpsc.punjab.gov.pk/api/v1/workflow-tracking?status=all&stage=all&page=1&per_page=50&search=Advertisement" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -H "X-API-KEY: 9kX7pL2mQ8rT5vY3nZ6bJ1hF4gD0eA9cU8iO2sV7tE5rW"
```

Response example:

```json
{
  "success": true,
  "data": {
    "data": [
      {
        "hash_id": "xyz123",
        "adv_number": "Advertisement 15-26",
        "title": "Assistant Director",
        "current_stage": "secretary",
        "workflow_status": "in_progress",
        "final_decision": null,
        "director_status": "accepted",
        "director_remarks": "Looks good",
        "director_acted_at": "2026-03-15T11:10:00Z",
        "director_acted_by": "Director Recruitment",
        "secretary_status": "pending",
        "secretary_remarks": null,
        "secretary_acted_at": null,
        "secretary_acted_by": null,
        "chairman_status": "pending",
        "chairman_remarks": null,
        "chairman_acted_at": null,
        "chairman_acted_by": null,
        "updated_at": "2026-03-15T11:10:00Z"
      }
    ],
    "current_page": 1,
    "per_page": 50,
    "total": 1,
    "last_page": 1
  }
}
```

## 8. Approval History API (Per record)

```bash
curl -X GET "https://api-admin-ajkpsc.punjab.gov.pk/api/v1/approval-history/xyz123" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -H "X-API-KEY: 9kX7pL2mQ8rT5vY3nZ6bJ1hF4gD0eA9cU8iO2sV7tE5rW"
```

Response shape accepted by frontend (any one of these is fine):

Option A (flat):

```json
{
  "success": true,
  "data": {
    "hash_id": "xyz123",
    "director_status": "accepted",
    "director_remarks": "Looks good",
    "secretary_status": "accepted",
    "secretary_remarks": "Approved",
    "chairman_status": "pending",
    "chairman_remarks": null
  }
}
```

Option B (nested):

```json
{
  "success": true,
  "data": {
    "hash_id": "xyz123",
    "steps": {
      "director": {
        "status": "accepted",
        "remarks": "Looks good",
        "acted_at": "2026-03-15T11:10:00Z",
        "acted_by_name": "Director Recruitment"
      },
      "secretary": {
        "status": "accepted",
        "remarks": "Approved",
        "acted_at": "2026-03-15T12:20:00Z",
        "acted_by_name": "Secretary"
      },
      "chairman": {
        "status": "pending",
        "remarks": null,
        "acted_at": null,
        "acted_by_name": null
      }
    }
  }
}
```

## 9. Status Summary API (Needed for dashboard counters/tab badges)

Recommended endpoint:
- `GET /workflow-status-summary`

```bash
curl -X GET "https://api-admin-ajkpsc.punjab.gov.pk/api/v1/workflow-status-summary" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -H "X-API-KEY: 9kX7pL2mQ8rT5vY3nZ6bJ1hF4gD0eA9cU8iO2sV7tE5rW"
```

Response example:

```json
{
  "success": true,
  "data": {
    "total": 128,
    "in_progress": 34,
    "approved": 72,
    "rejected": 22,
    "by_stage": {
      "director": 12,
      "secretary": 11,
      "chairman": 11,
      "completed": 94
    }
  }
}
```

## 10. Error Responses (Standardize)

401 Unauthorized:

```json
{
  "success": false,
  "message": "Unauthorized. Please login again."
}
```

403 Forbidden:

```json
{
  "success": false,
  "message": "Unauthorized: You do not have permission to access this resource.",
  "code": "ROLE_NOT_ALLOWED"
}
```

422 Validation:

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": {
    "remarks": ["The remarks field is required."]
  }
}
```

409 Conflict:

```json
{
  "success": false,
  "message": "Workflow stage changed. Please refresh and retry.",
  "code": "STAGE_CONFLICT"
}
```

## 11. Frontend Compatibility Checklist

Backend must ensure:
1. Every record has stable `hash_id`.
2. Approve/reject APIs update stage and workflow status atomically.
3. Admin tracking endpoint returns latest status/remarks in one payload.
4. Completed role endpoints return only items with that role decision already made.
5. OTP verify returns token in one of these keys: `data.token` or `data.access_token`.

## 12. Priority Order (What to build first)

P1:
1. `GET /workflow-tracking`
2. `GET /completed/{role}`
3. Existing approve/reject endpoints must return updated state.

P2:
1. `GET /workflow-status-summary`
2. `GET /approval-history/{hash_id}` standardized shape

P3:
1. Realtime events (SSE/WebSocket): `workflow.updated`

---

If you implement P1 exactly, current frontend will show correct status/remarks in:
- `/dashboard/workflow-tracking`
- `/dashboard/approvals/director`
- `/dashboard/approvals/secretary`
- `/dashboard/approvals/chairman`
