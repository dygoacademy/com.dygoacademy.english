---
name: dygo-uat-deployment
description: Complete guide for deploying Dygo Academy to UAT environment using watch-deploy.js
---

# Dygo Academy UAT Deployment Guide

**Status**: Ready for deployment | **Environment**: UAT | **Automation**: watch-deploy.js

---

## Quick Start (TL;DR)

```bash
# 1. Ensure watch-deploy watcher is running
pm2 list | grep deploy-watcher

# 2. Trigger a deploy (from repo root or anywhere)
echo "deploy: UI-4 interval previews on rating buttons" > deploy/request.md

# 3. Monitor progress
tail -f deploy/log.md

# 4. Verify deployment
pm2 status
```

---

## Prerequisites

### 1. Node.js & pm2

```bash
# Check Node.js version (should be v14+)
node --version

# Install pm2 globally (if not already)
npm install -g pm2

# Verify pm2 is installed
pm2 --version
```

### 2. pm2 Processes Configured

The watch-deploy.js script restarts two pm2 processes:
- `dygo-backend` — the NestJS backend service
- `dygo-frontend` — the Next.js frontend service

**Check if they exist:**

```bash
pm2 list
```

You should see output like:

```
│ id  │ name             │ namespace   │ version  │ mode    │ ┌─────────┐
├─────┼──────────────────┼─────────────┼──────────┼─────────┤ │ status  │
│ 0   │ dygo-backend     │ default     │ 1.0.0    │ fork    │ │ online  │
│ 1   │ dygo-frontend    │ default     │ 1.0.0    │ fork    │ │ online  │
```

**If they don't exist yet, create them:**

```bash
# In the backend directory
cd /Users/dylan/dygo/com.dygoacademy.english/com.dygoacademy.backend
pm2 start "npm run start:prod" --name dygo-backend

# In the frontend directory (new terminal)
cd /Users/dylan/dygo/com.dygoacademy.english/com.dygoacademy.frontend
pm2 start "npm run start" --name dygo-frontend

# Save pm2 configuration for restart persistence
pm2 save
```

### 3. watch-deploy.js Running

The watch-deploy.js script monitors the `deploy/` folder and automatically triggers the deployment pipeline.

**Start the watcher:**

```bash
# Option A: In a terminal (foreground)
node /Users/dylan/dygo/com.dygoacademy.english/watch-deploy.js

# Option B: Via pm2 (background, persistent)
pm2 start /Users/dylan/dygo/com.dygoacademy.english/watch-deploy.js --name deploy-watcher
pm2 save
```

**Verify the watcher is running:**

```bash
pm2 list | grep deploy-watcher
```

You should see it with status `online`.

---

## How to Deploy to UAT

### Step 1: Commit Your Changes

All code changes must be committed to git before deploying:

```bash
cd /Users/dylan/dygo/com.dygoacademy.english

# Check status
git status

# Stage and commit
git add .
git commit -m "Your commit message"

# Verify commits are in the log
git log --oneline -5
```

### Step 2: Create a Deploy Request

The watch-deploy script works by monitoring `deploy/request.md`. When this file contains more than 3 characters of text, it triggers the deployment pipeline.

**Create the request:**

```bash
cd /Users/dylan/dygo/com.dygoacademy.english

# Example deploy requests:
echo "deploy: UI-4 interval previews on rating buttons" > deploy/request.md
# or
echo "deploy: fix login bug + zh-CN translations" > deploy/request.md
# or
echo "deploy: backend FSRS calculation, frontend display integration" > deploy/request.md
```

**What to put in the request:**
- A brief description of what's being deployed
- Reference feature/UI changes, bug fixes, or backend updates
- 4+ characters (the minimum to trigger a deploy)

### Step 3: Monitor the Deployment

The watch-deploy watcher detects the request and starts the deployment pipeline. Monitor progress in real-time:

