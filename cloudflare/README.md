# Visual Direction OS · Cloudflare Agnes Proxy

This Worker is the server-side execution layer for the M3 generation loop.

## Architecture

`GitHub Pages → Cloudflare Worker → Agnes Image 2.1 Flash`

The browser never receives `AGNES_API_KEY`.

## Required Worker secrets

Configure both as **Secrets** in Cloudflare before deployment:

- `AGNES_API_KEY` — Agnes provider credential.
- `VDOS_PROXY_TOKEN` — a separate long random token used only to authorize Visual Direction OS browser sessions.

`VDOS_ALLOWED_ORIGINS` is non-secret configuration and is committed in `wrangler.jsonc` as `https://caesar-zzh.github.io`.

## Existing Cloudflare project

The existing Worker project can be reused:

- Worker name: `visual-direction-os`
- Production branch: `phase2-m3-generation-evaluation-loop`
- Deploy command: `npx wrangler deploy`

After deployment, the existing `workers.dev` hostname becomes an API Worker rather than a static-site deployment. GitHub Pages remains the product frontend.

## Endpoints

### Health

`GET /health`

Expected response:

```json
{
  "status": "ok",
  "service": "visual-direction-os-agnes-proxy",
  "model": "agnes-image-2.1-flash",
  "generationPath": "/api/agnes-generate",
  "auth": "proxy-token-required"
}
```

### Generate

`POST /api/agnes-generate`

Required browser headers:

- `Content-Type: application/json`
- `Origin: https://caesar-zzh.github.io` (browser-controlled)
- `X-VDOS-Proxy-Token: <session token>`

The Worker adds the provider `Authorization: Bearer <AGNES_API_KEY>` header server-side.

## Visual Direction OS configuration

In the Generation Workbench, set:

- Proxy Endpoint: `https://<worker-subdomain>.workers.dev/api/agnes-generate`
- Session Proxy Token: the same value stored as Worker secret `VDOS_PROXY_TOKEN`

The endpoint persists in local storage. The proxy token is stored only in `sessionStorage` and is cleared with the browser session. The Agnes key is never stored by the frontend.

## Security notes

CORS is not authentication. The separate proxy token prevents the public Worker from becoming an unauthenticated Agnes relay. Request schema, model, resolution, ratio, prompt length, reference count, request body size, origin, and proxy token are validated before any Agnes request is issued.

If a provider credential has ever been pasted into chat, source code, logs, or another non-secret surface, rotate it after the deployment is verified and update the Cloudflare Secret with the replacement value.
