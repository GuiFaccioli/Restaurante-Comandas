<!-- RAW SOURCE — NÃO EDITAR. Capturado em 2026-06-20 -->
<!-- URL: https://nextjs.org/docs -->
<!-- Versão documentada: 16.2.9 (App Router) -->

# Next.js Documentation Index

## Latest Version: 16.2.9

## App Router — Getting Started
- Installation
- Project Structure
- Layouts and Pages
- Linking and Navigating
- Server and Client Components
- Fetching Data
- Mutating Data
- Caching
- Revalidating
- Error Handling
- CSS / Image Optimization / Font Optimization
- Metadata and OG images
- Route Handlers
- Proxy
- Deploying
- Upgrading

## App Router — Guides (relevantes para o projeto)
- Authentication
- Environment Variables
- Forms
- Internationalization
- PWAs
- Redirecting
- Rendering Philosophy
- Streaming
- Testing (Cypress, Jest, Playwright, Vitest)
- Upgrading: Version 14, 15, 16

## App Router — Directives
- `use cache`
- `use cache: private`
- `use cache: remote`
- `use client`
- `use server`

## App Router — Components
- Font, Form, Image, Link, Script

## App Router — File-system conventions
- layout.js, page.js, loading.js, error.js, not-found.js
- route.js (Route Handlers)
- template.js, default.js
- Dynamic Segments, Parallel Routes, Intercepting Routes

## App Router — Functions
- after, cacheLife, cacheTag
- connection, cookies, draftMode
- fetch, forbidden, generateMetadata
- headers, NextRequest, NextResponse
- notFound, redirect, permanentRedirect
- revalidatePath, revalidateTag
- useLinkStatus, useParams, usePathname, useRouter
- useSearchParams, useSelectedLayoutSegment

## Architecture
- Accessibility
- Fast Refresh
- Next.js Compiler
- Supported Browsers

## What is Next.js?

Next.js is a React framework for building full-stack web applications. Uses React Components for UI, adds features and optimizations. Automatically configures bundlers and compilers.

## App Router vs Pages Router

- **App Router**: newer, supports React Server Components, uses React canary releases (includes React 19 stable + newer features)
- **Pages Router**: original, still supported, uses React version from package.json

## React version in App Router

App Router uses React canary releases built-in — includes all stable React 19 changes plus newer features being validated in frameworks prior to new React releases.

## LLM-optimized docs

Available at: https://nextjs.org/docs/llms.txt
