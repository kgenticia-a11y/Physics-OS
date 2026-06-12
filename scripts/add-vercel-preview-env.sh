#!/usr/bin/env bash
# Copies all required env vars from Development to Preview environment in Vercel.
# Run this once after initial Vercel setup:  bash scripts/add-vercel-preview-env.sh
#
# Prerequisites: vercel CLI installed and logged in (vercel login)

set -e

echo "Adding env vars to Vercel Preview environment..."

for VAR in NEXT_PUBLIC_SUPABASE_URL NEXT_PUBLIC_SUPABASE_ANON_KEY GEMINI_API_KEY SUPABASE_SERVICE_ROLE_KEY NEXT_PUBLIC_APP_URL; do
  # Pull the value from the local .env.local file
  VALUE=$(grep "^${VAR}=" .env.local 2>/dev/null | cut -d'=' -f2-)
  if [ -z "$VALUE" ]; then
    echo "  ⚠  $VAR not found in .env.local — skipping"
    continue
  fi
  echo "  → $VAR"
  echo "$VALUE" | vercel env add "$VAR" preview --yes 2>/dev/null || \
    vercel env add "$VAR" preview --force --yes < <(echo "$VALUE") 2>/dev/null || \
    echo "     (already exists or requires manual add in Vercel dashboard)"
done

echo ""
echo "Done. Verify with: vercel env ls"
