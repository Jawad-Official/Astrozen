# Implementation Plan

Based on the Product Requirements Document (PRD) and current codebase state.

## Phase 1: MVP Core (Current Phase)

**Goal:** Functional Project Planning and Issue Management.

- [x] **Authentication:** User Signup/Login (JWT).
- [x] **Project Management:** Create/View Projects.
- [x] **Database Schema:** Core models (Project, Feature, Issue).
- [ ] **Feature Planning:**
  - [ ] Implement Feature creation UI.
  - [ ] Link Issues to Features.
- [ ] **Issue Board:**
  - [ ] Drag-and-drop Kanban board.
  - [ ] Issue Details modal/page.
- [ ] **AI Blueprint & Architect:**
  - [ ] **Idea Refinement Loop:** Chat interface for clarifying project idea.
  - [ ] **Doc Generation Engine:**
    - [ ] Prompt engineering for specific doc types (App Flow, Schema, etc.).
    - [ ] Output parser to save as `Document` entities.
    - [ ] Support for the "Big 6" Docs: PRD, App Flow, Tech Stack, Frontend Guidelines, Backend Schema, Implementation Plan.
  - [ ] **Visual Generation:**
    - [ ] Text-to-Mermaid/ReactFlow conversion for User Flow diagrams.
  - [ ] **Ticket Conversion:**
    - [ ] Parser to convert Feature list -> Kanban Issues.

## Phase 2: Enhanced Collaboration

**Goal:** Enable real-time teamwork and deeper documentation.

- [ ] **Real-time Sync:**
  - [ ] Implement WebSockets (e.g., via specialized service or basic polling first).
  - [ ] Live cursors/presence on Board/Docs.
- [ ] **Documentation System:**
  - [ ] Markdown Editor implementation (TipTap/Slate).
  - [ ] Template system for PRDs/RFCs.
- [ ] **Notifications:**
  - [ ] In-app notification center.
  - [ ] Email digests (SendGrid/Resend).

## Phase 3: Zen Studio & Advanced Tech

**Goal:** Integrated Developer Experience.

- [ ] **IDE Integration:**
  - [ ] VS Code Extension prototype.
  - [ ] API endpoints for "My Tasks" fetching from IDE.
- [ ] **Metrics & Analytics:**
  - [ ] Dashboard charts (Burndown, Velocity).
  - [ ] Feature delivery confidence scoring.

## Phase 4: Enterprise & Scale

**Goal:** Security and Organization management.

- [ ] **RBAC:** Detailed permission sets (Admin vs Editor vs Viewer).
- [ ] **SSO:** Enterprise login (SAML/Updated OAuth).
- [ ] **Audit Logs:** Activity tracking table.

## Immediate Next Steps (Recommendation)

1.  Complete the **Issue Board** frontend implementation to ensure the core loop (Plan -> Track) is functional.
2.  Implement the **Feature** detail view to categorize issues.
3.  Connect the **AI Generation** endpoint to the Project Creation flow.
