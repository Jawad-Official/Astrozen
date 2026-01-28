# Product Requirements Document: Backend API Testing with TestSprite

## 1. Overview

The purpose of this document is to define the testing requirements for the SwiftFlow (Linear clone) backend API. The test suite should validate the core hierarchical architecture, data integrity, security, and performance across all primary modules.

**Backend Stack:**

- **Language:** Python 3.11+
- **Framework:** FastAPI
- **Database:** PostgreSQL (SQLAlchemy ORM)
- **Auth:** OAuth2 with Password Flow & JWT

## 2. Core Hierarchy & Data Model

Testing must strictly enforce the following object hierarchy:

1.  **Organization**: Top-level container.
2.  **Team**: Multiple teams within an organization.
3.  **Project**: High-level initiative belonging to a **Team**.
4.  **Feature**: A domain-specific delivery goal belonging to a **Project**.
5.  **Issue**: A specific task or bug belonging to a **Feature**.
    - _Constraint:_ An Issue **cannot** exist without a parent Feature.
    - _Constraint:_ A Project no longer has a direct relationship with Issues.

## 3. Testing Scope (API Modules)

### 3.1 Authentication & User Management

- **Endpoints:** `POST /auth/register`, `POST /auth/login`, `GET /auth/me`
- **Validation:**
  - Registration with valid/invalid emails.
  - Login returns valid JWT `access_token`.
  - Protected endpoints return `401 Unauthorized` without a token.
  - User profiles correctly map to organizations.

### 3.2 Organizations & Teams

- **Endpoints:** `/organizations/*`, `/teams/*`
- **Validation:**
  - Creation of organizations and teams.
  - Invite code generation and verification.
  - Team membership management (Lead, members).

### 3.3 Project Management

- **Endpoints:** `/projects/*` (GET, POST, PATCH, DELETE)
- **Validation:**
  - Create project with metadata (icon, color, health).
  - Update project status (backlog -> in_progress -> completed).
  - Authorization: Ensure users cannot view projects from other organizations.

### 3.4 Feature Delivery (Strategy Layer)

- **Endpoints:** `/features/*`, `/features/{id}/milestones`
- **Validation:**
  - Feature creation requiring a valid `project_id`.
  - Automated status updates.
  - **Milestone lifecycle:** Target dates and completion toggles.

### 3.5 Issue Tracking (Execution Layer)

- **Endpoints:** `/issues/*`, `/issues/{id}/comments`, `/issues/{id}/activities`
- **Validation:**
  - Issue creation requiring a valid `feature_id`.
  - Status transitions (Backlog -> Todo -> In Progress -> Done).
  - Triage logic (assigning `triage_status`).
  - Filtering issues by assignee, feature, or project (via feature-join).
  - Labeling and unlabeling issues.

## 4. Key Test Scenarios

### 4.1 Happy Path: The Delivery Graph

1.  Register and login as a new user.
2.  Create an Organization and a Team.
3.  Create a Project ("Mobile App") for that Team.
4.  Create a Feature ("Dark Mode") for that Project.
5.  Create 3 Issues for "Dark Mode".
6.  List Issues for the Project "Mobile App" and verify all 3 issues appear.
7.  Complete all 3 Issues and verify Feature health remains consistent.

### 4.2 Edge Cases & Error Handling

- **Missing Parents:** Attempt to create a Feature without a `project_id` (Expect `422`).
- **Orphan Issues:** Attempt to create an Issue without a `feature_id` (Expect `422`).
- **Duplicate Identifiers:** Ensure issue identifiers (e.g., ENG-1) are unique across the team.
- **Cascade Deletes:** Verify that deleting a Project deletes its Features, and deleting a Feature deletes its Issues/Milestones.

### 4.3 Security & Authorization

- **Cross-Org Access:** User A in Org 1 tries to GET an issue from User B in Org 2 (Expect `403/404`).
- **Inactive Users:** Ensure inactive users cannot perform write operations.

## 5. Technical Requirements for TestSprite

- **Base URL:** `http://localhost:8000/api/v1`
- **Headers:** `Authorization: Bearer <token>`
- **Content Type:** `application/json`
- **Login Mechanism:** The `/auth/login` endpoint accepts `username` (which is the email) and `password` in `multipart/form-data` format (standard OAuth2 flow).

## 6. Success Metrics

- **Coverage:** 90%+ of endpoints covered.
- **Reliability:** 0% flaky tests in stable environment.
- **Performance:** All GET requests for list views return in < 200ms.
