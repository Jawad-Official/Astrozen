# Phase 0: Research Findings

## 1. Cloudflare R2 Integration
**Decision**: Use `boto3` with S3-compatible configuration.
**Rationale**: Cloudflare R2 provides an S3-compatible API. `boto3` is the industry standard Python SDK for S3 interactions.
**Implementation**:
- Configure `boto3.client('s3', ...)` with R2 credentials.
- **Access Control**: Instead of generating public/presigned URLs for direct sharing, the backend will verify user permissions (Admin/Team Leader/Member) and then either stream the content or generate a short-lived (1 hour) presigned URL for the authenticated user to download.

## 2. AI Service & Prompt Management
**Decision**: Implement `AiService` using `openai` SDK with a `PromptManager` class.
**Rationale**: dedicated service isolates AI logic. `PromptManager` (FR-012) allows prompt versioning without code changes.
**Implementation**:
- `AiService` handles API calls, JSON mode enforcement, and retry logic (1-2 retries) for malformed JSON.
- `PromptManager` loads prompts from config.
- **Strategy**: "Single Comprehensive Prompt" for Validation Report to ensure consistency.

## 3. Real-time Feedback & Polling
**Decision**: Use **Standard Polling**.
**Rationale**: Simple to implement, works well with the 60-second target (SC-001), and avoids WebSocket complexity.
**Implementation**:
- Frontend polls `GET /api/v1/ideas/{id}/status` every 3-5 seconds.
- Backend uses `BackgroundTasks` to handle AI generation asynchronously.

## 4. Mermaid Rendering
**Decision**: Use `mermaid` (official library) directly in React.
**Rationale**: Direct usage offers better control than wrappers.
**Implementation**:
- `MermaidRenderer` component initializes mermaid and renders text-based diagrams.

## 5. Authentication Flow
**Decision**: **Mandatory Authentication**.
**Rationale**: Per updated FR-013, all features require login. This simplifies state management (no anonymous sessions) and secures the AI/R2 resources.
**Implementation**:
- Frontend redirects unauthenticated users to Login/Register before accessing the "New Idea" page.
- All API endpoints (`/api/v1/ai/*`, `/api/v1/ideas/*`) require `current_user` dependency.

## 6. Document Generation & Storage
**Decision**: Auto-generated filenames, permission-based access.
**Rationale**: Ensures consistency and security.
**Implementation**:
- Files: `{project_name}_{Type}.pdf/docx`.
- Access: `GET /api/v1/assets/{id}/download` checks permissions -> returns presigned URL.