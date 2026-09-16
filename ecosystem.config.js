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
module.exports = {
  apps: [
    {
      name: 'dygo-backend',
      cwd: __dirname + '/com.dygoacademy.backend',
      script: 'npm',
      args: 'run start:prod:domain',
    },
    {
      name: 'dygo-frontend',
      cwd: __dirname + '/com.dygoacademy.frontend',
      script: 'npm',
      args: 'run start',
    },
    {
      name: 'dygo-tunnel',
      cwd: __dirname,
      script: 'cloudflared',
      args: 'tunnel --config ' + __dirname + '/cloudflared-config.yml run dygo-academy',
    },
  ],
};
