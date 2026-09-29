// Dygo Academy — pm2 process file for the production ("domain") profile.
// Keeps all three processes running, restarts them on crash and on machine
// reboot (after `pm2 save` + `pm2 startup`, see the handoff notes).
//
// Frontend runs plain `npm run start` (next start) — NOT a script that
// re-sources .env.prod, because NEXT_PUBLIC_* vars are baked into the
// build at `npm run build:prod:domain` time (see that script's comment in
// package.json); re-sourcing them at start time would do nothing.
// Backend runs `npm run start:prod:domain`, which DOES source .env.prod
// itself before starting, since NestJS reads its config at process start,
// not build time.
//
// cloudflared runs the tunnel that gets traffic to the two apps above and
// to Kong (see cloudflared-config.yml) — replaced the earlier Caddy +
// port-forwarding plan (2026-09-16) since the public IP here is dynamic
// and possibly CGNAT'd. --config is given as an absolute path (not
// ./cloudflared-config.yml) because pm2's `cwd` isn't reliably applied to
// a plain binary script the way it is to `npm` — a relative path here
// intermittently resolved against the wrong directory and cloudflared
// errored with "no such file or directory" even though cwd looked right.
// Requires `cloudflared tunnel create` to have been run once already and
// cloudflared-config.yml's placeholders filled in (see README "Production
// — public domain").
//
// Logging (added 2026-09-27): every process gets its own out/error files
// under logs/, timestamped lines, and a shared date format instead of
// pm2's default ~/.pm2/logs/<name>-out.log / -error.log. Apply with
// `pm2 startOrReload ecosystem.config.js` (or `pm2 restart ecosystem.config.js
// --update-env` if all four are already running) — pm2 only picks up
// out_file/error_file changes on a start/reload, not a plain `pm2 restart
// <name>`. Raw log files aren't rotated or size-capped by pm2 itself; run
// `pm2 install pm2-logrotate` once so they don't grow unbounded (defaults:
// rotate at 10M, keep 30, compress old ones — tune with `pm2 set
// pm2-logrotate:<key> <value>`).
const LOG_OPTS = (name) => ({
  out_file: __dirname + `/logs/${name}-out.log`,
  error_file: __dirname + `/logs/${name}-error.log`,
  time: true,
  log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
  merge_logs: true,
});

module.exports = {
  apps: [
    {
      name: 'dygo-backend',
      cwd: __dirname + '/com.dygoacademy.backend',
      script: 'npm',
      args: 'run start:prod:domain',
      ...LOG_OPTS('dygo-backend'),
    },
    {
      name: 'dygo-frontend',
      cwd: __dirname + '/com.dygoacademy.frontend',
      script: 'npm',
      args: 'run start',
      ...LOG_OPTS('dygo-frontend'),
    },
    {
      name: 'dygo-watch-deploy',
      cwd: __dirname,
      script: 'node',
      args: 'watch-deploy.js',
      ...LOG_OPTS('dygo-watch-deploy'),
    },
    {
      name: 'dygo-tunnel',
      cwd: __dirname,
      script: 'cloudflared',
      args: 'tunnel --config ' + __dirname + '/cloudflared-config.yml run dygo-academy',
      ...LOG_OPTS('dygo-tunnel'),
    },
  ],
};
