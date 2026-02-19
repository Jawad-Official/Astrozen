# Astrozen Notification System Plan

This document outlines the notification types, triggers, and implementation strategy for converting mock notifications into a real, functional system.

## 1. Notification Types & Triggers

### A. Issue Management
| Type | Trigger | Content Example |
| :--- | :--- | :--- |
| `ISSUE_ASSIGNED` | User is assigned to an issue | "Sarah assigned you to 'Implement real-time collaboration'" |
| `ISSUE_STATUS_CHANGED` | Status of an assigned/watched issue changes | "Issue AST-123 moved to 'In Review'" |
| `ISSUE_COMMENT` | Someone comments on an issue user is involved in | "Alex commented: 'I think we should use a drawer here.'" |
| `ISSUE_MENTION` | User is mentioned in a description or comment | "Sarah mentioned you in AST-123" |
| `ISSUE_PRIORITY_UPGRADE` | Issue priority changed to High/Urgent | "AST-456 escalated to Urgent priority" |

### B. AI Validator & Planner
| Type | Trigger | Content Example |
| :--- | :--- | :--- |
| `AI_VALIDATION_READY` | Phase 2 report generation finishes | "Market Validation for 'Astrozen Mobile' is ready" |
| `AI_BLUEPRINT_READY` | Phase 3 visual blueprint generation finishes | "System Architecture for 'Project X' has been generated" |
| `AI_DOC_GENERATED` | A technical document (PRD, etc.) is ready | "PRD for 'Project X' is now available for download" |
| `AI_ISSUES_CREATED` | Mass-generation of issues from a blueprint node complete | "5 issues generated for 'Authentication' component" |

### C. Team & Organization
| Type | Trigger | Content Example |
| :--- | :--- | :--- |
| `TEAM_INVITE` | User is invited to a new team | "You have been invited to join Team Alpha" |
| `TEAM_MEMBER_JOINED` | Someone joins a team user belongs to | "John Doe joined Team Alpha" |
| `ORG_ROLE_CHANGED` | User's role in organization is updated | "Your role in 'Astrozen Corp' changed to Admin" |

## 2. Technical Strategy

### Backend (Python/FastAPI)
1.  **Database Model**: Create a `Notification` table.
    - `id`: UUID
    - `recipient_id`: UUID (Foreign Key to User)
    - `actor_id`: UUID (Optional, User who triggered the action)
    - `type`: Enum (as defined above)
    - `target_id`: String (e.g., Issue ID, Project ID)
    - `target_type`: String (e.g., 'issue', 'project', 'ai_idea')
    - `title`: String
    - `content`: Text
    - `is_read`: Boolean (default False)
    - `created_at`: DateTime
2.  **Service Layer**:
    - `notification_service.notify_user(...)`: Main helper to create notification records.
    - `notification_service.mark_as_read(notification_id)`
3.  **Hooks/Signals**: 
    - Integrate `notify_user` calls inside existing services: `issue_service`, `ai_service`, `organization_service`.
4.  **API Endpoints**:
    - `GET /api/v1/notifications`: List recent notifications for current user.
    - `PATCH /api/v1/notifications/{id}/read`: Mark single read.
    - `POST /api/v1/notifications/read-all`: Mark all as read.

### Frontend (React/TypeScript)
1.  **State Management**:
    - Refactor `Frontend/src/store/issueStore.ts` or create `notificationStore.ts`.
    - Fetch real notifications on app load and periodically.
2.  **Real-time Updates**:
    - Short-term: Polling (every 30-60s).
    - Long-term: WebSocket implementation for instant push.
3.  **UI Components**:
    - Ensure the existing notification bell/dropdown renders the new data structure.
    - Add "Mark as Read" functionality.

## 3. Implementation Phases
1.  **Phase 1**: Backend Model & Migration.
2.  **Phase 2**: Notification Service & API Endpoints.
3.  **Phase 3**: Integrating triggers into existing business logic.
4.  **Phase 4**: Frontend store refactoring and API wiring.