```bash
# Watch the deployment log as it happens
tail -f /Users/dylan/dygo/com.dygoacademy.english/deploy/log.md
```

**What to expect:**

```
[2026-09-29T20:25:00.000Z] == request.md found — starting deploy ==
[2026-09-29T20:25:00.000Z] Copied request -> deploy.md
[2026-09-29T20:25:05.000Z] -- Step 1/4: Build backend --
[2026-09-29T20:25:15.000Z]    ✓ Build backend — no errors
[2026-09-29T20:25:20.000Z] -- Step 2/4: Build frontend --
[2026-09-29T20:25:45.000Z]    ✓ Build frontend — no errors
[2026-09-29T20:25:50.000Z] -- Step 3/4: Deploy to UAT (pm2 restart) --
[2026-09-29T20:25:52.000Z]    ✓ Deploy to UAT (pm2 restart) — no errors
[2026-09-29T20:25:55.000Z] -- Step 4/4: Check status --
[2026-09-29T20:25:57.000Z]    ✓ Check status — no errors
[2026-09-29T20:25:58.000Z] == Deploy finished OK (all steps passed) ==
```

**Typical timings:**
- Backend build: 10–15 seconds
- Frontend build: 20–30 seconds
- pm2 restart: 2–5 seconds
- Total: 35–50 seconds

### Step 4: Verify Deployment Success

**Option A: Check the log directly**

```bash
# View the full deploy log
cat /Users/dylan/dygo/com.dygoacademy.english/deploy/log.md | tail -20

# Should end with "== Deploy finished OK (all steps passed) =="
```

**Option B: Check pm2 processes**

```bash
pm2 status

# Both should show "online" and recent uptime:
# dygo-backend  online  (started less than 1 minute ago)
# dygo-frontend online  (started less than 1 minute ago)
```

**Option C: Request file cleanup**

- **Success**: `deploy/request.md` is **deleted** automatically
- **Failure**: `deploy/request.md` is **left in place** so you can inspect the issue

```bash
# Check if request.md still exists (indicates a failure)
ls -la /Users/dylan/dygo/com.dygoacademy.english/deploy/request.md
# If it doesn't exist, deployment succeeded
```

---

## Deployment Pipeline Details

The watch-deploy.js script runs four sequential steps. Each step must complete successfully before the next one starts.

### Step 1: Build Backend

```
cwd: com.dygoacademy.backend
command: npm run build
```

- Compiles TypeScript to JavaScript
- Validates NestJS configuration
- Duration: ~10 seconds

**If it fails:**
```
✗ Build backend — FAILED: Command failed with exit code 1
Deploy sequence stopped at step 1.
```
→ Check backend code, run `npm run build` locally to debug, fix, commit, retry.

### Step 2: Build Frontend

```
cwd: com.dygoacademy.frontend
command: npm run build:prod:domain
```

- Builds Next.js for production
- Optimizes and bundles assets
- Duration: ~20 seconds

**If it fails:**
→ Check frontend code, run `npm run build:prod:domain` locally, fix, commit, retry.

### Step 3: Deploy to UAT (pm2 Restart)

```
cwd: repo root
command: pm2 restart dygo-backend dygo-frontend
```

- Restarts the backend process (loads new code)
- Restarts the frontend process (loads new code)
- Duration: ~3 seconds

**If it fails:**
→ Check pm2 logs: `pm2 logs dygo-backend` or `pm2 logs dygo-frontend`

### Step 4: Check Status

```
cwd: repo root
command: pm2 status
```

- Verifies both processes restarted successfully
- Duration: <1 second

---

## Troubleshooting

### Deploy Fails at Step 1 (Backend Build)

**Symptoms:**
```
✗ Build backend — FAILED: Command failed with exit code 1
```

**Debug:**

```bash
cd /Users/dylan/dygo/com.dygoacademy.english/com.dygoacademy.backend
npm run build

# Check the error output for:
# - TypeScript compilation errors
# - Missing dependencies
# - Configuration issues
```

