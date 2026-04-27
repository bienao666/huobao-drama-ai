---
Task ID: 1
Agent: main
Task: Fix git merge conflict, sync code, fix bugs, deploy to Vercel

Work Log:
- Checked git status: no merge conflict existed, repo was clean with just an initial commit
- Added git remote: https://github.com/dav-niu474/huobao-drama-ai.git
- Fetched and reset local to match remote/main (commit 6e267df)
- Generated Prisma client and pushed schema to SQLite
- Started dev server on port 3000
- Verified all API endpoints: /api/health, /api/dramas, /api/settings all working locally
- Found Vercel production database missing tables, ran force migration via POST /api/migrate?force=true
- Verified Vercel endpoints all returning 200 OK
- Fixed bug: episode-workspace.tsx used result.url instead of result.imageUrl (API returns imageUrl)
- Fixed bug: runSafeMigration() used PostgreSQL-specific DO $$ syntax that fails on SQLite
  - Added isPostgres() detection function
  - Used TIMESTAMP(3)/DATETIME based on database type
  - Used DOUBLE PRECISION/REAL based on database type
  - Only run foreign key constraint creation on PostgreSQL
- Ran lint check - all passed
- Committed and pushed to GitHub (commit 26dd4bb)
- Verified Vercel deployment completed successfully
- Tested creating drama and episode on Vercel - all working
- Cleaned up test data

Stage Summary:
- Git conflict resolved (was already resolved)
- Remote code synced to local
- Two bugs fixed: API field mismatch and SQLite/PostgreSQL dual-database compatibility
- Code pushed to GitHub and deployed to Vercel
- All endpoints verified working on both local and production
