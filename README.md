# Airship

Self-hosted Expo OTA update server.

## Start Here

- First use (10 min): `docs/quick-start.md`
- Daily publish + CI: `docs/ota-publish-guide.md`
- Staging verification: `docs/staging-cross-platform-checklist.md`
- Production operations: `docs/production-operations-checklist.md`

## Local Development

```bash
bun install
bun run db:migrate
bun run dev
```

Open `http://localhost:3000/dashboard/login`.

## Validation

```bash
bun run test:integration
bun run verify:platform
```

## Staging Rehearsal

```bash
STAGING_BASE_URL="https://<staging-host>" \
STAGING_ADMIN_SECRET="<admin-secret-or-token>" \
STAGING_APP_KEY="my-app" \
STAGING_RUNTIME_VERSION="1.0.0" \
bun run rehearse:staging
```

## Docker Deployment (AWS t4g.micro)

`t4g.micro` is ARM-based, so build and run `linux/arm64` images.

Build:

```bash
docker buildx build --platform linux/arm64 --progress=plain -t airship:arm64 .
```

Run:

```bash
docker run -d \
  --name airship \
  --restart unless-stopped \
  -p 3000:3000 \
  -v /opt/airship/data:/app/data \
  -e NODE_ENV=production \
  --env-file .env \
  airship:arm64
```

Health check:

```bash
curl -i http://localhost:3000
docker logs --tail=100 airship
```
