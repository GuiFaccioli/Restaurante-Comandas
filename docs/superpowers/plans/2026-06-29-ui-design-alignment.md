# Mintlify-Inspired UI Alignment Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Align the existing UI foundation with `DESIGN.MD` without changing business behavior.

**Architecture:** Apply the design system from the foundation outward: CSS tokens first, then shared primitives, then high-traffic auth/area/admin screens. Use source-level tests to lock key visual invariants from `DESIGN.MD`.

**Tech Stack:** Next.js 16, Tailwind CSS v4, Base UI/Shadcn-style primitives, Vitest.

## Global Constraints

- `DESIGN.MD` is the authoritative design reference.
- Inter is prose/UI; Geist Mono remains mono/code.
- Primary buttons are black pills.
- Mint green is reserved for accent/focus/active states.
- Cards use 12px radius.
- Buttons use rounded-full.
- Do not change auth, permissions, or order behavior.

---

### Task 1: Foundation tokens and primitives

**Files:**
- Modify: `app/globals.css`
- Modify: `components/ui/button.tsx`
- Modify: `components/ui/input.tsx`
- Create: `tests/unit/design/design-system.test.ts`

- [ ] Write failing source tests for mint green token, Inter/Geist mapping, rounded-full buttons, 40px inputs, and 12px card radius token.
- [ ] Run focused design test and confirm RED.
- [ ] Update global tokens and Button/Input primitives.
- [ ] Run focused design test and confirm GREEN.
- [ ] Run `npm test` and `npm run build`.
- [ ] Commit `style: align base design tokens and controls`.

### Task 2: Auth and area selection surfaces

**Files:**
- Modify: `app/auth/sign-in/page.tsx`
- Modify: `app/auth/sign-up/page.tsx`
- Modify: `app/selecionar-area/page.tsx`
- Modify: `app/sem-acesso/page.tsx`

- [ ] Apply card-base, pill buttons, muted prose, and hairline borders.
- [ ] Keep all form actions unchanged.
- [ ] Run `npm test` and `npm run build`.
- [ ] Commit `style: align auth surfaces with design system`.

### Task 3: Operational shells

**Files:**
- Modify: `app/admin/layout.tsx`
- Modify: `app/cozinha/layout.tsx`
- Modify: `app/garcom/layout.tsx`

- [ ] Apply flat dense shell styling, hairline borders, Inter sizing, and active-safe navigation rhythm.
- [ ] Keep all permission guards unchanged.
- [ ] Run `npm test` and `npm run build`.
- [ ] Commit `style: align operational shells with design system`.
