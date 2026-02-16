# Story 6.1: Gestione Fattori di Emissione

Status: done

## Story

As a **Admin**,
I want **gestire la tabella dei fattori di emissione per tipo carburante con data di efficacia**,
So that **i calcoli di emissione utilizzino i fattori corretti secondo fonte ISPRA/DEFRA**.

## Acceptance Criteria

1. L'Admin puo inserire e modificare un fattore di emissione specificando tipo carburante, valore kgCO2e/litro, fonte (ISPRA/DEFRA) e data efficacia (FR35)
2. I tipi carburante includono almeno: benzina, diesel, GPL, metano, elettrico, ibrido benzina, ibrido diesel (enum FuelType)
3. Per ogni tipo carburante possono coesistere piu fattori con date di efficacia diverse (storico temporale)
4. Il sistema utilizza il fattore con data efficacia piu recente rispetto alla data del rifornimento (lookup temporale)
5. Ogni modifica e tracciata con audit trail: chi, quando, valore precedente, valore nuovo (NFR10)
6. I calcoli producono risultati deterministici e riproducibili: stesso input = stesso output (NFR21)
7. La tabella fattori e gestita tramite DataTable con sorting, filtri e paginazione
8. I dati fattori di emissione sono globali (non scoped per tenant) — accessibili a tutti i tenant in lettura, modificabili solo da Admin

## Tasks / Subtasks

