# Story 6.2: Calcolo Emissioni Teoriche e Reali con Delta

Status: done

## Story

As a **Fleet Manager**,
I want **calcolare le emissioni di ogni veicolo con doppio metodo (teorico e reale) e confrontarle**,
So that **posso valutare l'impatto ambientale effettivo della flotta rispetto ai dati dichiarati**.

## Acceptance Criteria

1. Le emissioni teoriche sono calcolate come: gCO2e/km da InfocarData x km percorsi (FR32)
2. Le emissioni reali sono calcolate come: quantita carburante rifornita x fattore di emissione per tipo carburante (FR33)
3. Il sistema confronta emissioni teoriche e reali evidenziando il delta assoluto (kgCO2e) e percentuale (%) (FR34)
4. Il delta e visualizzato tramite il componente DeltaBar con varianti inline, full e mini
5. I calcoli sono deterministici e riproducibili: stesso input = stesso output, sempre (NFR21)
6. I risultati sono espressi in kgCO2e con precisione a 2 decimali
7. Il servizio emission-calculator.ts contiene funzioni pure e testabili, senza dipendenze da framework o database

## Tasks / Subtasks

- [ ] Task 1: Servizio emission-calculator — funzioni pure di calcolo (AC: #1, #2, #3, #5, #6, #7)
  - [ ] 1.1 Creare `src/lib/services/emission-calculator.ts` con le seguenti funzioni pure:
    - `calculateTheoreticalEmissions(co2GKm: number, kmTravelled: number): number` — ritorna kgCO2e con 2 decimali
    - `calculateRealEmissions(fuelLitres: number, emissionFactorKgCO2ePerL: number): number` — ritorna kgCO2e con 2 decimali
    - `calculateDelta(theoretical: number, real: number): { absolute: number; percentage: number }` — delta assoluto (real - theoretical) e percentuale con 2 decimali
    - `calculateVehicleEmissions(input: VehicleEmissionInput): VehicleEmissionResult` — funzione aggregata che orchestra le tre precedenti
  - [ ] 1.2 Definire i tipi di input/output in `src/lib/services/emission-calculator.ts` (co-locati):
    ```typescript
    type VehicleEmissionInput = {
      co2GKm: number          // gCO2e/km da catalogo InfocarData
      kmTravelled: number      // km percorsi nel periodo
      fuelLitres: number       // litri totali riforniti nel periodo
      emissionFactorKgCO2ePerL: number  // fattore emissione del tipo carburante
    }
    type VehicleEmissionResult = {
      theoretical: number      // kgCO2e
      real: number             // kgCO2e
      delta: {
        absolute: number       // kgCO2e (real - theoretical)
        percentage: number     // % ((real - theoretical) / theoretical * 100)
      }
    }
    ```
  - [ ] 1.3 Formula emissioni teoriche: `(co2GKm * kmTravelled) / 1000` — conversione da gCO2e a kgCO2e
  - [ ] 1.4 Formula emissioni reali: `fuelLitres * emissionFactorKgCO2ePerL` — gia in kgCO2e
  - [ ] 1.5 Formula delta assoluto: `real - theoretical` (positivo = reale > teorico)
  - [ ] 1.6 Formula delta percentuale: `((real - theoretical) / theoretical) * 100` — gestire caso theoretical = 0 (ritornare 0 o Infinity con guard)
  - [ ] 1.7 Arrotondamento: usare `Math.round(value * 100) / 100` per 2 decimali su tutti i risultati (determinismo — evitare toFixed che ritorna stringa)
  - [ ] 1.8 Le funzioni sono pure: nessun side effect, nessuna dipendenza da database/prisma/session, nessun import da framework
- [ ] Task 2: Test unitari emission-calculator (AC: #5, #6, #7)
  - [ ] 2.1 Creare `src/lib/services/emission-calculator.test.ts` con Vitest
  - [ ] 2.2 Test `calculateTheoreticalEmissions`:
    - Input: co2GKm=150, kmTravelled=10000 → Expected: 1500.00 kgCO2e
    - Input: co2GKm=0, kmTravelled=10000 → Expected: 0.00
    - Input: co2GKm=150, kmTravelled=0 → Expected: 0.00
    - Input: co2GKm=123.4, kmTravelled=5678 → verifica 2 decimali
  - [ ] 2.3 Test `calculateRealEmissions`:
    - Input: fuelLitres=500, emissionFactor=2.640 → Expected: 1320.00 kgCO2e
    - Input: fuelLitres=0, emissionFactor=2.640 → Expected: 0.00
    - Input: fuelLitres=500, emissionFactor=0 → Expected: 0.00 (elettrico)
  - [ ] 2.4 Test `calculateDelta`:
    - theoretical=1500, real=1320 → absolute=-180, percentage=-12.00
    - theoretical=1500, real=1635 → absolute=135, percentage=9.00
    - theoretical=1500, real=1500 → absolute=0, percentage=0.00
    - theoretical=0, real=100 → gestire edge case (divisione per zero)
  - [ ] 2.5 Test `calculateVehicleEmissions` end-to-end:
    - Input completo con valori realistici → verifica coerenza tra theoretical, real e delta
  - [ ] 2.6 Test determinismo: eseguire lo stesso calcolo 100 volte → tutti i risultati identici
  - [ ] 2.7 Test precisione: verificare che i risultati abbiano esattamente 2 decimali
- [ ] Task 3: Funzione di lookup e aggregazione dati per calcolo veicolo (AC: #1, #2)
  - [ ] 3.1 Creare funzione `getVehicleEmissionData(vehicleId: string, periodStart: Date, periodEnd: Date)` in `src/lib/services/emission-calculator.ts` (o in un file separato `emission-data-loader.ts` se la complessita lo richiede)
  - [ ] 3.2 La funzione recupera dal database:
    - `co2GKm` dal veicolo (tramite Engine del tipo carburante primario → campo `co2GKm`)
    - `kmTravelled` = differenza tra ultima e prima rilevazione km nel periodo (sia da rifornimenti che da rilevazioni dedicate)
    - `fuelLitres` = somma litri di tutti i rifornimenti nel periodo
    - `emissionFactorKgCO2ePerL` = lookup dal servizio Story 6.1 (`getEffectiveEmissionFactor`) usando il tipo carburante e la data mediana del periodo
  - [ ] 3.3 Gestire caso veicolo senza rifornimenti nel periodo → emissioni reali = 0
  - [ ] 3.4 Gestire caso veicolo senza rilevazioni km nel periodo → emissioni teoriche non calcolabili, ritornare errore o flag "dati insufficienti"
  - [ ] 3.5 Gestire caso veicolo elettrico → emissioni reali = 0 (fattore emissione = 0)
  - [ ] 3.6 La funzione usa il Prisma client (con tenant filter gia applicato) — separazione tra data loading e calcolo puro
- [ ] Task 4: Componente DeltaBar (AC: #4)
  - [ ] 4.1 Creare `src/components/data-display/DeltaBar.tsx` — componente shared cross-feature
  - [ ] 4.2 Props: `theoretical: number`, `real: number`, `variant: "inline" | "full" | "mini"`, `className?: string`
  - [ ] 4.3 Variante `full` (dashboard e dettaglio):
    - Due barre orizzontali (Teorico e Reale) con larghezza proporzionale al valore maggiore
    - Etichette: "Teorico" e "Reale" con valori in kgCO2e formattati locale IT
    - Delta: percentuale con freccia direzionale, colore semantico
  - [ ] 4.4 Variante `inline` (righe di tabella):
    - Solo due barre compatte senza labels testuali
    - Tooltip con dettaglio al hover
  - [ ] 4.5 Variante `mini` (per KPICard):
    - Solo percentuale delta + freccia direzionale
  - [ ] 4.6 Colori semantici delta:
    - Delta positivo (reale > teorico) → colore `destructive` (rosso)
    - Delta negativo (reale < teorico) → colore `success` (verde)
    - Delta neutro (±2%) → colore `muted` (grigio)
  - [ ] 4.7 Accessibilita: `aria-label` descrittivo (es. "Emissioni teoriche: 145 tonnellate. Emissioni reali: 158 tonnellate. Delta: piu 9 percento"), barre con `role="meter"`, `aria-valuenow`, `aria-valuemin`, `aria-valuemax`
  - [ ] 4.8 Composizione interna: div Tailwind per barre CSS (nessuna libreria chart), Typography per labels, Badge per delta
  - [ ] 4.9 States: Loading (skeleton barre), Populated (barre + delta), No data ("Dati insufficienti")
- [ ] Task 5: Formattazione e presentazione risultati (AC: #6)
  - [ ] 5.1 Creare helper `formatEmission(value: number): string` in `src/lib/utils/number.ts` — formatta in locale IT con 2 decimali e unita "kgCO2e" (es. "1.320,00 kgCO2e")
  - [ ] 5.2 Creare helper `formatDeltaPercentage(value: number): string` — formatta con segno ("+9,00%" o "-12,00%")
  - [ ] 5.3 Per valori grandi (>= 1000 kgCO2e), supportare anche visualizzazione in tCO2e (tonnellate) con 2 decimali

## Dev Notes

### CORE BUSINESS LOGIC — Architettura

Il servizio `emission-calculator.ts` e il cuore della logica di business di Greenfleet. Deve essere:

1. **Puro**: funzioni senza side effect, nessuna dipendenza da framework/database
2. **Testabile**: test unitari con Vitest, copertura 100% dei path
3. **Deterministico**: stesso input = stesso output, sempre (NFR21)
4. **Isolato**: la logica di calcolo e separata dal data loading

La separazione chiave e tra:
- **Funzioni pure di calcolo** (`calculateTheoreticalEmissions`, `calculateRealEmissions`, `calculateDelta`) — nessuna dipendenza esterna, testabili in isolamento
- **Data loader** (`getVehicleEmissionData`) — accede al database, prepara l'input per le funzioni pure

Questa separazione permette di testare la logica di calcolo senza database e garantisce il determinismo.

### Formule di Calcolo

**Emissioni Teoriche (FR32):**
```
theoretical_kgCO2e = (co2_gCO2e_per_km * km_percorsi) / 1000
```
- `co2_gCO2e_per_km`: valore WLTP dal catalogo InfocarData (campo `co2GKm` del modello Engine)
- `km_percorsi`: differenza tra rilevazioni km nel periodo (da rifornimenti + rilevazioni dedicate)
- Divisione per 1000: conversione da grammi a kilogrammi

**Emissioni Reali (FR33):**
```
real_kgCO2e = litri_riforniti * fattore_emissione_kgCO2e_per_litro
```
- `litri_riforniti`: somma quantita litri di tutti i rifornimenti nel periodo
- `fattore_emissione`: lookup dalla tabella EmissionFactor (Story 6.1) per tipo carburante e data

**Delta (FR34):**
```
delta_assoluto = real - theoretical     (in kgCO2e)
delta_percentuale = ((real - theoretical) / theoretical) * 100   (in %)
```
- Delta positivo: il veicolo emette PIU del dichiarato (rosso/destructive)
- Delta negativo: il veicolo emette MENO del dichiarato (verde/success)

### Arrotondamento Deterministico

Per garantire NFR21, tutti i risultati intermedi e finali sono arrotondati a 2 decimali usando:
```typescript
const round2 = (n: number): number => Math.round(n * 100) / 100
```

NON usare `toFixed()` (ritorna stringa e ha problemi di arrotondamento con floating point). NON usare librerie esterne per questa operazione semplice.

### DeltaBar — Specifiche UX

Da `ux-design-specification.md`:
- **Composizione**: Div con Tailwind (barre CSS, nessuna libreria chart) + Typography + Badge delta
- **Colori**: destructive (reale > teorico), success (reale < teorico), muted (±2%)
- **Accessibilita**: `role="meter"`, `aria-label` completo con valori e delta
- **Varianti**: inline (tabella), full (dashboard/dettaglio), mini (KPICard)

### Dipendenze da Altre Story

- **Story 6.1** (Fattori di Emissione): la funzione `getEffectiveEmissionFactor` viene usata dal data loader
- **Epic 2** (Catalogo Veicoli): il campo `co2GKm` del modello Engine fornisce il dato per le emissioni teoriche
- **Epic 5** (Rifornimenti & Km): i modelli FuelRecord e KmReading forniscono i dati per le emissioni reali e i km percorsi

Se queste story non sono ancora implementate, creare i tipi e le interfacce con stub/mock per i test, e integrare quando disponibili.

### Decisioni Architetturali Rilevanti

- **AC-1 Pattern API Ibrido**: Il calcolo emissioni e invocato da Server Components (read) e potenzialmente da Server Actions (generazione report). Non e una Server Action di per se — e un service puro
- **DA-3 Multi-Engine**: Un veicolo puo avere piu motori (ibrido). Per il calcolo teorico, usare il motore primario o la media ponderata. Decisione: usare il motore con il tipo carburante corrispondente ai rifornimenti registrati
- **FA-1 State Management**: Il DeltaBar e un componente presentazionale puro — riceve props e renderizza. Nessuno stato interno necessario
- **NFR21**: Calcoli deterministici — le funzioni pure con arrotondamento fisso garantiscono questo requisito

### Convenzioni Naming

| Elemento | Convenzione | Esempio |
|---|---|---|
| Service file | kebab-case | `emission-calculator.ts` |
| Test file | co-locato .test.ts | `emission-calculator.test.ts` |
| Funzioni | camelCase | `calculateTheoreticalEmissions` |
| Tipi | PascalCase | `VehicleEmissionInput`, `VehicleEmissionResult` |
| Componente | PascalCase | `DeltaBar.tsx` |
| Helper | camelCase in utils | `formatEmission`, `formatDeltaPercentage` |

### Anti-Pattern da Evitare

- NON mettere logica di calcolo nei componenti React — sempre in `src/lib/services/`
- NON importare Prisma/database nelle funzioni pure di calcolo — solo nel data loader
- NON usare `toFixed()` per arrotondamento — usare `Math.round()`
- NON usare `any` — tipi espliciti per ogni input/output
- NON calcolare emissioni "on the fly" nei componenti — sempre tramite il service
- NON ignorare gli edge case (km=0, litri=0, theoretical=0) — gestire esplicitamente
- NON usare librerie chart per il DeltaBar — solo CSS Tailwind come da UX spec

### References

- [Source: architecture.md#Core Architectural Decisions] — AC-1, DA-3, FA-1
- [Source: architecture.md#Project Structure] — `emission-calculator.ts` in `lib/services/`, test co-locato
- [Source: architecture.md#Implementation Patterns] — business logic in services, naming conventions
- [Source: epics.md#Story 6.2] — acceptance criteria BDD
- [Source: prd.md#FR32] — emissioni teoriche gCO2e/km x km
- [Source: prd.md#FR33] — emissioni reali carburante x fattore
- [Source: prd.md#FR34] — confronto delta teorico vs reale
- [Source: prd.md#NFR21] — calcoli deterministici e riproducibili
- [Source: ux-design-specification.md#DeltaBar] — anatomy, states, variants, accessibility

## Dev Agent Record

### Agent Model Used

claude-opus-4-6

### Debug Log References

- TypeScript check (`npx tsc --noEmit`) passed with only pre-existing errors (TS2873, TS2698, TS2345 in unrelated files)

### Completion Notes List

- All 5 tasks implemented as specified
- Pure calculation functions in emission-calculator.ts with zero external dependencies
- Data loader separated in emission-data-loader.ts using PrismaClient
- DeltaBar component with 3 variants (full/inline/mini), loading skeleton, no-data state
- Format helpers in number.ts using IT locale with Intl.NumberFormat
- Tests placed in __tests__/ directory to match vitest glob pattern `src/**/__tests__/**/*.test.ts`
- round2 exported for reuse in coherence tests
- Vitest test file includes 22 test cases covering all functions, edge cases, determinism, and precision

### File List

- `src/lib/services/emission-calculator.ts` (NEW) - Pure calculation functions
- `src/lib/services/emission-data-loader.ts` (NEW) - Database layer for emission data
- `src/lib/services/__tests__/emission-calculator.test.ts` (NEW) - Unit tests (22 cases)
- `src/components/data-display/DeltaBar.tsx` (NEW) - Delta visualization component
- `src/lib/utils/number.ts` (NEW) - Emission formatting helpers
