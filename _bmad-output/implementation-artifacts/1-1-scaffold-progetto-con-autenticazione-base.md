# Story 1.1: Scaffold Progetto con Autenticazione Base

Status: ready-for-dev

## Story

As a **Utente**,
I want **registrarmi e autenticarmi sulla piattaforma Greenfleet**,
So that **posso accedere in modo sicuro alle funzionalita della piattaforma**.

## Acceptance Criteria

1. L'applicazione Next.js 16 e funzionante con shadcn/ui, Prisma 7 configurato per SQL Server, Docker compose (app + SQL Server), Pino logging, e struttura directory feature-based
2. Esiste una pagina di login e registrazione funzionanti con Better Auth
3. La password policy richiede minimo 12 caratteri con complessita (NFR9)
4. Tutti i dati in transito sono protetti con TLS 1.2+ (NFR7)
5. La sessione utente e gestita correttamente con cookie sicuri
6. La struttura progetto segue il layout feature-based definito in architecture.md

## Tasks / Subtasks

- [ ] Task 1: Scaffold Next.js 16 (AC: #1)
  - [ ] 1.1 Eseguire `npx create-next-app@16 greenfleet --typescript --tailwind --eslint --app --src-dir --import-alias="@/*" --turbopack`
  - [ ] 1.2 Verificare che il progetto si avvii correttamente con `npm run dev`
- [ ] Task 2: Inizializzare shadcn/ui (AC: #1)
  - [ ] 2.1 Eseguire `npx shadcn@latest init`
  - [ ] 2.2 Installare componenti base: button, card, input, form, label, toast, sonner
- [ ] Task 3: Setup Prisma 7 + SQL Server (AC: #1)
  - [ ] 3.1 Installare `@prisma/client @prisma/adapter-mssql` e `prisma --save-dev`
  - [ ] 3.2 Eseguire `npx prisma init --datasource-provider sqlserver --output ../generated/prisma`
  - [ ] 3.3 Configurare schema.prisma con modello User base (id, email, name, emailVerified, image, createdAt, updatedAt)
  - [ ] 3.4 Creare `src/lib/db/client.ts` con Prisma client singleton (con adapter-mssql)
- [ ] Task 4: Docker compose (AC: #1)
  - [ ] 4.1 Creare `docker-compose.yml` con servizi: app (Next.js standalone) + db (SQL Server 2022 con mcr.microsoft.com/mssql/server:2022-latest)
  - [ ] 4.2 Configurare volumi per persistenza dati SQL Server
  - [ ] 4.3 Creare `.env.example` con variabili: DATABASE_URL, BETTER_AUTH_SECRET, BETTER_AUTH_URL
  - [ ] 4.4 Creare `.env.local` da `.env.example` con valori dev
- [ ] Task 5: Setup Better Auth (AC: #2, #3, #5)
  - [ ] 5.1 Installare `better-auth @better-auth/prisma`
  - [ ] 5.2 Creare `src/lib/auth/auth.ts` — configurazione Better Auth server-side con credentials provider, Prisma adapter, sessione cookie sicuro
  - [ ] 5.3 Creare `src/lib/auth/auth-client.ts` — Better Auth client per uso in componenti React
  - [ ] 5.4 Creare `src/app/api/auth/[...all]/route.ts` — catch-all route handler per Better Auth
  - [ ] 5.5 Generare schema auth Better Auth nel Prisma schema (user, session, account, verification) tramite CLI o manuale
  - [ ] 5.6 Configurare password policy: minimo 12 caratteri con complessita
  - [ ] 5.7 Eseguire `npx prisma migrate dev --name init` per creare tabelle auth
- [ ] Task 6: Pagine Login e Registrazione (AC: #2, #3)
  - [ ] 6.1 Creare `src/app/(auth)/layout.tsx` — layout centrato senza sidebar
  - [ ] 6.2 Creare `src/app/(auth)/login/page.tsx` — form login con email + password usando React Hook Form + Zod + shadcn/ui Form
  - [ ] 6.3 Creare `src/app/(auth)/register/page.tsx` — form registrazione con validazione password policy (12 char, complessita)
  - [ ] 6.4 Implementare redirect post-login a `/(dashboard)`
  - [ ] 6.5 Implementare gestione errori (credenziali errate, utente gia esistente) con toast feedback
- [ ] Task 7: Struttura directory feature-based (AC: #6)
  - [ ] 7.1 Creare struttura `src/app/(dashboard)/layout.tsx` — placeholder layout dashboard
  - [ ] 7.2 Creare `src/app/(dashboard)/page.tsx` — placeholder homepage dashboard
  - [ ] 7.3 Creare directory structure: `src/lib/auth/`, `src/lib/db/`, `src/lib/schemas/`, `src/lib/services/`, `src/lib/utils/`, `src/types/`
  - [ ] 7.4 Creare `src/types/action-result.ts` con ActionResult<T> e ErrorCode enum
- [ ] Task 8: Middleware auth base (AC: #5)
  - [ ] 8.1 Creare `src/middleware.ts` — protezione route: redirect a /login se non autenticato su route (dashboard)
  - [ ] 8.2 Permettere accesso libero a route (auth) e api/auth
- [ ] Task 9: Pino logging (AC: #1)
  - [ ] 9.1 Installare `pino pino-pretty`
  - [ ] 9.2 Creare `src/lib/utils/logger.ts` — pino con output JSON in prod, pino-pretty in dev
- [ ] Task 10: Configurazione progetto (AC: #1)
  - [ ] 10.1 Configurare `next.config.ts` con output standalone per Docker
  - [ ] 10.2 Configurare `.gitignore` adeguato (node_modules, .env.local, .env.production, generated/prisma)
  - [ ] 10.3 Configurare `globals.css` con import Tailwind e font Inter
  - [ ] 10.4 Creare `Dockerfile` multi-stage per Next.js standalone

## Dev Notes

### Stack Tecnologico e Versioni

- **Next.js 16.1** (stable dic 2025): App Router default, Cache Components, PPR, Turbopack stable
- **Prisma 7.x**: Driver adapter obbligatorio — usare `@prisma/adapter-mssql` (NON il driver nativo)
- **Better Auth**: Successore ufficiale di Auth.js/NextAuth. Multi-tenant, RBAC, credentials provider built-in
- **shadcn/ui**: Componenti copiabili Radix + Tailwind, supporto Tailwind v4
- **React 19**: Incluso con Next.js 16, Server Components
- **TypeScript 5.x**: Strict mode
- **Tailwind CSS 4.x**: CSS variables, dark mode nativo

### Decisioni Architetturali Rilevanti

- **DA-4 Validazione Zod**: Schema Zod condivisi tra frontend e backend. Zod 3.x
- **AC-1 Pattern API Ibrido**: Server Actions per mutations + Route Handlers solo per endpoints esterni
- **AC-2 Error Handling**: ActionResult<T> pattern: `{ success: true, data } | { success: false, error, code }`
- **AS-1 Better Auth Credentials**: Email + password, nessun OAuth social. B2B SaaS — utenti creati da Admin
- **ID-1 Docker**: docker-compose con 2 servizi (app + db). Next.js standalone build
- **ID-3 Environment**: `.env.local` (dev), `.env.production` (prod)
- **ID-4 Logging**: Pino per logging strutturato JSON in produzione
- **FA-1 State Management**: RSC per read, Server Actions per write. Nessun Zustand/Redux

### ActionResult<T> Pattern (da implementare in src/types/action-result.ts)

```typescript
type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; code: ErrorCode }

enum ErrorCode {
  VALIDATION = "VALIDATION",
  NOT_FOUND = "NOT_FOUND",
  UNAUTHORIZED = "UNAUTHORIZED",
  FORBIDDEN = "FORBIDDEN",
  CONFLICT = "CONFLICT",
  INTERNAL = "INTERNAL",
}
```

### Prisma 7 — Attenzione Driver Adapter

Prisma 7 richiede obbligatoriamente un driver adapter. Per SQL Server usare `@prisma/adapter-mssql`. Il client si inizializza cosi:

```typescript
import { PrismaClient } from '../generated/prisma'
import { PrismaMssql } from '@prisma/adapter-mssql'

const adapter = new PrismaMssql({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })
```

NON usare il vecchio pattern `new PrismaClient()` senza adapter — non funziona in Prisma 7.

### Better Auth — Setup Minimo

```typescript
// src/lib/auth/auth.ts
import { betterAuth } from "better-auth"
import { prismaAdapter } from "@better-auth/prisma"
import { prisma } from "@/lib/db/client"

export const auth = betterAuth({
  database: prismaAdapter(prisma),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 12,
  },
  session: {
    cookieCache: { enabled: true, maxAge: 60 * 5 },
  },
})
```

### Convenzioni Naming

| Elemento | Convenzione | Esempio |
|---|---|---|
| Route directories | kebab-case | `src/app/vehicles/` |
| React Components | PascalCase.tsx | `LoginForm.tsx` |
| Non-component files | kebab-case.ts | `auth-client.ts` |
| Server Actions | kebab-case.ts in `actions/` | `create-vehicle.ts` |
| Zod schemas | kebab-case.ts in `src/lib/schemas/` | `vehicle.ts` |

### Struttura Directory Target

```
greenfleet/
├── docker-compose.yml
├── Dockerfile
├── .env.example
├── .env.local (gitignored)
├── prisma/
│   ├── schema.prisma
│   └── migrations/
└── src/
    ├── app/
    │   ├── globals.css
    │   ├── layout.tsx
    │   ├── (auth)/
    │   │   ├── layout.tsx
    │   │   ├── login/page.tsx
    │   │   └── register/page.tsx (o signup)
    │   ├── (dashboard)/
    │   │   ├── layout.tsx
    │   │   └── page.tsx
    │   └── api/auth/[...all]/route.ts
    ├── components/ui/ (shadcn)
    ├── lib/
    │   ├── auth/auth.ts, auth-client.ts
    │   ├── db/client.ts
    │   ├── schemas/
    │   ├── services/
    │   └── utils/logger.ts
    ├── types/action-result.ts
    ├── middleware.ts
    └── generated/prisma/ (gitignored)
```

### Docker Compose SQL Server

```yaml
services:
  db:
    image: mcr.microsoft.com/mssql/server:2022-latest
    environment:
      ACCEPT_EULA: "Y"
      MSSQL_SA_PASSWORD: "YourStrong!Passw0rd"
    ports:
      - "1433:1433"
    volumes:
      - sqlserver-data:/var/opt/mssql
```

### Anti-Pattern da Evitare

- NON usare NextAuth/Auth.js — e sostituito da Better Auth
- NON usare `new PrismaClient()` senza adapter in Prisma 7
- NON creare Server Actions dentro page.tsx — metterle in `actions/` directory
- NON usare `any` in TypeScript — usare tipi espliciti o `unknown` con type guard
- NON hardcodare stringhe di connessione — usare .env
- NON saltare la validazione server-side (Zod) anche se c'e validazione client

### Password Policy (NFR9)

Minimo 12 caratteri. Configurare in Better Auth con `minPasswordLength: 12`. Se Better Auth non supporta complessita custom, implementare validazione Zod lato form:

```typescript
const passwordSchema = z.string()
  .min(12, "Minimo 12 caratteri")
  .regex(/[A-Z]/, "Almeno una maiuscola")
  .regex(/[a-z]/, "Almeno una minuscola")
  .regex(/[0-9]/, "Almeno un numero")
  .regex(/[^A-Za-z0-9]/, "Almeno un carattere speciale")
```

### Project Structure Notes

- Il progetto va creato nella root `/home/federico/Documenti/Progetti/Greenfleet/` (o in una subdirectory `greenfleet/` da decidere)
- La struttura segue il pattern feature-based definito in architecture.md sezione "Structure Patterns"
- Import alias `@/*` per path assoluti da `src/`
- I file generati da Prisma vanno in `src/generated/prisma/` o `generated/prisma/` secondo il flag `--output`

### References

- [Source: architecture.md#Starter Template Evaluation] — comandi di inizializzazione, versioni verificate
- [Source: architecture.md#Core Architectural Decisions] — DA-1..DA-6, AS-1..AS-5, AC-1..AC-3
- [Source: architecture.md#Implementation Patterns] — naming, structure, format patterns
- [Source: architecture.md#Project Structure & Boundaries] — directory structure completa
- [Source: prd.md#NFR9] — password policy minimo 12 caratteri
- [Source: prd.md#NFR7] — TLS 1.2+
- [Source: epics.md#Story 1.1] — acceptance criteria BDD
- [Source: ux-design-specification.md] — font Inter, palette Greenfleet (teal 600)

## Dev Agent Record

### Agent Model Used



### Debug Log References

### Completion Notes List

### File List
