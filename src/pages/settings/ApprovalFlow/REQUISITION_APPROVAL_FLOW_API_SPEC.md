# Requisition Approval Flow — Backend API Specification

## Overview

This module allows admin users to configure a **Requisition Approval Flow** by assigning designations to organizational wings and selecting an approving employee for each. The configured flow defines the order in which a requisition passes through approvals before reaching the Secretary for final sign-off.

---

## How It Works (Frontend Flow)

1. User selects **Process Type** → currently only `"Requisition"` (hardcoded dropdown)
2. User selects one or more **Wings** from a tree view (max 3)
3. For each selected wing, user picks **one Designation** (Assistant Director / Deputy Director / Director)
4. Each designation is globally unique — once assigned to a wing, it is disabled in all other wings
5. For each assigned designation, user selects **one Employee** from the employees listed under that designation
6. User can **drag and reorder** the approval steps (except Secretary)
7. **Secretary** is automatically appended as the final approval step (not selectable, not reorderable)
8. User clicks **Save Flow** to submit

---

## Submission Payload

When the user clicks **Save Flow**, the frontend will send the following JSON:

```json
{
  "process_type": "requisition",
  "assignments": [
    {
      "step": 1,
      "wing": "Exam Wing",
      "designation": "Assistant Director",
      "employee": "Muhammad Imran Khan"
    },
    {
      "step": 2,
      "wing": "Recruitment Wing I",
      "designation": "Deputy Director",
      "employee": "Khalid Mehmood"
    },
    {
      "step": 3,
      "wing": "Recruitment Wing II",
      "designation": "Director",
      "employee": "Dr. Farooq Ahmed"
    },
    {
      "step": 4,
      "wing": "Final Approval",
      "designation": "Secretary",
      "employee": "Raja Muhammad Arif"
    }
  ]
}
```

---

## Payload Field Reference

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `process_type` | string | Yes | Always `"requisition"` for now. May support other types in future. |
| `assignments` | array | Yes | Ordered list of approval steps. Minimum 2 entries (1 wing + Secretary). Maximum 4 entries (3 wings + Secretary). |
| `assignments[].step` | integer | Yes | 1-based step order. Reflects the user's drag-arranged sequence. |
| `assignments[].wing` | string | Yes | Wing name. Last entry is always `"Final Approval"` (Secretary). |
| `assignments[].designation` | string | Yes | One of: `"Assistant Director"`, `"Deputy Director"`, `"Director"`, `"Secretary"`. |
| `assignments[].employee` | string | Yes | Full name of the selected employee. Can be `null` if employee not yet selected (frontend validates before submit). |

---

## Business Rules (for backend validation)

### Rule 1 — One Designation Per Wing
Each wing can have at most one designation assigned.

### Rule 2 — Global Designation Uniqueness
A designation (Assistant Director, Deputy Director, Director) can only appear once across all assignments. No two wings can share the same designation.

### Rule 3 — Maximum 3 Wing Assignments
Only 3 unique designations exist, so maximum 3 wings can be assigned. The 4th entry is always Secretary.

### Rule 4 — One Employee Per Designation
Each designation assignment has exactly one employee selected.

### Rule 5 — Secretary Is Always Final
The last entry in `assignments` must always be Secretary with `wing: "Final Approval"`. This is not user-configurable — the frontend appends it automatically.

### Rule 6 — Step Order Is User-Defined
The `step` field reflects the user's chosen order (via drag-and-drop). The backend should preserve this order when executing the approval workflow. Secretary is always the last step regardless of step number.

---

## Available Wings (Hardcoded)

| Wing ID | Wing Name |
|---------|-----------|
| exam_wing | Exam Wing |
| recruitment_wing_1 | Recruitment Wing I |
| recruitment_wing_2 | Recruitment Wing II |
| admin_wing | Admin Wing |
| research_wing | Research Wing |
| litigation_wing | Litigation Wing |
| it_wing | IT Wing |

---

## Available Designations (Per Wing)

| Designation | Can Be Assigned To |
|-------------|--------------------|
| Assistant Director | Any one wing |
| Deputy Director | Any one wing |
| Director | Any one wing |
| Secretary | Fixed — Final Approval (not selectable) |

