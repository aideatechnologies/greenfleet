# Story 3.2: Import Dipendenti da CSV/Excel

Status: done

## Story

As a **Fleet Manager**,
I want **importare dipendenti da file CSV o Excel**,
So that **posso caricare massivamente l'anagrafica senza inserimento manuale uno per uno**.

## Acceptance Criteria

1. Il sistema mostra un'anteprima dei dati caricati con validazione pre-import (FR15)
2. Il flusso segue i 6 step: upload, mapping colonne, anteprima, validazione, conferma, risultato
3. L'import supporta encoding UTF-8 e separatori configurabili (NFR26)
4. Gli errori di validazione sono evidenziati riga per riga con possibilita di correzione
5. L'import di 10.000 righe completa in meno di 30 secondi (NFR4)

## Tasks / Subtasks

- [ ] Task 1: Installare librerie di parsing CSV/Excel (AC: #1, #3)
  - [ ] 1.1 Installare `papaparse` per parsing CSV (type-safe, streaming, configurabile)
  - [ ] 1.2 Installare `@types/papaparse` per TypeScript types
  - [ ] 1.3 Installare `xlsx` (SheetJS) per parsing file Excel (.xlsx, .xls)
  - [ ] 1.4 Verificare che entrambe le librerie funzionino correttamente in ambiente Next.js (client-side per preview, server-side per import bulk)

- [ ] Task 2: Creare schema Zod per validazione dipendente import (AC: #1, #4)
  - [ ] 2.1 Creare `src/lib/schemas/employee-import.ts` con `employeeImportRowSchema` — schema per singola riga importata: nome (required, string, min 1), cognome (required, string, min 1), email (optional, email format), codiceFiscale (optional, regex 16 chars), matricola (optional, string), telefono (optional, string), reparto (optional, string), note (optional, string)
  - [ ] 2.2 Creare `employeeImportConfigSchema` — schema per configurazione import: separator (default `,`), encoding (default `utf-8`), hasHeader (default `true`), dateFormat (default `dd/MM/yyyy`)
  - [ ] 2.3 Creare `columnMappingSchema` — schema per mapping colonne: oggetto che mappa nomi colonna CSV ai campi Employee (chiave = campo target, valore = indice o nome colonna sorgente)
  - [ ] 2.4 Creare tipo `ImportValidationResult` — per ogni riga: `{ rowIndex: number, data: EmployeeImportRow, errors: { field: string, message: string }[], isValid: boolean }`
  - [ ] 2.5 Creare tipo `ImportSummary` — risultato finale: `{ totalRows: number, validRows: number, errorRows: number, importedRows: number, skippedRows: number, errors: ImportValidationResult[] }`

- [ ] Task 3: Creare import service (AC: #1, #4, #5)
  - [ ] 3.1 Creare `src/lib/services/employee-import-service.ts` con la logica di business per l'import
  - [ ] 3.2 Implementare `parseCSV(file: File, config: ImportConfig): Promise<ParsedData>` — usa papaparse con config separatore/encoding, ritorna righe raw + headers
  - [ ] 3.3 Implementare `parseExcel(file: File): Promise<ParsedData>` — usa xlsx per leggere il primo foglio, ritorna righe raw + headers
  - [ ] 3.4 Implementare `detectFileType(file: File): 'csv' | 'excel'` — detection basata su estensione (.csv, .xlsx, .xls) e MIME type
  - [ ] 3.5 Implementare `autoMapColumns(headers: string[]): ColumnMapping` — tentativo di auto-mapping basato su nomi colonna comuni (nome/first_name/firstName, cognome/last_name/lastName, email, codice_fiscale/cf, matricola, telefono/phone, reparto/department)
  - [ ] 3.6 Implementare `validateRows(rows: RawRow[], mapping: ColumnMapping): ImportValidationResult[]` — valida ogni riga con employeeImportRowSchema, raccoglie errori per campo, ritorna array con status per riga
  - [ ] 3.7 Implementare `checkDuplicates(rows: ValidRow[], existingEmployees: Employee[]): ImportValidationResult[]` — verifica duplicati per email e/o codiceFiscale contro dati gia esistenti nel tenant e all'interno del file stesso
  - [ ] 3.8 Ottimizzare per performance: processing in batch di 500 righe, validazione Zod con `safeParse` per non bloccare su errori singoli, target < 30 secondi per 10.000 righe (NFR4)

- [ ] Task 4: Creare componente stepper wizard (AC: #2)
  - [ ] 4.1 Creare `src/app/(dashboard)/import/components/ImportWizard.tsx` — componente stepper a 6 step con stato gestito via `useState`. Step: 1-Upload, 2-Mapping, 3-Anteprima, 4-Validazione, 5-Conferma, 6-Risultato
  - [ ] 4.2 Implementare UI stepper con shadcn/ui: barra orizzontale con numeri step, label, stato (completato/corrente/futuro), colori teal 600 per completato, navigazione avanti/indietro tra step (no skip)
  - [ ] 4.3 Gestire lo stato globale del wizard con `useState` in ImportWizard: file selezionato, dati parsati, mapping colonne, risultati validazione, risultato import
  - [ ] 4.4 Implementare navigazione: bottone "Avanti" (Primary, abilitato solo se step corrente e valido), "Indietro" (Secondary), "Annulla" (Ghost con conferma se ci sono dati caricati)

- [ ] Task 5: Creare step 1 — Upload file con drag-and-drop (AC: #1, #3)
  - [ ] 5.1 Creare `src/app/(dashboard)/import/components/ImportUploader.tsx` — zona drag-and-drop prominente con icona Upload + testo "Trascina il file CSV o Excel qui, oppure clicca per selezionare"
  - [ ] 5.2 Implementare drag-and-drop con gestione eventi `onDragOver`, `onDragEnter`, `onDragLeave`, `onDrop`. Stato visivo: bordo tratteggiato default, bordo solid teal 600 + sfondo accent quando file e sopra la zona
  - [ ] 5.3 Implementare input file nascosto con accettazione `.csv, .xlsx, .xls` (`accept=".csv,.xlsx,.xls"`)
  - [ ] 5.4 Mostrare info file dopo selezione: nome file, dimensione (formattata), tipo rilevato (CSV/Excel)
  - [ ] 5.5 Aggiungere sezione configurazione separatore CSV: select con opzioni Virgola (`,`), Punto e virgola (`;`), Tab (`\t`), Pipe (`|`). Default: auto-detect dal contenuto
  - [ ] 5.6 Aggiungere toggle "Il file ha una riga di intestazione" (default: attivo)
  - [ ] 5.7 Limite dimensione file: 10 MB con messaggio di errore se superato
  - [ ] 5.8 Al click "Avanti": parsare il file con papaparse/xlsx e passare i dati allo step successivo. Mostrare spinner durante il parsing

- [ ] Task 6: Creare step 2 — Mapping colonne (AC: #2)
  - [ ] 6.1 Creare `src/app/(dashboard)/import/components/ImportColumnMapping.tsx` — interfaccia per mappare colonne del file ai campi dipendente
  - [ ] 6.2 Mostrare tabella a 3 colonne: "Colonna nel file" (read-only), "Anteprima valore" (prima riga di esempio, read-only), "Campo Greenfleet" (select con opzioni: Nome, Cognome, Email, Codice Fiscale, Matricola, Telefono, Reparto, Note, -- Ignora --)
  - [ ] 6.3 Implementare auto-mapping iniziale con `autoMapColumns()` — pre-selezionare i campi corrispondenti riconosciuti automaticamente
  - [ ] 6.4 Validare che almeno Nome e Cognome siano mappati (campi obbligatori) — "Avanti" disabilitato finche il mapping non e valido
  - [ ] 6.5 Evidenziare con StatusBadge warning le colonne non mappate (ignorate)
  - [ ] 6.6 Impedire mapping duplicato: un campo Greenfleet puo essere mappato a una sola colonna sorgente

- [ ] Task 7: Creare step 3 — Anteprima dati (AC: #1)
  - [ ] 7.1 Creare `src/app/(dashboard)/import/components/ImportPreview.tsx` — DataTable con anteprima delle prime 20 righe mappate ai campi Greenfleet
  - [ ] 7.2 Mostrare header con riepilogo: "X righe trovate nel file — Anteprima delle prime 20"
  - [ ] 7.3 Colonne della DataTable corrispondono ai campi mappati nello step precedente
  - [ ] 7.4 Evidenziare celle con dati anomali (valori vuoti in campi obbligatori) con sfondo `destructive/10` e bordo `destructive`
  - [ ] 7.5 Mostrare badge contatore in header: "X righe", "Y campi mappati"

- [ ] Task 8: Creare step 4 — Validazione con errori riga per riga (AC: #4, #5)
  - [ ] 8.1 Creare `src/app/(dashboard)/import/components/ImportValidation.tsx` — eseguire validazione completa di tutte le righe con `validateRows()` e `checkDuplicates()`
  - [ ] 8.2 Mostrare progress bar durante la validazione (per file grandi, > 1000 righe)
  - [ ] 8.3 Mostrare summary in header: "X righe totali — Y valide — Z con errori" con colori semantici (success per valide, destructive per errori)
  - [ ] 8.4 Mostrare DataTable con tutte le righe, colonna "Stato" con StatusBadge (valido/errore), colonna "Errori" con lista errori per riga
  - [ ] 8.5 Filtro toggle: "Mostra solo righe con errori" per focus rapido sugli errori
  - [ ] 8.6 Implementare correzione inline: click su cella con errore apre input per correzione. Dopo modifica, ri-validare la riga in tempo reale
  - [ ] 8.7 Mostrare tipo di errore specifico per ogni campo: "Campo obbligatorio", "Formato email non valido", "Codice fiscale non valido (16 caratteri)", "Duplicato: email gia presente nel file/nel sistema"

- [ ] Task 9: Creare step 5 — Conferma import (AC: #2)
  - [ ] 9.1 Creare `src/app/(dashboard)/import/components/ImportConfirm.tsx` — riepilogo finale prima dell'import effettivo
  - [ ] 9.2 Mostrare summary card: totale righe, righe valide (che verranno importate), righe con errori (che verranno scartate)
  - [ ] 9.3 Opzioni: "Importa solo righe valide" (Primary), "Torna indietro per correggere" (Secondary)
  - [ ] 9.4 Se zero righe valide: mostrare EmptyState con messaggio "Nessuna riga valida da importare. Correggi gli errori e riprova." e bottone "Torna alla validazione"
  - [ ] 9.5 Checkbox di conferma: "Confermo l'import di X dipendenti" — "Importa" abilitato solo con checkbox selezionata

- [ ] Task 10: Creare step 6 — Risultato import (AC: #2)
  - [ ] 10.1 Creare `src/app/(dashboard)/import/components/ImportResult.tsx` — risultato finale dell'operazione di import
  - [ ] 10.2 Mostrare summary con icona success/warning: "X dipendenti importati con successo. Y righe scartate per errori."
  - [ ] 10.3 Se ci sono righe scartate: mostrare link "Scarica report errori" che genera un CSV con le righe scartate e i motivi
  - [ ] 10.4 Bottoni: "Vai alla lista dipendenti" (Primary, naviga a pagina dipendenti), "Importa altro file" (Secondary, resetta wizard)
  - [ ] 10.5 Toast di successo al completamento import

- [ ] Task 11: Creare Server Action per bulk import dipendenti (AC: #1, #5)
  - [ ] 11.1 Creare `src/app/(dashboard)/import/actions/import-employees.ts` — Server Action che riceve le righe validate e le inserisce nel database
  - [ ] 11.2 Verificare autenticazione e RBAC: solo Admin e Fleet Manager possono importare (FM solo sul proprio tenant)
  - [ ] 11.3 Validare i dati lato server con `employeeImportRowSchema` (mai fidarsi del client, DA-4)
  - [ ] 11.4 Inserimento bulk tramite Prisma `createMany` con batch di 500 righe per performance. Il tenantId e iniettato automaticamente dal Prisma client extension (DA-1)
  - [ ] 11.5 Gestire errori parziali: se alcune righe falliscono in database (es. constraint violation), continuare con le rimanenti e raccogliere errori
  - [ ] 11.6 Ritornare `ActionResult<ImportSummary>` con contatori e dettaglio errori
  - [ ] 11.7 Log operazione con Pino: `info` per import completato (totale righe, importate, scartate, utente, tenant), `warn` per righe scartate

- [ ] Task 12: Creare pagina import e route (AC: #2)
  - [ ] 12.1 Creare `src/app/(dashboard)/import/page.tsx` — pagina import come React Server Component. Verifica autenticazione, mostra ImportWizard con tipo "dipendenti" preselezionato
  - [ ] 12.2 Creare `src/app/(dashboard)/import/loading.tsx` — skeleton matching struttura pagina
  - [ ] 12.3 Creare `src/app/(dashboard)/import/error.tsx` — error boundary con messaggio user-friendly + bottone retry
  - [ ] 12.4 Aggiungere breadcrumb: Dashboard > Import > Dipendenti
  - [ ] 12.5 Nota: la route `import/` e condivisa con altri tipi di import (rifornimenti in Story 5.2). Prevedere un selettore tipo import o parametro query `?type=employees`

## Dev Notes

### Librerie di Parsing

**papaparse (CSV):**
- Parsing client-side per preview rapida e server-side per import bulk
- Supporta streaming per file grandi (10.000+ righe)
- Configurazione separatore, encoding, header detection
- Type-safe con generics

```typescript
import Papa from "papaparse"

// Client-side: parsing per anteprima
Papa.parse(file, {
  header: true,
  encoding: "utf-8",
  delimiter: ";", // configurabile
  preview: 20, // solo prime 20 righe per anteprima
  complete: (results) => {
    // results.data: array di oggetti
    // results.meta.fields: nomi colonne
    // results.errors: errori di parsing
  },
})

// Server-side: parsing completo
Papa.parse(csvString, {
  header: true,
  encoding: "utf-8",
  delimiter: ";",
  skipEmptyLines: true,
  complete: (results) => {
    // processing completo
  },
})
```

**xlsx (SheetJS) per Excel:**
- Parsing client-side con `XLSX.read(data, { type: "array" })`
- Supporta .xlsx e .xls
- Conversione foglio in array di array con `XLSX.utils.sheet_to_json(sheet, { header: 1 })`

```typescript
import * as XLSX from "xlsx"

const workbook = XLSX.read(arrayBuffer, { type: "array" })
const sheetName = workbook.SheetNames[0]
const sheet = workbook.Sheets[sheetName]
const data = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1 })
// data[0] = headers, data[1..N] = righe
```

### Auto-Mapping Colonne — Pattern di Riconoscimento

```typescript
const COLUMN_ALIASES: Record<string, string[]> = {
  nome: ["nome", "first_name", "firstname", "name", "first name"],
  cognome: ["cognome", "last_name", "lastname", "surname", "last name"],
  email: ["email", "e-mail", "mail", "posta elettronica"],
  codiceFiscale: ["codice_fiscale", "codice fiscale", "cf", "fiscal_code", "tax_code"],
  matricola: ["matricola", "badge", "employee_id", "id_dipendente", "employee id"],
  telefono: ["telefono", "phone", "tel", "cellulare", "mobile"],
  reparto: ["reparto", "department", "divisione", "ufficio", "area"],
  note: ["note", "notes", "commento", "commenti", "osservazioni"],
}
```

Il mapping e case-insensitive e trim-safe. I nomi colonna del file vengono normalizzati (lowercase, trim) e confrontati con gli alias.

### Performance — 10.000 Righe in < 30 Secondi (NFR4)

Strategia di ottimizzazione:
1. **Parsing lato client** per preview e mapping (solo prime 20 righe inizialmente)
2. **Validazione lato client** in batch di 500 righe con `requestAnimationFrame` o `setTimeout(0)` per non bloccare la UI
3. **Insert lato server** con `prisma.employee.createMany()` in batch di 500 — evitare N insert singoli
4. **Progress feedback** durante validazione e import per file grandi (progress bar)

```typescript
// Batch processing per non bloccare la UI
async function validateInBatches(rows: RawRow[], batchSize = 500): Promise<ImportValidationResult[]> {
  const results: ImportValidationResult[] = []
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize)
    const batchResults = batch.map((row, idx) => validateRow(row, i + idx))
    results.push(...batchResults)
    // Yield alla UI per aggiornare progress bar
    await new Promise((resolve) => setTimeout(resolve, 0))
  }
  return results
}
```

### Wizard a 6 Step — Dettaglio Flusso

```
Step 1: UPLOAD
  ├── Drag & drop / click per selezionare file
  ├── Config: separatore, header si/no
  └── Parsing file → dati raw + headers

Step 2: MAPPING COLONNE
  ├── Auto-mapping basato su nomi colonne
  ├── Override manuale con select per colonna
  └── Validazione: almeno Nome + Cognome mappati

Step 3: ANTEPRIMA
  ├── DataTable con prime 20 righe mappate
  ├── Highlight celle anomale
  └── Contatore righe totali

Step 4: VALIDAZIONE
  ├── Validazione completa tutte le righe
  ├── Check duplicati (file + database)
  ├── Errori riga per riga con correzione inline
  └── Summary: valide / errori

Step 5: CONFERMA
  ├── Riepilogo: X righe da importare, Y scartate
  ├── Checkbox conferma
  └── Opzione: importa solo valide / torna a correggere

Step 6: RISULTATO
  ├── Summary import completato
  ├── Download report errori (CSV)
  └── Link a lista dipendenti
```

### Campi Dipendente per Import

Basato sullo schema Employee che verra definito/e gia definito in Story 3.1. Campi importabili:

| Campo | Obbligatorio | Validazione |
|---|---|---|
| nome | Si | String, min 1 char, max 100 |
| cognome | Si | String, min 1 char, max 100 |
| email | No | Formato email valido |
| codiceFiscale | No | Regex 16 caratteri alfanumerici |
| matricola | No | String, max 50 |
| telefono | No | String, max 20 |
| reparto | No | String, max 100 |
| note | No | String, max 500 |

**Nota:** il campo `tenantId` viene iniettato automaticamente dal Prisma client extension — non viene importato dal file.

### ActionResult Pattern

```typescript
// Server Action ritorna sempre ActionResult<T>
export async function importEmployees(
  validRows: EmployeeImportRow[]
): Promise<ActionResult<ImportSummary>> {
  const session = await auth.api.getSession({ headers: headers() })
  if (!session) return { success: false, error: "Non autenticato", code: "UNAUTHORIZED" }

  // RBAC: solo Admin o FM
  if (isDriver(session)) {
    return { success: false, error: "Permesso negato", code: "FORBIDDEN" }
  }

  // Validazione server-side (mai fidarsi del client)
  const validationResults = validRows.map((row) => employeeImportRowSchema.safeParse(row))
  // ...

  // Bulk insert con Prisma createMany
  const result = await prisma.employee.createMany({
    data: serverValidRows.map((row) => ({
      name: row.nome,
      surname: row.cognome,
      email: row.email ?? null,
      fiscalCode: row.codiceFiscale ?? null,
      badgeNumber: row.matricola ?? null,
      phone: row.telefono ?? null,
      department: row.reparto ?? null,
      notes: row.note ?? null,
      isActive: true,
      // tenantId iniettato automaticamente da Prisma extension
    })),
    skipDuplicates: true,
  })

  return {
    success: true,
    data: {
      totalRows: validRows.length,
      validRows: result.count,
      errorRows: validRows.length - result.count,
      importedRows: result.count,
      skippedRows: 0,
      errors: [],
    },
  }
}
```

### Struttura File Target

```
src/
├── app/
│   └── (dashboard)/
│       └── import/
│           ├── page.tsx               # Pagina import (RSC)
│           ├── loading.tsx            # Skeleton
│           ├── error.tsx              # Error boundary
│           ├── actions/
│           │   └── import-employees.ts # Server Action bulk import
│           └── components/
│               ├── ImportWizard.tsx     # Stepper a 6 step
│               ├── ImportUploader.tsx   # Step 1: drag-and-drop upload
│               ├── ImportColumnMapping.tsx # Step 2: mapping colonne
│               ├── ImportPreview.tsx    # Step 3: anteprima dati
│               ├── ImportValidation.tsx # Step 4: validazione errori
│               ├── ImportConfirm.tsx    # Step 5: conferma
│               └── ImportResult.tsx     # Step 6: risultato
├── lib/
│   ├── schemas/
│   │   └── employee-import.ts         # Zod schemas per import
│   └── services/
│       └── employee-import-service.ts  # Logica parsing, validazione, mapping
└── types/
    └── import.ts                       # ImportValidationResult, ImportSummary, ColumnMapping
```

### Decisioni Architetturali Rilevanti

- **AC-1 Pattern API Ibrido:** Server Actions per il bulk import (mutation). Nessun Route Handler necessario — il parsing avviene client-side, l'insert via Server Action
- **AC-2 Error Handling:** ActionResult<T> su Server Action con ImportSummary come tipo di ritorno
- **DA-1 Multi-Tenant:** tenantId iniettato automaticamente dal Prisma client extension — mai passato dal client
- **DA-4 Validazione Zod:** Schema Zod condivisi per validazione riga lato client (anteprima) e lato server (import effettivo)
- **FA-1 State Management:** Stato wizard gestito con `useState` nel componente ImportWizard — nessun state management globale necessario
- **FA-5 DataTable:** TanStack Table + shadcn/ui DataTable per anteprima e validazione
- **ID-4 Logging:** Pino per log import (info completato, warn righe scartate)

### Dipendenze da Story Precedenti

- **Story 1.1:** Scaffold progetto, shadcn/ui, Prisma, struttura directory, ActionResult<T>
- **Story 1.2:** Prisma client extension per auto-filter tenantId
- **Story 1.4:** Permissions helper (hasRole, isDriver, requireTenantAccess), RBAC enforcement
- **Story 3.1:** Schema Prisma Employee, CRUD dipendenti base, Zod schema employee base

### Anti-Pattern da Evitare

- NON parsare file grandi interamente lato server al primo upload — usare parsing client-side per preview (prime 20 righe), server-side solo per insert finale
- NON fare N insert singoli per N righe — usare `prisma.createMany()` in batch per performance
- NON ignorare la validazione server-side — il client fa preview e validazione UX, ma la Server Action DEVE ri-validare con Zod
- NON passare tenantId dal file CSV — il tenant viene dalla sessione, iniettato dal Prisma client extension
- NON bloccare la UI durante validazione di file grandi — usare batch processing con yield alla UI
- NON permettere upload di file oltre 10 MB senza warning — file troppo grandi degradano l'esperienza
- NON hardcodare il separatore CSV — deve essere configurabile (virgola, punto e virgola, tab, pipe) come da NFR26
- NON usare `any` per i dati parsati — definire tipi espliciti per `RawRow`, `ParsedData`, `ColumnMapping`

### UX Pattern Import CSV (da ux-design-specification.md)

Pattern di interazione definiti nella UX specification:
1. Zona drag & drop prominente con icona + testo
2. Dopo upload: preview tabella con prime righe
3. Righe con errori evidenziate in rosso con tooltip per riga
4. Header: "X righe — Y valide, Z con errori"
5. Opzioni: "Importa solo valide" (Primary) + "Correggi errori" (Secondary) + "Annulla" (Ghost)
6. Post-import: summary "X dipendenti importati. Y scartate — Scarica report errori"

Feedback proporzionato (ux-design-specification.md): azione grande (import CSV) = summary con contatori + toast. Error recovery gentile: ogni errore suggerisce cosa fare.

### Riutilizzo per Story 5.2 (Import Rifornimenti)

La route `import/` e i componenti ImportWizard, ImportUploader sono progettati per essere riutilizzabili. Story 5.2 (Import Rifornimenti da CSV/Excel) riutilizzera:
- `ImportWizard.tsx` — con configurazione diversa per schema e campi
- `ImportUploader.tsx` — identico
- `ImportColumnMapping.tsx` — con mapping campi rifornimento
- `ImportPreview.tsx` e `ImportValidation.tsx` — con schema validazione rifornimento

Il parametro `type` (query param o prop) determina lo schema di validazione e i campi target.

### References

- [Source: architecture.md#AC-1] — Server Actions per mutations
- [Source: architecture.md#DA-1] — Multi-tenant con tenantId automatico
- [Source: architecture.md#DA-4] — Validazione Zod condivisa client/server
- [Source: architecture.md#Project Structure] — `import/` directory con ImportUploader, ImportPreview
- [Source: architecture.md#Gap Analysis] — papaparse candidato per CSV parsing
- [Source: epics.md#Story 3.2] — Acceptance criteria BDD
- [Source: prd.md#FR15] — Import dipendenti da file CSV/Excel
- [Source: prd.md#NFR4] — Import 10.000 righe in < 30 secondi
- [Source: prd.md#NFR26] — CSV encoding UTF-8 e separatori configurabili
- [Source: ux-design-specification.md#Import CSV Pattern] — UX pattern per import con preview e validazione

## Dev Agent Record

### Agent Model Used



### Debug Log References

### Completion Notes List

### File List

