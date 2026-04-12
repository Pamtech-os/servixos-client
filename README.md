# ServixOS Client Portal (Next.js)

ServixOS Client Portal is now powered by **Next.js (App Router)** and **TypeScript**.

## Stack

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS
- TanStack Query for server-state caching and synchronization
- Context API for global UI state (theme + mobile sidebar)

## Commands

- `npm run dev` - start local development server
- `npm run build` - production build
- `npm run start` - start production server
- `npm run lint` - run Next.js linting

## Architecture Notes

- Routing is handled by `src/app` (App Router route groups).
- Shared providers are mounted in `src/providers/AppProviders.tsx`.
- Server-state hooks live in `src/lib/server-state/hooks.ts`.
- SEO metadata is configured in `src/app/layout.tsx`, `src/app/robots.ts`, and `src/app/sitemap.ts`.
