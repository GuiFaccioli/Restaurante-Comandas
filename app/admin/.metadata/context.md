# AdminShell — Context

**Type**: App Router layout
**Specialist**: frontend-dev
**Last updated**: 2026-07-03

## Purpose
Layout owns admin chrome while individual pages own access checks and data loading.

## Key dependencies
React children — nested admin pages; standard anchors — route navigation.

## Patterns
The layout itself currently does not call `requireAccess`; admin child pages enforce their own access level.

## Notes
Created during admin management work.
