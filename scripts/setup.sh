#!/usr/bin/env bash
set -euo pipefail

echo "Astrozen setup script"
echo "====================="

if [ ! -d "/c/Users/jawad/Coding/Astrozen/Astrozen/.git" ]; then
  echo "ERROR: not inside Astrozen repo root"
  exit 1
fi

if ! command -v railway >/dev/null 2>&1; then
  echo "Installing Railway CLI..."
  npm install -g @railway/cli
fi

if ! command -v netlify >/dev/null 2>&1; then
  echo "Installing Netlify CLI..."
  npm install -g netlify-cli
fi

echo "Building frontend..."
cd Astrozen/Frontend
npm ci
npm run build
cd -

echo
echo "Expected secrets to set in GitHub:"
echo "  - RAILWAY_TOKEN"
echo "  - NETLIFY_AUTH_TOKEN"
echo "  - NETLIFY_SITE_ID"
echo
echo "Expected env vars on Railway backend:"
echo "  - DATABASE_URL"
echo "  - JWT_SECRET"
echo "  - OPENROUTER_API_KEY"
echo "  - GOOGLE_CLIENT_ID"
echo "  - GOOGLE_CLIENT_SECRET"
echo "  - GOOGLE_REDIRECT_URI"
echo "  - R2_ACCOUNT_ID"
echo "  - R2_ACCESS_KEY_ID"
echo "  - R2_SECRET_ACCESS_KEY"
echo "  - R2_BUCKET_NAME"
echo "  - R2_ENDPOINT"
echo "  - BACKEND_CORS_ORIGINS"
