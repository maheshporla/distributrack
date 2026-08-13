# DistribuTrack

Distributor & Delivery Management Platform — a SaaS dashboard for managing products,
inventory, warehouse stock, customer orders, delivery workers, invoices, payments,
analytics, reports, and notifications.

This repository currently contains **Phase 1: Project Scaffolding** — the architecture,
design system, layout shell, and reusable component library the rest of the app is
built on. No business features (Products, Orders, Invoices, ...) are implemented yet;
each route renders a placeholder until its phase is built.

## Tech Stack

| Layer            | Choice                                   |
|-------------------|-------------------------------------------|
| Framework          | React 19 + TypeScript                     |
| Build tool          | Vite 8                                    |
| Styling             | Tailwind CSS v4                           |
| Component primitives| shadcn/ui (Radix UI + class-variance-authority) |
| Routing             | React Router DOM v7                       |
| HTTP client         | Axios                                     |
| Global state         | Zustand                                   |
| Forms & validation    | React Hook Form + Zod                     |
| Icons                | lucide-react                              |
| Charts               | Recharts                                  |
| Linting / formatting  | ESLint (flat config) + Prettier           |

## Getting Started

```bash
npm install
cp .env.example .env.development   # already provided — edit VITE_API_BASE_URL as needed
npm run dev
```

The app runs at `http://localhost:5173`.

## Scripts

| Command              | Description                                   |
|-----------------------|------------------------------------------------|
| `npm run dev`          | Start the Vite dev server                      |
| `npm run build`         | Type-check (`tsc -b`) then build for production |
| `npm run preview`        | Preview the production build locally            |
| `npm run lint`           | Run ESLint (fails on any warning)               |
| `npm run lint:fix`        | Run ESLint with `--fix`                         |
| `npm run format`          | Format the codebase with Prettier               |
| `npm run format:check`     | Check formatting without writing                |
| `npm run typecheck`        | Run TypeScript in `--noEmit` mode               |

## Folder Structure

```
src/
├── app/               # Root App component
├── assets/            # Static images/icons bundled by Vite
├── components/
│   ├── ui/             # shadcn/ui primitives (Button, Card, Table, ...)
│   ├── shared/          # Reusable business components (DataTable, StatCard, ...)
│   └── layout/           # App shell (Sidebar, Navbar, DashboardLayout, AuthLayout)
├── config/             # Typed environment variable reader
├── constants/           # Routes, API endpoints, app-wide constants
├── features/            # Feature modules (populated from Phase 2 onward)
├── hooks/               # Reusable hooks (useMediaQuery, useDebounce, ...)
├── lib/                 # Utilities (cn, formatters)
├── providers/            # App-wide context providers (Theme, Toast, composition root)
├── routes/               # Router config, guards, placeholder/fallback pages
├── schemas/               # Zod schemas (populated as forms are built)
├── services/
│   └── api/                # Axios instance + typed API client (Spring Boot ready)
├── store/                  # Zustand stores (auth, ui)
├── styles/                 # Global Tailwind CSS + design tokens
└── types/                   # Shared TypeScript types
```

## Backend Integration

The API layer is pre-wired for a Spring Boot REST backend:

- `VITE_API_BASE_URL` in `.env.*` points at the backend (default `http://localhost:8080/api/v1`)
- `src/services/api/axiosInstance.ts` attaches the bearer token to every request and
  transparently refreshes it on a 401 (queuing concurrent requests during the refresh)
- `src/services/api/apiClient.ts` unwraps the backend's `ApiResponse<T>` / `Page<T>`
  envelopes so feature services work with plain types
- `src/constants/endpoints.constants.ts` mirrors the anticipated Spring Boot
  `@RequestMapping` structure, one group per controller

Feature services (e.g. `productService.ts`) should be built on top of `apiClient`,
never by calling `axios` directly from components.

## Design System

Color tokens live in `src/styles/globals.css` as HSL CSS variables, mapped into
Tailwind via `@theme inline`. Brand color is a deep teal (`--primary`), with a
dark-navy sidebar (`--sidebar-*`) as the app's signature visual element. Both light
and dark themes are fully defined; toggle via the sun/moon icon in the Navbar.
