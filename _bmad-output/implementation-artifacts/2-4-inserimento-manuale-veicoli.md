# Story 2.4: Inserimento Manuale Veicoli

Status: done

## Story

As a **Admin**,
I want **integrare manualmente dati di veicoli non presenti in InfocarData**,
So that **posso gestire nel catalogo anche veicoli speciali o non ancora censiti**.

## Acceptance Criteria

1. Il veicolo viene salvato nel catalogo globale con gli stessi campi dei veicoli importati da InfocarData (FR4)
2. Il form utilizza React Hook Form + Zod per validazione frontend e backend (FA-3, DA-4)
3. Il form ha layout a 2 colonne su desktop con label sopra input
4. I campi obbligatori sono validati con inline validation on-blur
5. Il veicolo manuale e distinguibile da quelli importati tramite un flag sorgente (`source: "manual" | "infocardata"`)
6. I motori (1:N) possono essere aggiunti inline nel form del veicolo
7. I campi esposti sono conformi a FR5: marca, modello, allestimento, carrozzeria, normativa anti-inquinamento, motori (tipo combustibile, cilindrata, potenza KW/CV), emissioni CO2 g/km (WLTP/NEDC), consumi, capacita serbatoio, flag ibrido

## Tasks / Subtasks

- [ ] Task 1: Creare schema Zod per inserimento manuale veicolo (AC: #1, #2, #4, #5, #7)
  - [ ] 1.1 Creare `src/lib/schemas/vehicle.ts` con `manualVehicleSchema` — campi: marca (required), modello (required), allestimento (optional), carrozzeria (optional), normativaAntiInquinamento (optional), capacitaSerbatoioLitri (optional, number > 0), flagIbrido (boolean, default false), source (literal "manual"), emissioniCo2WltpGKm (optional, number >= 0), emissioniCo2NedcGKm (optional, number >= 0)
  - [ ] 1.2 Creare `manualEngineSchema` nello stesso file — campi: tipoCombustibile (required, enum FuelType), cilindrataCc (optional, number > 0), potenzaKw (optional, number > 0), potenzaCv (optional, number > 0), co2GKm (optional, number >= 0), consumoL100Km (optional, number > 0)
  - [ ] 1.3 Comporre `manualVehicleWithEnginesSchema` che include `engines: z.array(manualEngineSchema).min(1, "Almeno un motore richiesto")`
  - [ ] 1.4 Esportare i tipi TypeScript inferiti (`ManualVehicleInput`, `ManualEngineInput`) con `z.infer<>`
  - [ ] 1.5 Verificare che lo schema Zod sia importabile sia da componenti client che da Server Action (nessun import server-only)
- [ ] Task 2: Creare componente form veicolo manuale (AC: #2, #3, #4, #6)
  - [ ] 2.1 Creare `src/app/(dashboard)/vehicles/components/ManualVehicleForm.tsx` — componente client (`"use client"`) con React Hook Form + `@hookform/resolvers/zod` + `manualVehicleWithEnginesSchema`
  - [ ] 2.2 Implementare layout grid 2 colonne desktop (`grid grid-cols-1 md:grid-cols-2 gap-6`) con colonna singola su mobile
  - [ ] 2.3 Usare shadcn/ui `Form`, `FormField`, `FormItem`, `FormLabel`, `FormControl`, `FormMessage` per ogni campo
  - [ ] 2.4 Label sopra input con asterisco (*) per campi obbligatori, helper text in `text-muted-foreground` sotto input
  - [ ] 2.5 Configurare `mode: "onBlur"` in `useForm()` per inline validation on-blur
  - [ ] 2.6 Usare shadcn/ui `Input` per campi testo/numero, `Select` per enum (carrozzeria, normativa), `Switch` per flag ibrido
  - [ ] 2.7 Sezione "Dati Veicolo" (marca, modello, allestimento, carrozzeria, normativa, capacita serbatoio, flag ibrido, emissioni WLTP, emissioni NEDC) come prima parte del form
  - [ ] 2.8 Footer form con bottoni: "Annulla" (variant ghost, naviga indietro) e "Salva veicolo" (variant default/primary)
- [ ] Task 3: Implementare sezione motori inline nel form (AC: #6, #7)
  - [ ] 3.1 Usare `useFieldArray` di React Hook Form per gestire array `engines` dinamicamente
  - [ ] 3.2 Sezione "Motori" sotto la sezione dati veicolo, separata da `Separator` shadcn/ui
  - [ ] 3.3 Ogni motore e un blocco con grid 2 colonne: tipo combustibile (Select, required), cilindrata cc (Input number), potenza KW (Input number), potenza CV (Input number), CO2 g/km (Input number), consumo l/100km (Input number)
  - [ ] 3.4 Bottone "Aggiungi motore" (variant outline, icona Plus) sotto l'ultimo motore — aggiunge un nuovo blocco vuoto
  - [ ] 3.5 Ogni blocco motore ha un bottone "Rimuovi" (variant ghost, icona Trash2) — disabilitato se c'e un solo motore (minimo 1)
  - [ ] 3.6 Il primo motore viene aggiunto automaticamente al mount del form (default values con 1 engine vuoto)
  - [ ] 3.7 Validazione inline on-blur per ogni campo motore, errore visualizzato sotto il campo corrispondente
- [ ] Task 4: Creare Server Action per creazione veicolo manuale (AC: #1, #2, #5)
  - [ ] 4.1 Creare `src/app/(dashboard)/vehicles/actions/create-manual-vehicle.ts` con `"use server"` — riceve FormData o typed input
  - [ ] 4.2 Validare input con `manualVehicleWithEnginesSchema.safeParse()` server-side — ritornare `ActionResult` con `code: "VALIDATION"` se fallisce
  - [ ] 4.3 Verificare autenticazione e ruolo Admin dalla sessione Better Auth — ritornare `ActionResult` con `code: "UNAUTHORIZED"` o `code: "FORBIDDEN"` se non autorizzato
  - [ ] 4.4 Creare il veicolo nel database con Prisma: `prisma.vehicle.create({ data: { ...vehicleData, source: "manual", engines: { create: enginesData } } })` — il campo `source` distingue veicoli manuali da importati
  - [ ] 4.5 Ritornare `ActionResult<{ id: string }>` con `success: true` e l'ID del veicolo creato
  - [ ] 4.6 In caso di errore database, loggare con Pino e ritornare `ActionResult` con `code: "INTERNAL"`
  - [ ] 4.7 Chiamare `revalidatePath("/vehicles")` dopo creazione per aggiornare la lista veicoli
- [ ] Task 5: Creare pagina per nuovo veicolo manuale (AC: #3)
  - [ ] 5.1 Creare `src/app/(dashboard)/vehicles/new/page.tsx` — Server Component che renderizza `ManualVehicleForm`
  - [ ] 5.2 Pagina con titolo "Nuovo veicolo (inserimento manuale)" e breadcrumb `Dashboard > Veicoli > Nuovo`
  - [ ] 5.3 Contenuto centrato con `max-w-4xl mx-auto` per non estendersi troppo su schermi larghi
- [ ] Task 6: Gestire submit del form e feedback utente (AC: #1, #2, #4)
  - [ ] 6.1 Nel `ManualVehicleForm`, usare `useActionState` (React 19) o `useTransition` per gestire pending state durante il submit
  - [ ] 6.2 Durante il submit, bottone "Salva veicolo" mostra spinner e testo "Salvataggio..." (disabilitato)
  - [ ] 6.3 Su successo: toast con `sonner` ("Veicolo creato con successo") + redirect a `/vehicles` o `/vehicles/[id]`
  - [ ] 6.4 Su errore di validazione server: mappare errori Zod sui campi corrispondenti del form (inline errors)
  - [ ] 6.5 Su errore server generico: toast errore persistente ("Errore durante il salvataggio. Riprova.")
- [ ] Task 7: Aggiungere campo source al modello Vehicle (AC: #5)
  - [ ] 7.1 Verificare che il modello Prisma `Vehicle` includa il campo `source` di tipo `String` con valori `"manual"` o `"infocardata"` (default `"infocardata"`)
  - [ ] 7.2 Se il campo non esiste nello schema Prisma, aggiungerlo e creare una migrazione `npx prisma migrate dev --name add-vehicle-source`
  - [ ] 7.3 Verificare che la lista veicoli mostri un indicatore visivo (badge o icona) per veicoli manuali vs importati

## Dev Notes

### Campi Veicolo da FR5 (stessi per importati e manuali)

Il veicolo nel catalogo deve esporre:
- **Identificazione:** marca, modello, allestimento
- **Dati tecnici:** carrozzeria, normativa anti-inquinamento, capacita serbatoio, flag ibrido
- **Emissioni:** CO2 g/km WLTP, CO2 g/km NEDC (almeno uno dei due obbligatorio per veicoli importati, entrambi opzionali per manuali)
- **Motori (1:N):** tipo combustibile, cilindrata cc, potenza KW, potenza CV, CO2 g/km per motore, consumo l/100km
- **Immagine:** non applicabile per veicoli manuali (nessun codice Codall) — usare placeholder

### Decisioni Architetturali Rilevanti

- **DA-4 Validazione Zod:** Schema Zod in `src/lib/schemas/vehicle.ts` condiviso tra form (client) e Server Action (server). Zod 3.x
- **FA-3 Forms:** React Hook Form + Zod resolver + shadcn/ui Form components. Mode `onBlur` per inline validation
- **AC-1 Pattern API Ibrido:** Server Action per la mutation di creazione veicolo. NON Route Handler
- **AC-2 Error Handling:** ActionResult<T> pattern: `{ success: true, data } | { success: false, error, code }`
- **DA-3 Multi-Engine:** Tabella `Engine` separata con FK a `Vehicle`. Relazione 1:N gestita con `useFieldArray` nel form e `create` nested in Prisma

### ActionResult<T> Pattern

```typescript
import { ActionResult, ErrorCode } from "@/types/action-result"

// Server Action ritorna sempre ActionResult
export async function createManualVehicle(
  input: ManualVehicleInput
): Promise<ActionResult<{ id: string }>> {
  const parsed = manualVehicleWithEnginesSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: "Dati non validi", code: ErrorCode.VALIDATION }
  }
  // ...
  return { success: true, data: { id: vehicle.id } }
}
```

### Layout Form 2 Colonne

```tsx
<form className="space-y-8">
  {/* Sezione Dati Veicolo */}
  <div>
    <h3 className="text-lg font-medium">Dati Veicolo</h3>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
      {/* FormField per ogni campo */}
    </div>
  </div>

  <Separator />

  {/* Sezione Motori */}
  <div>
    <h3 className="text-lg font-medium">Motori</h3>
    {fields.map((field, index) => (
      <div key={field.id} className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4 p-4 border rounded-lg">
        {/* Campi motore */}
      </div>
    ))}
    <Button type="button" variant="outline" onClick={() => append(emptyEngine)}>
      <Plus className="mr-2 h-4 w-4" /> Aggiungi motore
    </Button>
  </div>
</form>
```

### useFieldArray per Motori Dinamici

```tsx
const { fields, append, remove } = useFieldArray({
  control: form.control,
  name: "engines",
})

// Default: 1 motore vuoto
const defaultValues = {
  // ...campi veicolo...
  engines: [{ tipoCombustibile: "", cilindrataCc: undefined, potenzaKw: undefined, potenzaCv: undefined, co2GKm: undefined, consumoL100Km: undefined }]
}
```

### Enum FuelType (da usare nel Select motore)

```typescript
// src/types/domain.ts (o schema Prisma enum)
enum FuelType {
  BENZINA = "benzina",
  DIESEL = "diesel",
  GPL = "gpl",
  METANO = "metano",
  ELETTRICO = "elettrico",
  IBRIDO_BENZINA = "ibrido_benzina",
  IBRIDO_DIESEL = "ibrido_diesel",
}
```

### Convenzioni Naming Applicate

| Elemento | Convenzione | File |
|---|---|---|
| Zod schema | kebab-case.ts in `schemas/` | `src/lib/schemas/vehicle.ts` |
| React Component | PascalCase.tsx | `ManualVehicleForm.tsx` |
| Server Action | kebab-case.ts in `actions/` | `create-manual-vehicle.ts` |
| Pagina | page.tsx nella route | `src/app/(dashboard)/vehicles/new/page.tsx` |

### Struttura File Target

```
src/
├── lib/schemas/
│   └── vehicle.ts               # Zod schema manualVehicleSchema + manualEngineSchema
├── app/(dashboard)/vehicles/
│   ├── new/
│   │   └── page.tsx             # Pagina nuovo veicolo manuale (Server Component)
│   ├── actions/
│   │   └── create-manual-vehicle.ts  # Server Action creazione veicolo
│   └── components/
│       └── ManualVehicleForm.tsx     # Form component (Client Component)
└── types/
    └── domain.ts                # FuelType enum (se non gia definito)
```

### Dipendenze da Story Precedenti

- **Story 1.1:** Scaffold progetto con React Hook Form, Zod, shadcn/ui Form components installati
- **Story 2.1:** Schema Prisma `Vehicle` e `Engine` con campi da FR5 gia creati
- **Se Story 2.1 non ancora implementata:** il campo `source` va aggiunto al modello Vehicle durante questa story

### Validazione UX (da ux-design-specification.md)

- Asterisco (*) per campi obbligatori, nessun testo "opzionale" per gli altri
- Helper text sotto input in `text-muted-foreground` per contesto (es. "Cilindrata in cc", "Potenza in KW")
- Errore inline sostituisce l'helper text, in `text-destructive`, sempre con suggerimento di correzione
- Validazione: on-blur per singolo campo, on-submit per form completo. Mai on-change
- Numeri formattati in locale IT (1.234,56) dove applicabile

### Anti-Pattern da Evitare

- NON creare la Server Action dentro `page.tsx` — metterla in `actions/` directory
- NON usare `any` per i tipi — usare tipi espliciti o `z.infer<>`
- NON validare solo client-side — validare sempre anche server-side con lo stesso schema Zod
- NON usare `onSubmit` HTML standard — usare il pattern React Hook Form `handleSubmit` + Server Action
- NON hardcodare i valori FuelType — usare l'enum da `types/domain.ts`

### References

- [Source: architecture.md#FA-3] — React Hook Form + Zod + shadcn/ui Form
- [Source: architecture.md#DA-4] — Validazione Zod condivisa client/server
- [Source: architecture.md#DA-3] — Multi-Engine (Vehicle → Engine 1:N)
- [Source: architecture.md#AC-1] — Server Actions per mutations
- [Source: architecture.md#AC-2] — ActionResult<T> pattern
- [Source: epics.md#Story 2.4] — Acceptance criteria BDD
- [Source: prd.md#FR4] — Inserimento manuale veicoli non censiti
- [Source: prd.md#FR5] — Campi esposti per ogni veicolo nel catalogo
- [Source: ux-design-specification.md#Form Pattern] — Grid 2 colonne, label sopra input, validation on-blur

## Dev Agent Record

### Agent Model Used



### Debug Log References

### Completion Notes List

### File List

