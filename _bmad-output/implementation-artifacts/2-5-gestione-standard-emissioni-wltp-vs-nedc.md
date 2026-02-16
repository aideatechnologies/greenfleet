# Story 2.5: Gestione Standard Emissioni WLTP vs NEDC

Status: done

## Story

As a **Admin**,
I want **gestire entrambi gli standard di emissione WLTP e NEDC con conversione automatica**,
So that **i dati di emissione siano comparabili indipendentemente dallo standard di origine**.

## Acceptance Criteria

1. Entrambi i valori (WLTP e NEDC) sono disponibili per ogni motore, con quello mancante calcolato tramite coefficiente di conversione
2. Il coefficiente di conversione e configurabile dall'Admin
3. Lo standard di origine e sempre indicato chiaramente (badge/label che distingue valore originale da valore calcolato)
4. I calcoli di emissione successivi (teorici e reali) utilizzano il valore WLTP come default
5. I valori convertiti sono ricalcolati automaticamente quando il coefficiente di conversione viene aggiornato
6. Il campo `co2Standard` enum indica lo standard di origine del dato (WLTP o NEDC)

## Tasks / Subtasks

- [ ] Task 1: Aggiornare il modello Engine nel Prisma schema (AC: #1, #6)
  - [ ] 1.1 Creare enum `EmissionStandard` con valori `WLTP` e `NEDC` nello schema Prisma
  - [ ] 1.2 Aggiungere campo `co2GKmWltp` (Decimal, nullable) al modello `Engine` — valore CO2 g/km secondo standard WLTP
  - [ ] 1.3 Aggiungere campo `co2GKmNedc` (Decimal, nullable) al modello `Engine` — valore CO2 g/km secondo standard NEDC
  - [ ] 1.4 Aggiungere campo `co2Standard` (enum `EmissionStandard`) al modello `Engine` — indica lo standard di origine del dato
  - [ ] 1.5 Aggiungere campo `co2GKmWltpIsCalculated` (Boolean, default false) — flag che indica se il valore WLTP e stato calcolato tramite conversione
  - [ ] 1.6 Aggiungere campo `co2GKmNedcIsCalculated` (Boolean, default false) — flag che indica se il valore NEDC e stato calcolato tramite conversione
  - [ ] 1.7 Mantenere il campo esistente `co2GKm` come campo di riferimento primario (alias di `co2GKmWltp` per backward compatibility nei calcoli)
  - [ ] 1.8 Eseguire `npx prisma migrate dev --name add-wltp-nedc-emission-standards` per generare la migrazione
  - [ ] 1.9 Scrivere migrazione dati per popolare `co2GKmWltp` e `co2Standard` dai valori `co2GKm` esistenti (assumendo WLTP come default per veicoli senza standard specificato)

- [ ] Task 2: Creare modello ConversionCoefficient per configurazione Admin (AC: #2)
  - [ ] 2.1 Creare modello Prisma `EmissionConversionConfig` con campi: `id`, `name` (String, es. "Default", "SUV", "Citycar"), `nedcToWltpFactor` (Decimal, es. 1.20 — perche WLTP e tipicamente superiore a NEDC), `wltpToNedcFactor` (Decimal, es. 0.83), `isDefault` (Boolean), `createdAt`, `updatedAt`, `createdById` (FK a User)
  - [ ] 2.2 Questo modello e globale (non ha tenantId) — i coefficienti di conversione sono standard tecnici, non dati tenant-specific
  - [ ] 2.3 Aggiungere campo opzionale `conversionConfigId` (FK) al modello `Engine` per permettere override del coefficiente per singolo motore
  - [ ] 2.4 Creare seed data con coefficiente default: `nedcToWltpFactor = 1.21` e `wltpToNedcFactor = 0.83` (basato su studi medi di correlazione WLTP/NEDC)
  - [ ] 2.5 Eseguire migrazione per la nuova tabella

- [ ] Task 3: Creare Zod schemas per validazione (AC: #1, #2)
  - [ ] 3.1 Creare `src/lib/schemas/emission-standard.ts` con:
    - Schema `emissionStandardEnum` (z.enum ["WLTP", "NEDC"])
    - Schema `emissionConversionConfigSchema` per creazione/modifica coefficiente (name, nedcToWltpFactor 1.00-2.00, wltpToNedcFactor 0.50-1.00, isDefault)
    - Schema `engineEmissionInputSchema` per input emissioni motore (co2GKmWltp opzionale, co2GKmNedc opzionale, co2Standard richiesto) con validazione `refine` che almeno uno dei due valori CO2 sia presente
  - [ ] 3.2 Aggiornare `src/lib/schemas/engine.ts` per integrare i nuovi campi emissione

- [ ] Task 4: Creare servizio di conversione emissioni (AC: #1, #4, #5)
  - [ ] 4.1 Creare `src/lib/services/emission-conversion-service.ts` con funzioni:
    - `convertNedcToWltp(nedcValue: number, factor: number): number` — converte NEDC in WLTP moltiplicando per il fattore
    - `convertWltpToNedc(wltpValue: number, factor: number): number` — converte WLTP in NEDC moltiplicando per il fattore
    - `getConversionConfig(engineId?: string): Promise<EmissionConversionConfig>` — recupera il coefficiente (override motore o default)
    - `calculateMissingStandard(engine: EngineEmissionInput): Promise<EngineEmissionResult>` — data un'emissione con uno standard, calcola l'altro e ritorna entrambi i valori con flag isCalculated
    - `getWltpValueForCalculation(engine: EngineWithEmissions): number` — ritorna il valore WLTP (originale o calcolato) da usare nei calcoli emissione successivi
  - [ ] 4.2 Tutti i valori calcolati arrotondati a 1 decimale (coerente con precisione dati InfocarData)
  - [ ] 4.3 Il servizio logga con Pino (info) quando esegue una conversione, includendo valore originale, fattore e risultato
  - [ ] 4.4 Creare `src/lib/services/emission-conversion-service.test.ts` con test:
    - Conversione NEDC -> WLTP con fattore 1.21 (es. NEDC 120 g/km -> WLTP 145.2 g/km)
    - Conversione WLTP -> NEDC con fattore 0.83 (es. WLTP 145 g/km -> NEDC 120.4 g/km)
    - Roundtrip consistency: NEDC -> WLTP -> NEDC deve tornare vicino al valore originale (tolleranza 1%)
    - Override coefficiente per singolo motore
    - Errore se entrambi i valori sono assenti
    - `getWltpValueForCalculation` ritorna WLTP originale se presente, altrimenti WLTP calcolato

- [ ] Task 5: Auto-calcolo valore mancante al salvataggio (AC: #1, #5)
  - [ ] 5.1 Aggiornare la Server Action di creazione/modifica Engine (`src/app/(dashboard)/vehicles/actions/manage-engines.ts`) per invocare `calculateMissingStandard` prima del save
  - [ ] 5.2 Se `co2Standard = WLTP` e `co2GKmWltp` e valorizzato ma `co2GKmNedc` e nullo: calcolare NEDC = WLTP * wltpToNedcFactor, impostare `co2GKmNedcIsCalculated = true`
  - [ ] 5.3 Se `co2Standard = NEDC` e `co2GKmNedc` e valorizzato ma `co2GKmWltp` e nullo: calcolare WLTP = NEDC * nedcToWltpFactor, impostare `co2GKmWltpIsCalculated = true`
  - [ ] 5.4 Se entrambi i valori sono forniti dall'utente: salvare entrambi come originali (isCalculated = false per entrambi)
  - [ ] 5.5 Aggiornare anche il mapper InfocarData (`src/lib/integrations/infocardata/mapper.ts`) per popolare `co2Standard` in base ai dati della banca dati (veicoli post-2018 = WLTP, pre-2018 = NEDC) e calcolare il valore mancante
  - [ ] 5.6 Validare con Zod server-side che almeno un valore CO2 sia presente quando `co2Standard` e specificato
  - [ ] 5.7 Ritornare `ActionResult<EngineWithEmissions>` dal Server Action

- [ ] Task 6: Server Action per gestione coefficienti di conversione — Admin only (AC: #2)
  - [ ] 6.1 Creare `src/app/(dashboard)/settings/emission-standards/actions/manage-conversion-config.ts` con azioni:
    - `createConversionConfig(input)` — crea nuovo coefficiente, RBAC check Admin
    - `updateConversionConfig(id, input)` — modifica coefficiente esistente, RBAC check Admin
    - `deleteConversionConfig(id)` — elimina coefficiente non-default, RBAC check Admin
    - `setDefaultConversionConfig(id)` — imposta come default (rimuove flag da precedente default), RBAC check Admin
  - [ ] 6.2 Ogni azione valida con Zod e ritorna `ActionResult<T>`
  - [ ] 6.3 Audit trail: tracciare ogni modifica con `emission_conversion.created`, `emission_conversion.updated`, `emission_conversion.deleted` tramite audit-service
  - [ ] 6.4 Quando il coefficiente default viene modificato, non ricalcolare automaticamente tutti i motori esistenti (operazione batch troppo pesante). Invece, mostrare un avviso all'Admin con conteggio motori impattati e opzione di ricalcolo batch esplicita

- [ ] Task 7: Server Action per ricalcolo batch (AC: #5)
  - [ ] 7.1 Creare `src/app/(dashboard)/settings/emission-standards/actions/recalculate-emissions.ts` con azione:
    - `recalculateMissingStandards()` — ricalcola tutti i valori calcolati (isCalculated = true) con il coefficiente attuale
  - [ ] 7.2 RBAC check Admin
  - [ ] 7.3 Operazione batch: processare in chunk di 100 motori per non sovraccaricare il database
  - [ ] 7.4 Ritornare `ActionResult<{ updated: number; errors: number }>` con conteggio risultati
  - [ ] 7.5 Audit trail: tracciare come `emission_standard.batch_recalculated`

- [ ] Task 8: UI — Pagina configurazione coefficienti di conversione (AC: #2)
  - [ ] 8.1 Creare `src/app/(dashboard)/settings/emission-standards/page.tsx` — pagina Admin per gestione coefficienti
  - [ ] 8.2 Creare `src/app/(dashboard)/settings/emission-standards/loading.tsx` con skeleton
  - [ ] 8.3 Creare `src/app/(dashboard)/settings/emission-standards/components/ConversionConfigTable.tsx` — DataTable con colonne: Nome, Fattore NEDC->WLTP, Fattore WLTP->NEDC, Default (badge), Azioni (modifica/elimina)
  - [ ] 8.4 Creare `src/app/(dashboard)/settings/emission-standards/components/ConversionConfigForm.tsx` — Dialog form per creazione/modifica coefficiente con React Hook Form + Zod
  - [ ] 8.5 Creare `src/app/(dashboard)/settings/emission-standards/components/RecalculateButton.tsx` — Bottone con conferma Dialog che mostra il conteggio motori impattati e avvia il ricalcolo batch
  - [ ] 8.6 Aggiungere voce "Standard Emissioni" nel menu settings della sidebar (visibile solo ad Admin)

- [ ] Task 9: UI — Visualizzazione emissioni WLTP/NEDC nel dettaglio motore (AC: #3)
  - [ ] 9.1 Aggiornare `src/app/(dashboard)/vehicles/components/EngineList.tsx` per mostrare entrambi i valori CO2 (WLTP e NEDC) con indicatore chiaro:
    - Valore originale: testo normale con badge dello standard di origine (es. badge "WLTP" in teal)
    - Valore calcolato: testo in stile secondario (muted) con icona calcolatrice e tooltip "Calcolato da [standard] con fattore [x.xx]"
  - [ ] 9.2 Aggiornare `src/app/(dashboard)/vehicles/components/EngineForm.tsx`:
    - Aggiungere select per `co2Standard` (WLTP/NEDC) — obbligatorio
    - Mostrare campo CO2 per lo standard selezionato come input obbligatorio
    - Mostrare campo CO2 per l'altro standard come input opzionale con placeholder "Calcolato automaticamente se vuoto"
    - Mostrare preview del valore calcolato in tempo reale quando l'utente compila un solo valore
  - [ ] 9.3 Nella DataTable veicoli (`VehicleTable.tsx`), mostrare il valore WLTP (colonna "CO2 g/km") con indicatore piccolo se il dato e NEDC convertito

- [ ] Task 10: Integrazione con calcolo emissioni teoriche (AC: #4)
  - [ ] 10.1 Aggiornare `src/lib/services/emission-calculator.ts` per usare `getWltpValueForCalculation` dal conversion service quando calcola le emissioni teoriche (gCO2e/km x km percorsi)
  - [ ] 10.2 Nel report emissioni, annotare quando il valore WLTP usato e un valore calcolato (non originale) per trasparenza
  - [ ] 10.3 I calcoli rimangono deterministici: stesso input + stesso coefficiente = stesso output (NFR21)

## Dev Notes

### Contesto Dominio WLTP vs NEDC

- **WLTP** (Worldwide Harmonized Light Vehicle Test Procedure): standard post-settembre 2018 per veicoli nuovi in UE. Misurazioni piu realistiche, valori CO2 tipicamente piu alti del 20-25% rispetto a NEDC
- **NEDC** (New European Driving Cycle): standard precedente, usato fino a 2018. Condizioni di test meno realistiche, valori CO2 tipicamente piu bassi
- **Conversione tipica:** WLTP = NEDC * 1.21 (media), ma varia per segmento veicolo (SUV, citycar, etc.). Per questo il coefficiente e configurabile e supporta profili multipli
- **InfocarData:** La banca dati espone il valore CO2 nello standard di omologazione del veicolo. Veicoli pre-2018 avranno NEDC, post-2018 avranno WLTP. Alcuni veicoli in periodo transitorio (2017-2019) possono avere entrambi
- **Compliance:** I report ESG (CSRD, GRI, GHG Protocol) richiedono consistenza nello standard di misurazione usato. Usare WLTP come default e allineato con la normativa UE vigente

### Decisioni Architetturali Rilevanti

- **DA-3 Multi-Engine:** Il modello Engine ha FK a Vehicle. I campi WLTP/NEDC sono a livello motore (non veicolo) perche ogni motore di un ibrido ha le proprie emissioni CO2
- **DA-4 Validazione Zod:** Schema condivisi client/server. Lo schema `engineEmissionInputSchema` valida che almeno un valore CO2 sia presente
- **AC-1 Pattern API Ibrido:** Server Actions per CRUD coefficienti e ricalcolo batch
- **AC-2 Error Handling:** ActionResult<T> per ogni operazione
- **FA-1 State Management:** RSC per read dei coefficienti, Server Actions per write
- **ID-4 Logging:** Pino per tracciare conversioni e ricalcoli batch

### Modello Dati — Engine (aggiornato)

```prisma
model Engine {
  id                    String   @id @default(cuid())
  vehicleId             String
  vehicle               Vehicle  @relation(fields: [vehicleId], references: [id])
  fuelType              FuelType
  displacement          Int?                  // cilindrata cc
  powerKw               Decimal?              // potenza KW
  powerCv               Decimal?              // potenza CV
  co2GKm                Decimal?              // valore CO2 di riferimento (= co2GKmWltp se disponibile)
  co2GKmWltp            Decimal?              // CO2 g/km standard WLTP
  co2GKmNedc            Decimal?              // CO2 g/km standard NEDC
  co2Standard           EmissionStandard?     // standard di origine del dato
  co2GKmWltpIsCalculated Boolean @default(false) // true se calcolato da NEDC
  co2GKmNedcIsCalculated Boolean @default(false) // true se calcolato da WLTP
  conversionConfigId    String?               // FK opzionale per override coefficiente
  conversionConfig      EmissionConversionConfig? @relation(fields: [conversionConfigId], references: [id])
  consumptionL100Km     Decimal?              // consumo l/100km
  nucmot                String?               // codice motore InfocarData
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  @@map("Engines")
}

enum EmissionStandard {
  WLTP
  NEDC
}

model EmissionConversionConfig {
  id                String   @id @default(cuid())
  name              String                    // es. "Default", "SUV", "Citycar"
  nedcToWltpFactor  Decimal                   // es. 1.21
  wltpToNedcFactor  Decimal                   // es. 0.83
  isDefault         Boolean  @default(false)
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  createdById       String
  createdBy         User     @relation(fields: [createdById], references: [id])
  engines           Engine[]                  // motori che usano questo config come override

  @@map("EmissionConversionConfigs")
}
```

### Servizio di Conversione — Interfacce

```typescript
// src/lib/services/emission-conversion-service.ts

type EngineEmissionInput = {
  co2GKmWltp?: number | null
  co2GKmNedc?: number | null
  co2Standard: "WLTP" | "NEDC"
  conversionConfigId?: string | null
}

type EngineEmissionResult = {
  co2GKmWltp: number
  co2GKmNedc: number
  co2GKmWltpIsCalculated: boolean
  co2GKmNedcIsCalculated: boolean
  co2GKm: number // = co2GKmWltp (reference value per calcoli)
  conversionFactorUsed: number | null // null se entrambi originali
}
```

### Logica di Conversione

```
Se co2Standard = WLTP e co2GKmWltp presente:
  co2GKmNedc = co2GKmWltp * wltpToNedcFactor
  co2GKmNedcIsCalculated = true
  co2GKm = co2GKmWltp (originale)

Se co2Standard = NEDC e co2GKmNedc presente:
  co2GKmWltp = co2GKmNedc * nedcToWltpFactor
  co2GKmWltpIsCalculated = true
  co2GKm = co2GKmWltp (calcolato)

Se entrambi presenti:
  Nessuna conversione, entrambi originali
  co2GKm = co2GKmWltp (WLTP ha precedenza)
```

### UI — Indicatori Visivi

- **Badge standard di origine:** Badge piccolo colorato accanto al valore (es. "WLTP" in teal, "NEDC" in slate)
- **Indicatore valore calcolato:** Icona calcolatrice (`Calculator` da lucide-react) + testo muted + tooltip con dettaglio conversione
- **Preview in tempo reale nel form:** Sotto il campo vuoto, mostrare "Valore stimato: XXX g/km" in testo muted calcolato live dal valore inserito nell'altro campo
- **Formattazione numeri:** Locale IT con 1 decimale (es. "145,2 g/km")

### Seed Data — Coefficienti Default

```typescript
// prisma/seed.ts (da aggiungere)
const defaultConversionConfigs = [
  {
    name: "Default",
    nedcToWltpFactor: 1.21,
    wltpToNedcFactor: 0.83,
    isDefault: true,
  },
  {
    name: "SUV / Crossover",
    nedcToWltpFactor: 1.25,
    wltpToNedcFactor: 0.80,
    isDefault: false,
  },
  {
    name: "Citycar / Utilitaria",
    nedcToWltpFactor: 1.18,
    wltpToNedcFactor: 0.85,
    isDefault: false,
  },
]
```

### Convenzioni Naming (da architecture.md)

| Elemento | Convenzione | Esempio in questa story |
|---|---|---|
| Model Prisma | PascalCase singolare | `EmissionConversionConfig` |
| Campo Prisma | camelCase | `co2GKmWltp`, `nedcToWltpFactor` |
| Tabella SQL Server | @map PascalCase plurale | `@@map("EmissionConversionConfigs")` |
| Server Actions | kebab-case in actions/ | `manage-conversion-config.ts` |
| React Components | PascalCase.tsx | `ConversionConfigTable.tsx` |
| Zod schemas | kebab-case in schemas/ | `emission-standard.ts` |
| Service | kebab-case in services/ | `emission-conversion-service.ts` |
| Test | co-locato .test.ts | `emission-conversion-service.test.ts` |

### Dipendenze tra Story

- **Richiede:** Story 2.1 (Schema Catalogo e Import InfocarData) — il modello Engine deve esistere
- **Richiede:** Story 1.1 (Scaffold) — Prisma, Better Auth, struttura progetto
- **Utilizzata da:** Story 6.2 (Calcolo Emissioni Teoriche e Reali) — usa `getWltpValueForCalculation`
- **Utilizzata da:** Story 2.4 (Inserimento Manuale Veicoli) — form motore deve supportare selezione standard

### Anti-Pattern da Evitare

- NON hardcodare il coefficiente di conversione nel codice — deve essere configurabile da database
- NON ricalcolare automaticamente tutti i motori quando il coefficiente cambia — operazione esplicita con conferma Admin
- NON usare il valore NEDC per i calcoli emissione quando il WLTP e disponibile (anche se calcolato)
- NON mostrare un valore calcolato senza indicarlo chiaramente come tale
- NON permettere di salvare un motore senza almeno un valore CO2 quando lo standard e specificato
- NON fare query dirette al database nel service — usare sempre il Prisma client (con tenant extension dove applicabile)

### References

- [Source: brainstorming #40] — Standard WLTP vs NEDC con coefficiente di conversione
- [Source: brainstorming #27] — Multi-engine per ibridi/bi-fuel con gCO2e/km_WLTP per motore
- [Source: prd.md — Domain-Specific Requirements] — Supporto WLTP/NEDC con coefficiente di conversione
- [Source: architecture.md — DA-3] — Tabella Engine separata con FK a Vehicle
- [Source: architecture.md — Structure Patterns] — Feature-based directory, services in lib/services/
- [Source: epics.md — Story 2.5] — Acceptance criteria BDD
- [Source: implementation-readiness-report] — WLTP/NEDC compliance requirement

## Dev Agent Record

### Agent Model Used



### Debug Log References

### Completion Notes List

### File List

