# Story 1.6: Seed Data e Demo Tenant

Status: done

## Story

As a **Admin**,
I want **un tenant demo precaricato con dati di esempio**,
So that **posso dimostrare la piattaforma a prospect e facilitare l'onboarding**.

## Acceptance Criteria

1. Viene creato un tenant demo con nome "Greenfleet Demo" tramite il seed
2. Il tenant demo contiene utenti esempio per ogni ruolo (Admin, Fleet Manager, Driver)
3. Il tenant demo e marcato come demo e non cancellabile (flag `isDemo`)
4. Il seed e idempotente: eseguibile piu volte senza creare duplicati
5. La conformita GDPR e garantita — i dati demo non contengono dati personali reali (NFR11)

## Tasks / Subtasks

- [ ] Task 1: Aggiungere campo `isDemo` al modello Organization in Prisma (AC: #3)
  - [ ] 1.1 Aggiungere `isDemo Boolean @default(false)` al modello Organization nello schema Prisma
  - [ ] 1.2 Creare migrazione Prisma: `npx prisma migrate dev --name add-is-demo-flag`
  - [ ] 1.3 Aggiungere guard nelle Server Actions di delete tenant: se `isDemo === true`, ritornare `ActionResult` con errore `FORBIDDEN` e messaggio "Il tenant demo non puo essere eliminato"

- [ ] Task 2: Creare `prisma/seed.ts` con struttura base idempotente (AC: #4)
  - [ ] 2.1 Creare file `prisma/seed.ts`
  - [ ] 2.2 Importare Prisma client da `@/lib/db/client` (con adapter-mssql)
  - [ ] 2.3 Implementare funzione `main()` async con try/catch e disconnect nel finally
  - [ ] 2.4 Implementare pattern idempotente con `upsert` per ogni entita (match su campo univoco, create se non esiste, update se esiste)
  - [ ] 2.5 Aggiungere logging con `console.log` per tracciare operazioni seed (creato/aggiornato)

- [ ] Task 3: Creare tenant demo "Greenfleet Demo" via Better Auth organization (AC: #1, #3)
  - [ ] 3.1 Usare Prisma `upsert` sull'entita Organization con `slug: "greenfleet-demo"` come campo univoco di match
  - [ ] 3.2 Impostare campi: `name: "Greenfleet Demo"`, `slug: "greenfleet-demo"`, `isDemo: true`
  - [ ] 3.3 Verificare che i campi siano compatibili con lo schema Better Auth organization (id, name, slug, metadata, createdAt)

- [ ] Task 4: Creare utenti demo con ruoli appropriati (AC: #2, #5)
  - [ ] 4.1 Creare utente Admin demo: `admin@greenfleet-demo.local` / nome "Demo Admin" / password sicura ma nota per demo (es. `DemoAdmin2026!Pass`)
  - [ ] 4.2 Creare utente Fleet Manager demo: `fleetmanager@greenfleet-demo.local` / nome "Demo Fleet Manager" / password `DemoFM2026!Pass`
  - [ ] 4.3 Creare utente Driver demo: `driver@greenfleet-demo.local` / nome "Demo Driver" / password `DemoDriver2026!Pass`
  - [ ] 4.4 Usare `upsert` su campo `email` per idempotenza
  - [ ] 4.5 Hashare le password con il metodo di Better Auth (importare l'utility di hashing da `better-auth` o usare il context auth per creare utenti)
  - [ ] 4.6 Creare i record `Member` per associare ogni utente all'organization "Greenfleet Demo" con il ruolo corretto (`admin`, `member` per FM, `member` per Driver — mappato secondo la configurazione Better Auth organization plugin)
  - [ ] 4.7 Usare solo dati fittizi per conformita GDPR: nomi generici ("Demo Admin"), email su dominio fittizio (`@greenfleet-demo.local`), nessun dato personale reale

- [ ] Task 5: Configurare `package.json` per il comando seed (AC: #4)
  - [ ] 5.1 Aggiungere sezione `prisma.seed` in `package.json`: `"prisma": { "seed": "npx tsx prisma/seed.ts" }`
  - [ ] 5.2 Installare `tsx` come dev dependency se non presente: `npm install tsx --save-dev`
  - [ ] 5.3 Verificare che `npx prisma db seed` esegua correttamente lo script

- [ ] Task 6: Garantire dati realistici ma non personali — GDPR (AC: #5)
  - [ ] 6.1 Verificare che tutti i nomi siano generici e descrittivi del ruolo ("Demo Admin", "Demo Fleet Manager", "Demo Driver")
  - [ ] 6.2 Verificare che tutte le email usino il dominio fittizio `@greenfleet-demo.local`
  - [ ] 6.3 Verificare che non siano presenti numeri di telefono, indirizzi, codici fiscali o altri dati personali
  - [ ] 6.4 Aggiungere commento nel file seed.ts che documenta la conformita GDPR

- [ ] Task 7: Test idempotenza (AC: #4)
  - [ ] 7.1 Eseguire `npx prisma db seed` su database vuoto — verificare creazione tenant + 3 utenti
  - [ ] 7.2 Eseguire `npx prisma db seed` una seconda volta — verificare che non ci siano duplicati (nessun errore, conteggi invariati)
  - [ ] 7.3 Verificare con query diretta: `SELECT COUNT(*) FROM Organizations WHERE slug = 'greenfleet-demo'` deve ritornare 1
  - [ ] 7.4 Verificare con query diretta: `SELECT COUNT(*) FROM Users WHERE email LIKE '%@greenfleet-demo.local'` deve ritornare 3

## Dev Notes

### Prisma 7 — Client nel Seed

Il seed file usa Prisma 7 con driver adapter obbligatorio. Importare il client gia configurato:

```typescript
import { PrismaClient } from '../src/generated/prisma'
import { PrismaMssql } from '@prisma/adapter-mssql'

const adapter = new PrismaMssql({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })
```

**Nota:** nel seed non si usa il client singleton di `src/lib/db/client.ts` perche il seed gira fuori dal contesto Next.js. Creare un'istanza dedicata.

### Better Auth — Creazione Utenti Programmatica

Better Auth gestisce le proprie tabelle (user, session, account). Per creare utenti nel seed ci sono due approcci:

**Approccio 1 — API interna Better Auth (preferito):**
```typescript
import { auth } from '../src/lib/auth/auth'

// Creare utente tramite Better Auth API interna
const user = await auth.api.signUpEmail({
  body: {
    email: "admin@greenfleet-demo.local",
    password: "DemoAdmin2026!Pass",
    name: "Demo Admin",
  }
})
```

**Approccio 2 — Prisma diretto (fallback):**
Se l'API interna non e disponibile nel contesto seed, creare i record direttamente via Prisma nelle tabelle `user` e `account` di Better Auth. In questo caso, hashare la password con lo stesso algoritmo usato da Better Auth (verificare nella documentazione se usa `bcrypt` o `argon2`).

```typescript
import { hashPassword } from 'better-auth/utils' // verificare il path esatto

const hashedPassword = await hashPassword("DemoAdmin2026!Pass")

await prisma.user.upsert({
  where: { email: "admin@greenfleet-demo.local" },
  update: { name: "Demo Admin" },
  create: {
    email: "admin@greenfleet-demo.local",
    name: "Demo Admin",
    emailVerified: true,
  }
})

// Creare record nella tabella account con password hashata
await prisma.account.upsert({
  where: {
    providerId_accountId: {
      providerId: "credential",
      accountId: userId, // ID dell'utente appena creato
    }
  },
  update: {},
  create: {
    userId: userId,
    providerId: "credential",
    accountId: userId,
    password: hashedPassword,
  }
})
```

### Better Auth — Organization e Membership

Le organization in Better Auth usano il plugin `organization`. Per associare utenti al tenant demo:

```typescript
// Creare organization
await prisma.organization.upsert({
  where: { slug: "greenfleet-demo" },
  update: { name: "Greenfleet Demo", isDemo: true },
  create: {
    name: "Greenfleet Demo",
    slug: "greenfleet-demo",
    isDemo: true,
  }
})

// Creare membership con ruolo
await prisma.member.upsert({
  where: {
    organizationId_userId: {
      organizationId: orgId,
      userId: userId,
    }
  },
  update: { role: "admin" },
  create: {
    organizationId: orgId,
    userId: userId,
    role: "admin", // "admin" | "member" — mappare secondo config RBAC
  }
})
```

**Mapping ruoli Better Auth → Greenfleet:**
- Admin → `role: "admin"` nell'organization (o `role: "owner"`)
- Fleet Manager → `role: "admin"` nell'organization (admin del proprio tenant)
- Driver → `role: "member"` nell'organization

Verificare i ruoli effettivi nella configurazione del plugin organization di Better Auth definita in `src/lib/auth/auth.ts` (Story 1.2 e 1.4).

### Pattern Idempotente con Upsert

Il pattern raccomandato per ogni entita nel seed:

```typescript
const org = await prisma.organization.upsert({
  where: { slug: "greenfleet-demo" },     // campo univoco di match
  update: { name: "Greenfleet Demo" },     // aggiorna se esiste
  create: {                                 // crea se non esiste
    name: "Greenfleet Demo",
    slug: "greenfleet-demo",
    isDemo: true,
  },
})
console.log(`Organization: ${org.name} (${org.id}) — upserted`)
```

Ogni `upsert` garantisce che:
- La prima esecuzione crea il record
- Le esecuzioni successive aggiornano il record senza duplicati
- Il campo `where` deve essere un campo con constraint `@unique` nello schema Prisma

### Flag isDemo — Protezione da Cancellazione

Aggiungere il campo allo schema Prisma (modello Organization di Better Auth):

```prisma
model Organization {
  // ... campi Better Auth esistenti
  isDemo    Boolean @default(false) @map("is_demo")
  // ...
  @@map("Organizations")
}
```

Nelle Server Actions di delete tenant, aggiungere il guard:

```typescript
// In src/app/(dashboard)/settings/tenant/actions/delete-tenant.ts
const tenant = await prisma.organization.findUnique({ where: { id: tenantId } })
if (tenant?.isDemo) {
  return { success: false, error: "Il tenant demo non puo essere eliminato", code: ErrorCode.FORBIDDEN }
}
```

### GDPR — Considerazioni sui Dati Demo

I dati del seed sono dati sintetici e non contengono informazioni personali reali:
- **Nomi:** Descrittivi del ruolo, non nomi di persona ("Demo Admin", "Demo Fleet Manager", "Demo Driver")
- **Email:** Dominio fittizio `@greenfleet-demo.local` (non risolvibile, non associabile a persona reale)
- **Password:** Password di demo predefinite, note e documentate (non sono dati personali)
- **Nessun altro dato personale:** Niente telefoni, indirizzi, CF, date di nascita

Questo approccio e conforme al principio di minimizzazione dati (Art. 5 GDPR) e non richiede consenso poiche non si tratta di dati personali.

### Struttura File Seed Completa

```typescript
// prisma/seed.ts
import { PrismaClient } from '../src/generated/prisma'
import { PrismaMssql } from '@prisma/adapter-mssql'

const adapter = new PrismaMssql({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('Seed: inizio...')

  // 1. Creare organization demo
  const org = await prisma.organization.upsert({ /* ... */ })

  // 2. Creare utenti demo
  const adminUser = await prisma.user.upsert({ /* ... */ })
  const fmUser = await prisma.user.upsert({ /* ... */ })
  const driverUser = await prisma.user.upsert({ /* ... */ })

  // 3. Creare account (password) per ogni utente
  // ... upsert account con password hashate

  // 4. Creare membership (ruoli) nell'organization
  // ... upsert member per ogni utente

  console.log('Seed: completato con successo')
}

main()
  .catch((e) => {
    console.error('Seed: errore', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
```

### Dipendenze

- **Story 1.1** (Scaffold Progetto) — deve essere completata: Prisma 7, Better Auth, struttura progetto
- **Story 1.2** (Multi-Tenant con Organizzazioni) — lo schema Organization deve esistere con il plugin Better Auth
- **Story 1.4** (Gestione Utenti e Ruoli RBAC) — la configurazione ruoli deve essere definita

### Anti-Pattern da Evitare

- NON usare `create` senza controllo di esistenza — usare sempre `upsert` per idempotenza
- NON hardcodare ID — lasciare che il database li generi, usare campi univoci (`email`, `slug`) per il match
- NON inserire dati personali reali nel seed (nomi, email reali, numeri di telefono)
- NON usare `deleteMany` + `createMany` come pattern di idempotenza — rischia di perdere dati in ambiente condiviso
- NON saltare l'hashing della password — mai salvare password in chiaro nel database
- NON creare il Prisma client con `new PrismaClient()` senza adapter in Prisma 7

### References

- [Source: architecture.md#Development Workflow] — `npx prisma db seed`, file `prisma/seed.ts`
- [Source: architecture.md#Project Structure] — posizione file seed, schema Prisma
- [Source: architecture.md#Authentication & Security] — Better Auth organization plugin, RBAC
- [Source: architecture.md#Data Architecture DA-1] — modello multi-tenant con tenantId
- [Source: epics.md#Story 1.6] — acceptance criteria BDD
- [Source: prd.md#NFR11] — conformita GDPR, minimizzazione dati

## Dev Agent Record

### Agent Model Used



### Debug Log References

### Completion Notes List

### File List
