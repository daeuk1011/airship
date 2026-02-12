This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Validation and Integration Tests

```bash
bun run test:integration
bun run verify:platform
```

Staging cross-platform OTA verification checklist:
- `docs/staging-cross-platform-checklist.md`

Staging OTA full-flow rehearsal:

```bash
STAGING_BASE_URL="https://<staging-host>" \
STAGING_ADMIN_SECRET="<admin-secret>" \
STAGING_APP_KEY="my-app" \
STAGING_RUNTIME_VERSION="1.0.0" \
bun run rehearse:staging
```

## Docker Deployment (AWS t4g.micro)

`t4g.micro` is ARM-based, so always build and run `linux/arm64` images.

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

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
