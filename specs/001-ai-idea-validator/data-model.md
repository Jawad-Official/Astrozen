# Data Model

## Database Schema (SQLAlchemy/SQLModel)

### `ProjectIdea`
Represents the core project concept submitted by the user.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, Index | Unique Identifier |
| `user_id` | UUID | FK(users.id), Index | Owner of the idea |
| `title` | String | Nullable | Auto-generated or user-defined title |
| `raw_input` | Text | Not Null | The user's original/chunked input (Unlimited) |
| `refined_description` | Text | Nullable | AI-refined description after Q&A |
| `status` | Enum | Default='draft' | `draft`, `validating`, `validated`, `confirmed`, `generating_assets`, `completed` |
| `created_at` | DateTime | Default=Now | |
| `updated_at` | DateTime | OnUpdate=Now | |

### `ValidationReport`
Stores the structured output of the AI validation process.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | |
| `project_idea_id` | UUID | FK(project_ideas.id), Unique | One-to-one with ProjectIdea |
| `market_analysis` | JSON | Not Null | 6 pillars data |
| `core_features` | JSON | Not Null | List of features |
| `tech_stack` | JSON | Not Null | Recommended stack |
| `pricing_model` | JSON | Not Null | Pricing strategy |
| `improvements` | JSON | Not Null | List of suggestions |
| `created_at` | DateTime | Default=Now | |

### `ProjectAsset`
Tracks generated documents and artifacts stored in R2.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | |
| `project_idea_id` | UUID | FK(project_ideas.id), Index | Parent project |
| `asset_type` | Enum | Not Null | `PRD`, `APP_FLOW`, `TECH_STACK`, `FRONTEND_GUIDE`, `BACKEND_SCHEMA`, `IMPL_PLAN`, `DIAGRAM_MERMAID` |
| `storage_path` | String | Not Null | R2 Key (e.g., `projects/{id}/docs/{name}.pdf`) |
| `file_format` | String | Not Null | `pdf`, `docx`, `md` |
| `created_at` | DateTime | Default=Now | |

## Enum Definitions

### `IdeaStatus`
- `DRAFT`: Initial state, Q&A in progress.
- `VALIDATING`: AI is generating the report.
- `VALIDATED`: Report ready, waiting for user confirmation.
- `CONFIRMED`: User accepted the idea.
- `GENERATING_ASSETS`: Background task creating docs/diagrams.
- `COMPLETED`: All assets generated.

### `AssetType`
- `PRD`
- `APP_FLOW`
- `TECH_STACK`
- `FRONTEND_GUIDE`
- `BACKEND_SCHEMA`
- `IMPL_PLAN`
- `DIAGRAM_MERMAID`