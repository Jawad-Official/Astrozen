# Feature Specification: AI Idea Validator and Generator

**Feature Branch**: `001-ai-idea-validator`
**Created**: 2026-02-06
**Status**: Draft
**Input**: User description: "I want to add this AI feature: first the user entir the project idea, then the AI ask some qustions to make the idea very clear to ai then the ai gives the user a validation of the idea with 6 core pillars(market feasiblity analysis) and improvements suggestions, core features, best tech-stack, best pricing model after that the user edits on it if the user wants then confirming it, then AI will convert the idea into a user flow diagram connecting all of the project pages, and taking all core features and convert them to kanban tickets, and gives this 6 docs after asking the user a couple of qustions to create it: 1. PRD 2. App Flow 3. Tech Stack 4. Frontend Guidelines 5. Backend Schema 6. Implementation Plan the data like docs should be stored in cloudflare R2"

## Clarifications

### Session 2026-02-06
- Q: What format should the User Flow Diagram take for storage and rendering? → A: Option A - Mermaid / Structured (Rendered by frontend, editable text source)
- Q: What is the preferred generation strategy for the Validation Report? → A: Option A - Single Comprehensive (One large prompt requesting JSON with all fields)
- Q: How should AI prompts be managed and stored? → A: Option B - Service-Level (Prompts managed in a dedicated Backend service/config)
- Q: What is the authentication model for starting the process? → A: Option B - Authentication Required (Account/Login required for all features, including initial submission)
- Q: How should users securely access documents stored in Cloudflare R2? → A: Internal Access (Restricted to project members, admins, and team leaders; backend verifies permissions before serving).
- Q: What are the fallback behaviors if the AI fails to generate valid JSON? → A: Option A - Strict Schema + Retries (Enforce JSON Mode, retry on failure, then error).
- Q: How should loading states be handled for long-running AI generation? → A: Option A - Standard Polling (Frontend checks status endpoint every 3-5 seconds).
- Q: What is the maximum character limit for user input? → A: Unlimited (No hard cap enforced on the initial idea input).
- Q: What are the file naming conventions and formats for generated documents? → A: Auto-generated ({project_name}_{Type}) in PDF, Word (.docx), and Google Docs compatible formats.
- Q: How is the AI flow initiated? → A: Integrated into the "New Project" dialog. Users can choose "Plan with AI" (initiates AI wizard) or "Create Project" (manual creation).
- Q: What is the specific User Journey Flow for the AI Architect? → A: 4 Phases: 1. Input Phase (Q&A with progress bar), 2. Validation & Analysis (6 pillars), 3. Visual Blueprint (User Flow, Kanban, Dashboard), 4. 6 Docs Generating (Sequential: PRD -> App Flow -> Tech Stack -> Frontend Guide -> Backend Schema -> Implementation Plan).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Structured AI Planning Wizard (Priority: P1)

As a User, I want to be guided through a 4-phase project planning process, so that I don't feel overwhelmed by endless questions and receive a comprehensive project scaffold.

**Acceptance Scenarios**:

1. **Phase 1 (Input)**: **Given** the AI Wizard is open, **When** the AI asks clarifying questions, **Then** a progress bar indicates how close the user is to completing the discovery phase.
2. **Phase 2 (Validation)**: **Given** the input phase is complete, **When** the system generates the report, **Then** the user reviews 6 pillars: Market Feasibility, Improvements, Core Features, Tech Stack, and Pricing Model.
3. **Phase 3 (Blueprint)**: **Given** the validation is accepted, **When** the system proceeds, **Then** it generates a Mermaid User Flow diagram, a Kanban board of features, and a progress dashboard.
4. **Phase 4 (Docs Loop)**: **Given** the blueprint is ready, **When** the user starts document generation, **Then** the system generates 6 documents sequentially (PRD -> App Flow -> Tech Stack -> Frontend Guide -> Backend Schema -> Implementation Plan).

