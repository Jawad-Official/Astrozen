# API Contracts

## Endpoints

### 1. Project Ideas

#### `POST /api/v1/ideas`
Create a new project idea.
- **Auth**: Required
- **Input**: `{ "raw_input": "My awesome app idea..." }`
- **Output**: `{ "id": "uuid", "status": "draft" }`

#### `GET /api/v1/ideas/{id}`
Get idea details and status.
- **Auth**: Required (Owner/Admin)
- **Output**: `ProjectIdea` schema

#### `POST /api/v1/ideas/{id}/clarify`
Submit answer to AI question.
- **Input**: `{ "answer": "..." }`
- **Output**: `{ "next_question": "...", "is_complete": boolean }`

#### `GET /api/v1/ideas/{id}/validation`
Get the validation report (polling endpoint).
- **Output**: `ValidationReport` schema or `{ "status": "processing" }`

#### `POST /api/v1/ideas/{id}/confirm`
Confirm idea and start asset generation.
- **Input**: `{ "refined_input": "..." }` (Optional edits)
- **Output**: `{ "status": "generating_assets" }`

### 2. Assets

#### `GET /api/v1/ideas/{id}/assets`
List generated assets.
- **Output**: `[ { "id": "...", "type": "PRD", "format": "pdf", "name": "MyProject_PRD.pdf" } ]`

#### `GET /api/v1/assets/{asset_id}/download`
Get secure download link.
- **Auth**: Required (Member/Admin)
- **Output**: `{ "url": "https://r2.cloudflare...signed...", "expires_at": "..." }`

## Schemas (JSON)

### ValidationReport
```json
{
  "market_analysis": {
    "viability": "High",
    "target_audience": "...",
    "competitors": [...]
  },
  "core_features": [
    { "name": "Feature A", "priority": "P1" }
  ],
  "tech_stack": {
    "frontend": "React",
    "backend": "FastAPI"
  }
}
```
