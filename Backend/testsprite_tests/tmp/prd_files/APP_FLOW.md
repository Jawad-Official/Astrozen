# App Flow Reference

This document outlines the user flow and navigation structure for Astrozen, based on the implemented frontend routes and PRD requirements.

## 1. Authentication Flow

- **Entry Points:** `/login`, `/register`
- **Actions:**
  - User logs in or creates an account.
  - Upon success, redirects to `/dashboard` (or intended protected route).
  - Session managed via JWT (stored in cookies/localStorage).

## 2. Core Navigation (Layout)

The application uses a `DashboardLayout` containing:

- **Sidebar:** Primary navigation (Inbox, My Issues, Projects, Teams, Insights, Settings).
- **Header:** Global search (`Cmd+K`), Notifications, User Profile.
- **Main Content Area:** Renders the page content.

## 3. User Journeys

### A. Dashboard & Personal Work

- **Route:** `/` or `/dashboard`
- **Purpose:** Overview of assigned work and project updates.
- **Sub-views:**
  - **My Issues:** (`/my-issues`) List of issues assigned to the current user.
    - Filter by: Status (Todo/In Progress/Done), Priority.
  - **Inbox:** (`/inbox`) Notifications and updates requiring attention.

### B. Project Management

- **Route:** `/projects`
- **Flow:**
  1.  **Project List:** View all accessible projects.
      - _Action:_ Create New Project.
  2.  **Create Project / AI Architect Wizard:** (`/projects/new`)
      - **Step 1: Idea Input:** User inputs project idea (freeform text).
      - **Step 2: Refinement:** AI suggests improvements/clarifications. User edits and confirms.
      - **Step 3: Questionnaire:** AI asks 3-5 clarifying questions (e.g., Target Audience, Key Constraints).
      - **Step 4: Generation:** System generates:
        - **User Flow Diagram:** Visual map connecting all project pages.
        - **Kanban Tickets:** Core features converted to tasks (Todo/In Progress).
        - **Documentation Suite:** (6 Docs)
          1.  PRD
          2.  App Flow
          3.  Tech Stack
          4.  Frontend Guidelines
          5.  Backend Schema
          6.  Implementation Plan
  3.  **Project Details:** (`/projects/:projectId`)
      - **Overview:** Health, Status, Recent Updates.
      - **Board:** Kanban view of Issues.
      - **List:** List view of Issues.
      - **Timeline:** Gantt/Timeline view of Features and Milestones.
      - **Features:** List of features within the project.
      - **Settings:** Project configuration.

### C. Feature Development

- **Route:** `/projects/:projectId/features/:featureId` (or via `/features/` context)
- **Flow:**
  1.  **Feature Overview:** Status (Discovery -> Shipped), Owner, Priority.
  2.  **Specifications:** PRD docs, requirements.
  3.  **Milestones:** Track progress towards specific goals.
  4.  **Issues:** Linked implementation tasks.

### D. Issue Triage & Management

- **Route:** `/issues` (Global) or `/triage`
- **Flow:**
  1.  **Triage Queue:** (`/triage`) Incoming issues needing review.
      - _Actions:_ Accept, Decline, Duplicate.
  2.  **All Issues:** Global search and filter for all organizational issues.
  3.  **Issue Details:** (Modal or Page)
      - Edit Status, Priority, Assignee.
      - View/Add Comments.
      - View Linked PRs/Commits.
      - View Sub-issues.

### E. Team Management

- **Route:** `/teams`
- **Flow:**
  1.  **Team List:** View all teams.
  2.  **Team Details:** (`/teams/:teamId`)
      - Members.
      - Team Settings.
      - Active Projects.

## 4. IDE Integration (Zen Studio)

- **Route:** `/ide` (Web-based preview or external linkage)
- **Flow:**
  - Context-aware coding.
  - Sidebar shows Astrozen tasks/specs relevant to open files.

## 5. Settings

- **Route:** `/settings`
- **Sections:**
  - User Profile.
  - Organization Settings.
  - Integrations (GitHub, Slack).
  - Billing.
