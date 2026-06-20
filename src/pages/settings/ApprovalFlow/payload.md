# Requisition Approval Flow — Submission Payload

## Payload Structure

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

## Field Descriptions

| Field | Type | Description |
|-------|------|-------------|
| `process_type` | string | Hardcoded as `"requisition"` |
| `assignments` | array | Ordered list of approval steps |
| `assignments[].step` | number | Step order (user can reorder via drag) |
| `assignments[].wing` | string | Selected wing name |
| `assignments[].designation` | string | Assigned designation |
| `assignments[].employee` | string | Selected employee name |

## Rules

- Maximum 3 wing assignments (Assistant Director, Deputy Director, Director)
- Each designation can only be assigned once across all wings
- Each wing can have only one designation
- Each designation has only one employee selected
- Secretary is always the final step (not changeable)
- Step order is customizable via drag-and-drop (except Secretary)

## Available Wings

1. Exam Wing
2. Recruitment Wing I
3. Recruitment Wing II
4. Admin Wing
5. Research Wing
6. Litigation Wing
7. IT Wing

## Available Designations (per wing)

1. Assistant Director
2. Deputy Director
3. Director

## Fixed Final Step

- **Secretary** — always appended as the last step with `"wing": "Final Approval"`