---

### User Story 2 - Sequential & Adaptive Document Generation (Priority: P1)

As a User, I want the AI to generate technical documents one by one using previous outputs as sources, with the ability to skip questions, so that I can have high-quality, consistent documentation with minimal effort.

**Acceptance Scenarios**:

1. **Given** the system is generating a specific document (e.g., App Flow), **When** the AI needs more details, **Then** it presents targeted questions to the user.
2. **Given** a document question is presented, **When** the user clicks "Skip", **Then** the AI automatically suggests and implements the best defaults without further input.
3. **Given** a document is generated (e.g., PRD), **When** the next document (e.g., App Flow) starts, **Then** the AI MUST use the previous document's content as a primary context source.
4. **Given** any document (generated or not), **When** viewed in the Project Page, **Then** the user can see a preview or click to (re)generate it individually.

---

### User Story 3 - Visual & Task Asset Generation (Priority: P2)

As a User, I want the system to automatically generate a user flow diagram and a set of Kanban tickets, so that I can visualize the application and start execution immediately.

**Why this priority**: transforms the conceptual idea into actionable project artifacts.

**Independent Test**: Can be tested by confirming an idea and verifying the output of a visual diagram and a list of tickets.

**Acceptance Scenarios**:

1. **Given** a confirmed project idea, **When** the generation process runs, **Then** a visual User Flow Diagram connecting project pages is displayed.
2. **Given** a confirmed project idea, **When** the generation process runs, **Then** a list of Kanban tickets representing core features is generated and displayed.

---

### User Story 4 - Comprehensive Documentation Generation (Priority: P3)

As a User, I want the system to generate and store 6 specific technical documents in the cloud, so that I have a complete project blueprint for development.

**Why this priority**: Provides the "Generator" value, creating long-term documentation assets.

**Independent Test**: Can be tested by verifying the creation of 6 specific files and their existence in the external storage.

**Acceptance Scenarios**:

1. **Given** the asset generation is complete, **When** the system prepares documentation, **Then** it asks a final set of questions to tailor the docs.
2. **Given** the user answers the documentation questions, **When** processing finishes, **Then** 6 documents (PRD, App Flow, Tech Stack, Frontend Guidelines, Backend Schema, Implementation Plan) are generated.
3. **Given** the documents are generated, **When** the process completes, **Then** they are uploaded to Cloudflare R2 and accessible links are provided.

### Edge Cases

- **AI JSON Generation Failure**: If the AI fails to return valid JSON for the Validation Report, the system will perform 1-2 automated retries using strict JSON mode. If retries fail, a graceful error message is shown to the user.
- **Extreme Input Length**: Since input is unlimited, the system will implement server-side chunking or truncation for the AI model's context window limits if necessary, while preserving the full original input in the database.
- **Session Expiry**: If a user's session expires while waiting for AI generation (long-running task), the system MUST allow the user to resume monitoring the task status upon re-authentication without data loss.
- **Partial Generation Failure**: If some documents fail to generate while others succeed, the system MUST allow the user to retry specifically the failed assets.
- **AI Service Error Messages**: 
  - Service Unavailable: "AI service is currently busy. Please try again in a few minutes."
  - Policy Violation: "Your idea cannot be processed as it violates our safety guidelines."
- What happens when the AI service is unavailable during the Q&A loop?
- How does the system handle network errors when uploading to Cloudflare R2?
- What happens if the user provides an idea that violates safety guidelines?
- How does the system handle extremely long or complex user inputs?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST accept natural language input for a project idea.
  - **Clarification**: System MUST accept unlimited input but internally chunk text into segments compatible with the AI model's context window (e.g., 128k tokens), processing chunks sequentially or summarily if the input exceeds limits.
  - **Integrity**: System MUST preserve the full original raw input in the database for reference, even when using chunked/summarized versions for AI processing.
