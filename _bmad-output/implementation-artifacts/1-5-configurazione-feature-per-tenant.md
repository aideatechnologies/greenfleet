# Story 1.5: Configurazione Feature per Tenant

Status: done

## Story

As a **Admin**,
I want **configurare le feature abilitate per ogni tenant**,
So that **posso offrire livelli di servizio differenziati a ciascuna azienda cliente**.

## Acceptance Criteria

1. La feature e immediatamente visibile/nascosta per tutti gli utenti del tenant quando l'Admin abilita o disabilita una feature (FR7)
2. Le feature disabilitate non sono accessibili ne da UI ne da API — le API ritornano 403 FORBIDDEN, la UI nasconde le voci di menu e le route corrispondenti
3. La configurazione feature e persistita nel database e caricata ad ogni sessione utente
4. Esiste un elenco predefinito di feature toggle corrispondenti ai moduli della piattaforma

## Tasks / Subtasks

- [ ] Task 1: Creare modello Prisma TenantFeature (AC: #3, #4)
  - [ ] 1.1 Aggiungere al Prisma schema il modello `TenantFeature` con campi: `id` (cuid), `tenantId` (String, FK a Organization), `featureKey` (String, enum-like), `enabled` (Boolean, default false), `createdAt`, `updatedAt`
  - [ ] 1.2 Aggiungere constraint unique su `(tenantId, featureKey)` per evitare duplicati
  - [ ] 1.3 Aggiungere indice `idx_tenant_features_tenant_id` su `tenantId` per performance
  - [ ] 1.4 Aggiungere `@@map("TenantFeatures")` per naming tabella SQL Server
  - [ ] 1.5 Eseguire `npx prisma migrate dev --name add-tenant-features` per creare la tabella

- [ ] Task 2: Definire enum feature keys predefinite (AC: #4)
  - [ ] 2.1 Creare `src/lib/services/feature-keys.ts` con enum `FeatureKey` contenente le chiavi predefinite:
    - `VEHICLES` — Gestione veicoli operativi e catalogo
    - `CONTRACTS` — Gestione contratti veicoli
    - `FUEL_RECORDS` — Rifornimenti e rilevazioni km
    - `EMISSIONS` — Calcolo emissioni e report
    - `DASHBOARD_FM` — Dashboard Fleet Manager
    - `DASHBOARD_DRIVER` — Dashboard personale Driver
    - `IMPORT_EXPORT` — Import CSV/Excel e export PDF/CSV
    - `CARLIST` — Gestione car list (raggruppamenti veicoli)
    - `ADVANCED_REPORTS` — Report certificabili PDF con metodologia
    - `ALERTS` — Notifiche scadenze contratti e documenti
    - `ESG_EXPORT` — Export dati per reportistica ESG
    - `AUDIT_LOG` — Consultazione audit trail
  - [ ] 2.2 Creare costante `FEATURE_KEY_LABELS: Record<FeatureKey, string>` con etichette italiane leggibili per la UI
  - [ ] 2.3 Creare costante `FEATURE_KEY_DESCRIPTIONS: Record<FeatureKey, string>` con descrizioni brevi per tooltip
  - [ ] 2.4 Creare costante `DEFAULT_FEATURES: FeatureKey[]` con le feature abilitate di default per nuovi tenant (VEHICLES, FUEL_RECORDS, DASHBOARD_FM, DASHBOARD_DRIVER)
  - [ ] 2.5 Creare funzione `initializeTenantFeatures(tenantId: string)` in `tenant-service.ts` che crea tutti i record TenantFeature per un nuovo tenant con i default corretti

- [ ] Task 3: Creare Server Actions per gestione feature toggle (AC: #1, #2, #3)
  - [ ] 3.1 Creare `src/app/(dashboard)/settings/tenant/actions/toggle-feature.ts` — Server Action che riceve `{ tenantId, featureKey, enabled }`, valida con Zod, verifica ruolo Admin, esegue upsert su TenantFeature, ritorna `ActionResult<TenantFeature>`
  - [ ] 3.2 Creare `src/app/(dashboard)/settings/tenant/actions/get-tenant-features.ts` — Server Action che riceve `{ tenantId }`, verifica ruolo Admin, ritorna `ActionResult<TenantFeature[]>` con tutte le feature del tenant
  - [ ] 3.3 Creare `src/app/(dashboard)/settings/tenant/actions/reset-tenant-features.ts` — Server Action che resetta tutte le feature ai default, verifica ruolo Admin, ritorna `ActionResult<TenantFeature[]>`
  - [ ] 3.4 Aggiungere validazione Zod: `featureKey` deve essere un valore valido dell'enum FeatureKey
  - [ ] 3.5 Aggiungere logging Pino per ogni toggle (info level): `feature_toggle.changed { tenantId, featureKey, enabled, userId }`

- [ ] Task 4: Creare componente FeatureTogglePanel (AC: #1, #4)
  - [ ] 4.1 Creare `src/app/(dashboard)/settings/tenant/components/FeatureTogglePanel.tsx` — componente client con lista di toggle switch per ogni feature
  - [ ] 4.2 Ogni toggle mostra: etichetta feature (da FEATURE_KEY_LABELS), descrizione (tooltip da FEATURE_KEY_DESCRIPTIONS), switch on/off (shadcn/ui Switch)
  - [ ] 4.3 Raggruppare i toggle per categoria: "Moduli Core" (VEHICLES, CONTRACTS, FUEL_RECORDS, EMISSIONS), "Dashboard" (DASHBOARD_FM, DASHBOARD_DRIVER), "Funzionalita Avanzate" (IMPORT_EXPORT, CARLIST, ADVANCED_REPORTS, ALERTS, ESG_EXPORT, AUDIT_LOG)
  - [ ] 4.4 Implementare toggle ottimistico: UI si aggiorna subito, rollback se la Server Action fallisce (toast errore)
  - [ ] 4.5 Aggiungere pulsante "Ripristina default" che chiama reset-tenant-features con ConfirmDialog
  - [ ] 4.6 Integrare il pannello nella pagina `src/app/(dashboard)/settings/tenant/page.tsx`

- [ ] Task 5: Creare helper/middleware per controllo feature availability (AC: #2)
  - [ ] 5.1 Creare `src/lib/services/feature-guard.ts` con funzione `isFeatureEnabled(tenantId: string, featureKey: FeatureKey): Promise<boolean>` — query diretta al database con cache Next.js (`use cache` con tag `tenant-features-{tenantId}`)
  - [ ] 5.2 Creare funzione `requireFeature(tenantId: string, featureKey: FeatureKey): Promise<void>` — throw se feature disabilitata, per uso nelle Server Actions (errore con code FORBIDDEN)
  - [ ] 5.3 Creare funzione `getEnabledFeatures(tenantId: string): Promise<FeatureKey[]>` — ritorna array di feature keys abilitate, per uso nella UI (sidebar, navigation)
  - [ ] 5.4 Invalidare la cache `tenant-features-{tenantId}` in toggle-feature.ts dopo ogni modifica (revalidateTag)
  - [ ] 5.5 Creare hook client `src/lib/auth/use-features.ts` con `useFeatures()` che espone `isEnabled(featureKey)` e `enabledFeatures` — alimentato da dati passati dal Server Component layout

- [ ] Task 6: Integrare controllo feature su API e UI (AC: #1, #2)
  - [ ] 6.1 Aggiungere `requireFeature()` come prima istruzione in tutte le Server Actions dei moduli protetti (vehicles, contracts, fuel-records, km-readings, emissions, carlist, import, audit-log) — per ora come pattern documentato, da applicare quando le actions vengono create nelle story successive
  - [ ] 6.2 Modificare il dashboard layout `src/app/(dashboard)/layout.tsx` per passare `enabledFeatures` come prop al componente Sidebar
  - [ ] 6.3 Modificare il componente Sidebar per nascondere le voci di menu corrispondenti a feature disabilitate
  - [ ] 6.4 Creare `src/app/(dashboard)/[...feature-disabled]/page.tsx` — pagina fallback se un utente accede direttamente a una route di feature disabilitata (redirect a dashboard con toast informativo)
  - [ ] 6.5 Aggiungere check feature nel middleware `src/middleware.ts` — mapping route → featureKey, se feature disabilitata redirect a dashboard

## Dev Notes

### Feature Toggle Pattern

La feature toggle e un cross-cutting concern (#4 da architecture.md). Il pattern scelto e database-driven con cache Next.js:

```
Request → Middleware (route → featureKey mapping) → isFeatureEnabled() → allow/redirect
                                                        ↓
Server Action → requireFeature() → allow/403 FORBIDDEN
                                                        ↓
Sidebar Component → getEnabledFeatures() → show/hide menu items
```

**Tre livelli di enforcement:**
1. **Middleware** (route-level): Blocca navigazione diretta a route di feature disabilitata
2. **Server Actions** (API-level): Blocca operazioni CRUD su feature disabilitata → 403 FORBIDDEN
3. **UI** (visual-level): Nasconde voci sidebar e link a feature disabilitate

### Elenco Feature Predefinite

| FeatureKey | Modulo | Abilitata di default |
|---|---|---|
| `VEHICLES` | Gestione veicoli operativi e catalogo | Si |
| `CONTRACTS` | Gestione contratti veicoli | No |
| `FUEL_RECORDS` | Rifornimenti e rilevazioni km | Si |
| `EMISSIONS` | Calcolo emissioni e report | No |
| `DASHBOARD_FM` | Dashboard Fleet Manager | Si |
| `DASHBOARD_DRIVER` | Dashboard personale Driver | Si |
| `IMPORT_EXPORT` | Import CSV/Excel e export PDF/CSV | No |
| `CARLIST` | Gestione car list | No |
| `ADVANCED_REPORTS` | Report certificabili PDF con metodologia | No |
| `ALERTS` | Notifiche scadenze contratti e documenti | No |
| `ESG_EXPORT` | Export dati per reportistica ESG | No |
| `AUDIT_LOG` | Consultazione audit trail | No |

Le feature abilitate di default sono quelle minime per un tenant operativo. L'Admin abilita le altre in base al piano commerciale del cliente.

### Modello Prisma TenantFeature

```prisma
model TenantFeature {
  id         String   @id @default(cuid())
  tenantId   String   @map("tenant_id")
  featureKey String   @map("feature_key")
  enabled    Boolean  @default(false)
  createdAt  DateTime @default(now()) @map("created_at")
  updatedAt  DateTime @updatedAt @map("updated_at")

  @@unique([tenantId, featureKey])
  @@index([tenantId], map: "idx_tenant_features_tenant_id")
  @@map("TenantFeatures")
}
```

**Nota:** Il modello TenantFeature NON ha il filtro automatico tenantId tramite Prisma extension, perche l'Admin deve poter gestire feature di qualsiasi tenant. L'accesso e protetto da RBAC (solo Admin).

### Caching Strategy

La configurazione feature viene letta ad ogni richiesta (middleware, sidebar, server actions). Per evitare N query al database:

1. **Next.js `use cache`** con tag `tenant-features-{tenantId}` — cache server-side invalidata solo quando l'Admin togga una feature
2. **`revalidateTag`** in `toggle-feature.ts` dopo ogni modifica — invalida la cache per quel tenant specifico
3. **Layout Server Component** carica `getEnabledFeatures()` una volta e passa i dati ai componenti figli via props — evita query duplicate nella stessa pagina

### Mapping Route → FeatureKey (per middleware)

```typescript
const ROUTE_FEATURE_MAP: Record<string, FeatureKey> = {
  "/vehicles": FeatureKey.VEHICLES,
  "/contracts": FeatureKey.CONTRACTS,
  "/fuel-records": FeatureKey.FUEL_RECORDS,
  "/km-readings": FeatureKey.FUEL_RECORDS,
  "/emissions": FeatureKey.EMISSIONS,
  "/carlist": FeatureKey.CARLIST,
  "/import": FeatureKey.IMPORT_EXPORT,
  "/settings/audit-log": FeatureKey.AUDIT_LOG,
}
```

Le route di settings (users, tenant) e la dashboard home NON sono protette da feature toggle — sono sempre accessibili.

### Integrazione con Story Precedenti

- **Story 1.2 (Multi-Tenant)**: `initializeTenantFeatures()` deve essere chiamata quando viene creata una nuova Organization (tenant). Aggiungere la chiamata nel flusso di creazione tenant.
- **Story 1.4 (RBAC)**: Solo il ruolo Admin puo accedere al FeatureTogglePanel. Le Server Actions verificano `hasRole("admin")` prima di procedere.
- **Story successive**: Ogni Server Action dei moduli protetti dovra chiamare `requireFeature()` come prima istruzione. Pattern da seguire:

```typescript
"use server"

import { requireFeature } from "@/lib/services/feature-guard"
import { FeatureKey } from "@/lib/services/feature-keys"

export async function createVehicle(input: CreateVehicleInput): Promise<ActionResult<Vehicle>> {
  // 1. Auth check (middleware gia eseguito)
  const session = await getSession()
  if (!session) return { success: false, error: "Non autenticato", code: ErrorCode.UNAUTHORIZED }

  // 2. Feature check
  await requireFeature(session.tenantId, FeatureKey.VEHICLES)

  // 3. Zod validation
  // 4. RBAC check
  // 5. Business logic via service
}
```

### Anti-Pattern da Evitare

- NON usare feature flags hardcoded in codice — sempre dal database via `isFeatureEnabled()`
- NON controllare le feature solo lato UI — enforcement obbligatorio anche lato API (Server Actions)
- NON cachare le feature nel client con stato locale — usare il server come source of truth con cache Next.js
- NON creare feature keys dinamiche — usare solo l'enum `FeatureKey` predefinito
- NON filtrare TenantFeature con il Prisma tenant extension — e un modello gestito solo dall'Admin cross-tenant

### File Coinvolti

| File | Azione |
|---|---|
| `prisma/schema.prisma` | Aggiungere modello TenantFeature |
| `src/lib/services/feature-keys.ts` | Nuovo — enum, labels, descriptions, defaults |
| `src/lib/services/feature-guard.ts` | Nuovo — isFeatureEnabled, requireFeature, getEnabledFeatures |
| `src/lib/services/tenant-service.ts` | Aggiungere initializeTenantFeatures() |
| `src/lib/auth/use-features.ts` | Nuovo — hook client useFeatures() |
| `src/app/(dashboard)/settings/tenant/actions/toggle-feature.ts` | Nuovo — Server Action toggle |
| `src/app/(dashboard)/settings/tenant/actions/get-tenant-features.ts` | Nuovo — Server Action get |
| `src/app/(dashboard)/settings/tenant/actions/reset-tenant-features.ts` | Nuovo — Server Action reset |
| `src/app/(dashboard)/settings/tenant/components/FeatureTogglePanel.tsx` | Nuovo — UI pannello toggle |
| `src/app/(dashboard)/settings/tenant/page.tsx` | Modificare — integrare FeatureTogglePanel |
| `src/app/(dashboard)/layout.tsx` | Modificare — passare enabledFeatures a Sidebar |
| `src/middleware.ts` | Modificare — aggiungere check feature per route |

### References

- [Source: architecture.md#Cross-Cutting Concerns] — Concern #4: Feature toggle, controllo a livello API e UI
- [Source: architecture.md#Project Structure] — `lib/services/tenant-service.ts`, `settings/tenant/` con FeatureTogglePanel
- [Source: architecture.md#Core Architectural Decisions] — AC-2 Error Handling (ActionResult, ErrorCode.FORBIDDEN)
- [Source: epics.md#Story 1.5] — Acceptance criteria BDD (FR7)
- [Source: prd.md#FR7] — L'Admin puo configurare le feature abilitate per ogni tenant

## Dev Agent Record

### Agent Model Used



### Debug Log References

### Completion Notes List

### File List