- [ ] Task 1: Modello Prisma EmissionFactor e enum FuelType (AC: #1, #2, #3)
  - [ ] 1.1 Aggiungere enum `FuelType` nel Prisma schema con valori: `Benzina`, `Diesel`, `GPL`, `Metano`, `Elettrico`, `IbridoBenzina`, `IbridoDiesel`
  - [ ] 1.2 Creare modello `EmissionFactor` con campi: `id` (cuid), `fuelType` (FuelType), `value` (Decimal — kgCO2e/litro), `source` (String — es. "ISPRA 2025", "DEFRA 2025"), `effectiveDate` (DateTime), `createdAt`, `updatedAt`, `createdBy` (String — userId)
  - [ ] 1.3 Aggiungere indice composto `@@index([fuelType, effectiveDate])` per lookup performante
  - [ ] 1.4 NON aggiungere `tenantId` — i fattori di emissione sono dati globali di riferimento
  - [ ] 1.5 Aggiungere mapping SQL Server: `@@map("EmissionFactors")`, campi con `@map("snake_case")`
  - [ ] 1.6 Eseguire `npx prisma migrate dev --name add-emission-factors`
- [ ] Task 2: Schema Zod per validazione (AC: #1, #2)
  - [ ] 2.1 Creare `src/lib/schemas/emission-factor.ts` con schema `createEmissionFactorSchema`: fuelType (enum FuelType), value (number positivo, max 2 cifre decimali), source (string min 1 max 100), effectiveDate (date)
  - [ ] 2.2 Creare schema `updateEmissionFactorSchema` (partial di create + id obbligatorio)
  - [ ] 2.3 Creare schema `emissionFactorFilterSchema` per filtri DataTable: fuelType opzionale, dateRange opzionale
- [ ] Task 3: Server Actions CRUD Admin-only (AC: #1, #5, #8)
  - [ ] 3.1 Creare `src/app/(dashboard)/settings/emission-factors/actions/create-emission-factor.ts` — validazione Zod, check ruolo Admin, salvataggio, audit entry `emission_factor.created`
  - [ ] 3.2 Creare `src/app/(dashboard)/settings/emission-factors/actions/update-emission-factor.ts` — validazione Zod, check ruolo Admin, salvataggio con diff, audit entry `emission_factor.updated` con valore precedente e nuovo
  - [ ] 3.3 Creare `src/app/(dashboard)/settings/emission-factors/actions/delete-emission-factor.ts` — check ruolo Admin, soft delete o hard delete (non ci sono FK dirette), audit entry `emission_factor.deleted`
  - [ ] 3.4 Tutte le actions ritornano `ActionResult<T>` con ErrorCode tipizzato
  - [ ] 3.5 Check ruolo Admin: se l'utente non e Admin, ritornare `{ success: false, code: ErrorCode.FORBIDDEN }`
- [ ] Task 4: Logica di lookup fattore per data (AC: #4, #6)
  - [ ] 4.1 Creare funzione `getEffectiveEmissionFactor(fuelType: FuelType, referenceDate: Date)` in `src/lib/services/emission-calculator.ts`
  - [ ] 4.2 La funzione cerca il fattore con `effectiveDate <= referenceDate` ordinato per `effectiveDate DESC`, limit 1
  - [ ] 4.3 Se non esiste nessun fattore valido, ritornare errore esplicito (non null silenzioso)
  - [ ] 4.4 La funzione e pura e deterministica: dato lo stesso fuelType e referenceDate, ritorna sempre lo stesso fattore (NFR21)
  - [ ] 4.5 Scrivere test unitario in `src/lib/services/emission-calculator.test.ts` per verificare: lookup corretto con piu fattori, errore se nessun fattore, determinismo
- [ ] Task 5: Pagina DataTable fattori di emissione (AC: #7, #8)
  - [ ] 5.1 Creare `src/app/(dashboard)/settings/emission-factors/page.tsx` — Server Component che carica tutti i fattori con paginazione
  - [ ] 5.2 Creare `src/app/(dashboard)/settings/emission-factors/loading.tsx` — skeleton DataTable
  - [ ] 5.3 Creare `src/app/(dashboard)/settings/emission-factors/error.tsx` — error boundary con retry
  - [ ] 5.4 Creare `src/app/(dashboard)/settings/emission-factors/components/EmissionFactorTable.tsx` — TanStack Table + shadcn/ui DataTable con colonne: Tipo Carburante, Valore (kgCO2e/L), Fonte, Data Efficacia, azioni (modifica/elimina)
  - [ ] 5.5 Sorting su tutte le colonne, filtro per tipo carburante, paginazione 50 righe default
  - [ ] 5.6 Formattazione numeri in locale IT (virgola decimale), date in formato dd MMM yyyy
  - [ ] 5.7 Condizionare il pulsante "Aggiungi fattore" alla verifica ruolo Admin — nascondere per FM e Driver
- [ ] Task 6: Form creazione/modifica fattore (AC: #1, #2)
  - [ ] 6.1 Creare `src/app/(dashboard)/settings/emission-factors/components/EmissionFactorForm.tsx` — React Hook Form + Zod + shadcn/ui Form
  - [ ] 6.2 Campi form: Select per tipo carburante (enum FuelType), Input numerico per valore kgCO2e/L, Input testo per fonte, DatePicker per data efficacia
  - [ ] 6.3 Layout form a 2 colonne su desktop, label sopra input
  - [ ] 6.4 Inline validation on-blur con messaggi errore in italiano
  - [ ] 6.5 Modalita creazione e modifica nello stesso componente (prop `defaultValues` opzionale)
  - [ ] 6.6 Dialog shadcn/ui per apertura form (non pagina separata — i fattori sono pochi)
  - [ ] 6.7 Feedback: toast successo (auto-dismiss 5s), toast errore (persistente)
- [ ] Task 7: Audit trail per fattori di emissione (AC: #5)
  - [ ] 7.1 Verificare che `audit-service.ts` esista (creato in story precedente) oppure creare stub minimo
  - [ ] 7.2 Ogni creazione registra: `action: "emission_factor.created"`, `entityType: "EmissionFactor"`, `entityId`, `userId`, `timestamp`, `changes: [{ field, old: null, new: value }]`
  - [ ] 7.3 Ogni modifica registra: `changes: [{ field, old, new }]` per ogni campo modificato
  - [ ] 7.4 Ogni eliminazione registra: `action: "emission_factor.deleted"` con snapshot completo del fattore eliminato

## Dev Notes

### Architettura Dati Globali

I fattori di emissione sono dati di riferimento globali, non scoped per tenant. Questo e diverso dalla maggior parte delle entita del sistema. Non aggiungere `tenantId` al modello EmissionFactor. La Prisma client extension per il filtro automatico tenant NON deve applicarsi a questo modello. Verificare come escludere modelli specifici dall'extension (probabilmente tramite lista di modelli esclusi in `tenant-extension.ts`).

### FuelType Enum — Condiviso

L'enum `FuelType` sara utilizzato anche da:
- Modello `Engine` (Epic 2 — tipo combustibile motore)
- Modello `FuelRecord` (Epic 5 — tipo carburante rifornimento)
- Servizio `emission-calculator.ts` (Story 6.2 — calcolo emissioni)

Definirlo nel Prisma schema come enum nativo SQL Server e esporlo anche come costante TypeScript in `src/types/domain.ts` per uso nei componenti.

### Lookup Temporale — Pattern

Il pattern di lookup "fattore valido alla data X" e critico per la correttezza dei calcoli. La query Prisma sara:

```typescript
const factor = await prisma.emissionFactor.findFirst({
  where: {
    fuelType: fuelType,
    effectiveDate: { lte: referenceDate },
  },
  orderBy: { effectiveDate: 'desc' },
})
```

Questo garantisce che un rifornimento del 15 marzo 2025 usi il fattore con effectiveDate piu recente ma <= 15 marzo 2025. Se esistono fattori con effectiveDate 01/01/2025 e 01/07/2025, un rifornimento di marzo usera quello di gennaio.

### Determinismo (NFR21)

I calcoli devono essere deterministici. Per i fattori di emissione questo significa:
- Il valore `Decimal` nel database deve essere trattato con precisione fissa (2 decimali per kgCO2e/L)
- La logica di lookup non deve dipendere dall'ordine di inserimento ma solo dalla data efficacia
- I test devono verificare che lo stesso input produca sempre lo stesso output

### Decisioni Architetturali Rilevanti

- **DA-4 Validazione Zod**: Schema Zod condivisi client/server in `src/lib/schemas/emission-factor.ts`
- **AC-1 Pattern API Ibrido**: Server Actions per CRUD fattori (nessun Route Handler necessario)
- **AC-2 Error Handling**: ActionResult<T> pattern per ogni Server Action
- **FA-5 Tabelle Dati**: TanStack Table + shadcn/ui DataTable per lista fattori
- **FA-3 Forms**: React Hook Form + Zod + shadcn/ui Form per creazione/modifica

### Convenzioni Naming

| Elemento | Convenzione | Esempio |
|---|---|---|
| Modello Prisma | PascalCase singolare | `EmissionFactor` |
| Tabella SQL | PascalCase plurale | `@@map("EmissionFactors")` |
| Colonne SQL | snake_case | `@map("fuel_type")`, `@map("effective_date")` |
| Route | kebab-case | `settings/emission-factors/` |
| Server Actions | kebab-case in `actions/` | `create-emission-factor.ts` |
| Componenti | PascalCase | `EmissionFactorTable.tsx`, `EmissionFactorForm.tsx` |

### Valori Iniziali Fattori ISPRA (seed)

Prevedere nel seed (o nella documentazione per il seed) i fattori ISPRA 2024 come dati iniziali:

| Tipo Carburante | kgCO2e/litro | Fonte |
|---|---|---|
| Benzina | 2.392 | ISPRA 2024 |
| Diesel | 2.640 | ISPRA 2024 |
| GPL | 1.665 | ISPRA 2024 |
| Metano | 2.750 (kg) | ISPRA 2024 |
| Elettrico | 0.000 | N/A (emissioni zero al tubo) |

Nota: per veicoli elettrici il fattore e 0 (emissioni tank-to-wheel). Per ibridi si usa il fattore del combustibile primario.

### Anti-Pattern da Evitare

- NON creare Server Actions dentro page.tsx — metterle in `actions/` directory
- NON usare `any` in TypeScript — usare tipi espliciti
- NON fidarsi della validazione client — validare sempre con Zod anche nella Server Action
- NON aggiungere tenantId a EmissionFactor — e un dato globale
- NON hardcodare i valori dei fattori nel codice — devono essere in database con data efficacia

### References

- [Source: architecture.md#Data Architecture] — DA-4 Zod, modelli Prisma
- [Source: architecture.md#Implementation Patterns] — naming, structure, format patterns
- [Source: architecture.md#Project Structure] — `settings/emission-factors/` route e `emission-calculator.ts` service
- [Source: epics.md#Story 6.1] — acceptance criteria BDD
- [Source: prd.md#FR35] — fattori emissione per tipo carburante con data efficacia
- [Source: prd.md#NFR10] — audit trail per dati emission-impacting
- [Source: prd.md#NFR21] — calcoli deterministici e riproducibili
- [Source: ux-design-specification.md] — DataTable pattern, form pattern, button hierarchy

## Dev Agent Record

### Agent Model Used



### Debug Log References

### Completion Notes List

### File List

