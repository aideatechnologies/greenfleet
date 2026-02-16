# Story 2.1: Schema Catalogo e Import Dati InfocarData

Status: done

## Story

As a **Admin**,
I want **importare e sincronizzare i dati tecnici dei veicoli dalla banca dati InfocarData**,
So that **il catalogo globale Greenfleet contenga informazioni tecniche accurate e aggiornate**.

## Acceptance Criteria

1. I dati tecnici dei veicoli vengono importati da InfocarData: identificazione, dati tecnici base, motori, prestazioni, emissioni CO2, consumi (FR1)
2. Il sistema espone per ogni veicolo: marca, modello, allestimento, carrozzeria, normativa anti-inquinamento, motori (tipo combustibile, cilindrata, potenza KW/CV), emissioni CO2 g/km (WLTP/NEDC), consumi, capacita serbatoio, flag ibrido (FR5)
3. L'import supporta sia batch iniziale che aggiornamenti incrementali (NFR23)
4. Il sistema gestisce graceful degradation in caso di indisponibilita InfocarData senza bloccare le operazioni core (NFR22)
5. Lo schema Prisma include le tabelle catalogo veicoli, motori e dati tecnici
6. Il catalogo veicoli e GLOBALE (nessun tenantId) — condiviso tra tutti i tenant

## Tasks / Subtasks

