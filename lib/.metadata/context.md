# SharedLib — Context

**Type**: Utilities
**Specialist**: backend-dev
**Last updated**: 2026-07-03

## Purpose
Utilities are pure where possible; SSE keeps module-level client registry.

## Key dependencies
`clsx`/`tailwind-merge` — class merging; `Intl` — pt-BR date/money formatting; Web Streams — SSE encoding.

## Patterns
SSE module-memory registry is a deployment caveat for serverless/multi-process.

## Notes
Built incrementally from core app needs.