**Fixes:**
- Run `npm install` to install missing dependencies
- Fix TypeScript errors in the code
- Check `tsconfig.json` and `nest-cli.json`
- Commit the fix and retry

### Deploy Fails at Step 2 (Frontend Build)

**Symptoms:**
```
✗ Build frontend — FAILED: Command failed with exit code 1
```

**Debug:**

```bash
cd /Users/dylan/dygo/com.dygoacademy.english/com.dygoacademy.frontend
npm run build:prod:domain

# Check for:
# - Next.js build errors
# - Missing dependencies
# - TypeScript/ESLint errors
```

**Fixes:**
- Run `npm install` to sync dependencies
- Fix any TypeScript or Next.js errors
- Ensure all imports are correct
- Commit and retry

### Deploy Fails at Step 3 (pm2 Restart)

**Symptoms:**
```
✗ Deploy to UAT (pm2 restart) — FAILED
```

**Debug:**

```bash
# Check if dygo-backend and dygo-frontend processes exist
pm2 list

# Check pm2 logs
pm2 logs dygo-backend
pm2 logs dygo-frontend

# Check process status
pm2 status
```

**Fixes:**
- If processes don't exist, create them (see Prerequisites)
- Check pm2 logs for startup errors
- Ensure previous steps (build) completed without errors
- Restart pm2 processes manually: `pm2 restart dygo-backend dygo-frontend`

### Deploy Fails at Step 4 (Status Check)

**Symptoms:**
```
✗ Check status — FAILED
```

**Debug:**

```bash
pm2 status

# All processes should show "online"
```

**Fixes:**
- This usually means one of the restarts failed in Step 3
- Check Step 3 for more details

### Watcher Not Picking Up request.md

**Symptoms:**
- You create `deploy/request.md` but nothing happens
- Log file doesn't update

**Check:**

```bash
# Is the watcher running?
pm2 list | grep deploy-watcher

# Is request.md more than 3 characters?
wc -c /Users/dylan/dygo/com.dygoacademy.english/deploy/request.md
# Should be > 3
```

**Fixes:**
- Ensure `node watch-deploy.js` or pm2 deploy-watcher is running
- File must have > 3 characters (not empty or just whitespace)
- Check watcher logs: `pm2 logs deploy-watcher`

---

## Files & Logs

| File | Purpose | Location |
|------|---------|----------|
| `deploy/request.md` | You create this to trigger a deploy | `/Users/dylan/dygo/com.dygoacademy.english/deploy/request.md` |
| `deploy/deploy.md` | Running history of deploy requests | `/Users/dylan/dygo/com.dygoacademy.english/deploy/deploy.md` |
| `deploy/log.md` | Full timestamped logs of every deploy attempt | `/Users/dylan/dygo/com.dygoacademy.english/deploy/log.md` |
| `watch-deploy.js` | The deployment watcher script | `/Users/dylan/dygo/com.dygoacademy.english/watch-deploy.js` |

---

## Example: Complete Deployment Workflow

Here's a complete example of deploying the UI-4 interval preview feature:

### Before Deploying

```bash
# 1. Verify feature is complete and tested locally
cd /Users/dylan/dygo/com.dygoacademy.english
git status

# 2. Stage and commit all changes
git add com.dygoacademy.backend com.dygoacademy.frontend
git commit -m "UI-4: Display interval previews on rating buttons"

# 3. Verify commit is in the log
git log --oneline -3
# Should show: UI-4: Display interval previews on rating buttons
```

### Deploying

```bash
# 4. Ensure watch-deploy watcher is running
pm2 list | grep deploy-watcher
# Should show "online"

# 5. Create deploy request
echo "deploy: UI-4 interval previews — backend FSRS calculation + frontend display" > deploy/request.md

# 6. Monitor in real-time
tail -f deploy/log.md

# (Wait for deployment to complete — should see "== Deploy finished OK ==")
```