- [ ] Task 1: Schema Prisma — modello CatalogVehicle (AC: #1, #2, #5, #6)
  - [ ] 1.1 Aggiungere il modello `CatalogVehicle` in `prisma/schema.prisma` con i seguenti campi:
    - `id` String @id @default(cuid())
    - `codiceInfocarData` String? @unique — codice univoco InfocarData (null se inserimento manuale)
    - `marca` String — marca del veicolo (es. "FIAT", "BMW")
    - `modello` String — modello del veicolo (es. "500", "Serie 3")
    - `allestimento` String? — allestimento/versione specifica
    - `carrozzeria` String? — tipo carrozzeria (berlina, SUV, station wagon, etc.)
    - `normativa` String? — normativa anti-inquinamento (Euro 6d, Euro 6d-TEMP, etc.)
    - `capacitaSerbatoioL` Float? — capacita serbatoio in litri
    - `isHybrid` Boolean @default(false) — flag veicolo ibrido (derivato dalla presenza di 2+ motori con combustibili diversi)
    - `source` String @default("INFOCARDATA") — sorgente dati: "INFOCARDATA" | "MANUAL"
    - `imageUrl` String? — URL immagine Codall (popolato dalla Story 2.3)
    - `codiceAllestimento` String? — codice allestimento per integrazione Codall
    - `annoImmatricolazione` Int? — anno prima immatricolazione per query Codall
    - `createdAt` DateTime @default(now())
    - `updatedAt` DateTime @updatedAt
    - `lastSyncAt` DateTime? — data ultimo sync con InfocarData
    - relazione `engines Engine[]` (1:N)
  - [ ] 1.2 Aggiungere `@@map("CatalogVehicles")` per nome tabella SQL Server
  - [ ] 1.3 Aggiungere indici: `@@index([marca, modello])`, `@@index([codiceInfocarData])`
  - [ ] 1.4 **IMPORTANTE:** Nessun campo `tenantId` — il catalogo e globale
- [ ] Task 2: Schema Prisma — modello Engine (AC: #1, #2, #5)
  - [ ] 2.1 Aggiungere il modello `Engine` in `prisma/schema.prisma` con i seguenti campi:
    - `id` String @id @default(cuid())
    - `catalogVehicleId` String — FK a CatalogVehicle
    - `nucmot` String? — codice motore InfocarData (identificativo univoco motore nella banca dati)
    - `fuelType` FuelType — enum: BENZINA, DIESEL, GPL, METANO, ELETTRICO, IBRIDO_BENZINA, IBRIDO_DIESEL, IDROGENO, BIFUEL_BENZINA_GPL, BIFUEL_BENZINA_METANO
    - `cilindrata` Int? — cilindrata in cc (null per motori elettrici)
    - `potenzaKw` Float? — potenza in kW
    - `potenzaCv` Float? — potenza in CV
    - `co2GKm` Float? — emissioni CO2 in g/km (valore primario)
    - `co2Standard` Co2Standard @default(WLTP) — standard di misurazione: WLTP | NEDC
    - `consumptionL100Km` Float? — consumo in l/100km (o kWh/100km per elettrici)
    - `consumptionUnit` String @default("L/100KM") — unita di misura consumo: "L/100KM" | "KWH/100KM"
    - `createdAt` DateTime @default(now())
    - `updatedAt` DateTime @updatedAt
    - relazione `catalogVehicle CatalogVehicle @relation(fields: [catalogVehicleId], references: [id], onDelete: Cascade)`
  - [ ] 2.2 Aggiungere `@@map("Engines")` per nome tabella SQL Server
  - [ ] 2.3 Aggiungere indici: `@@index([catalogVehicleId])`, `@@index([fuelType])`
  - [ ] 2.4 Creare gli enum `FuelType` e `Co2Standard` nel Prisma schema
- [ ] Task 3: Enum Prisma per FuelType e Co2Standard (AC: #2)
  - [ ] 3.1 Aggiungere enum `FuelType` con valori: BENZINA, DIESEL, GPL, METANO, ELETTRICO, IBRIDO_BENZINA, IBRIDO_DIESEL, IDROGENO, BIFUEL_BENZINA_GPL, BIFUEL_BENZINA_METANO
  - [ ] 3.2 Aggiungere enum `Co2Standard` con valori: WLTP, NEDC
  - [ ] 3.3 Aggiungere enum `VehicleSource` con valori: INFOCARDATA, MANUAL (opzionale — si puo anche usare String)
- [ ] Task 4: Migrazione database (AC: #5)
  - [ ] 4.1 Eseguire `npx prisma migrate dev --name add-catalog-vehicles-engines` per generare la migrazione
  - [ ] 4.2 Verificare che la migrazione SQL generata crei correttamente le tabelle CatalogVehicles e Engines con tutti i vincoli
  - [ ] 4.3 Verificare gli indici generati
- [ ] Task 5: Tipi TypeScript per InfocarData (AC: #1)
  - [ ] 5.1 Creare `src/lib/integrations/infocardata/types.ts` con i tipi per la risposta InfocarData grezza:
    ```typescript
    /** Rappresentazione grezza di un veicolo dalla banca dati InfocarData */
    export interface InfocarDataVehicleRaw {
      codice: string                    // codice univoco veicolo InfocarData
      marca: string
      modello: string
      allestimento?: string
      carrozzeria?: string
      normativa?: string               // es. "EURO 6D", "EURO 6D-TEMP"
      capacitaSerbatoio?: number       // litri
      codiceAllestimento?: string      // per integrazione Codall
      annoImmatricolazione?: number
      motori: InfocarDataEngineRaw[]
    }

    export interface InfocarDataEngineRaw {
      nucmot: string                    // codice motore InfocarData
      tipoAlimentazione: string         // es. "BENZINA", "GASOLIO", "GPL", etc.
      cilindrata?: number               // cc
      potenzaKw?: number
      potenzaCv?: number
      co2GKm?: number                   // emissioni CO2 g/km
      standardEmissione?: string        // "WLTP" | "NEDC"
      consumo?: number                  // l/100km o kWh/100km
      unitaConsumo?: string             // "L/100KM" | "KWH/100KM"
    }

    /** Parametri per import batch */
    export interface InfocarDataBatchParams {
      fromDate?: Date                   // per incrementale: solo veicoli aggiornati dopo questa data
      marca?: string                    // filtro per marca
      limit?: number                    // limite risultati per pagina
      offset?: number                   // offset per paginazione
    }

    /** Risposta paginata da InfocarData */
    export interface InfocarDataBatchResponse {
      data: InfocarDataVehicleRaw[]
      total: number
      hasMore: boolean
    }

    /** Stato import per progress tracking */
    export interface ImportProgress {
      status: 'idle' | 'running' | 'completed' | 'failed'
      totalRecords: number
      processedRecords: number
      createdRecords: number
      updatedRecords: number
      skippedRecords: number
      errors: ImportError[]
      startedAt?: Date
      completedAt?: Date
    }

    export interface ImportError {
      codice: string
      message: string
      raw?: unknown
    }
    ```
- [ ] Task 6: Mapper InfocarData → Prisma (AC: #1, #2)
  - [ ] 6.1 Creare `src/lib/integrations/infocardata/mapper.ts` con le funzioni di mapping:
    ```typescript
    import { InfocarDataVehicleRaw, InfocarDataEngineRaw } from './types'
    import { Prisma } from '@/generated/prisma'

    /** Mappa un veicolo InfocarData raw al formato Prisma CatalogVehicle create input */
    export function mapVehicle(raw: InfocarDataVehicleRaw): Prisma.CatalogVehicleCreateInput

    /** Mappa un motore InfocarData raw al formato Prisma Engine create input */
    export function mapEngine(raw: InfocarDataEngineRaw, catalogVehicleId: string): Prisma.EngineCreateInput

    /** Mappa il tipo alimentazione InfocarData al FuelType enum Prisma */
    export function mapFuelType(tipoAlimentazione: string): FuelType

    /** Mappa lo standard emissione InfocarData al Co2Standard enum Prisma */
    export function mapCo2Standard(standard?: string): Co2Standard

    /** Determina se un veicolo e ibrido basandosi sui motori */
    export function isHybridVehicle(engines: InfocarDataEngineRaw[]): boolean
    ```
  - [ ] 6.2 Implementare `mapFuelType` con mapping esplicito di tutti i tipi alimentazione InfocarData noti:
    - "BENZINA" → BENZINA
    - "GASOLIO" / "DIESEL" → DIESEL
    - "GPL" → GPL
    - "METANO" / "GAS NATURALE" → METANO
    - "ELETTRICO" → ELETTRICO
    - "IBRIDO BENZINA" / "BENZINA/ELETTRICO" → IBRIDO_BENZINA
    - "IBRIDO GASOLIO" / "DIESEL/ELETTRICO" → IBRIDO_DIESEL
    - "IDROGENO" → IDROGENO
    - "BENZINA/GPL" → BIFUEL_BENZINA_GPL
    - "BENZINA/METANO" → BIFUEL_BENZINA_METANO
    - Fallback: loggare warning e usare il valore piu vicino o generare errore
  - [ ] 6.3 Implementare `isHybridVehicle`: ritorna `true` se il veicolo ha 2+ motori con tipi combustibile diversi di cui almeno uno elettrico
  - [ ] 6.4 Implementare `mapVehicle` che mappa tutti i campi e calcola `isHybrid` dai motori
  - [ ] 6.5 Implementare `mapEngine` che mappa i campi motore e normalizza le unita di misura
  - [ ] 6.6 Gestire valori assenti/null in modo difensivo — i campi opzionali nel raw devono mappare a `null` nei campi Prisma nullable
- [ ] Task 7: Client InfocarData con batch e incrementale (AC: #1, #3, #4)
  - [ ] 7.1 Creare `src/lib/integrations/infocardata/client.ts` con la classe/modulo client:
    ```typescript
    import { InfocarDataBatchParams, InfocarDataBatchResponse, InfocarDataVehicleRaw } from './types'
    import { logger } from '@/lib/utils/logger'

    const INFOCARDATA_API_URL = process.env.INFOCARDATA_API_URL
    const INFOCARDATA_API_KEY = process.env.INFOCARDATA_API_KEY
    const DEFAULT_TIMEOUT_MS = 30000
    const DEFAULT_BATCH_SIZE = 100

    /** Fetch batch di veicoli dalla banca dati InfocarData */
    export async function fetchVehicleBatch(params: InfocarDataBatchParams): Promise<InfocarDataBatchResponse>

    /** Fetch singolo veicolo per codice InfocarData */
    export async function fetchVehicleByCode(codice: string): Promise<InfocarDataVehicleRaw | null>

    /** Verifica disponibilita del servizio InfocarData */
    export async function checkHealth(): Promise<boolean>
    ```
  - [ ] 7.2 Implementare `fetchVehicleBatch` con:
    - Paginazione tramite `limit`/`offset`
    - Supporto `fromDate` per import incrementale (solo veicoli aggiornati dopo una certa data)
    - Timeout configurabile (`DEFAULT_TIMEOUT_MS = 30000`)
    - Logging strutturato con Pino
    - Gestione errori HTTP con messaggi specifici
  - [ ] 7.3 Implementare `fetchVehicleByCode` per recupero singolo veicolo (usato per aggiornamento puntuale)
  - [ ] 7.4 Implementare `checkHealth` che verifica la raggiungibilita del servizio InfocarData (usato per graceful degradation)
  - [ ] 7.5 Configurare variabili ambiente: aggiungere `INFOCARDATA_API_URL` e `INFOCARDATA_API_KEY` a `.env.example`
- [ ] Task 8: Servizio import con logica batch e incrementale (AC: #1, #3)
  - [ ] 8.1 Creare `src/lib/services/catalog-import-service.ts` con la logica di import:
    ```typescript
    import { prisma } from '@/lib/db/client'
    import { fetchVehicleBatch, checkHealth } from '@/lib/integrations/infocardata/client'
    import { mapVehicle, mapEngine } from '@/lib/integrations/infocardata/mapper'
    import { ImportProgress } from '@/lib/integrations/infocardata/types'

    /** Esegue import batch completo dal catalogo InfocarData */
    export async function runBatchImport(
      onProgress?: (progress: ImportProgress) => void
    ): Promise<ImportProgress>

    /** Esegue import incrementale (solo veicoli aggiornati dopo lastSyncAt) */
    export async function runIncrementalImport(
      onProgress?: (progress: ImportProgress) => void
    ): Promise<ImportProgress>

    /** Importa/aggiorna un singolo veicolo con i suoi motori (upsert) */
    export async function upsertCatalogVehicle(
      raw: InfocarDataVehicleRaw
    ): Promise<{ created: boolean }>
    ```
  - [ ] 8.2 Implementare `upsertCatalogVehicle` con transazione Prisma:
    - Upsert su CatalogVehicle per `codiceInfocarData`
    - Delete + recreate motori associati (per gestire motori aggiunti/rimossi)
    - Aggiornare `lastSyncAt` con timestamp corrente
    - Calcolare `isHybrid` dal set di motori
  - [ ] 8.3 Implementare `runBatchImport`:
    - Iterare con paginazione (`limit` + `offset`) fino a `hasMore = false`
    - Chiamare `upsertCatalogVehicle` per ogni veicolo
    - Aggiornare `ImportProgress` ad ogni batch
    - Invocare `onProgress` callback per reporting progresso
    - Catturare errori per singolo veicolo senza interrompere il batch (log + skip)
    - Logging riassuntivo a fine import
  - [ ] 8.4 Implementare `runIncrementalImport`:
    - Determinare `fromDate` come il `MAX(lastSyncAt)` dal catalogo o `null` se primo import
    - Se `fromDate` e `null`, delegare a `runBatchImport`
    - Altrimenti, chiamare `fetchVehicleBatch` con `fromDate` e processare come batch
  - [ ] 8.5 Gestire le transazioni Prisma: ogni upsert veicolo + motori in una singola `prisma.$transaction`
- [ ] Task 9: Server Action per import (AC: #3)
  - [ ] 9.1 Creare `src/app/(dashboard)/import/actions/import-infocardata.ts` con:
    ```typescript
    'use server'

    import { ActionResult } from '@/types/action-result'
    import { ImportProgress } from '@/lib/integrations/infocardata/types'
    import { runBatchImport, runIncrementalImport } from '@/lib/services/catalog-import-service'
    import { auth } from '@/lib/auth/auth'

    /** Server Action: avvia import batch InfocarData (solo Admin) */
    export async function importInfocarDataBatch(): Promise<ActionResult<ImportProgress>>

    /** Server Action: avvia import incrementale InfocarData (solo Admin) */
    export async function importInfocarDataIncremental(): Promise<ActionResult<ImportProgress>>
    ```
  - [ ] 9.2 Implementare controllo RBAC: solo utenti con ruolo Admin possono eseguire l'import
  - [ ] 9.3 Implementare wrapper `ActionResult<ImportProgress>` con gestione errori
  - [ ] 9.4 Loggare inizio e fine import con Pino (info level)
- [ ] Task 10: Graceful degradation InfocarData (AC: #4)
  - [ ] 10.1 Nel client InfocarData, implementare circuit breaker pattern semplificato:
    - Tenere traccia degli ultimi N errori consecutivi
    - Se errori consecutivi > soglia (es. 3), marcare il servizio come `unavailable`
    - Quando `unavailable`, ritornare errore immediato senza tentare la chiamata
    - Dopo un cooldown (es. 60s), riprovare una singola chiamata per verificare recovery
  - [ ] 10.2 Nella Server Action, se InfocarData e indisponibile:
    - Ritornare `ActionResult` con `success: false`, `code: ErrorCode.INTERNAL`, `error: "Servizio InfocarData temporaneamente non disponibile. Il catalogo locale resta operativo."`
    - Le operazioni di lettura sul catalogo locale continuano a funzionare normalmente
  - [ ] 10.3 Nel servizio import, se un singolo veicolo fallisce il fetch/parsing:
    - Loggare il warning con dettagli
    - Aggiungere a `ImportProgress.errors`
    - Incrementare `skippedRecords`
    - Continuare con il veicolo successivo (non interrompere il batch)
  - [ ] 10.4 Creare helper `src/lib/integrations/infocardata/health.ts` che espone lo stato corrente del servizio per eventuale visualizzazione UI
- [ ] Task 11: Schema Zod per validazione CatalogVehicle (AC: #2)
  - [ ] 11.1 Creare `src/lib/schemas/catalog-vehicle.ts` con Zod schema per CatalogVehicle:
    ```typescript
    import { z } from 'zod'

    export const catalogVehicleSchema = z.object({
      marca: z.string().min(1, "Marca obbligatoria").max(100),
      modello: z.string().min(1, "Modello obbligatorio").max(100),
      allestimento: z.string().max(200).nullable().optional(),
      carrozzeria: z.string().max(100).nullable().optional(),
      normativa: z.string().max(50).nullable().optional(),
      capacitaSerbatoioL: z.number().positive().nullable().optional(),
      isHybrid: z.boolean().default(false),
      source: z.enum(["INFOCARDATA", "MANUAL"]).default("INFOCARDATA"),
    })

    export const engineSchema = z.object({
      fuelType: z.enum([...FuelType values...]),
      cilindrata: z.number().int().positive().nullable().optional(),
      potenzaKw: z.number().positive().nullable().optional(),
      potenzaCv: z.number().positive().nullable().optional(),
      co2GKm: z.number().nonnegative().nullable().optional(),
      co2Standard: z.enum(["WLTP", "NEDC"]).default("WLTP"),
      consumptionL100Km: z.number().positive().nullable().optional(),
      consumptionUnit: z.enum(["L/100KM", "KWH/100KM"]).default("L/100KM"),
      nucmot: z.string().nullable().optional(),
    })

    export const catalogVehicleWithEnginesSchema = catalogVehicleSchema.extend({
      engines: z.array(engineSchema).min(1, "Almeno un motore obbligatorio"),
    })
    ```
  - [ ] 11.2 Esportare i tipi TypeScript inferiti dagli schema Zod per uso nei service e nelle action
- [ ] Task 12: Variabili ambiente e configurazione (AC: #3, #4)
  - [ ] 12.1 Aggiungere a `.env.example`:
    ```
    # InfocarData Integration
    INFOCARDATA_API_URL=https://api.infocardata.example.com
    INFOCARDATA_API_KEY=your-api-key-here
    INFOCARDATA_TIMEOUT_MS=30000
    INFOCARDATA_BATCH_SIZE=100
    ```
  - [ ] 12.2 Aggiungere le stesse variabili a `.env.local` con valori per dev (possibilmente un mock URL)

## Dev Notes

### Struttura Dati InfocarData (Hints)

InfocarData (Quattroruote) e la banca dati di riferimento per i dati tecnici dei veicoli in Italia. La struttura tipica dei dati include:

- **Identificazione veicolo:** Codice univoco, marca, modello, allestimento, carrozzeria
- **Dati tecnici:** Normativa anti-inquinamento (Euro 6d, etc.), capacita serbatoio
- **Motori (1:N):** Ogni veicolo puo avere piu motori (ibridi, bi-fuel). Ogni motore ha: codice motore (nucmot), tipo alimentazione, cilindrata, potenza KW e CV, emissioni CO2, consumo
- **Emissioni CO2:** Espresse in g/km, con standard WLTP (post 2018) o NEDC (pre 2018). I veicoli piu recenti hanno solo WLTP, quelli piu vecchi solo NEDC, alcuni hanno entrambi

### Multi-Engine e Veicoli Ibridi

Un veicolo ibrido ha tipicamente 2 motori nel database InfocarData:
1. **Motore termico** (es. BENZINA, 1.6L, 90kW, 120 g/km CO2)
2. **Motore elettrico** (es. ELETTRICO, 0cc, 50kW, 0 g/km CO2)

Per i veicoli **bi-fuel** (benzina/GPL, benzina/metano):
- InfocarData puo esporre 1 motore con tipo alimentazione combinato ("BENZINA/GPL") oppure 2 motori separati
- Il mapper deve gestire entrambi i casi

Il flag `isHybrid` si determina verificando la presenza di almeno 2 motori con tipi di combustibile diversi, di cui almeno uno elettrico.

### WLTP vs NEDC

- **WLTP** (Worldwide Harmonized Light Vehicle Test Procedure): standard dal 2018, valori tendenzialmente piu alti di NEDC
- **NEDC** (New European Driving Cycle): standard pre-2018, valori tendenzialmente piu bassi
- Il campo `co2Standard` in Engine indica quale standard e stato usato per la misurazione
- La conversione tra i due standard e gestita nella Story 2.5 (non in questa story)
- Per i calcoli emissioni, WLTP e il default. Se disponibile solo NEDC, si usa NEDC (la conversione e implementata nella Story 2.5)

### Catalogo GLOBALE (no tenantId)

Il catalogo veicoli e **GLOBALE** — non ha `tenantId`. Questo significa:
- Non passa dal Prisma client extension che filtra per tenant
- Le query al catalogo usano il Prisma client base (senza filtro tenant)
- Solo Admin puo eseguire import e gestione catalogo
- I veicoli operativi tenant (Epic 3) fanno riferimento al catalogo tramite FK `catalogVehicleId`

### Pattern Import Batch

Il batch import segue questo flusso:
```
Admin avvia import → checkHealth() → fetchVehicleBatch(page 1)
  → per ogni veicolo: mapVehicle() + mapEngine() → upsertCatalogVehicle()
  → fetchVehicleBatch(page 2) → ... → fine pagine
  → ImportProgress con riepilogo
```

L'import incrementale usa lo stesso flusso ma con `fromDate = MAX(lastSyncAt)`.

### Graceful Degradation (NFR22)

Il pattern di graceful degradation per InfocarData:
- Il catalogo locale funziona sempre, anche se InfocarData e down
- L'import fallisce con messaggio user-friendly se il servizio e indisponibile
- Errori su singoli veicoli non bloccano l'intero batch
- Un circuit breaker semplificato evita flood di richieste verso un servizio in errore
- Lo stato di salute del servizio e consultabile per feedback UI

### Decisioni Architetturali Rilevanti

- **DA-3 Multi-Engine:** Tabella Engine separata con FK a CatalogVehicle. Ogni motore ha fuelType, co2GKm, consumptionL100Km, nucmot
- **DA-4 Validazione Zod:** Schema Zod condivisi tra frontend e backend
- **DA-5 Migrazioni Prisma:** Prisma Migrate per DDL versionato
- **AC-1 Pattern API Ibrido:** Server Actions per mutations (import e un mutation)
- **AC-2 Error Handling:** ActionResult<T> pattern per la Server Action di import
- **ID-4 Logging:** Pino per logging strutturato di tutto il flusso import

### Naming Conventions (da architecture.md)

- Modelli Prisma: PascalCase singolare (`CatalogVehicle`, `Engine`)
- Campi Prisma: camelCase (`fuelType`, `co2GKm`, `potenzaKw`)
- Tabelle SQL Server: `@@map("CatalogVehicles")`, `@@map("Engines")`
- Enum: PascalCase (`FuelType`, `Co2Standard`)
- File: kebab-case (`catalog-import-service.ts`, `catalog-vehicle.ts`)

### File da Creare/Modificare

| File | Azione | Descrizione |
|---|---|---|
| `prisma/schema.prisma` | Modifica | Aggiungere modelli CatalogVehicle, Engine, enum FuelType, Co2Standard |
| `src/lib/integrations/infocardata/types.ts` | Crea | Tipi TypeScript per dati InfocarData raw |
| `src/lib/integrations/infocardata/mapper.ts` | Crea | Mapping InfocarData raw → Prisma input |
| `src/lib/integrations/infocardata/client.ts` | Crea | Client HTTP per API InfocarData |
| `src/lib/integrations/infocardata/health.ts` | Crea | Circuit breaker e health check |
| `src/lib/services/catalog-import-service.ts` | Crea | Logica import batch/incrementale |
| `src/lib/schemas/catalog-vehicle.ts` | Crea | Schema Zod per CatalogVehicle e Engine |
| `src/app/(dashboard)/import/actions/import-infocardata.ts` | Crea | Server Action per import |
| `.env.example` | Modifica | Aggiungere variabili INFOCARDATA_* |
| `prisma/migrations/` | Genera | Migrazione add-catalog-vehicles-engines |

### Anti-Pattern da Evitare

- NON aggiungere `tenantId` al catalogo — e globale
- NON usare `any` per i dati InfocarData raw — tipizzare tutto con le interfacce definite
- NON interrompere il batch per errori su singoli veicoli — log + skip + continua
- NON hardcodare URL/credenziali InfocarData — usare variabili ambiente
- NON fare import sincrono bloccante — usare paginazione con progress callback
- NON saltare la validazione Zod nella Server Action — validare sempre server-side

### References

- [Source: architecture.md#DA-3] — Multi-Engine pattern (Vehicle → Engine 1:N)
- [Source: architecture.md#Structure Patterns] — Directory structure e file locations
- [Source: architecture.md#Integration Points] — InfocarData integration flow
- [Source: epics.md#Story 2.1] — Acceptance criteria BDD
- [Source: prd.md#FR1] — Import/sync dati tecnici da InfocarData
- [Source: prd.md#FR5] — Esposizione dati principali veicolo
- [Source: prd.md#NFR22] — Graceful degradation servizi esterni
- [Source: prd.md#NFR23] — Import batch e aggiornamenti incrementali

## Dev Agent Record

### Agent Model Used



### Debug Log References

### Completion Notes List

### File List

