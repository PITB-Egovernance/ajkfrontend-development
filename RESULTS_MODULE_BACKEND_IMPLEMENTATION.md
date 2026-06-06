# Results Module: Backend Implementation Plan
**Project:** AJK PSC Admin Portal  
**Architecture:** Laravel (PHP 8.3+) + MySQL  
**Pattern:** Controller -> Service -> Repository

---

## 1. Backend Module Overview
The Results Module backend provides a secure, high-performance API for managing the evaluation lifecycle. It handles complex business logic including merit ranking, quota-based rotation, and mass data processing.

---

## 2. Database Design

### Core Tables

#### `exam_results`
| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | BIGINT (PK) | Primary Key |
| `application_id` | BIGINT (FK) | Reference to candidate application |
| `job_post_id` | BIGINT (FK) | Reference to job |
| `exam_date` | DATE | Date of written test |
| `result_type` | ENUM | `detailed`, `summary` |
| `total_marks` | INT | Maximum possible marks |
| `obtained_marks` | FLOAT | Total obtained |
| `status` | ENUM | `pass`, `fail`, `absent`, `withheld` |
| `is_published` | BOOLEAN | Visibility status |

#### `interview_awards`
- Stores Academic (Part-A) and Interview (Part-B) scores.
- Includes `marks_matric`, `marks_intermediate`, `marks_graduation`, `marks_masters`.
- Includes `marks_interview`, `district`, and `interview_date`.

#### `merit_audit_log`
- Tracks every change to a candidate's merit position.
- Stores `old_value`, `new_value`, `reason`, and `actor_id`.

---

## 3. Laravel Architecture Planning

### Models
- `ExamResult`: Main result record.
- `InterviewAward`: Academic/Interview breakdown.
- `ResultPublication`: Batch records for public releases.

### Repositories
- `ExamResultRepository`: Handles complex queries like "Get Top N candidates for Job X".
- `AwardRepository`: Manages CRUD for interview scores.

### Services
- `ResultCalculationService`: Logic for percentage calculation and status auto-determination.
- `MeritRotationService`: Complex logic for applying regional/district quotas and ranking candidates.
- `ImportService`: Manages CSV parsing, validation, and batch insertion.

---

## 4. Business Logic & Rules

### Merit Ranking
1. **Primary Sort:** Total Obtained Marks (Written + Interview).
2. **Secondary Sort (Tie-break):** Academic scores (Part-A).
3. **Tertiary Sort (Tie-break):** Seniority in age (DOB).

### Quota Logic
- Automated allocation of candidates to General Merit, District Quota, and Minority/Women quotas based on their residence and job specifications.

---

## 5. CSV Import Architecture
- **Queueing:** Large files are processed via Laravel Jobs (`ProcessResultImport`).
- **Dry-Run:** The API supports a `dry_run` flag which executes all validations without committing to the database.
- **Validation Pipeline:**
    1. Row format check.
    2. Candidate/Application existence check.
    3. Range check (Marks cannot exceed Max).

---

## 6. PDF Generation Strategy
- **Library:** `barryvdh/laravel-dompdf` or `spatie/browsershot`.
- **Security:** Official results are watermarked and include a unique QR code for verification.
- **Storage:** PDFs are generated on-the-fly or cached in S3 for high-traffic public releases.

---

## 7. Security & Concurrency
- **Middleware:** Use the existing `RoleMiddleware` in `api.php` (e.g., `middleware('role:admin,secretary')`).
- **Policies:** `ExamResultPolicy` to ensure only `admin` or `director` can modify finalized results.
- **Atomic Transactions:** Using `DB::transaction` during merit rotation and publication to prevent data inconsistency.
- **Optimistic Locking:** Using a `version` or `updated_at` check to prevent two admins from overwriting result edits simultaneously.

---

## 8. Backend Development Order
1. **Phase 1:** Migrations and core Eloquent models.
2. **Phase 2:** Base Repositories and CRUD Controllers.
3. **Phase 3:** CSV Import pipeline and Queue configuration.
4. **Phase 4:** Merit Calculation and Quota logic.
5. **Phase 5:** PDF Export services.
6. **Phase 6:** Event listeners for Notifications (SMS/Email).