- **FR-002**: System MUST support an interactive Q&A workflow where the AI asks follow-up questions to clarify the idea.
- **FR-003**: System MUST generate a Validation Report containing: Market Feasibility Analysis (6 pillars), Improvement Suggestions, Core Features, Recommended Tech Stack, and Pricing Model.
  - **Clarification**: The report MUST be generated using a **Single Comprehensive Prompt** strategy returning structured JSON to ensure consistency and lower latency.
  - **Retry UI**: System MUST display a "Refining response..." status to the user when performing automated retries due to JSON parsing failures.
- **FR-004**: System MUST allow the user to edit and update the project idea/details after viewing the validation report.
- **FR-005**: System MUST require user confirmation of the idea before proceeding to asset generation.
- **FR-006**: System MUST generate a User Flow Diagram visualizing connections between project pages.
  - **Clarification**: Diagrams MUST be generated in **Mermaid.js** format (text-based) to allow frontend rendering and future editing.
- **FR-007**: System MUST generate a set of Kanban tickets derived from the defined core features.
  - **Visual Style**: Kanban tickets MUST use a Zinc-themed UI with color-coded priority indicators: Critical (Red), P1 (Orange), P2 (Blue), P3 (Gray).
- **FR-008**: System MUST prompt the user for specific details required to generate the final documentation set.
- **FR-009**: System MUST generate the following 6 documents in **PDF and Word (.docx)** formats (compatible with Google Docs). Files MUST use the naming convention `{project_name}_{DocumentType}` (e.g., `MyProject_PRD.docx`).
  - **Constraints**: Files MUST NOT exceed 10MB each.
  - **Compatibility**: Documents MUST use standard system fonts and simple layouts (avoiding complex nested tables) to ensure full compatibility when opened in Google Docs.
  1. Product Requirements Document (PRD)
  2. App Flow Document
  3. Tech Stack Document
  4. Frontend Guidelines
  5. Backend Schema
  6. Implementation Plan.
- **FR-010**: System MUST store the generated documents in Cloudflare R2.
  - **Clarification**: Document access MUST be restricted via the backend to authenticated **Project Members, Admins, or Team Leaders**. The system will verify permissions before serving the asset.
  - **Permissions**: System MUST verify that the requesting user has 'View' permissions (Member role or higher) for the specific project before generating a signed URL.
  - **Retention**: System MUST retain generated assets in R2 for 365 days unless manually deleted by an authorized administrator.
- **FR-011**: System MUST provide the user with access (links or UI view) to the stored documents and generated assets.
- **FR-012**: System MUST manage AI prompts at the **Service-Level** (backend/config) to ensure frontend-independence and ease of updates.
- **FR-013**: System MUST require **Authentication/Account login** for all features, including the initial idea submission and validation process.
  - **Redirect**: System MUST redirect unauthenticated users attempting to access idea submission or validation pages to the login page, preserving the intended destination for post-login redirection.
- **FR-014**: System MUST provide a status polling mechanism for the frontend to track long-running AI generation tasks.
  - **Interval**: Frontend MUST poll the status endpoint every 3-5 seconds.
  - **Timeout**: System MUST time out generation tasks that exceed 5 minutes, marking them as 'Failed' and notifying the user.

### Key Entities *(include if feature involves data)*

- **Project Idea**: Stores the user's initial input and refined description.
- **Validation Report**: Contains the analysis, pillars, and suggestions.
- **User Flow Diagram**: Visual representation of the app navigation.
- **Kanban Ticket**: Represents a unit of work/feature.
- **Project Document**: Represents one of the 6 generated files stored externally.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users receive the 6-pillar validation report within 60 seconds of completing the clarification Q&A.
- **SC-002**: 100% of confirmed projects generate all 6 required documentation types.
- **SC-003**: Generated User Flow Diagrams correctly link at least 90% of the pages mentioned in the project description.
- **SC-004**: All generated documents are successfully uploaded to Cloudflare R2 and are retrievable.