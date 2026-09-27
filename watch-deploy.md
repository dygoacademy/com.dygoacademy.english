# watch-deploy.js — README

A small, dependency-free Node.js script that deploys Dygo Academy when you
drop a request file into `deploy/`. No cron, no launchd, no npm packages —
just `node watch-deploy.js` running in a terminal (or under pm2).

## What it does

1. Watches the `deploy/` folder inside the repo for `deploy/request.md`.
2. Only reacts if `request.md`'s text (after trimming whitespace) is
   **more than 3 characters**. An empty file, or one with just a blank
   line, is ignored — logged, but no deploy runs.
3. If it qualifies, copies the request's text into `deploy/deploy.md`
   as a record of what was requested.
4. Runs the deploy pipeline as four ordered steps — **each step must
   finish with no error before the next one starts**:
   1. Build backend (`com.dygoacademy.backend`, `npm run build`)
   2. Build frontend (`com.dygoacademy.frontend`, `npm run build:prod:domain`)
   3. Deploy to UAT (`pm2 restart dygo-backend dygo-frontend`)
   4. Check status (`pm2 status`)
5. Appends everything — timestamps, each step's output, and a ✓/✗ per
   step — to `deploy/log.md`.
6. If all four steps pass, deletes `request.md`. If any step fails,
   the sequence stops there (later steps never run) and `request.md`
   is left in place so you can see what was requested and retry.

All commands always run rooted at the repo folder
(`/Users/dylan/dygo/com.dygoacademy.english`), no matter what directory
you launch the script from.

## Requirements

- Node.js (any reasonably recent version — no npm packages needed)
- `pm2` installed and already managing `dygo-backend` and `dygo-frontend`
  (check with `pm2 list` before your first run)

## Setup

1. Save `watch-deploy.js` anywhere convenient — it doesn't need to live
   inside the repo, since `REPO_DIR` is hardcoded inside the script.
2. Open the file and check these constants near the top match your setup:

   ```js
   const REPO_DIR = '/Users/dylan/dygo/com.dygoacademy.english';
   const MIN_REQUEST_LENGTH = 3;
   const DEPLOY_STEPS = [ /* backend build, frontend build, pm2 restart, pm2 status */ ];
   ```

3. Run it:

   ```bash
   node watch-deploy.js
   ```

   You should see startup lines like:

   ```
   [2026-09-27T12:07:00.000Z] Watching /Users/dylan/dygo/com.dygoacademy.english/deploy for request.md ...
   [2026-09-27T12:07:00.000Z] Deploys only when request.md has > 3 trimmed characters.
   [2026-09-27T12:07:00.000Z] Deploy sequence: Build backend -> Build frontend -> Deploy to UAT (pm2 restart) -> Check status
   ```

   Leave this running in a terminal tab, or start it under pm2 so it
   survives closing the terminal:

   ```bash
   pm2 start watch-deploy.js --name deploy-watcher
   pm2 save
   ```

## How to trigger a deploy

Write more than 3 characters into `deploy/request.md`:

```bash
echo "deploy: bump homepage copy" > deploy/request.md
```

Within moments the watcher picks it up and starts the sequence. Watch
progress live with:

```bash
tail -f deploy/log.md
```

A run that passes looks like:

```
== request.md found — starting deploy ==
Copied request.md -> deploy.md
-- Step 1/4: Build backend (cwd=.../com.dygoacademy.backend) --
$ npm run build
   ✓ Build backend — no errors
-- Step 2/4: Build frontend (cwd=.../com.dygoacademy.frontend) --
$ npm run build:prod:domain
   ✓ Build frontend — no errors
-- Step 3/4: Deploy to UAT (pm2 restart) (cwd=...) --
$ pm2 restart dygo-backend dygo-frontend
   ✓ Deploy to UAT (pm2 restart) — no errors
-- Step 4/4: Check status (cwd=...) --
$ pm2 status
   ✓ Check status — no errors
== Deploy finished OK (all steps passed) ==
Deleted request.md
```

## What happens on failure

If, say, the backend build fails:

```
-- Step 1/4: Build backend (cwd=...) --
$ npm run build
   ✗ Build backend — FAILED: Command failed with exit code 1
Deploy sequence stopped at step 1 ("Build backend"). Later steps did not run.
== Deploy FAILED — request.md left in place so you can inspect it or retry. ==
```

- Steps 2–4 never ran, so pm2 is never restarted on a broken build.
- `request.md` is **not** deleted, so you can read `deploy/log.md`,
  fix the problem, and just save `request.md` again (or touch it) to
  retry the whole sequence.

## Files involved

| File | Purpose |
| --- | --- |
| `deploy/request.md` | You create/edit this to ask for a deploy. Deleted automatically on success. |
| `deploy/deploy.md` | A copy of the last request's text — a record of what was asked for. Overwritten each run. |
| `deploy/log.md` | Full running history of every deploy attempt, appended to (never cleared automatically). |

## Stopping it

`Ctrl-C` in the terminal it's running in, or if it's under pm2:

```bash
pm2 stop deploy-watcher
```

## Notes / things you might want to change

- **Ignoring vs. deleting an empty request.md**: right now, if
  `request.md` has 3 characters or fewer, it's left alone (not
  deleted). If you'd rather it get cleaned up automatically too, add
  an `fs.unlinkSync(REQUEST_FILE)` in that branch of `handleRequest()`.
- **Delete request.md on failure too**: by default a failed deploy
  keeps `request.md` around for inspection. To always delete it
  (success or failure), move the delete logic into a `finally` block
  instead of the success path.
- **Concurrent triggers**: if `request.md` changes again while a
  deploy is already running, the watcher just ignores it — it does
  not queue a second run. Wait for the current one to finish (check
  `deploy/log.md`) before editing `request.md` again.