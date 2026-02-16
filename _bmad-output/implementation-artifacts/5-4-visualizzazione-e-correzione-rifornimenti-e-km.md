# Story 5.4: Visualizzazione e Correzione Rifornimenti e Km

Status: done

## Story

As a **Fleet Manager**,
I want **visualizzare e correggere i rifornimenti e le rilevazioni km**,
So that **posso garantire l'accuratezza dei dati utilizzati per il calcolo emissioni**.

## Acceptance Criteria

1. I rifornimenti e le rilevazioni km sono visualizzati in DataTable con sorting, filtri e paginazione (FR31)
2. Il Fleet Manager puo modificare qualsiasi rifornimento o rilevazione del tenant
3. Il Driver puo visualizzare solo i propri rifornimenti e rilevazioni (sola lettura)
4. Ogni correzione e tracciata con audit trail: valore precedente e nuovo (NFR10)
5. I rifornimenti sono visualizzabili anche nel FuelFeed cronologico per veicolo
6. Il FuelFeed mostra variante validation per dati con anomalie (es. consumo fuori range)

## Tasks / Subtasks

- [ ] Task 1: Fuel Records DataTable (AC: #1, #2, #3)
  - [ ] 1.1 Creare `src/app/(dashboard)/fuel-records/components/FuelRecordTable.tsx`:
    - TanStack Table + shadcn/ui DataTable
    - Colonne: Veicolo (targa), Data (dd MMM yyyy), Tipo Carburante, Quantita (L, locale IT), Importo (EUR, locale IT), Km (locale IT), Sorgente, Azioni
    - Sorting su tutte le colonne (default: data DESC)
    - Paginazione: 50 righe default, opzioni 25/50/100
    - Azioni riga per FM/Admin: Modifica (icona edit), Elimina (icona trash con conferma dialog)
    - Per Driver: nessuna azione riga (sola lettura)
  - [ ] 1.2 Implementare filtri come chip (pattern da UX design):
    - Filtro veicolo (select con search tra i veicoli del tenant)
    - Filtro periodo (date range picker: da/a)
    - Filtro tipo carburante (multi-select)
    - Filtro sorgente (MANUAL / IMPORT_CSV)
    - Search debounce 300ms sulla targa
    - Chip visibili sopra la tabella, rimovibili singolarmente
  - [ ] 1.3 Implementare formattazione colonne:
    - Quantita: `45,50 L` con `Intl.NumberFormat('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })`
    - Importo: `78,30 EUR` con `Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' })`
    - Km: `125.430` con `Intl.NumberFormat('it-IT')`
    - Data: `15 gen 2026` con `Intl.DateTimeFormat('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })`
    - Targa: uppercase monospace
  - [ ] 1.4 Implementare row highlighting per anomalie:
    - Righe con anomalia consumo evidenziate con sfondo warning leggero
    - Tooltip sulla riga con messaggio anomalia
- [ ] Task 2: Km Readings DataTable migliorata (AC: #1, #2, #3)
  - [ ] 2.1 Aggiornare `src/app/(dashboard)/km-readings/components/KmReadingTable.tsx` (creato in Story 5.3):
    - Aggiungere filtri completi come per FuelRecordTable: veicolo, periodo, search
    - Aggiungere colonna "Delta Km" che mostra la differenza con la rilevazione precedente
    - Formattazione colonne in locale IT (stesse regole di FuelRecordTable)
  - [ ] 2.2 Implementare colonna "Delta Km":
    - Per ogni riga, calcolare `currentKm - previousKm` dove previousKm e il km della rilevazione precedente per lo stesso veicolo (da KmReading o FuelRecord)
    - Mostrare come "+12.500 km" con formattazione locale IT
    - Se non esiste rilevazione precedente, mostrare "-"
    - Evidenziare delta anomali (troppo alti o negativi) con colore warning
- [ ] Task 3: Pagina Lista Rifornimenti — Vista DataTable (AC: #1, #5)
  - [ ] 3.1 Aggiornare `src/app/(dashboard)/fuel-records/page.tsx` (creato in Story 5.1):
    - Aggiungere toggle vista: FuelFeed | DataTable
    - Stato vista persistito in URL search params (es. `?view=table` o `?view=feed`)
    - Vista FuelFeed: componente FuelFeed in variante `full` (gia implementato in Story 5.1)
    - Vista DataTable: componente FuelRecordTable
    - Il pulsante "Nuovo Rifornimento" e visibile in entrambe le viste
    - Filtri condivisi tra le due viste
  - [ ] 3.2 Per il Driver: filtrare automaticamente per il proprio veicolo, nascondere toggle vista (solo FuelFeed), nessuna azione di modifica
- [ ] Task 4: Pagina Modifica Rifornimento (AC: #2, #4)
  - [ ] 4.1 Creare `src/app/(dashboard)/fuel-records/[id]/edit/page.tsx`:
    - Server Component che recupera il rifornimento per ID
    - Verifica permessi: solo FM/Admin possono modificare
    - Renderizza FuelRecordForm (da Story 5.1) in modalita edit con dati precompilati
    - Breadcrumb: Dashboard > Rifornimenti > Modifica
  - [ ] 4.2 Aggiornare `src/app/(dashboard)/fuel-records/components/FuelRecordForm.tsx` (da Story 5.1) per supportare modalita edit:
    - Prop `defaultValues` con dati del record esistente
    - Prop `mode: 'create' | 'edit'`
    - In modalita edit: usare `updateFuelRecordAction` come submit handler
    - In modalita edit: il veicolo non e modificabile (solo data, quantita, importo, km, note, tipo carburante)
  - [ ] 4.3 Creare `src/app/(dashboard)/fuel-records/[id]/edit/loading.tsx` con skeleton
- [ ] Task 5: FuelFeed per Veicolo (AC: #5)
  - [ ] 5.1 Creare Server Action o funzione service per recuperare il feed cronologico di un veicolo:
    ```typescript
    /** Recupera il feed cronologico per un veicolo, unendo FuelRecord e KmReading */
    export async function getVehicleFeed(
      vehicleId: string,
      pagination?: PaginationParams
    ): Promise<PaginatedResult<FuelFeedItem>>
    ```
  - [ ] 5.2 Implementare `getVehicleFeed`:
    - Query FuelRecord per il veicolo, ordinati per data DESC
    - Query KmReading per il veicolo, ordinati per data DESC
    - Unire i due set in un unico feed cronologico ordinato per data DESC
    - Ogni entry ha un tipo (`fuel_record` o `km_reading`) per rendering differenziato
    - Mappare a `FuelFeedItem` con tutti i campi per il componente FuelFeed
  - [ ] 5.3 Aggiornare il componente `FuelFeed.tsx` (da Story 5.1) per supportare anche le entry di tipo `km_reading`:
    - Icona diversa per km_reading (tachimetro vs pompa benzina)
    - Corpo: "Rilevazione km" + km formattati
    - Nessun campo quantita/importo per km_reading
  - [ ] 5.4 Il FuelFeed per veicolo e utilizzabile in:
    - Pagina rifornimenti filtrata per veicolo
    - Dettaglio veicolo (tab rifornimenti/km) — se implementato
    - Dashboard Driver (Story 7.2)
- [ ] Task 6: Rilevamento Anomalie Consumo (AC: #6)
  - [ ] 6.1 Creare `src/lib/services/anomaly-detection-service.ts` con le seguenti funzioni:
    ```typescript
    /** Analizza i rifornimenti di un veicolo e identifica anomalie */
    export async function detectFuelAnomalies(
      vehicleId: string,
      tenantId: string
    ): Promise<FuelAnomaly[]>

    /** Verifica se un singolo rifornimento presenta anomalie */
    export function checkFuelRecordAnomaly(
      record: FuelRecord,
      previousRecord: FuelRecord | null,
      vehicleConsumptionRef: number | null // consumo di riferimento da catalogo in L/100km
    ): FuelAnomaly | null

    export interface FuelAnomaly {
      fuelRecordId: string
      type: 'consumption_too_high' | 'consumption_too_low' | 'negative_km' | 'suspicious_quantity'
      message: string
      severity: 'warning' | 'error'
      calculatedConsumption?: number // L/100km calcolato
      expectedConsumption?: number   // L/100km da catalogo
    }
    ```
  - [ ] 6.2 Implementare `checkFuelRecordAnomaly`:
    - Se esiste un record precedente per lo stesso veicolo, calcolare il consumo effettivo:
      `consumoEffettivo = (quantityLiters / (currentKm - previousKm)) * 100` (L/100km)
    - Se `vehicleConsumptionRef` e disponibile (dal catalogo, Engine.consumptionL100Km):
      - Se `consumoEffettivo > vehicleConsumptionRef * 2`: anomalia `consumption_too_high`
      - Se `consumoEffettivo < vehicleConsumptionRef * 0.3`: anomalia `consumption_too_low`
    - Se la quantita e > 200L: anomalia `suspicious_quantity` (warning)
    - Se `currentKm < previousKm`: anomalia `negative_km` (error)
  - [ ] 6.3 Implementare `detectFuelAnomalies`:
    - Recuperare tutti i rifornimenti del veicolo ordinati per data
    - Recuperare il consumo di riferimento dal catalogo (Engine del veicolo)
    - Iterare e chiamare `checkFuelRecordAnomaly` per ogni coppia consecutiva
    - Ritornare la lista di anomalie trovate
  - [ ] 6.4 Integrare le anomalie nel FuelFeed variante `validation`:
    - Chiamare `detectFuelAnomalies` quando si renderizza il FuelFeed in variante `validation`
    - Mappare le anomalie a `FuelFeedItem.hasAnomaly` e `FuelFeedItem.anomalyMessage`
- [ ] Task 7: FuelFeed Variante Validation — Vista FM (AC: #6)
  - [ ] 7.1 Creare una vista dedicata per il FM per la revisione dei dati:
    - Accessibile da un pulsante "Verifica Anomalie" nella pagina rifornimenti
    - Mostra il FuelFeed in variante `validation` per un veicolo selezionato
    - Evidenzia i record con anomalie con bordo warning/destructive
    - Per ogni anomalia: messaggio descrittivo, consumo calcolato vs atteso, azione "Correggi"
  - [ ] 7.2 Il pulsante "Correggi" su un record con anomalia porta alla pagina di modifica del rifornimento
  - [ ] 7.3 Dopo la correzione, il FuelFeed si aggiorna e ricalcola le anomalie
- [ ] Task 8: Confirm Dialog per Eliminazione (AC: #2, #4)
  - [ ] 8.1 Implementare un ConfirmDialog per l'eliminazione di rifornimenti e rilevazioni km:
    - Usare shadcn/ui Dialog o AlertDialog
    - Titolo: "Conferma Eliminazione"
    - Messaggio: "Sei sicuro di voler eliminare questo rifornimento/rilevazione? L'azione sara tracciata nell'audit trail."
    - Pulsanti: "Annulla" (secondary) e "Elimina" (destructive)
  - [ ] 8.2 Dopo la conferma, chiamare la Server Action di eliminazione
  - [ ] 8.3 Successo: toast "Rifornimento eliminato" / "Rilevazione eliminata" + refresh tabella
  - [ ] 8.4 Ogni eliminazione e registrata nell'audit trail con i valori del record eliminato
- [ ] Task 9: Driver — Vista Sola Lettura (AC: #3)
  - [ ] 9.1 Nella pagina rifornimenti, per il Driver:
    - Filtrare automaticamente per il proprio veicolo assegnato
    - Mostrare solo FuelFeed (nessun toggle DataTable)
    - Nessun pulsante "Nuovo Rifornimento" — usare quello nella sezione dedicata
    - Nessuna azione di modifica/eliminazione sulle entry
  - [ ] 9.2 Nella pagina rilevazioni km, per il Driver:
    - Filtrare automaticamente per il proprio veicolo
    - Nessuna azione di modifica/eliminazione nella DataTable
    - Pulsante "Nuova Rilevazione" visibile (il Driver puo inserire ma non modificare)
  - [ ] 9.3 Verificare che le Server Actions di update e delete rifiutino le richieste con ruolo Driver con `ActionResult` code `FORBIDDEN`
- [ ] Task 10: Pagine Loading e Error (AC: #1)
  - [ ] 10.1 Verificare che tutte le pagine create/aggiornate abbiano `loading.tsx` e `error.tsx`:
    - `src/app/(dashboard)/fuel-records/loading.tsx` — skeleton DataTable
    - `src/app/(dashboard)/fuel-records/error.tsx` — error boundary con retry
    - `src/app/(dashboard)/km-readings/loading.tsx` — skeleton DataTable
    - `src/app/(dashboard)/km-readings/error.tsx` — error boundary con retry
  - [ ] 10.2 I skeleton devono corrispondere alla struttura della pagina (non spinner generico)

## Dev Notes

### FuelFeed Variante Validation — Caso d'Uso

La variante `validation` del FuelFeed e pensata per il Fleet Manager che deve verificare l'integrita dei dati prima di generare un report emissioni. Il flusso tipico:

1. FM accede alla pagina rifornimenti
2. Clicca "Verifica Anomalie"
3. Seleziona un veicolo (o vede tutti i veicoli con anomalie)
4. Il FuelFeed mostra i rifornimenti in ordine cronologico con evidenziazione delle anomalie
5. Per ogni anomalia, FM vede il consumo calcolato vs atteso e decide se correggere
6. Clicca "Correggi" e viene portato alla pagina di modifica del rifornimento
7. Dopo la correzione, torna al FuelFeed che si aggiorna

### Anomaly Detection — Soglie e Logica

Le soglie per il rilevamento anomalie sono:

| Anomalia | Condizione | Severita |
|---|---|---|
| `consumption_too_high` | Consumo calcolato > 2x consumo catalogo | warning |
| `consumption_too_low` | Consumo calcolato < 0.3x consumo catalogo | warning |
| `suspicious_quantity` | Quantita > 200L per rifornimento | warning |
| `negative_km` | Km corrente < km precedente | error |

Il **consumo calcolato** si ottiene dalla formula:
```
consumoL100Km = (quantityLiters / (currentKm - previousKm)) * 100
```

Il **consumo catalogo** proviene da `Engine.consumptionL100Km` del veicolo operativo (tramite il catalogo globale). Se il veicolo ha piu motori, usare il motore corrispondente al `fuelType` del rifornimento.

Se non esiste un record precedente (primo rifornimento), non e possibile calcolare il consumo e non si generano anomalie di tipo consumo.

### DataTable — Pattern Interazione (da UX Design)

La DataTable segue il pattern definito nel UX Design Specification:
- **Sorting:** Click su header colonna, freccia indicatore direzione
- **Filtri:** Come chip sopra la tabella, rimovibili. Non un pannello filtri laterale
- **Search:** Campo search con debounce 300ms sulla targa
- **Paginazione:** 50 righe default, selettore righe per pagina (25/50/100), navigazione pagine
- **Azioni riga:** Icone a destra (edit, delete), visibili on hover o sempre su mobile
- **Responsive:** Su mobile, la tabella diventa card-view con i campi principali

### Unione FuelRecord + KmReading nel Feed

Il feed per veicolo unisce due fonti dati diverse. La struttura comune:

```typescript
interface FuelFeedItem {
  id: string
  type: 'fuel_record' | 'km_reading'
  date: Date
  odometerKm: number
  vehiclePlate?: string
  source: string
  // Campi specifici fuel_record
  fuelType?: string
  quantityLiters?: number
  amountEur?: number
  // Campi specifici km_reading
  notes?: string
  // Anomalie
  hasAnomaly?: boolean
  anomalyMessage?: string
  anomalySeverity?: 'warning' | 'error'
}
```

L'unione avviene a livello service, non a livello SQL. Le due query vengono fatte separatamente e il merge ordinato per data avviene in TypeScript.

### Permessi per Operazione

| Operazione | Driver | Fleet Manager | Admin |
|---|---|---|---|
| Visualizzare rifornimenti | Solo propri | Tutti del tenant | Tutti del tenant |
| Modificare rifornimento | NO | SI | SI |
| Eliminare rifornimento | NO | SI | SI |
| Visualizzare km readings | Solo propri | Tutti del tenant | Tutti del tenant |
| Modificare km reading | NO | SI | SI |
| Eliminare km reading | NO | SI | SI |
| Verifica anomalie | NO | SI | SI |

### Decisioni Architetturali Rilevanti

- **DA-1 Multi-Tenant:** Filtro automatico tenantId su tutte le query
- **FA-5 Tabelle Dati:** TanStack Table + shadcn/ui DataTable per sorting, filtering, pagination
- **AC-2 Error Handling:** ActionResult<T> per operazioni di modifica/eliminazione
- **NFR10 Audit Trail:** Ogni correzione tracciata con valore precedente e nuovo
- **Pattern UX:** DataTable con filtri come chip, search debounce 300ms, paginazione 50 righe default

### Naming Conventions (da architecture.md)

- Route edit: `src/app/(dashboard)/fuel-records/[id]/edit/`
- Componenti: `FuelRecordTable.tsx`, `KmReadingTable.tsx`
- Service: `anomaly-detection-service.ts`
- Componente shared: `src/components/data-display/FuelFeed.tsx` (aggiornamento)

### File da Creare/Modificare

| File | Azione | Descrizione |
|---|---|---|
| `src/app/(dashboard)/fuel-records/components/FuelRecordTable.tsx` | Crea | DataTable rifornimenti con filtri |
| `src/app/(dashboard)/fuel-records/[id]/edit/page.tsx` | Crea | Pagina modifica rifornimento |
| `src/app/(dashboard)/fuel-records/[id]/edit/loading.tsx` | Crea | Skeleton loading |
| `src/app/(dashboard)/fuel-records/page.tsx` | Modifica | Aggiungere toggle FuelFeed/DataTable |
| `src/app/(dashboard)/fuel-records/components/FuelRecordForm.tsx` | Modifica | Supporto modalita edit |
| `src/app/(dashboard)/km-readings/components/KmReadingTable.tsx` | Modifica | Aggiungere filtri completi e colonna Delta Km |
| `src/components/data-display/FuelFeed.tsx` | Modifica | Supporto entry km_reading e variante validation migliorata |
| `src/lib/services/anomaly-detection-service.ts` | Crea | Rilevamento anomalie consumo |
| `src/lib/services/fuel-record-service.ts` | Modifica | Aggiungere getVehicleFeed |
| `src/components/forms/ConfirmDialog.tsx` | Crea (se non esiste) | Dialog conferma eliminazione |

### Anti-Pattern da Evitare

- NON fare il merge FuelRecord + KmReading a livello SQL con UNION — fare due query separate e merge in TypeScript (piu manutenibile e testabile)
- NON calcolare le anomalie in real-time sulla DataTable per grandi dataset — calcolare lato server e passare i flag
- NON permettere al Driver di accedere alla pagina di modifica di un rifornimento — il routing deve verificare il ruolo
- NON duplicare la logica di formattazione numeri — creare utility condivise in `src/lib/utils/number.ts`
- NON dimenticare l'audit trail per le eliminazioni — ogni delete deve registrare i valori del record eliminato
- NON mostrare la colonna Azioni nella DataTable per il Driver — nasconderla completamente

### References

- [Source: architecture.md#FA-5] — TanStack Table + shadcn/ui DataTable
- [Source: architecture.md#Structure Patterns] — Directory structure fuel-records/, km-readings/
- [Source: architecture.md#Communication Patterns] — AuditAction types
- [Source: architecture.md#Format Patterns] — Date/Time formato locale italiano
- [Source: epics.md#Story 5.4] — Acceptance criteria BDD
- [Source: epics.md#Story 5.1] — Dipendenza: FuelFeed component, FuelRecordForm, audit-service
- [Source: epics.md#Story 5.3] — Dipendenza: KmReadingTable, km-reading-service
- [Source: prd.md#FR31] — Visualizzazione e correzione rifornimenti/km
- [Source: prd.md#NFR10] — Audit trail per ogni correzione
- [Source: ux-design-specification.md] — FuelFeed variante validation, DataTable pattern

## Dev Agent Record

### Agent Model Used



### Debug Log References

### Completion Notes List

### File List

