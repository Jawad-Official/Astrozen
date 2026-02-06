# Quickstart Guide: AI Idea Validator

## Prerequisites
1. **Backend**:
   - Python 3.11+
   - PostgreSQL running
   - Environment variables set: `OPENAI_API_KEY`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`.
2. **Frontend**:
   - Node.js 18+
   - `npm install` completed

## Running the Feature

1. **Start Backend**:
   ```bash
   cd Backend
   source venv/bin/activate
   alembic upgrade head  # Apply new migrations
   uvicorn app.main:app --reload
   ```

2. **Start Frontend**:
   ```bash
   cd Frontend
   npm run dev
   ```

3. **Test Flow**:
   - Log in to the application.
   - Navigate to `/ideas/new`.
   - Enter a project idea (e.g., "A dog walking uber app").
   - Answer the AI's follow-up questions.
   - Wait for the Validation Report (~30-60s).
   - Review the report and click "Confirm & Generate Assets".
   - Wait for assets to generate.
   - Download the generated PDF/Docx files.

## Troubleshooting
- **AI Timeout**: Check backend logs for OpenAI API latency.
- **R2 Errors**: Verify `R2_BUCKET_NAME` matches your Cloudflare bucket.
- **Mermaid Rendering**: Ensure the generated mermaid syntax is valid (check browser console).