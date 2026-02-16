# Story 5.2: Import Rifornimenti da CSV/Excel

Status: done

## Story

As a **Fleet Manager**,
I want **importare rifornimenti da file CSV o Excel**,
So that **posso caricare massivamente i dati di rifornimento senza inserimento manuale**.

## Acceptance Criteria

1. Il sistema mostra anteprima con validazione pre-import prima di confermare (FR28)
2. Il flusso segue i 6 step: upload, mapping colonne, anteprima, validazione, conferma, risultato
3. L'import supporta encoding UTF-8 e separatori configurabili (punto e virgola, virgola, tab) (NFR26)
4. L'import di 10.000 righe completa in meno di 30 secondi (NFR4)
5. Gli errori sono evidenziati riga per riga (veicolo non trovato, targa non valida, km inconsistenti)
6. Ogni rifornimento importato e tracciato con audit trail indicando sorgente "IMPORT_CSV" (NFR10)

## Tasks / Subtasks

- [ ] Task 1: Analisi e riuso pattern import da Story 3.2 (AC: #2)
  - [ ] 1.1 Verificare che il wizard di import creato nella Story 3.2 (Import Dipendenti) sia implementato e riutilizzabile
  - [ ] 1.2 Identificare i componenti riutilizzabili:
    - `ImportUploader.tsx` — step 1: upload file + selezione encoding/separatore
    - `ImportColumnMapper.tsx` — step 2: mapping colonne file → campi entita
    - `ImportPreview.tsx` — step 3: anteprima dati mappati
    - `ImportValidation.tsx` — step 4: risultati validazione riga per riga
    - `ImportConfirm.tsx` — step 5: riepilogo e conferma
    - `ImportResult.tsx` — step 6: risultato finale con contatori
  - [ ] 1.3 Se i componenti non sono ancora generici, pianificare la loro generalizzazione in `src/components/import/` prima di procedere
- [ ] Task 2: Configurazione mapping colonne per Fuel Records (AC: #2)
  - [ ] 2.1 Definire la configurazione di mapping per i rifornimenti:
    ```typescript
    export const fuelRecordImportConfig: ImportFieldConfig[] = [
      { field: 'licensePlate', label: 'Targa', required: true, type: 'string' },
      { field: 'date', label: 'Data', required: true, type: 'date', formats: ['dd/MM/yyyy', 'yyyy-MM-dd', 'dd-MM-yyyy'] },
      { field: 'fuelType', label: 'Tipo Carburante', required: true, type: 'enum', values: [...FuelType values...] },
      { field: 'quantityLiters', label: 'Quantita (L)', required: true, type: 'number', locale: 'it-IT' },
      { field: 'amountEur', label: 'Importo (EUR)', required: true, type: 'number', locale: 'it-IT' },
      { field: 'odometerKm', label: 'Km', required: true, type: 'integer' },
      { field: 'notes', label: 'Note', required: false, type: 'string' },
    ]
    ```
  - [ ] 2.2 La targa viene usata per risolvere il `vehicleId` — matching per targa corrente del veicolo operativo tenant
- [ ] Task 3: Schema Zod per validazione riga import (AC: #1, #5)
  - [ ] 3.1 Creare `src/lib/schemas/fuel-record-import.ts` con schema di validazione per singola riga:
    ```typescript
    import { z } from 'zod'

    export const fuelRecordImportRowSchema = z.object({
      licensePlate: z.string().min(1, "Targa obbligatoria"),
      date: z.coerce.date({ required_error: "Data obbligatoria" }),
      fuelType: z.string().min(1, "Tipo carburante obbligatorio"),
      quantityLiters: z.number().positive("Quantita deve essere > 0"),
      amountEur: z.number().positive("Importo deve essere > 0"),
      odometerKm: z.number().int().nonnegative("Km devono essere >= 0"),
      notes: z.string().max(500).nullable().optional(),
    })

    export type FuelRecordImportRow = z.infer<typeof fuelRecordImportRowSchema>

    /** Risultato validazione per singola riga */
    export interface ImportRowValidation {
      rowIndex: number
      data: FuelRecordImportRow
      errors: Array<{ field: string; message: string }>
      warnings: Array<{ field: string; message: string }>
      vehicleId?: string  // risolto da targa
      isValid: boolean
    }

    /** Risultato complessivo dell'import */
    export interface FuelRecordImportResult {
      totalRows: number
      validRows: number
      invalidRows: number
      importedRows: number
      skippedRows: number
      errors: Array<{ rowIndex: number; field: string; message: string }>
      duration: number  // millisecondi
    }
    ```
- [ ] Task 4: Servizio di parsing e validazione CSV (AC: #1, #3, #5)
  - [ ] 4.1 Creare `src/lib/services/fuel-record-import-service.ts` con le seguenti funzioni:
    ```typescript
    import { FuelRecordImportRow, ImportRowValidation, FuelRecordImportResult } from '@/lib/schemas/fuel-record-import'

    /** Parsa il file CSV/Excel e ritorna le righe raw */
    export async function parseImportFile(
      file: File | Buffer,
      options: { encoding?: string; separator?: string }
    ): Promise<Record<string, string>[]>

    /** Valida tutte le righe con matching veicolo per targa */
    export async function validateImportRows(
      rows: FuelRecordImportRow[],
      tenantId: string
    ): Promise<ImportRowValidation[]>

    /** Esegue l'import bulk delle righe validate */
    export async function executeBulkImport(
      validatedRows: ImportRowValidation[],
      tenantId: string,
      userId: string
    ): Promise<FuelRecordImportResult>
    ```
  - [ ] 4.2 Implementare `parseImportFile`:
    - Usare `papaparse` per parsing CSV con encoding e separatore configurabili
    - Per file Excel (.xlsx), usare una libreria compatibile (es. `xlsx` o `exceljs`)
    - Ritornare array di oggetti con chiavi = intestazioni colonne
    - Gestire BOM UTF-8 e encoding alternativi
  - [ ] 4.3 Implementare `validateImportRows`:
    - Per ogni riga, validare con `fuelRecordImportRowSchema`
    - Risolvere `licensePlate` → `vehicleId` tramite query al database (targa corrente del veicolo operativo nel tenant)
    - Se targa non trovata: errore "Veicolo con targa XXX non trovato nel tenant"
    - Mappare `fuelType` stringa a `FuelType` enum (con mapping flessibile: "benzina" → BENZINA, "gasolio" → DIESEL, etc.)
    - Validare coerenza km: per ogni veicolo, le righe ordinate per data devono avere km crescenti
    - Generare warning per valori anomali (quantita > 200L, importo > 500 EUR, etc.)
  - [ ] 4.4 Implementare `executeBulkImport`:
    - Filtrare solo le righe con `isValid: true`
    - Creare i FuelRecord in batch con `prisma.fuelRecord.createMany` o transazione iterativa
    - Per ogni record creato, registrare audit trail con source "IMPORT_CSV"
    - Misurare la durata totale dell'import
    - Ritornare `FuelRecordImportResult` con contatori
  - [ ] 4.5 Ottimizzare per performance (NFR4: 10K righe < 30s):
    - Pre-caricare tutte le targhe del tenant in una Map per lookup O(1)
    - Usare `createMany` per inserimenti batch (se supportato da SQL Server adapter)
    - Se `createMany` non supportato, usare transazione con batch di 100 insert
    - Registrare audit trail in batch (non uno per uno)
- [ ] Task 5: Server Action per import (AC: #1, #2, #6)
  - [ ] 5.1 Creare `src/app/(dashboard)/fuel-records/actions/import-fuel-records.ts`:
    ```typescript
    'use server'

    import { ActionResult } from '@/types/action-result'
    import { ImportRowValidation, FuelRecordImportResult } from '@/lib/schemas/fuel-record-import'

    /** Step 1-3: Upload, parsing e validazione preview */
    export async function validateFuelRecordImport(
      formData: FormData
    ): Promise<ActionResult<{ rows: ImportRowValidation[]; totalRows: number }>>

    /** Step 5-6: Esecuzione import confermato */
    export async function executeFuelRecordImport(
      validatedRows: ImportRowValidation[]
    ): Promise<ActionResult<FuelRecordImportResult>>
    ```
  - [ ] 5.2 Implementare `validateFuelRecordImport`:
    - Estrarre file, encoding e separatore dal FormData
    - Autenticazione e RBAC: solo FM e Admin
    - Parsare il file con `parseImportFile`
    - Validare le righe con `validateImportRows`
    - Ritornare le righe validate con errori/warning per visualizzazione preview
  - [ ] 5.3 Implementare `executeFuelRecordImport`:
    - Autenticazione e RBAC: solo FM e Admin
    - Filtro solo righe valide
    - Delega a `executeBulkImport`
    - Ritornare `FuelRecordImportResult`
    - Loggare con Pino: inizio, fine, contatori, durata
- [ ] Task 6: Pagina Import Rifornimenti — Wizard 6 Step (AC: #1, #2, #3, #5)
  - [ ] 6.1 Creare `src/app/(dashboard)/fuel-records/import/page.tsx`:
    - Server Component wrapper con breadcrumb: Dashboard > Rifornimenti > Import
    - Renderizza il componente wizard client-side
  - [ ] 6.2 Creare `src/app/(dashboard)/fuel-records/import/components/FuelRecordImportWizard.tsx`:
    - Client Component ("use client") con stato step corrente (1-6)
    - Step 1 — Upload: drag & drop o browse file (.csv, .xlsx), selezione encoding (UTF-8 default, Latin-1), selezione separatore (; , \t)
    - Step 2 — Mapping: visualizza intestazioni del file, permette mapping a campi fuel record tramite select/dropdown per ogni colonna
    - Step 3 — Anteprima: mostra le prime 10-20 righe mappate in una tabella con i dati formattati
    - Step 4 — Validazione: mostra risultati validazione, righe valide in verde, righe con errori in rosso con dettaglio errore per campo, contatori totali (valide/invalide/warning)
    - Step 5 — Conferma: riepilogo finale con numero righe da importare, possibilita di tornare indietro o confermare
    - Step 6 — Risultato: contatori finali (importate/skipped/errori), durata, pulsante "Torna ai Rifornimenti"
  - [ ] 6.3 Implementare navigazione wizard:
    - Stepper visuale in alto con 6 step numerati
    - Pulsanti "Indietro" e "Avanti" / "Importa" / "Chiudi"
    - Disabilitare "Avanti" se lo step corrente non e completo
    - Lo step 4→5 e possibile solo se almeno 1 riga e valida
  - [ ] 6.4 Creare `src/app/(dashboard)/fuel-records/import/loading.tsx` con skeleton
- [ ] Task 7: Mapping flessibile tipo carburante (AC: #5)
  - [ ] 7.1 Creare funzione di mapping flessibile per il tipo carburante importato:
    ```typescript
    /** Mappa stringhe flessibili da CSV al FuelType enum */
    export function mapImportFuelType(value: string): FuelType | null
    ```
  - [ ] 7.2 Implementare mapping case-insensitive con varianti comuni:
    - "benzina", "BENZINA", "Benzina", "B" → BENZINA
    - "diesel", "gasolio", "DIESEL", "GASOLIO", "D" → DIESEL
    - "gpl", "GPL" → GPL
    - "metano", "METANO", "CNG", "gas naturale" → METANO
    - "elettrico", "ELETTRICO", "EV", "BEV" → ELETTRICO
    - Se non riconosciuto: ritornare `null` e generare errore di validazione sulla riga
- [ ] Task 8: Gestione encoding e separatori (AC: #3)
  - [ ] 8.1 Nel componente di upload (step 1), offrire le opzioni:
    - Encoding: UTF-8 (default), Latin-1 (ISO-8859-1), Windows-1252
    - Separatore: punto e virgola (default per locale IT), virgola, tab
  - [ ] 8.2 Implementare auto-detect opzionale:
    - Leggere i primi 1024 bytes del file
    - Se contiene BOM UTF-8 (EF BB BF), selezionare UTF-8
    - Contare occorrenze di `;`, `,`, `\t` nelle prime righe per suggerire il separatore
  - [ ] 8.3 Configurare `papaparse` con i parametri selezionati dall'utente

## Dev Notes

### Riuso Pattern Import Wizard da Story 3.2

La Story 3.2 (Import Dipendenti da CSV/Excel) introduce il wizard di import a 6 step. Questa story riusa lo stesso pattern e idealmente gli stessi componenti UI, adattati per i campi specifici dei rifornimenti.

Se la Story 3.2 non e ancora implementata quando si sviluppa questa story, creare i componenti wizard come generici fin da subito in `src/components/import/` per facilitare il riuso:

```
src/components/import/
  ImportWizard.tsx        — container wizard con stepper e navigazione
  ImportUploader.tsx      — step 1: upload file
  ImportColumnMapper.tsx  — step 2: mapping colonne
  ImportPreview.tsx       — step 3: anteprima
  ImportValidation.tsx    — step 4: risultati validazione
  ImportConfirm.tsx       — step 5: conferma
  ImportResult.tsx        — step 6: risultato
```

Ogni componente riceve la configurazione specifica dell'entita (campi, validazione, mapping) tramite props/config.

### Performance: 10K Righe in 30 Secondi (NFR4)

Strategie per rispettare il vincolo di performance:

1. **Pre-loading targhe:** Caricare tutte le targhe del tenant in una `Map<string, string>` (targa → vehicleId) prima della validazione. Evita N query al DB.
2. **Batch insert:** Usare `prisma.$transaction` con batch di 100-500 record alla volta, non uno per uno.
3. **Audit in batch:** Creare gli AuditEntry in batch dopo l'import, non uno per record.
4. **Parsing streaming:** PapaParse supporta lo streaming per file grandi — valutare se necessario per 10K righe.
5. **Validazione parallela:** La validazione Zod e CPU-bound — per 10K righe e comunque veloce (< 1s).

### Matching Veicolo per Targa

Il campo chiave per il matching e la targa (`licensePlate`). Il flusso:

1. Estrarre la targa dalla riga CSV (trim, uppercase)
2. Cercare tra i veicoli operativi del tenant per targa corrente
3. Se trovato: assegnare `vehicleId` alla riga
4. Se non trovato: cercare anche nelle targhe storiche (Story 3.6 — ritargatura)
5. Se ancora non trovato: marcare la riga come errore "Veicolo con targa XXX non trovato"

**Nota:** Le targhe nel CSV possono avere formati diversi (spazi, trattini, etc.). Normalizzare rimuovendo spazi e caratteri speciali prima del matching.

### Validazione Coerenza Km tra Righe

Se il CSV contiene piu rifornimenti per lo stesso veicolo, verificare che i km siano crescenti rispetto alla data:

1. Raggruppare le righe per `vehicleId`
2. Ordinare per `date` ASC
3. Verificare che `odometerKm[i] >= odometerKm[i-1]`
4. Verificare anche rispetto all'ultimo km noto nel DB per quel veicolo

Se la sequenza non e rispettata, generare un warning (non un errore bloccante) — il FM decide se procedere.

### Formato Numeri nel CSV — Locale IT

I file CSV italiani usano la virgola come separatore decimale e il punto come separatore delle migliaia:
- Quantita: `45,50` (non `45.50`)
- Importo: `1.234,56` (non `1,234.56`)
- Km: `125.430` (non `125,430`)

Il parsing deve gestire entrambi i formati (IT e EN) in base alla configurazione. Suggerimento: rilevare il formato dal file e offrire un selettore "Formato numeri" nello step 1 (IT/EN).

### Decisioni Architetturali Rilevanti

- **DA-1 Multi-Tenant:** Import solo per veicoli del proprio tenant, filtro automatico
- **DA-4 Validazione Zod:** Schema Zod per validazione righe import
- **AC-1 Pattern API Ibrido:** Server Actions per le due fasi (validate + execute)
- **AC-2 Error Handling:** ActionResult<T> con dettaglio errori per riga
- **NFR4 Performance:** 10K righe < 30s — batch insert, pre-loading targhe
- **NFR26 CSV:** UTF-8 e separatori configurabili
- **NFR10 Audit Trail:** Ogni record importato tracciato con source "IMPORT_CSV"

### Naming Conventions (da architecture.md)

- Route: `src/app/(dashboard)/fuel-records/import/`
- Server Actions: `import-fuel-records.ts`
- Service: `fuel-record-import-service.ts`
- Schema Zod: `src/lib/schemas/fuel-record-import.ts`
- Componenti: `FuelRecordImportWizard.tsx`

### File da Creare/Modificare

| File | Azione | Descrizione |
|---|---|---|
| `src/lib/schemas/fuel-record-import.ts` | Crea | Schema Zod per righe import + tipi risultato |
| `src/lib/services/fuel-record-import-service.ts` | Crea | Parsing, validazione, bulk import |
| `src/app/(dashboard)/fuel-records/actions/import-fuel-records.ts` | Crea | Server Actions validate + execute |
| `src/app/(dashboard)/fuel-records/import/page.tsx` | Crea | Pagina wrapper import |
| `src/app/(dashboard)/fuel-records/import/loading.tsx` | Crea | Skeleton loading |
| `src/app/(dashboard)/fuel-records/import/components/FuelRecordImportWizard.tsx` | Crea | Wizard 6 step |
| `src/components/import/ImportWizard.tsx` | Crea (se non esiste) | Container wizard generico |
| `src/components/import/ImportUploader.tsx` | Crea (se non esiste) | Step upload generico |
| `src/components/import/ImportColumnMapper.tsx` | Crea (se non esiste) | Step mapping generico |
| `src/components/import/ImportPreview.tsx` | Crea (se non esiste) | Step anteprima generico |
| `src/components/import/ImportValidation.tsx` | Crea (se non esiste) | Step validazione generico |
| `src/components/import/ImportConfirm.tsx` | Crea (se non esiste) | Step conferma generico |
| `src/components/import/ImportResult.tsx` | Crea (se non esiste) | Step risultato generico |
| `package.json` | Modifica | Aggiungere `papaparse` (+ `@types/papaparse`) e eventuale libreria Excel |

### Dipendenze NPM

- `papaparse` — parsing CSV con encoding e separatori configurabili
- `@types/papaparse` — tipi TypeScript per papaparse
- `xlsx` o `exceljs` — parsing file Excel (.xlsx) (valutare quale e piu leggero)

### Anti-Pattern da Evitare

- NON caricare tutto il file in memoria in una volta per file > 10MB — usare streaming se necessario
- NON fare una query al DB per ogni riga per risolvere la targa — pre-caricare tutte le targhe in una Map
- NON inserire i record uno per uno — usare batch insert
- NON bloccare l'import per errori su singole righe — mostrare gli errori e importare le righe valide
- NON permettere l'import senza anteprima e validazione — i 6 step sono obbligatori
- NON ignorare il formato numeri locale IT — i CSV italiani usano virgola come decimale
- NON saltare l'audit trail per i record importati — ogni record deve avere source "IMPORT_CSV"

### References

- [Source: architecture.md#DA-1] — Multi-tenant filtering
- [Source: architecture.md#Structure Patterns] — Directory structure import/
- [Source: architecture.md#Format Patterns] — ActionResult<T>, PaginatedResult<T>
- [Source: epics.md#Story 5.2] — Acceptance criteria BDD
- [Source: epics.md#Story 3.2] — Pattern import wizard 6 step (riferimento)
- [Source: prd.md#FR28] — Import rifornimenti CSV/Excel
- [Source: prd.md#NFR4] — Performance: 10K righe < 30s
- [Source: prd.md#NFR10] — Audit trail con sorgente import
- [Source: prd.md#NFR26] — CSV UTF-8 e separatori configurabili

## Dev Agent Record

### Agent Model Used



### Debug Log References

### Completion Notes List

### File List

