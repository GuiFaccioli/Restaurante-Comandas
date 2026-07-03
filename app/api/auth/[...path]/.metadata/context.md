# AuthProxyRoute — Context

**Type**: API Route Handler
**Specialist**: backend-dev
**Last updated**: 2026-07-03

## Purpose
Keeps the legacy `/api/auth/[...path]` endpoint from instantiating Neon Auth while the app uses first-party Server Action authentication.

## Key dependencies
- Web `Response.json` — returns a disabled-route JSON response.

## Patterns
GET and POST share the same disabled response. The route intentionally does not import `@/lib/auth/server` so production build does not require Neon Auth cookie config.

## Notes
Current sign-in/sign-up flows live in `/auth/sign-in`, `/auth/sign-up`, and `lib/actions/auth.ts`.
