#!/usr/bin/env node
/**
 * watch-deploy.js
 *
 * Simple, dependency-free watcher for a "deploy by file" workflow:
 *
 *   1. Watches deploy/ for deploy/request.md to appear.
 *   2. Only deploys if request.md's text (trimmed) is MORE THAN
 *      MIN_REQUEST_LENGTH characters (default 3) — a stray empty file
 *      or a file with just a newline/whitespace is ignored, not deployed.
 *   3. When it qualifies: copies its text into deploy/deploy.md.
 *   4. Runs the deploy pipeline below as an ORDERED SEQUENCE OF STEPS —
 *      each step must finish with no error before the next one starts:
 *        Step 1: build backend    (no error) ->
 *        Step 2: build frontend   (no error) ->
 *        Step 3: deploy to UAT    (pm2 restart) ->
 *        Step 4: check status     (pm2 status)
 *      If any step fails, the sequence stops right there — later steps
 *      never run, so you never restart pm2 on a backend that failed to build.
 *   5. Appends a timestamped log to deploy/log.md (each step logged
 *      separately, with a clear PASS/FAIL per step).
 *   6. On success (all steps passed), deletes deploy/request.md.
 *      On failure, request.md is left in place so you can inspect it
 *      and retry — see the comment in handleRequest() if you'd rather
 *      it always delete regardless of outcome.
 *
 * No npm install needed — uses only Node's built-in fs/child_process.
 *
 * Usage (from anywhere — REPO_DIR is hardcoded below, not process.cwd()):
 *   node watch-deploy.js
 *
 * To deploy: write more than MIN_REQUEST_LENGTH characters into
 * deploy/request.md. Example:
 *   echo "deploy: bump homepage copy" > deploy/request.md
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// ---- Config — edit these for your setup ----

// Hardcoded to the actual repo root, so every step below runs rooted
// there — NOT wherever this script happens to be launched from.
const REPO_DIR = '/Users/dylan/dygo/com.dygoacademy.english';

const DEPLOY_DIR = path.join(REPO_DIR, 'deploy');
const REQUEST_FILE = path.join(DEPLOY_DIR, 'request.md');
const DEPLOY_RECORD_FILE = path.join(DEPLOY_DIR, 'deploy.md');
const LOG_FILE = path.join(DEPLOY_DIR, 'log.md');

// request.md's trimmed text must be longer than this to trigger a deploy.
// Guards against an empty file, or one with just whitespace/a newline,
// accidentally kicking off a build.
const MIN_REQUEST_LENGTH = 3;

// The deploy pipeline as an explicit, ordered sequence. Each step's `cwd`
// is resolved against REPO_DIR, so `com.dygoacademy.backend` means
// REPO_DIR/com.dygoacademy.backend, regardless of where this script runs.
const DEPLOY_STEPS = [
  {
    name: 'Build backend',
    cwd: path.join(REPO_DIR, 'com.dygoacademy.backend'),
    command: 'npm run build',
  },
  {
    name: 'Build frontend',
    cwd: path.join(REPO_DIR, 'com.dygoacademy.frontend'),
    command: 'npm run build:prod:domain',
  },
  {
    name: 'Deploy to UAT (pm2 restart)',
    cwd: REPO_DIR,
    command: 'pm2 restart dygo-backend dygo-frontend',
  },
  {
    name: 'Check status',
    cwd: REPO_DIR,
    command: 'pm2 status',
  },
];

// ---------------------------------------------

let deploying = false;

function timestamp() {
  return new Date().toISOString();
}

function appendLog(message) {
  const line = `[${timestamp()}] ${message}\n`;
  process.stdout.write(line);
  fs.appendFileSync(LOG_FILE, line, 'utf8');
}

function runShellCommand(command, cwd) {
  return new Promise((resolve, reject) => {
    exec(
      command,
      { cwd, shell: '/bin/bash', maxBuffer: 20 * 1024 * 1024 },
      (err, stdout, stderr) => {
        if (stdout && stdout.trim()) appendLog(stdout.trim());
        if (stderr && stderr.trim()) appendLog(stderr.trim());
        if (err) return reject(err);
        resolve();
      }
    );
  });
}

// Runs DEPLOY_STEPS in order. Stops at the first failure and reports
// which step failed, so a broken backend build never reaches pm2 restart.
async function runDeploySequence() {
  for (let i = 0; i < DEPLOY_STEPS.length; i++) {
    const step = DEPLOY_STEPS[i];
    appendLog(`-- Step ${i + 1}/${DEPLOY_STEPS.length}: ${step.name} (cwd=${step.cwd}) --`);
    appendLog(`$ ${step.command}`);
    try {
      await runShellCommand(step.command, step.cwd);
      appendLog(`   ✓ ${step.name} — no errors`);
    } catch (err) {
      appendLog(`   ✗ ${step.name} — FAILED: ${err.message}`);
      appendLog(`Deploy sequence stopped at step ${i + 1} ("${step.name}"). Later steps did not run.`);
      throw err; // stop the sequence — caller decides what to do with request.md
    }
  }
}

async function handleRequest() {
  if (deploying) return; // a deploy is already running — ignore re-triggers until it's done
  if (!fs.existsSync(REQUEST_FILE)) return;

  const requestText = fs.readFileSync(REQUEST_FILE, 'utf8');
  const trimmedLength = requestText.trim().length;

  if (trimmedLength <= MIN_REQUEST_LENGTH) {
    appendLog(
      `request.md has ${trimmedLength} char(s) of text (need > ${MIN_REQUEST_LENGTH}) — ignoring, not deploying.`
    );
    return;
  }

  deploying = true;
  try {
    appendLog('== request.md found — starting deploy ==');

    // Copy request.md's text into deploy.md as a record of the request
    fs.writeFileSync(DEPLOY_RECORD_FILE, requestText, 'utf8');
    appendLog(`Copied request.md -> ${path.basename(DEPLOY_RECORD_FILE)}`);

    // Run the ordered sequence: backend build -> frontend build -> UAT deploy -> status
    await runDeploySequence();

    appendLog('== Deploy finished OK (all steps passed) ==');

    // Delete request.md now that the whole sequence succeeded
    if (fs.existsSync(REQUEST_FILE)) {
      fs.unlinkSync(REQUEST_FILE);
      appendLog('Deleted request.md');
    }
  } catch (err) {
    appendLog('== Deploy FAILED — request.md left in place so you can inspect it or retry. ==');
    // If you'd rather request.md always be deleted (success or failure),
    // move the unlink above into a `finally` block instead.
  } finally {
    deploying = false;
  }
}

function main() {
  if (!fs.existsSync(DEPLOY_DIR)) {
    fs.mkdirSync(DEPLOY_DIR, { recursive: true });
  }
  if (!fs.existsSync(LOG_FILE)) {
    fs.writeFileSync(LOG_FILE, '', 'utf8');
  }

  appendLog(`Watching ${DEPLOY_DIR} for request.md ...`);
  appendLog(`Deploys only when request.md has > ${MIN_REQUEST_LENGTH} trimmed characters.`);
  appendLog(`Deploy sequence: ${DEPLOY_STEPS.map((s) => s.name).join(' -> ')}`);

  // Handle a request.md that's already sitting there when this starts.
  handleRequest();

  // fs.watch fires for any change inside the folder (create/write/delete
  // of ANY file in it, including deploy.md and log.md themselves) —
  // filter down to only react when request.md is the one that changed.
  fs.watch(DEPLOY_DIR, (eventType, filename) => {
    if (filename === 'request.md') {
      handleRequest();
    }
  });

  process.on('SIGINT', () => {
    appendLog('Stopped by user (Ctrl-C).');
    process.exit(0);
  });
}

main();