### After Deploying

```bash
# 7. Verify success
pm2 status
# Both dygo-backend and dygo-frontend should show "online"

# 8. Check request.md was deleted (sign of success)
ls deploy/request.md
# Should show "No such file or directory"

# 9. Verify on UAT
# Open http://localhost:3000/garden/review?ui=garden (or your UAT URL)
# Check that interval previews appear under rating buttons
```

---

## Monitoring & Maintenance

### Check Watcher Health

```bash
# Verify watcher is running
pm2 list | grep deploy-watcher

# View watcher logs
pm2 logs deploy-watcher

# If stuck, restart the watcher
pm2 restart deploy-watcher
```

### View Deployment History

```bash
# Last 10 deploys
tail -20 /Users/dylan/dygo/com.dygoacademy.english/deploy/deploy.md

# Full deploy log
cat /Users/dylan/dygo/com.dygoacademy.english/deploy/log.md | tail -100
```

### Rollback (if needed)

```bash
# Check git history for the last good commit
git log --oneline -10

# Revert to a previous commit
git revert <commit-hash>
# or
git reset --hard <commit-hash>

# Commit and deploy again
git commit -m "Rollback to [reason]"
echo "deploy: rollback to previous stable version" > deploy/request.md
```

---

## Tips & Best Practices

✅ **Always commit before deploying** — watch-deploy assumes code is already in git

✅ **Test locally first** — run `npm run build` in backend and frontend directories locally to catch errors early

✅ **Use descriptive deploy messages** — helps with audit trails
```bash
# ✓ Good
echo "deploy: UI-4 interval previews + FSRS calculation fix" > deploy/request.md

# ✗ Vague
echo "deploy: fixes" > deploy/request.md
```

✅ **Monitor the full log** — not just the last few lines
```bash
tail -f deploy/log.md  # Live view
cat deploy/log.md      # Full history
```

✅ **Keep the watcher running** — use pm2 to ensure it survives terminal closes
```bash
pm2 start watch-deploy.js --name deploy-watcher
pm2 save
```

✅ **Don't concurrent deploy** — wait for one deploy to finish before requesting another
```bash
# Check if a deploy is in progress
ls -la deploy/request.md
# If it exists and is recent, a deploy is running — check deploy/log.md
```

---

## Contacts & Escalation

- **Deployment issues**: Check `deploy/log.md` for detailed error messages
- **Backend build fails**: Debug with `npm run build` in `com.dygoacademy.backend`
- **Frontend build fails**: Debug with `npm run build:prod:domain` in `com.dygoacademy.frontend`
- **pm2 process issues**: Check pm2 status and logs: `pm2 logs dygo-backend` / `pm2 logs dygo-frontend`

---

## Appendix: watch-deploy.js Configuration

The script is hardcoded with these settings (edit `watch-deploy.js` if you need to change them):

```javascript
// Repo root directory
const REPO_DIR = '/Users/dylan/dygo/com.dygoacademy.english';

// Minimum characters in request.md to trigger deploy (guards against accidental empty files)
const MIN_REQUEST_LENGTH = 3;

// Deploy pipeline steps (in order)
const DEPLOY_STEPS = [
  { name: 'Build backend', command: 'npm run build', cwd: 'com.dygoacademy.backend' },
  { name: 'Build frontend', command: 'npm run build:prod:domain', cwd: 'com.dygoacademy.frontend' },
  { name: 'Deploy to UAT (pm2 restart)', command: 'pm2 restart dygo-backend dygo-frontend', cwd: REPO_DIR },
  { name: 'Check status', command: 'pm2 status', cwd: REPO_DIR },
];
```

To modify the pipeline (e.g., add a test step, change a build command), edit these constants in the script.

---

**Last Updated**: 2026-09-29
**Maintained By**: Dylan Ngo (it.tinhngo@gmail.com)
