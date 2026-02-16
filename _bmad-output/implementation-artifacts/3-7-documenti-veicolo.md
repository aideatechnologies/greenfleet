# Story 3.7: Documenti Veicolo

Status: done

## Story

As a **Fleet Manager**,
I want **gestire i documenti associati a un veicolo (assicurazione, revisione, etc.)**,
So that **posso tracciare le scadenze documentali e mantenere la conformita della flotta**.

## Acceptance Criteria

1. Il documento viene associato al veicolo con tipo, data scadenza e file allegato (FR20)
2. I documenti in scadenza sono evidenziati tramite StatusBadge (warning per scadenza entro 30 giorni, destructive per scaduto)
3. Il FM puo visualizzare, modificare e rimuovere documenti (CRUD completo)
4. I tipi documento includono almeno: assicurazione, revisione, bollo, carta di circolazione
5. I documenti sono accessibili dalla vista dettaglio veicolo in un tab dedicato "Documenti"

## Tasks / Subtasks

- [ ] Task 1: Creare modello VehicleDocument nel Prisma schema (AC: #1, #4)
  - [ ] 1.1 Aggiungere model `VehicleDocument` in `prisma/schema.prisma` con campi: id (cuid), tenantId, vehicleId (FK a TenantVehicle), documentType (enum DocumentType), description (opzionale), expiryDate (DateTime), fileName, fileUrl, fileMimeType, fileSize (Int), createdAt, updatedAt, createdBy (FK a User)
  - [ ] 1.2 Creare enum `DocumentType` in Prisma con valori: `ASSICURAZIONE`, `REVISIONE`, `BOLLO`, `CARTA_CIRCOLAZIONE`, `ALTRO`
  - [ ] 1.3 Aggiungere relazione `documents VehicleDocument[]` nel model TenantVehicle
  - [ ] 1.4 Creare indice `idx_vehicle_documents_tenant_id` su tenantId e `idx_vehicle_documents_vehicle_id` su vehicleId
  - [ ] 1.5 Eseguire `npx prisma migrate dev --name add-vehicle-documents`
- [ ] Task 2: Creare schema Zod per validazione documenti (AC: #1, #4)
  - [ ] 2.1 Creare `src/lib/schemas/vehicle-document.ts` con `createDocumentSchema`: documentType (enum), description (string opzionale, max 500 char), expiryDate (date, deve essere futura per nuovi documenti), file (File, max 10MB, tipi: pdf, jpg, png)
  - [ ] 2.2 Creare `updateDocumentSchema`: stessi campi di create ma tutti opzionali (partial update)
  - [ ] 2.3 Creare `documentFilterSchema`: vehicleId, documentType (opzionale), expiryStatus (opzionale: all, expiring, expired)
- [ ] Task 3: Creare document service per business logic (AC: #1, #3)
  - [ ] 3.1 Creare `src/lib/services/vehicle-document-service.ts` con funzioni: `getDocumentsByVehicle(prisma, vehicleId, filters)`, `getDocumentById(prisma, id)`, `createDocument(prisma, input)`, `updateDocument(prisma, id, input)`, `deleteDocument(prisma, id)`
  - [ ] 3.2 `getDocumentsByVehicle` ritorna documenti ordinati per expiryDate ASC (scadenze piu vicine prima)
  - [ ] 3.3 Aggiungere funzione helper `getExpiryStatus(expiryDate)` che ritorna: `expired` se passata, `warning` se entro 30 giorni, `ok` altrimenti
  - [ ] 3.4 Aggiungere funzione `getExpiringDocuments(prisma, tenantId, daysAhead)` per query documenti in scadenza (utile per notifiche dashboard)
- [ ] Task 4: Gestione file upload (AC: #1)
  - [ ] 4.1 Creare `src/lib/services/file-upload-service.ts` con funzione `uploadFile(file, path)` che salva il file su filesystem locale in `storage/documents/{tenantId}/{vehicleId}/`
  - [ ] 4.2 Implementare validazione file: max 10MB, tipi ammessi: application/pdf, image/jpeg, image/png
  - [ ] 4.3 Generare nome file univoco con UUID per evitare collisioni (preservando estensione originale)
  - [ ] 4.4 Creare funzione `deleteFile(filePath)` per rimozione file su cancellazione documento
  - [ ] 4.5 Creare Route Handler `src/app/api/documents/[id]/download/route.ts` per download sicuro del file (verifica sessione + tenant access prima di servire il file)
  - [ ] 4.6 Aggiungere `storage/` a `.gitignore`
- [ ] Task 5: Creare Server Actions per CRUD documenti (AC: #1, #3)
  - [ ] 5.1 Creare `src/app/(dashboard)/vehicles/[id]/actions/create-document.ts` — Server Action che: valida input Zod, verifica RBAC (Admin o FM sul tenant), gestisce upload file, salva documento via service, ritorna ActionResult<VehicleDocument>
  - [ ] 5.2 Creare `src/app/(dashboard)/vehicles/[id]/actions/update-document.ts` — Server Action che: valida input Zod, verifica RBAC, aggiorna documento (opzionalmente sostituisce file), ritorna ActionResult<VehicleDocument>
  - [ ] 5.3 Creare `src/app/(dashboard)/vehicles/[id]/actions/delete-document.ts` — Server Action che: verifica RBAC, rimuove file fisico, cancella record, ritorna ActionResult<void>. Richiede ConfirmDialog prima dell'esecuzione
  - [ ] 5.4 Ogni Server Action logga l'operazione con Pino (info level) e traccia in audit se necessario
- [ ] Task 6: Creare componenti UI per tab Documenti (AC: #2, #3, #5)
  - [ ] 6.1 Creare `src/app/(dashboard)/vehicles/[id]/components/DocumentTab.tsx` — container del tab Documenti nella vista dettaglio veicolo. React Server Component che carica documenti dal service
  - [ ] 6.2 Creare `src/app/(dashboard)/vehicles/[id]/components/DocumentTable.tsx` — DataTable con TanStack Table + shadcn/ui: colonne tipo (con icona), descrizione, scadenza, stato (StatusBadge), dimensione file, azioni (download, modifica, elimina). Sorting per scadenza default
  - [ ] 6.3 Creare `src/app/(dashboard)/vehicles/[id]/components/DocumentForm.tsx` — form per creazione/modifica documento con React Hook Form + Zod + shadcn/ui Form. Campi: tipo (Select con enum DocumentType), descrizione (Textarea opzionale), scadenza (DatePicker), file (input file con drag-and-drop area). Layout 2 colonne desktop, label sopra input
  - [ ] 6.4 Implementare StatusBadge per stato scadenza nel DocumentTable: `expired` → variant destructive ("Scaduto"), `warning` → variant warning ("In scadenza"), `ok` → variant default ("Valido")
  - [ ] 6.5 Implementare EmptyState quando non ci sono documenti: messaggio "Nessun documento" + bottone "Aggiungi documento"
  - [ ] 6.6 Implementare Dialog per form creazione/modifica documento (shadcn/ui Dialog)
  - [ ] 6.7 Implementare ConfirmDialog per conferma eliminazione documento
- [ ] Task 7: Integrare tab Documenti nel dettaglio veicolo (AC: #5)
  - [ ] 7.1 Aggiungere tab "Documenti" nel componente di dettaglio veicolo `src/app/(dashboard)/vehicles/[id]/page.tsx` usando shadcn/ui Tabs
  - [ ] 7.2 Il tab mostra il conteggio documenti e un badge warning/destructive se ci sono documenti scaduti o in scadenza
  - [ ] 7.3 Implementare loading skeleton per il tab documenti
  - [ ] 7.4 Verificare che il Driver possa visualizzare i documenti del proprio veicolo in sola lettura (nessun bottone CRUD visibile)

## Dev Notes

### Schema Prisma — VehicleDocument

```prisma
enum DocumentType {
  ASSICURAZIONE
  REVISIONE
  BOLLO
  CARTA_CIRCOLAZIONE
  ALTRO
}

model VehicleDocument {
  id           String       @id @default(cuid())
  tenantId     String       @map("tenant_id")
  vehicleId    String       @map("vehicle_id")
  documentType DocumentType @map("document_type")
  description  String?
  expiryDate   DateTime     @map("expiry_date") @db.Date
  fileName     String       @map("file_name")
  fileUrl      String       @map("file_url")
  fileMimeType String       @map("file_mime_type")
  fileSize     Int          @map("file_size")
  createdBy    String       @map("created_by")
  createdAt    DateTime     @default(now()) @map("created_at")
  updatedAt    DateTime     @updatedAt @map("updated_at")

  vehicle      TenantVehicle @relation(fields: [vehicleId], references: [id])
  creator      User          @relation(fields: [createdBy], references: [id])

  @@index([tenantId], map: "idx_vehicle_documents_tenant_id")
  @@index([vehicleId], map: "idx_vehicle_documents_vehicle_id")
  @@index([expiryDate], map: "idx_vehicle_documents_expiry_date")
  @@map("VehicleDocuments")
}
```

### Logica Scadenze StatusBadge

```typescript
function getExpiryStatus(expiryDate: Date): "expired" | "warning" | "ok" {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const expiry = new Date(expiryDate)
  expiry.setHours(0, 0, 0, 0)

  if (expiry < today) return "expired"

  const thirtyDaysFromNow = new Date(today)
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)

  if (expiry <= thirtyDaysFromNow) return "warning"
  return "ok"
}

// Mapping StatusBadge
const expiryStatusMap = {
  expired: { variant: "destructive", label: "Scaduto" },
  warning: { variant: "warning", label: "In scadenza" },
  ok: { variant: "default", label: "Valido" },
}
```

### File Upload — Pattern

Il file upload segue un pattern semplificato per MVP con storage locale su filesystem. Il file viene caricato tramite FormData nella Server Action. Per produzione futura, il `file-upload-service.ts` puo essere sostituito con un adapter per S3/Azure Blob Storage senza modificare le Server Actions.

```typescript
// Server Action con FormData per file upload
"use server"
export async function createDocument(formData: FormData): Promise<ActionResult<VehicleDocument>> {
  const session = await auth.api.getSession({ headers: headers() })
  if (!session) return { success: false, error: "Non autenticato", code: "UNAUTHORIZED" }

  const file = formData.get("file") as File
  const documentType = formData.get("documentType") as string
  const expiryDate = formData.get("expiryDate") as string
  // ... validazione Zod, upload file, salvataggio DB
}
```

### Struttura File Target

```
src/
├── app/
│   └── (dashboard)/
│       └── vehicles/
│           └── [id]/
│               ├── page.tsx             # Aggiungere tab "Documenti"
│               ├── actions/
│               │   ├── create-document.ts
│               │   ├── update-document.ts
│               │   └── delete-document.ts
│               └── components/
│                   ├── DocumentTab.tsx
│                   ├── DocumentTable.tsx
│                   └── DocumentForm.tsx
├── lib/
│   ├── schemas/
│   │   └── vehicle-document.ts
│   └── services/
│       ├── vehicle-document-service.ts
│       └── file-upload-service.ts
├── app/
│   └── api/
│       └── documents/
│           └── [id]/
│               └── download/
│                   └── route.ts         # Route Handler per download sicuro
└── components/
    └── data-display/
        └── StatusBadge.tsx              # Se non gia creato in story precedenti
```

### Decisioni Architetturali Rilevanti

- **DA-1 Multi-Tenant:** tenantId su VehicleDocument, filtro automatico via Prisma extension
- **DA-4 Validazione Zod:** Schema Zod condivisi per form (React Hook Form) e Server Action
- **AC-1 Pattern API Ibrido:** Server Actions per CRUD documenti, Route Handler solo per download file
- **AC-2 Error Handling:** ActionResult<T> su ogni Server Action
- **FA-3 Forms:** React Hook Form + Zod + shadcn/ui Form per DocumentForm
- **FA-5 DataTable:** TanStack Table + shadcn/ui DataTable per DocumentTable
- **AS-2 RBAC:** FM puo gestire documenti sul proprio tenant, Driver solo lettura
- **FA-1 State Management:** RSC per read, Server Actions per write

### Dipendenze da Story Precedenti

- **Story 1.1:** Scaffold progetto, Better Auth, middleware, ActionResult<T>, struttura directory
- **Story 1.2:** Prisma client extension per auto-filter tenantId
- **Story 1.3:** RLS SQL Server
- **Story 1.4:** Permissions helper (hasRole, canAccess, isTenantAdmin)
- **Story 3.3:** TenantVehicle model e pagina dettaglio veicolo con sistema a tabs

### Anti-Pattern da Evitare

- NON salvare file nel database (BLOB) — usare filesystem o object storage con riferimento URL nel DB
- NON servire file direttamente da URL statico senza verifica sessione/tenant — usare Route Handler con auth check
- NON validare solo il tipo MIME dal campo file — verificare anche l'estensione e, se possibile, il magic number del file
- NON permettere upload senza limiti di dimensione — imporre max 10MB lato client e server
- NON mostrare pulsanti CRUD al Driver — verificare il ruolo nella UI e nelle Server Actions
- NON usare `any` per il tipo file — usare `File` o `Blob` con type guard
- NON creare Server Actions dentro page.tsx — metterle in `actions/` directory
- NON fare business logic nei componenti — delegare a `vehicle-document-service.ts`

### Formattazione e UX

- Date formattate in locale IT: `dd MMM yyyy` (es. "15 mar 2026")
- Dimensione file formattata human-readable: KB, MB
- Icone per tipo documento: assicurazione (Shield), revisione (Wrench), bollo (Receipt), carta circolazione (FileText), altro (File)
- StatusBadge con colore semantico coerente con il design system Greenfleet
- EmptyState con illustrazione + CTA "Aggiungi primo documento"

### References

- [Source: architecture.md#DA-1] — Multi-tenant con tenantId pervasivo
- [Source: architecture.md#AC-1] — Server Actions per mutations, Route Handlers per download
- [Source: architecture.md#Structure Patterns] — Feature-based dentro App Router
- [Source: architecture.md#Project Structure] — vehicles/[id]/ directory
- [Source: epics.md#Story 3.7] — Acceptance criteria BDD
- [Source: prd.md#FR20] — Documenti associati a veicolo
- [Source: ux-design-specification.md] — StatusBadge component, EmptyState component

## Dev Agent Record

### Agent Model Used



### Debug Log References

### Completion Notes List

### File List

