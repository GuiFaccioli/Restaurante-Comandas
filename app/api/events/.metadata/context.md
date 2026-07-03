# EventsSseRoute — Context

**Type**: API Route Handler
**Specialist**: backend-dev
**Last updated**: 2026-07-03

## Purpose
Force-dynamic GET route registers a stream controller, sends a heartbeat, and removes clients on cancel/abort.

## Key dependencies
`@/lib/sse` — client registry; `@/lib/auth/access` — cozinha access; Web Streams API — SSE response.

## Patterns
Module-memory SSE only works reliably for single-process deployments; `lib/sse.ts` documents the Redis/pub-sub replacement need for serverless/multi-process.

## Notes
Built from the real-time kitchen display requirement and permission-gate decision.
