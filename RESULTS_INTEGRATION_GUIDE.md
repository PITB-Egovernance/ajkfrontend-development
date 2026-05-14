# Results Module: Integration & Testing Guide

This document provides a technical overview and testing protocol for the Results Module integration in the AJK PSC Admin Portal.

---

## 1. Feature Overview
The module handles the end-to-end evaluation lifecycle:
- **Bulk CSV Import**: High-efficiency data pipeline with dry-run validation.
- **Award Management**: Interactive grid for Part-A (Academic) and Part-B (Interview) scores.
- **Merit Engine**: Automatic ranking calculation based on aggregate scores.
- **Publication**: Official Gazette generation (PDF) with verification QR codes.

## 2. Technical Architecture

### Backend (Laravel)
- **Service Layer**: 
    - `ImportPipelineService.php`: Handles chunked CSV processing and data mapping.
    - `PdfGeneratorService.php`: Manages DomPDF generation for Gazettes and Result Slips.
- **Request Validation**: 
    - `CSVImportRequest.php` & `CandidateResultSearchRequest.php`: Include **HashID Auto-Decoding** logic in `prepareForValidation()` to bridge frontend IDs with backend integers.
- **Models**:
    - `ReceivedApplication`: Implements `HasHashId` trait for secure identifier handling.

### Frontend (React)
- **Smart Routing**: Routes in `App.jsx` use optional `:jobId?` parameters to prevent 404s.
- **Navigation Guards**: Components (`ResultsViewPage`, `ImportResultsPage`, etc.) implement a fallback UI if no `jobId` is present in the context.
- **Data Mapping**: `ResultsViewPage` uses a format-agnostic mapper to handle both paginated and direct-array API responses.

---

## 3. Standard Testing Protocol (E2E)

Follow these steps to verify the complete data flow:

### Phase 1: Bulk Import
1. Navigate to **Results Dashboard**.
2. Click **Import** on a Job Card (e.g., Medical Officer).
3. Upload a standard CSV (see template).
4. Click **Preview**: Verify data displays correctly with "Ready" or "Error" status.
5. Click **Commit**: Verify data persists and the success toast appears.

### Phase 2: Scoring & Merit
1. Click **Award Entry** for the same job.
2. Enter academic/interview marks (Total must be ≤ 100).
3. Click **Merit Management**: Verify the **Merit Rank** is assigned correctly based on the updated aggregate scores.

### Phase 4: Output & Publication
1. Click **Publish** for the job.
2. Click **Gazette PDF** (top right).
3. **Verify**: The PDF must contain the Candidate Name, CNIC, Rank, and Official Gazette Reference.

---

## 4. Key Implementation Details
- **HashID Decoding**: All results-related endpoints support HashIDs. If a `jobId` like `8aj727pW3nQk` is sent, the backend translates it to its primary key (e.g., `1`) before querying.
- **Memory Efficiency**: CSV imports use Laravel's `LazyCollection` to process thousands of rows without crashing the server.
- **Data Robustness**: The frontend `ResultsViewPage` checks for multiple field names (`candidate_name`, `full_name`, `name`) to ensure candidate info is never hidden.

---
**Maintained by:** Antigravity (AI Architect)  
**Version:** 1.1.0  
**Status:** Integration Verified
