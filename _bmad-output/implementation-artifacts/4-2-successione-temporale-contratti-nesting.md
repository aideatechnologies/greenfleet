# Story 4.2: Successione Temporale Contratti (Nesting)

Status: done

## Story

As a **Fleet Manager**,
I want **gestire la successione temporale di contratti su un veicolo**,
So that **posso tracciare l'intera storia contrattuale senza perdere i dati dei contratti precedenti**.

## Acceptance Criteria

1. Quando il FM crea un nuovo contratto per un veicolo che ha gia un contratto attivo, il sistema gestisce la successione temporale (nesting/matrioska) (FR22)
2. Il contratto precedente viene chiuso automaticamente con data fine effettiva
3. Il nuovo contratto inizia dalla data specificata
4. Lo storico contrattuale completo e visibile nella vista dettaglio veicolo
5. Non sono permesse sovrapposizioni temporali tra contratti dello stesso veicolo
6. Il FM puo modificare i contratti attivi e visualizzare quelli chiusi (sola lettura)

## Tasks / Subtasks

- [ ] Task 1: Implementare logica di successione contrattuale nel service (AC: #1, #2, #3, #5)
  - [ ] 1.1 Creare `src/lib/services/contract-service.ts` con funzione `createContractWithSuccession(prisma, input)` che:
    - Verifica se esiste un contratto ACTIVE per il veicolo
    - Se esiste, chiude il contratto precedente impostando `status: CLOSED` e `endDate` (data effettiva di chiusura = giorno precedente alla data inizio nuovo contratto, o data specificata)
    - Crea il nuovo contratto con `status: ACTIVE`
    - Esegue entrambe le operazioni in una transazione Prisma (`prisma.$transaction`)
  - [ ] 1.2 Aggiungere campo `closedAt` (DateTime?) al modello Contract nel Prisma schema per tracciare la data effettiva di chiusura (distinta da `endDate` contrattuale)
  - [ ] 1.3 Eseguire `npx prisma migrate dev --name add-contract-closed-at` per la migrazione
  - [ ] 1.4 Implementare funzione `validateNoTemporalOverlap(prisma, vehicleId, startDate, endDate?, excludeContractId?)` che verifica assenza di sovrapposizioni temporali
  - [ ] 1.5 La validazione deve considerare: un veicolo puo avere un solo contratto ACTIVE alla volta; contratti CLOSED non possono sovrapporsi tra loro; il nuovo contratto non puo iniziare prima della fine dell'ultimo contratto chiuso (se non e quello che viene chiuso dalla successione)
- [ ] Task 2: Aggiornare Server Action di creazione contratto per gestire la successione (AC: #1, #2, #3)
  - [ ] 2.1 Modificare `src/app/(dashboard)/contracts/actions/create-contract.ts` per usare `createContractWithSuccession` dal service
  - [ ] 2.2 Prima della creazione, verificare se esiste un contratto attivo e mostrare warning all'utente con i dati del contratto che verra chiuso
  - [ ] 2.3 Aggiungere parametro opzionale `confirmSuccession: boolean` all'input — se esiste contratto attivo e `confirmSuccession` e false, ritornare `ActionResult` con `code: "CONFLICT"` e dati del contratto attivo nel messaggio errore
  - [ ] 2.4 Se `confirmSuccession` e true, procedere con chiusura + creazione in transazione
  - [ ] 2.5 Chiamare `revalidatePath` per `/contracts`, `/vehicles/[vehicleId]`
- [ ] Task 3: Creare dialog di conferma successione (AC: #1, #2)
  - [ ] 3.1 Creare `src/app/(dashboard)/contracts/components/SuccessionConfirmDialog.tsx` — dialog modale che mostra:
    - Dati del contratto attivo corrente (tipo, date, fornitore/societa)
    - Avviso: "Creando questo contratto, il contratto attuale verra chiuso con data [data]"
    - Bottoni: "Annulla" (variant ghost) e "Conferma e chiudi precedente" (variant default)
  - [ ] 3.2 Usare shadcn/ui `AlertDialog` con `AlertDialogAction` e `AlertDialogCancel`
  - [ ] 3.3 Il dialog viene mostrato nel ContractForm quando il submit ritorna `code: "CONFLICT"`
- [ ] Task 4: Implementare validazione sovrapposizioni temporali (AC: #5)
  - [ ] 4.1 In `contract-service.ts`, implementare `validateNoTemporalOverlap` che query tutti i contratti del veicolo e verifica che il periodo [startDate, endDate] del nuovo contratto non si sovrapponga a nessun contratto esistente (escluso quello che verra chiuso dalla successione)
  - [ ] 4.2 La validazione si applica sia alla creazione che alla modifica (update) del contratto
  - [ ] 4.3 In caso di sovrapposizione, ritornare errore con `code: "VALIDATION"` e messaggio che indica il periodo conflittuale
  - [ ] 4.4 Per il tipo Proprietario (senza endDate), considerare il periodo come [purchaseDate, +infinito]
- [ ] Task 5: Creare componente ContractTimeline (AC: #4)
  - [ ] 5.1 Creare `src/app/(dashboard)/contracts/components/ContractTimeline.tsx` — componente che visualizza la cronologia contrattuale di un veicolo
  - [ ] 5.2 Timeline verticale con ogni contratto come nodo: tipo (badge colorato), periodo (date inizio-fine), stato (StatusBadge: ACTIVE=success, CLOSED=secondary), dettagli principali (fornitore, canone o prezzo)
  - [ ] 5.3 Contratto attivo in cima, evidenziato con bordo primary e sfondo `bg-primary/5`
  - [ ] 5.4 Contratti chiusi sotto in ordine cronologico inverso, con stile attenuato (`opacity-75`)
  - [ ] 5.5 Usare shadcn/ui `Card` per ogni nodo, con connettore verticale tra i nodi (linea `border-l-2`)
  - [ ] 5.6 Ogni nodo cliccabile: naviga a `/contracts/[id]` per il dettaglio
  - [ ] 5.7 Se non ci sono contratti, mostrare `EmptyState` con azione "Crea primo contratto"
- [ ] Task 6: Integrare ContractTimeline nella vista dettaglio veicolo (AC: #4)
  - [ ] 6.1 Aggiungere tab "Contratti" nella pagina dettaglio veicolo `src/app/(dashboard)/vehicles/[id]/page.tsx`
  - [ ] 6.2 Il tab mostra `ContractTimeline` con tutti i contratti del veicolo (attivi e chiusi)
  - [ ] 6.3 Bottone "Nuovo contratto" nel tab che naviga a `/contracts/new?vehicleId=[id]` (pre-seleziona il veicolo)
  - [ ] 6.4 Creare Server Component wrapper che carica i contratti del veicolo ordinati per `startDate DESC` (o `purchaseDate DESC` per Proprietario)
- [ ] Task 7: Gestire contratti attivi vs chiusi nella UI (AC: #6)
  - [ ] 7.1 Nella pagina dettaglio contratto `/contracts/[id]/page.tsx`, mostrare bottone "Modifica" solo per contratti ACTIVE
  - [ ] 7.2 Per contratti CLOSED, mostrare tutti i campi in sola lettura con label "Contratto chiuso" e data di chiusura
  - [ ] 7.3 Nella ContractTable (lista contratti), colonna "Stato" con StatusBadge: ACTIVE=variant "success", CLOSED=variant "secondary"
  - [ ] 7.4 Filtro stato nella ContractTable per filtrare ACTIVE/CLOSED/tutti
  - [ ] 7.5 Nella modifica contratto, impedire il cambio del tipo contratto (campo tipo disabilitato)

## Dev Notes

### Decisioni Architetturali Rilevanti

- **DA-2 Single Table Inheritance:** Il nesting/successione opera sulla stessa tabella Contract. Il campo `status` (ACTIVE/CLOSED) e il campo `closedAt` gestiscono il ciclo di vita
- **AC-1 Pattern API Ibrido:** Server Action per la mutation di successione (transazione: close + create)
- **AC-2 Error Handling:** Uso di `code: "CONFLICT"` per segnalare contratto attivo esistente, trigger per il dialog di conferma
- **FA-1 State Management:** Nessun state globale — lo stato di conferma successione e locale al form

### Logica di Successione Contrattuale

```typescript
// src/lib/services/contract-service.ts
export async function createContractWithSuccession(
  prisma: PrismaClient,
  input: ContractInput,
  confirmSuccession: boolean = false
): Promise<ActionResult<{ id: string; closedContractId?: string }>> {

  // 1. Cercare contratto attivo per il veicolo
  const activeContract = await prisma.contract.findFirst({
    where: { vehicleId: input.vehicleId, status: "ACTIVE" },
  })

  // 2. Se esiste e non confermato, ritornare CONFLICT
  if (activeContract && !confirmSuccession) {
    return {
      success: false,
      error: `Esiste gia un contratto attivo (${activeContract.type}) per questo veicolo. Conferma per chiuderlo.`,
      code: ErrorCode.CONFLICT,
    }
  }

  // 3. Validare assenza sovrapposizioni (escluso il contratto che verra chiuso)
  const overlapError = await validateNoTemporalOverlap(
    prisma,
    input.vehicleId,
    input.startDate ?? input.purchaseDate,
    input.endDate,
    activeContract?.id
  )
  if (overlapError) return overlapError

  // 4. Transazione: chiudere precedente + creare nuovo
  const result = await prisma.$transaction(async (tx) => {
    let closedContractId: string | undefined

    if (activeContract) {
      await tx.contract.update({
        where: { id: activeContract.id },
        data: {
          status: "CLOSED",
          closedAt: new Date(),
          // endDate impostata al giorno prima dell'inizio del nuovo
        },
      })
      closedContractId = activeContract.id
    }

    const newContract = await tx.contract.create({
      data: { ...input, status: "ACTIVE" },
    })

    return { id: newContract.id, closedContractId }
  })

  return { success: true, data: result }
}
```

### Validazione Sovrapposizioni Temporali

La validazione deve considerare tutti i contratti del veicolo (ACTIVE e CLOSED) per garantire integrita temporale. Per il tipo Proprietario che non ha endDate esplicita, il periodo e considerato aperto (fino alla chiusura del contratto).

```typescript
async function validateNoTemporalOverlap(
  prisma: PrismaClient,
  vehicleId: string,
  startDate: Date,
  endDate?: Date,
  excludeContractId?: string
): Promise<ActionResult<never> | null> {
  const existingContracts = await prisma.contract.findMany({
    where: {
      vehicleId,
      id: excludeContractId ? { not: excludeContractId } : undefined,
    },
    select: { id: true, type: true, startDate: true, endDate: true, purchaseDate: true, closedAt: true },
  })

  for (const contract of existingContracts) {
    const cStart = contract.startDate ?? contract.purchaseDate
    const cEnd = contract.endDate ?? contract.closedAt
    // Logica overlap: [startDate, endDate] interseca [cStart, cEnd]
    if (cStart && startDate <= (cEnd ?? new Date("9999-12-31")) && (endDate ?? new Date("9999-12-31")) >= cStart) {
      return {
        success: false,
        error: `Sovrapposizione temporale con contratto ${contract.type} (${cStart.toLocaleDateString("it-IT")} - ${cEnd?.toLocaleDateString("it-IT") ?? "in corso"})`,
        code: ErrorCode.VALIDATION,
      }
    }
  }
  return null // Nessuna sovrapposizione
}
```

### ContractTimeline UI Pattern

```tsx
// Timeline verticale con connettori
<div className="space-y-0">
  {contracts.map((contract, index) => (
    <div key={contract.id} className="relative pl-8">
      {/* Connettore verticale */}
      {index < contracts.length - 1 && (
        <div className="absolute left-3 top-10 bottom-0 w-0.5 bg-border" />
      )}
      {/* Dot indicatore */}
      <div className={cn(
        "absolute left-1.5 top-4 h-3 w-3 rounded-full border-2",
        contract.status === "ACTIVE" ? "bg-primary border-primary" : "bg-muted border-muted-foreground"
      )} />
      {/* Card contratto */}
      <Card className={cn(
        "mb-4 cursor-pointer hover:border-primary/50 transition-colors",
        contract.status === "ACTIVE" && "border-primary bg-primary/5"
      )}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <Badge variant={contractTypeBadgeVariant(contract.type)}>
              {contractTypeLabel(contract.type)}
            </Badge>
            <StatusBadge status={contract.status} />
          </div>
          <CardDescription>
            {formatDateRange(contract)}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {contractSummary(contract)}
        </CardContent>
      </Card>
    </div>
  ))}
</div>
```

### Convenzioni Naming Applicate

| Elemento | Convenzione | File |
|---|---|---|
| Service | kebab-case.ts in `services/` | `src/lib/services/contract-service.ts` |
| React Component | PascalCase.tsx | `ContractTimeline.tsx`, `SuccessionConfirmDialog.tsx` |
| Server Action | kebab-case.ts in `actions/` | `create-contract.ts` (modificato) |

### Struttura File Target

```
src/
├── lib/services/
│   └── contract-service.ts              # Business logic: successione, validazione overlap
├── app/(dashboard)/contracts/
│   ├── actions/
│   │   └── create-contract.ts           # Modificato: usa createContractWithSuccession
│   └── components/
│       ├── ContractTimeline.tsx          # Timeline cronologica contratti veicolo
│       └── SuccessionConfirmDialog.tsx   # Dialog conferma chiusura contratto precedente
├── app/(dashboard)/vehicles/
│   └── [id]/
│       └── page.tsx                     # Modificato: aggiunto tab Contratti con ContractTimeline
└── prisma/
    └── schema.prisma                    # Modificato: aggiunto closedAt al model Contract
```

### Dipendenze da Story Precedenti

- **Story 4.1:** Modello Prisma Contract con STI, enum ContractType/ContractStatus, Server Actions CRUD, ContractForm, ContractTable, pagine contratti
- **Story 3.3:** Modello Vehicle con veicoli operativi nel tenant
- **Story 1.2:** Multi-tenant con tenantId e Prisma extension

### Flusso UX della Successione

1. FM accede a `/contracts/new` e seleziona tipo contratto
2. FM compila il form e seleziona un veicolo che ha gia un contratto attivo
3. FM clicca "Salva contratto"
4. Server Action rileva contratto attivo → ritorna `CONFLICT` con dati contratto esistente
5. UI mostra `SuccessionConfirmDialog` con dettagli del contratto che verra chiuso
6. FM clicca "Conferma e chiudi precedente"
7. Server Action riesegue con `confirmSuccession: true` → transazione: chiude vecchio + crea nuovo
8. Redirect a dettaglio nuovo contratto con toast "Contratto creato. Contratto precedente chiuso."

### Anti-Pattern da Evitare

- NON permettere la cancellazione fisica di contratti — solo chiusura (soft delete con CLOSED)
- NON permettere sovrapposizioni temporali tra contratti dello stesso veicolo
- NON mettere la business logic di successione nella Server Action — delegare al service
- NON usare `any` per i tipi — usare tipi espliciti
- NON chiudere il contratto precedente senza conferma esplicita dell'utente
- NON permettere la modifica di contratti CLOSED — solo visualizzazione

### References

- [Source: architecture.md#DA-2] — Single Table Inheritance per contratti polimorfici
- [Source: architecture.md#AC-1] — Server Actions per mutations
- [Source: architecture.md#AC-2] — ActionResult<T> pattern, ErrorCode.CONFLICT
- [Source: epics.md#Story 4.2] — Acceptance criteria BDD (nesting/matrioska)
- [Source: prd.md#FR22] — Successione temporale contratti (nesting/matrioska)
- [Source: ux-design-specification.md#StatusBadge] — Badge stato per contratti attivi/chiusi

## Dev Agent Record

### Agent Model Used



### Debug Log References

### Completion Notes List

### File List
