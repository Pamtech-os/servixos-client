# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # start dev server (Webpack bundler)
npm run build    # production build (Webpack)
npm run start    # serve production build
npm run lint     # ESLint
```

The `--webpack` flag is explicit in both dev and build scripts — do not switch to Turbopack.

## Environment

`NEXT_PUBLIC_API_BASE_URL` sets the API origin (defaults to `https://api-dev.servixos.com/api`). The socket base URL is derived from this by stripping the trailing `/api` segment.

## Architecture

### Route groups & page pattern

`src/app` uses two route groups:

- `(auth)` — unauthenticated pages (login, forgot-password)
- `(portal)` — authenticated pages (dashboard, invoices, files, contracts, messages, contacts)

Page files are thin wrappers that import from `src/views/`. All real UI logic lives in the corresponding view component.

### API layer (two-tier)

**`src/lib/api/client-api.ts`** — raw HTTP client.
- Every request is HMAC-SHA256 signed: a client token is fetched from `/auth/client-token`, then each request sends `x-client-token`, `x-timestamp`, and `x-signature` headers.
- Authenticated calls go through `withAuth`, which reads the session, proactively refreshes the access token if near expiry, and retries once on 401.
- Exports `clientAuthApi` (login, logout, refresh, forgotPassword, resetPassword, me) and `clientPortalApi` (all portal data endpoints).

**`src/lib/api/portal-api.ts`** — mapping layer between raw API types and portal-facing types.
- Converts minor-unit amounts (`/100`), formats dates, formats file sizes, and normalises missing fields.
- This is the layer consumed by TanStack Query hooks — never import `clientPortalApi` directly in views.

### Session management

`src/lib/api/client-session.ts` exposes `clientSessionStore`, which persists `{ accessToken, refreshToken, client }` to `localStorage` under the key `servixos-client-session`. An in-memory cache avoids redundant localStorage reads. SSR-safe (falls back to memory when `window` is undefined).

### Auth context

`src/contexts/AuthContext.tsx` — on mount it reads the stored session, optimistically sets auth state, then verifies with `/client-auth/me`. If verification fails the session is cleared. Exposes `login`, `logout`, `refreshProfile`, and `changePassword`.

`changePassword` re-logs in with the new password after a successful change to rotate tokens while keeping the session alive.

### Portal layout & data prefetch

`src/components/AppLayout.tsx` is the shell for all portal pages. On login it:
1. Redirects to `/login` if unauthenticated.
2. Prefetches all portal queries (`dashboard`, `invoices`, `files`, `contracts`, `conversations`, `messages`, `providers`, `activities`) into the TanStack Query cache.
3. Connects the Socket.io client (`connectClientMessagesSocket`).

`ForcePasswordChangeGate` renders a blocking modal when `auth.mustChangePassword` is true.

### Server state

- **Hooks**: `src/lib/server-state/hooks.ts` — one `useQuery` hook per data domain, all with 5-minute stale time.
- **Keys**: `src/lib/server-state/query-keys.ts` — all query keys use the `['portal', '<domain>']` shape.

### Real-time messaging

`src/lib/realtime/client-messages-socket.ts` manages a singleton Socket.io connection to the `/client-messages` namespace. Auth token is passed in `socket.auth`. The module exports typed server→client and client→server event payloads, and `connectClientMessagesSocket` / `disconnectClientMessagesSocket`. Disconnection is called on logout and on auth failure during hydration.

### UI context

`src/contexts/UIContext.tsx` manages dark mode (persisted to `localStorage` as `'theme'`) and mobile sidebar open state. The `dark` class is toggled on `document.documentElement`.

### Providers

`src/providers/AppProviders.tsx` is the provider tree mounted in `src/app/layout.tsx`:

```
QueryProvider → UIProvider → AuthProvider → TooltipProvider → Toaster
```

### UI components

`src/components/ui/` contains Radix UI primitives styled with Tailwind and `class-variance-authority` (`button`, `input`, `dialog`, `badge`, `card`, `table`, `avatar`, `label`, `sonner`, `tooltip`). Custom layout components (`AppSidebar`, `AppHeader`, `AppLayout`) are in `src/components/`.
