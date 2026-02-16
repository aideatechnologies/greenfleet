# Story 6.3: Target Emissioni per Flotta e Carlist

Status: done

## Story

As a **Fleet Manager**,
I want **configurare un target di emissioni per la mia flotta o per singole carlist**,
So that **posso definire obiettivi di riduzione e monitorare il progresso**.

## Acceptance Criteria

1. Il FM puo configurare un target di emissioni specificando valore obiettivo (kgCO2e), periodo (annuale/mensile) e ambito flotta o carlist (FR36)
2. Il FM puo definire target annuali e/o mensili per la stessa flotta o carlist
3. Il FM puo modificare target esistenti (valore, periodo, date)
4. Il progresso verso il target e calcolato automaticamente basandosi sulle emissioni reali calcolate nel periodo
5. Il progresso e visualizzato tramite il componente ProgressTarget con milestone trimestrali
6. I dati target sono tenant-scoped (ogni tenant ha i propri target)
7. Un target flotta copre tutti i veicoli del tenant; un target carlist copre solo i veicoli della carlist selezionata

## Tasks / Subtasks

- [ ] Task 1: Modello Prisma EmissionTarget (AC: #1, #6, #7)
  - [ ] 1.1 Creare modello `EmissionTarget` nel Prisma schema con campi:
    - `id` (String, cuid)
    - `tenantId` (String, FK a Organization — tenant-scoped)
    - `scope` (enum `TargetScope`: `Fleet`, `Carlist`)
    - `carlistId` (String?, FK a Carlist — nullable, obbligatorio se scope=Carlist)
    - `targetValue` (Decimal — valore obiettivo in kgCO2e)
    - `period` (enum `TargetPeriod`: `Annual`, `Monthly`)
    - `startDate` (DateTime — inizio periodo di riferimento)
    - `endDate` (DateTime — fine periodo di riferimento)
    - `description` (String? — nota opzionale)
    - `createdAt` (DateTime)
    - `updatedAt` (DateTime)
    - `createdBy` (String — userId)
  - [ ] 1.2 Creare enum `TargetScope` con valori: `Fleet`, `Carlist`
  - [ ] 1.3 Creare enum `TargetPeriod` con valori: `Annual`, `Monthly`
  - [ ] 1.4 Aggiungere relazione opzionale a Carlist: `carlist Carlist? @relation(fields: [carlistId], references: [id])`
  - [ ] 1.5 Aggiungere indice composto: `@@index([tenantId, scope, period])` per query efficienti
  - [ ] 1.6 Aggiungere constraint: se scope=Carlist allora carlistId non puo essere null (validazione Zod, non constraint DB)
  - [ ] 1.7 Aggiungere mapping SQL Server: `@@map("EmissionTargets")`, campi con `@map("snake_case")`
  - [ ] 1.8 Eseguire `npx prisma migrate dev --name add-emission-targets`
- [ ] Task 2: Schema Zod per validazione (AC: #1, #2)
  - [ ] 2.1 Creare `src/lib/schemas/emission-target.ts` con schema `createEmissionTargetSchema`:
    - `scope` (enum TargetScope)
    - `carlistId` (string opzionale — obbligatorio con refine se scope=Carlist)
    - `targetValue` (number positivo, max 2 decimali)
    - `period` (enum TargetPeriod)
    - `startDate` (date)
    - `endDate` (date, must be after startDate)
    - `description` (string opzionale, max 500 caratteri)
  - [ ] 2.2 Aggiungere Zod refine: se `scope === "Carlist"` allora `carlistId` e obbligatorio
  - [ ] 2.3 Aggiungere Zod refine: `endDate > startDate`
  - [ ] 2.4 Creare schema `updateEmissionTargetSchema` (partial + id obbligatorio)
- [ ] Task 3: Server Actions CRUD (AC: #1, #2, #3, #6)
  - [ ] 3.1 Creare `src/app/(dashboard)/emissions/targets/actions/create-emission-target.ts`:
    - Validazione Zod
    - Check ruolo FM o Admin
    - tenantId automatico dalla sessione (via Prisma extension)
    - Se scope=Carlist, verificare che la carlist appartenga al tenant
    - Salvataggio e ritorno `ActionResult<EmissionTarget>`
  - [ ] 3.2 Creare `src/app/(dashboard)/emissions/targets/actions/update-emission-target.ts`:
    - Validazione Zod
    - Check ruolo FM o Admin
    - Verificare che il target appartenga al tenant corrente
    - Salvataggio e ritorno `ActionResult<EmissionTarget>`
  - [ ] 3.3 Creare `src/app/(dashboard)/emissions/targets/actions/delete-emission-target.ts`:
    - Check ruolo FM o Admin
    - Verificare appartenenza al tenant
    - Eliminazione e ritorno `ActionResult<void>`
  - [ ] 3.4 Tutte le actions ritornano `ActionResult<T>` con ErrorCode tipizzato
- [ ] Task 4: Logica calcolo progresso target (AC: #4, #7)
  - [ ] 4.1 Creare funzione `calculateTargetProgress(target: EmissionTarget, currentEmissions: number): TargetProgress` in `src/lib/services/emission-calculator.ts`
  - [ ] 4.2 Definire tipo `TargetProgress`:
    ```typescript
    type TargetProgress = {
      targetValue: number        // kgCO2e obiettivo
      currentValue: number       // kgCO2e emissioni attuali
      percentage: number         // % completamento (currentValue / targetValue * 100)
      remaining: number          // kgCO2e rimanenti (targetValue - currentValue)
      status: "on-track" | "at-risk" | "off-track" | "completed"
      milestones: Milestone[]    // milestone trimestrali (per target annuali)
    }
    type Milestone = {
      label: string              // es. "Q1", "Q2", "Q3", "Q4"
      date: Date                 // data milestone
      expectedValue: number      // valore atteso alla milestone (distribuzione lineare)
      achieved: boolean          // milestone raggiunta (data corrente > milestone date)
      onTrack: boolean           // emissioni alla data <= expectedValue
    }
    ```
  - [ ] 4.3 Calcolo status:
    - `on-track`: proiezione lineare delle emissioni attuali non supera il target a fine periodo
    - `at-risk`: proiezione lineare supera il target del 1-15%
    - `off-track`: proiezione lineare supera il target di oltre il 15%
    - `completed`: il periodo e terminato (endDate < now)
  - [ ] 4.4 Calcolo proiezione lineare: `proiezione = (currentEmissions / giorni_trascorsi) * giorni_totali_periodo`
  - [ ] 4.5 Generazione milestones per target annuali: Q1 (25%), Q2 (50%), Q3 (75%), Q4 (100%). Per target mensili: nessuna milestone (periodo troppo breve)
  - [ ] 4.6 La funzione e pura: riceve il target e le emissioni correnti, ritorna il progresso. Non accede al database
- [ ] Task 5: Data loader per emissioni target (AC: #4, #7)
  - [ ] 5.1 Creare funzione `getTargetCurrentEmissions(target: EmissionTarget): Promise<number>` in `src/lib/services/emission-calculator.ts` o in un data loader separato
  - [ ] 5.2 Se scope=Fleet: sommare le emissioni reali di tutti i veicoli del tenant nel periodo (startDate → now o endDate)
  - [ ] 5.3 Se scope=Carlist: sommare le emissioni reali solo dei veicoli nella carlist specificata nel periodo
  - [ ] 5.4 Le emissioni reali sono calcolate usando la logica di Story 6.2 (`calculateRealEmissions`) per ogni veicolo
  - [ ] 5.5 Gestire caso "nessun veicolo/rifornimento nel periodo" → emissioni = 0
- [ ] Task 6: Pagina gestione target (AC: #1, #2, #3)
  - [ ] 6.1 Creare `src/app/(dashboard)/emissions/targets/page.tsx` — Server Component che carica i target del tenant con stato progresso
  - [ ] 6.2 Creare `src/app/(dashboard)/emissions/targets/loading.tsx` — skeleton
  - [ ] 6.3 Creare `src/app/(dashboard)/emissions/targets/error.tsx` — error boundary
  - [ ] 6.4 La pagina mostra i target esistenti come card, ognuna con:
    - Ambito (Flotta / nome carlist)
    - Periodo (es. "2026 annuale" o "Gen 2026 mensile")
    - Valore target (kgCO2e)
    - ProgressTarget component con stato progresso
    - Azioni: modifica, elimina
  - [ ] 6.5 Pulsante "Nuovo Target" (Primary button — unico per vista)
  - [ ] 6.6 Se non ci sono target, mostrare EmptyState con azione "Configura il tuo primo target"
- [ ] Task 7: Form creazione/modifica target (AC: #1, #2, #3)
  - [ ] 7.1 Creare `src/app/(dashboard)/emissions/targets/components/EmissionTargetForm.tsx` — React Hook Form + Zod + shadcn/ui Form
  - [ ] 7.2 Campi form:
    - Radio group per scope (Flotta / Carlist)
    - Select per carlist (visibile solo se scope=Carlist, caricato dal database)
    - Input numerico per valore target (kgCO2e)
    - Select per periodo (Annuale / Mensile)
    - DatePicker per data inizio
    - DatePicker per data fine
    - Textarea per descrizione (opzionale)
  - [ ] 7.3 Layout form a 2 colonne su desktop, label sopra input
  - [ ] 7.4 Inline validation on-blur con messaggi in italiano
  - [ ] 7.5 Conditional rendering: campo carlist visibile solo se scope=Carlist
  - [ ] 7.6 Modalita creazione e modifica nello stesso componente
  - [ ] 7.7 Dialog shadcn/ui per apertura form
  - [ ] 7.8 Feedback: toast successo (auto-dismiss 5s), toast errore (persistente)
- [ ] Task 8: Componente ProgressTarget (AC: #5)
  - [ ] 8.1 Creare `src/components/data-display/ProgressTarget.tsx` — componente shared cross-feature
  - [ ] 8.2 Props: `progress: TargetProgress`, `variant: "full" | "compact"`, `className?: string`
  - [ ] 8.3 Variante `full` (pagina target e dashboard):
    - Label target: "Target annuale: 200 tCO2e"
    - Barra progresso con percentuale (estende Progress shadcn/ui)
    - Milestone dots sotto la barra (Q1, Q2, Q3, Q4) con stato (completato/on-track/off-track)
    - Label stato: "On track — 124 tCO2e su 200"
  - [ ] 8.4 Variante `compact` (widget dashboard):
    - Solo barra progresso con percentuale e colore semantico
  - [ ] 8.5 Colori semantici stato:
    - On-track → `success` (verde)
    - At-risk → `warning` (arancione)
    - Off-track → `destructive` (rosso)
    - No target → `muted` (grigio) con testo "Nessun target configurato"
  - [ ] 8.6 Milestone dots:
    - Completato e on-track → cerchio pieno verde con check
    - Completato ma off-track → cerchio pieno arancione/rosso
    - Futuro → cerchio vuoto grigio
    - Corrente → cerchio con bordo in corso (animazione pulse)
  - [ ] 8.7 Accessibilita: `role="progressbar"`, `aria-valuenow`, `aria-valuemin="0"`, `aria-valuemax` (target value), `aria-label="Progresso target emissioni: 62%, 124 tonnellate su 200, on track"`
  - [ ] 8.8 States: Loading (skeleton barra), Populated (barra + milestones), No target (EmptyState inline con azione)

## Dev Notes

### Architettura Tenant-Scoped

A differenza dei fattori di emissione (Story 6.1, globali), i target emissioni sono tenant-scoped. Il modello `EmissionTarget` include `tenantId` e la Prisma client extension filtra automaticamente per tenant. Ogni FM vede e gestisce solo i target del proprio tenant.

### Relazione Target → Carlist

Un target con scope=Carlist ha una FK opzionale verso la tabella Carlist (Epic 3, Story 3.8). Se la Story 3.8 non e ancora implementata:
- Creare il modello EmissionTarget con `carlistId` come String nullable senza relazione Prisma
- Aggiungere la relazione Prisma quando il modello Carlist sara disponibile
- La validazione Zod verifica che carlistId sia presente quando scope=Carlist

### Calcolo Progresso — Proiezione Lineare

Il calcolo del progresso usa una proiezione lineare semplice:

```typescript
// Giorni trascorsi dall'inizio del periodo
const daysElapsed = differenceInDays(now, target.startDate)
// Giorni totali del periodo
const totalDays = differenceInDays(target.endDate, target.startDate)
// Proiezione a fine periodo
const projection = (currentEmissions / daysElapsed) * totalDays
// Status
if (projection <= targetValue) → "on-track"
else if (projection <= targetValue * 1.15) → "at-risk"
else → "off-track"
```

Questo modello assume che le emissioni siano distribuite uniformemente nel tempo. Per la maggior parte delle flotte aziendali questa e un'approssimazione ragionevole. Un modello stagionale piu sofisticato puo essere aggiunto post-MVP.

### Milestone Trimestrali

Per target annuali, le milestones sono distribuite linearmente:

| Milestone | Data | Valore atteso |
|---|---|---|
| Q1 | startDate + 3 mesi | 25% del target |
| Q2 | startDate + 6 mesi | 50% del target |
| Q3 | startDate + 9 mesi | 75% del target |
| Q4 | endDate | 100% del target |

Ogni milestone e marcata come "achieved" se la data corrente la supera, e "onTrack" se le emissioni alla milestone date erano <= il valore atteso.

### ProgressTarget — Specifiche UX

Da `ux-design-specification.md`:
- **Composizione**: `Progress` shadcn esteso + milestone dots + Badge stato + Typography
- **Colori**: on-track (verde), at-risk (arancione), off-track (rosso), no target (grigio muted)
- **Accessibilita**: `role="progressbar"`, `aria-valuenow`, `aria-valuemin`, `aria-valuemax`, `aria-label` completo
- **Varianti**: full (con milestones), compact (solo barra)

### Decisioni Architetturali Rilevanti

- **DA-1 Modello Multi-Tenant**: EmissionTarget ha `tenantId`, filtrato automaticamente da Prisma extension
- **DA-4 Validazione Zod**: Schema con refine per validazione condizionale (carlistId obbligatorio se scope=Carlist)
- **AC-1 Pattern API Ibrido**: Server Actions per CRUD target
- **AC-2 Error Handling**: ActionResult<T> pattern
- **FA-3 Forms**: React Hook Form + Zod + shadcn/ui Form con conditional rendering
- **FA-1 State Management**: ProgressTarget e un componente presentazionale puro — nessuno stato interno

### Convenzioni Naming

| Elemento | Convenzione | Esempio |
|---|---|---|
| Modello Prisma | PascalCase | `EmissionTarget` |
| Tabella SQL | PascalCase plurale | `@@map("EmissionTargets")` |
| Enum Prisma | PascalCase | `TargetScope`, `TargetPeriod` |
| Route | kebab-case | `emissions/targets/` |
| Server Actions | kebab-case in `actions/` | `create-emission-target.ts` |
| Componenti | PascalCase | `EmissionTargetForm.tsx`, `ProgressTarget.tsx` |
| Tipi | PascalCase | `TargetProgress`, `Milestone` |

### Posizionamento Route

La gestione target emissioni e sotto `emissions/targets/` (non sotto `settings/`) perche e un'operazione del Fleet Manager legata alle emissioni, non una configurazione di sistema. Questo e coerente con la struttura definita in architecture.md dove `emissions/` contiene dashboard, report e target.

### Anti-Pattern da Evitare

- NON mettere logica di calcolo progresso nei componenti React — sempre in `src/lib/services/`
- NON hardcodare le soglie on-track/at-risk/off-track — definirle come costanti in `src/lib/utils/constants.ts`
- NON calcolare il progresso ad ogni render — calcolarlo nel Server Component e passarlo come prop
- NON mostrare dati di altri tenant — verificare che la Prisma extension filtri correttamente
- NON permettere a un FM di creare target su carlist di altri tenant — verificare appartenenza
- NON usare `any` — tipi espliciti per TargetProgress, Milestone, etc.

### References

- [Source: architecture.md#Data Architecture] — DA-1 multi-tenant, DA-4 Zod
- [Source: architecture.md#Project Structure] — `emissions/` route, `emission-calculator.ts` service
- [Source: architecture.md#Implementation Patterns] — naming, structure, format patterns
- [Source: epics.md#Story 6.3] — acceptance criteria BDD
- [Source: prd.md#FR36] — target emissioni per flotta/carlist
- [Source: prd.md#FR39] — progresso verso target (collegato a Story 6.5, ma il calcolo base e qui)
- [Source: ux-design-specification.md#ProgressTarget] — anatomy, states, variants, accessibility

## Dev Agent Record

### Agent Model Used



### Debug Log References

### Completion Notes List

### File List