---

## API Endpoints Needed

### 1. Save Approval Flow

**Purpose:** Save or update the requisition approval flow configuration.

```
POST /api/v1/settings/approval-flow
```

**Request Body:**
```json
{
  "process_type": "requisition",
  "assignments": [
    {
      "step": 1,
      "wing": "Exam Wing",
      "designation": "Assistant Director",
      "employee": "Muhammad Imran Khan"
    }
  ]
}
```

**Expected Response (Success):**
```json
{
  "success": true,
  "status": 200,
  "message": "Approval flow saved successfully",
  "data": {
    "id": "hash_id_here",
    "process_type": "requisition",
    "assignments": [...]
  }
}
```

**Expected Response (Validation Error):**
```json
{
  "success": false,
  "status": 422,
  "message": "Validation failed",
  "errors": {
    "assignments.0.designation": ["Designation already assigned to another wing"]
  }
}
```

---

### 2. Get Saved Approval Flow

**Purpose:** Retrieve the current saved approval flow configuration (to pre-populate the form on page load).

```
GET /api/v1/settings/approval-flow?process_type=requisition
```

**Expected Response:**
```json
{
  "success": true,
  "status": 200,
  "data": {
    "id": "hash_id_here",
    "process_type": "requisition",
    "assignments": [
      {
        "step": 1,
        "wing": "Exam Wing",
        "designation": "Assistant Director",
        "employee": "Muhammad Imran Khan"
      },
      {
        "step": 2,
        "wing": "Recruitment Wing I",
        "designation": "Deputy Director",
        "employee": "Khalid Mehmood"
      },
      {
        "step": 3,
        "wing": "Recruitment Wing II",
        "designation": "Director",
        "employee": "Dr. Farooq Ahmed"
      },
      {
        "step": 4,
        "wing": "Final Approval",
        "designation": "Secretary",
        "employee": "Raja Muhammad Arif"
      }
    ]
  }
}
```

---

### 3. Get Employees By Designation

**Purpose:** Fetch employees who hold a specific designation (to populate the employee selection tree under each designation).

```
GET /api/v1/employees?designation=Assistant Director
```

**Expected Response:**
```json
{
  "success": true,
  "data": [
    { "id": 1, "name": "Muhammad Imran Khan" },
    { "id": 2, "name": "Syed Ali Raza" }
  ]
}
```

> **Note:** Currently the frontend uses hardcoded mock employee data. Once this endpoint is ready, the frontend will switch to fetching real employees.

---

## Database Schema Suggestion

### Table: `approval_flows`

| Column | Type | Description |
|--------|------|-------------|
| id | bigint | Primary key |
| hash_id | string | Public identifier |
| process_type | string | e.g. `"requisition"` |
| created_by | bigint | User who created |
| created_at | timestamp | |
| updated_at | timestamp | |

### Table: `approval_flow_steps`

| Column | Type | Description |
|--------|------|-------------|
| id | bigint | Primary key |
| approval_flow_id | bigint | FK → approval_flows |
| step | integer | Order (1, 2, 3, 4) |
| wing | string | Wing name |
| designation | string | Designation title |
| employee_id | bigint | FK → users/employees |
| employee_name | string | Denormalized name |
| created_at | timestamp | |
| updated_at | timestamp | |

---

## Example Approval Workflow Execution

When a requisition is submitted, the system should route it through the saved flow:

```
Requisition Created
       ↓
Step 1: Assistant Director (Exam Wing) — Muhammad Imran Khan
       ↓ Approve / Reject
Step 2: Deputy Director (Recruitment Wing I) — Khalid Mehmood
       ↓ Approve / Reject
Step 3: Director (Recruitment Wing II) — Dr. Farooq Ahmed
       ↓ Approve / Reject
Step 4: Secretary (Final Approval) — Raja Muhammad Arif
       ↓ Approve / Reject
Requisition Approved / Rejected
```

Each step should:
- Wait for the assigned employee to take action (approve/reject)
- If approved → move to next step
- If rejected → stop the flow and mark requisition as rejected
- Record remarks, timestamp, and actor at each step
