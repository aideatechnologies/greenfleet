# Story 2.3: Integrazione Immagini Codall

Status: done

## Story

As a **Admin**,
I want **che il sistema recuperi automaticamente l'immagine del veicolo dal servizio Codall**,
So that **ogni veicolo nel catalogo abbia una rappresentazione visiva per facilitare l'identificazione**.

## Acceptance Criteria

1. L'immagine del veicolo viene recuperata da Codall a partire dal codice allestimento e data di registrazione (FR2)
2. L'immagine e visibile nelle viste di dettaglio tramite il componente VehicleHeader (FR44)
3. In caso di timeout o immagine non disponibile, viene mostrata un'icona placeholder (NFR24)
4. Le immagini sono cachate localmente per evitare richieste ripetute
5. Il Route Handler proxy per Codall gestisce errori e retry con graceful degradation

## Tasks / Subtasks

- [ ] Task 1: Creare Codall client (AC: #1)
  - [ ] 1.1 Creare `src/lib/integrations/codall/client.ts` con funzione `buildCodallImageUrl(codall: string, registrationDate: Date): string` che costruisce l'URL immagine secondo il pattern `ANNOXX+MESEXX+CODALL`
  - [ ] 1.2 Creare `src/lib/integrations/codall/types.ts` con i tipi `CodallImageRequest`, `CodallImageResponse` e `CodallConfig`
  - [ ] 1.3 Implementare funzione `fetchCodallImage(codall: string, registrationDate: Date): Promise<CodallImageResult>` che effettua la richiesta HTTP al servizio Codall
  - [ ] 1.4 Leggere la base URL Codall dalla variabile d'ambiente `CODALL_API_URL` (definita in `.env.local`)
  - [ ] 1.5 Aggiungere `CODALL_API_URL` in `.env.example` con commento esplicativo del formato

- [ ] Task 2: Creare fallback handler per immagini non disponibili (AC: #3)
  - [ ] 2.1 Creare `src/lib/integrations/codall/fallback.ts` con funzione `getCodallFallbackResponse(): Response` che ritorna l'immagine placeholder come Response HTTP con Content-Type `image/svg+xml` o `image/png`
  - [ ] 2.2 Implementare logica di classificazione errore: `isRetryableError(error: unknown): boolean` per distinguere errori transitori (timeout, 5xx) da errori permanenti (404, 400)
  - [ ] 2.3 Log degli errori con Pino: livello `warn` per fallback attivato (Codall non disponibile, timeout), livello `error` per errori imprevisti (network, parsing)

- [ ] Task 3: Creare Route Handler proxy (AC: #1, #4, #5)
  - [ ] 3.1 Creare `src/app/api/images/vehicle/[codall]/route.ts` con handler GET
  - [ ] 3.2 Estrarre il parametro `codall` dalla route e il parametro `registrationDate` dalla query string (`?date=YYYY-MM`)
  - [ ] 3.3 Validare i parametri di input con Zod (codall non vuoto, registrationDate formato valido)
  - [ ] 3.4 Chiamare `fetchCodallImage` e ritornare l'immagine con header `Content-Type` appropriato (image/jpeg, image/png)
  - [ ] 3.5 In caso di errore, chiamare `getCodallFallbackResponse()` per ritornare il placeholder
  - [ ] 3.6 Impostare header di cache HTTP sulla Response: `Cache-Control: public, max-age=86400, stale-while-revalidate=604800` (1 giorno cache, 7 giorni stale)
  - [ ] 3.7 Implementare retry logic: massimo 1 retry per errori transitori con backoff di 500ms
  - [ ] 3.8 Proteggere la route con autenticazione (verificare sessione Better Auth)

- [ ] Task 4: Implementare strategia di caching immagini (AC: #4)
  - [ ] 4.1 Implementare cache in-memory con Map<string, { buffer: Buffer; contentType: string; cachedAt: number }> con TTL configurabile (default 24h)
  - [ ] 4.2 La chiave cache e composta da `codall + registrationDate` per unicita
  - [ ] 4.3 Implementare `getFromCache(key: string): CachedImage | null` e `setInCache(key: string, image: CachedImage): void`
  - [ ] 4.4 Implementare cleanup periodico delle entry scadute (lazy eviction al momento dell'accesso)
  - [ ] 4.5 Definire costante `CODALL_CACHE_TTL_MS` in `src/lib/utils/constants.ts` (default: 86400000 = 24h)
  - [ ] 4.6 Il Route Handler controlla la cache prima di effettuare la richiesta a Codall

- [ ] Task 5: Creare componente VehicleHeader (AC: #2)
  - [ ] 5.1 Creare `src/components/data-display/VehicleHeader.tsx` come componente shared (usato da dettaglio veicolo catalogo, dettaglio veicolo operativo, dashboard Driver)
  - [ ] 5.2 Implementare layout CSS Grid a 3 colonne: foto Codall (sinistra, 160x120px), dati chiave (centro), KPI sidebar (destra)
  - [ ] 5.3 La foto usa il tag `<img>` puntando al Route Handler proxy: `/api/images/vehicle/{codall}?date={YYYY-MM}`
  - [ ] 5.4 Dati chiave: targa (formattata mono uppercase), marca/modello/allestimento, stato (StatusBadge), dipendente assegnato (link navigabile), motore principale (combustibile, cilindrata, potenza)
  - [ ] 5.5 KPI sidebar: emissioni tCO2e YTD, km percorsi, contratto attivo con tipo e scadenza
  - [ ] 5.6 States gestiti: attivo (badge verde), manutenzione (badge arancione), dismesso (badge grigio), foto non disponibile (placeholder con icona auto + marca/modello)
  - [ ] 5.7 Implementare prop interface tipizzata: `VehicleHeaderProps` con dati veicolo, dipendente opzionale, KPI opzionali
  - [ ] 5.8 Composizione interna con shadcn/ui: layout CSS Grid, Badge per stato, Typography per testi, DropdownMenu per azioni (Modifica, Aggiungi contratto, Aggiungi rifornimento)
  - [ ] 5.9 Accessibility: foto con `alt` descrittivo (es. "Fiat 500X Cross, colore grigio"), dati in struttura semantica, KPI con labels esplicite
  - [ ] 5.10 Responsive: su mobile (<768px) layout stacked verticale (foto sopra, dati sotto, KPI come cards orizzontali)

- [ ] Task 6: Gestire timeout con valore configurabile (AC: #3, #5)
  - [ ] 6.1 Definire costante `CODALL_TIMEOUT_MS` in `src/lib/utils/constants.ts` (default: 5000ms)
  - [ ] 6.2 Utilizzare `AbortController` con `setTimeout` nel fetch verso Codall per implementare il timeout
  - [ ] 6.3 In caso di timeout, loggare con Pino livello `warn` e ritornare fallback placeholder
  - [ ] 6.4 Il timeout e leggibile da variabile d'ambiente `CODALL_TIMEOUT_MS` con fallback alla costante

- [ ] Task 7: Aggiungere immagine placeholder (AC: #3)
  - [ ] 7.1 Creare `public/images/vehicle-placeholder.svg` — icona stilizzata di automobile in stile outline, colori neutri (grigio), dimensioni 320x240px viewBox
  - [ ] 7.2 L'SVG deve includere il testo "Immagine non disponibile" sotto l'icona
  - [ ] 7.3 Il placeholder deve essere visivamente coerente con il design system Greenfleet (palette teal 600 per accento, grigio per contorno)

## Dev Notes

### Architettura Integrazione Codall

L'integrazione Codall e un proxy server-side che evita di esporre l'URL Codall direttamente al client. Il flusso e:

```
Browser → /api/images/vehicle/[codall]?date=YYYY-MM → Cache check → Codall API → Response
                                                      ↓ (cache hit)
                                                    Cached image
                                                      ↓ (cache miss + error)
                                                    Placeholder SVG
```

### URL Pattern Codall

Il servizio Codall genera immagini a partire da:
- **ANNOXX**: anno registrazione a 2 cifre (es. "24" per 2024)
- **MESEXX**: mese registrazione a 2 cifre (es. "03" per marzo)
- **CODALL**: codice allestimento del veicolo (stringa alfanumerica)

La combinazione `ANNOXX+MESEXX+CODALL` identifica univocamente l'immagine. L'URL esatto dipende dalla configurazione `CODALL_API_URL` in `.env`.

### Esempio Costruzione URL

```typescript
// src/lib/integrations/codall/client.ts
function buildCodallImageUrl(codall: string, registrationDate: Date): string {
  const anno = String(registrationDate.getFullYear()).slice(-2) // "24"
  const mese = String(registrationDate.getMonth() + 1).padStart(2, "0") // "03"
  const baseUrl = process.env.CODALL_API_URL
  return `${baseUrl}/${anno}${mese}${codall}`
}
```

### Decisioni Architetturali Rilevanti

- **AC-1 Pattern API Ibrido**: Route Handler usato perche il proxy immagini e un endpoint esterno (serve HTTP semantics esplicito: Content-Type, Cache-Control, streaming binario). Non e una mutation, quindi non e una Server Action
- **NFR22 Graceful Degradation**: Il sistema non deve bloccarsi se Codall non e disponibile. Placeholder mostrato immediatamente, nessun errore utente-visibile
- **NFR24 Timeout + Fallback**: Timeout configurabile con fallback a placeholder. L'utente vede sempre un'immagine (reale o placeholder)
- **ID-3 Environment Configuration**: `CODALL_API_URL` e `CODALL_TIMEOUT_MS` configurate via `.env`
- **ID-4 Logging — Pino**: Warn per fallback attivato, error per errori imprevisti. No log per cache hit (performance)

### VehicleHeader Component — Specifiche UX

Ispirazione: Salesforce Account Page. E il "biglietto da visita" del veicolo.

```
+--[ Foto ]---+--[ Dati chiave ]----+--[ KPI ]--------+
|             |  FR779VT             | Emissioni: 12.4 |
|   [Codall   |  Fiat 500X Cross    | tCO2e YTD       |
|    image]   |  ● Attivo           | Km: 18.400      |
|             |  → Marco Rossi      | Contratto: LT    |
|             |  Diesel 1.6 130cv   | Scade: 03/2027   |
+-------------+---------------------+-----------------+
```

- **Varianti stato**: Attivo (badge verde), Manutenzione (badge arancione), Dismesso (badge grigio)
- **Foto non disponibile**: Placeholder con icona auto + marca/modello come testo
- **Azioni**: Dropdown con Modifica, Aggiungi contratto, Aggiungi rifornimento
- **Responsive**: Su mobile layout stacked verticale
- **Composizione**: CSS Grid + Avatar/Image shadcn + Badge + Typography + DropdownMenu

### Strategia Cache

Cache in-memory (Map) con TTL di 24h. Scelta motivata da:
- Le immagini dei veicoli cambiano raramente (stessa immagine per codall+data)
- Non servono immagini real-time — anche un'immagine cachata di 24h e accettabile
- Per la scala target (10k veicoli, ma non tutti con immagine unica), la memoria e gestibile
- Lazy eviction: le entry scadute vengono rimosse al momento dell'accesso, non con un timer periodico
- Evoluzione post-MVP: se la memoria diventa un problema, migrare a cache su filesystem o Redis

### Struttura File

```
src/
├── app/api/images/vehicle/[codall]/
│   └── route.ts              # Route Handler proxy GET
├── components/data-display/
│   └── VehicleHeader.tsx      # Componente shared cross-feature
├── lib/integrations/codall/
│   ├── client.ts              # buildCodallImageUrl, fetchCodallImage
│   ├── fallback.ts            # getCodallFallbackResponse, isRetryableError
│   └── types.ts               # CodallImageRequest, CodallImageResponse, CodallConfig
├── lib/utils/
│   └── constants.ts           # CODALL_CACHE_TTL_MS, CODALL_TIMEOUT_MS (aggiungere)
└── public/images/
    └── vehicle-placeholder.svg # Placeholder SVG
```

### Convenzioni Naming

| Elemento | Convenzione | Esempio |
|---|---|---|
| Route Handler | kebab-case directory | `api/images/vehicle/[codall]/route.ts` |
| Integration client | kebab-case.ts | `client.ts`, `fallback.ts`, `types.ts` |
| Component shared | PascalCase.tsx | `VehicleHeader.tsx` |
| Costanti globali | UPPER_SNAKE_CASE | `CODALL_CACHE_TTL_MS`, `CODALL_TIMEOUT_MS` |

### Anti-Pattern da Evitare

- NON esporre l'URL Codall direttamente al browser — usare il Route Handler come proxy
- NON usare `any` per i tipi di risposta Codall — definire tipi espliciti in `types.ts`
- NON fare retry infiniti — massimo 1 retry per errori transitori
- NON cachare le risposte di errore — cachare solo immagini valide
- NON bloccare il rendering della pagina per il caricamento dell'immagine — l'immagine e un `<img>` con loading lazy
- NON loggare il body binario dell'immagine — loggare solo metadata (codall, size, status)

### Dipendenze

- **Story 1.1**: Scaffold progetto con Next.js 16, struttura directory, Pino logging, Better Auth, middleware auth
- **Story 2.1**: Schema catalogo veicoli (il campo `codall` e `registrationDate` devono esistere nel model Vehicle)
- **Componenti shadcn/ui necessari**: Badge, DropdownMenu, Image (o tag img nativo)

### Test Manuali Suggeriti

1. Richiedere `/api/images/vehicle/ABC123?date=2024-03` con Codall disponibile → immagine valida
2. Richiedere con Codall non disponibile (URL errato o servizio down) → placeholder SVG
3. Richiedere con codall vuoto o date malformata → errore 400 con messaggio Zod
4. Richiedere senza sessione autenticata → redirect a login / errore 401
5. Richiedere la stessa immagine 2 volte in rapida successione → seconda richiesta servita da cache
6. Verificare VehicleHeader con immagine valida → foto visibile con dati chiave
7. Verificare VehicleHeader con immagine non disponibile → placeholder con icona auto
8. Verificare VehicleHeader responsive su viewport 375px → layout stacked

### Variabili d'Ambiente

```env
# URL base del servizio Codall per le immagini veicoli
CODALL_API_URL=https://codall.example.com/images

# Timeout per le richieste a Codall (ms) - default 5000
CODALL_TIMEOUT_MS=5000
```

### References

- [Source: architecture.md#Technical Constraints & Dependencies] — Codall API pattern ANNOXX+MESEXX+CODALL
- [Source: architecture.md#API & Communication Patterns AC-1] — Route Handler per endpoints esterni
- [Source: architecture.md#Infrastructure & Deployment ID-3] — CODALL_API_URL in env
- [Source: architecture.md#Project Structure] — `api/images/vehicle/[codall]/route.ts`, `lib/integrations/codall/`
- [Source: epics.md#Story 2.3] — AC BDD
- [Source: ux-design-specification.md#VehicleHeader] — Anatomy, states, actions, accessibility
- [Source: prd.md#FR2] — Recupero immagini veicolo da Codall
- [Source: prd.md#FR44] — Immagine veicolo nelle viste di dettaglio
- [Source: prd.md#NFR22] — Graceful degradation servizi esterni
- [Source: prd.md#NFR24] — Timeout e fallback immagini Codall

## Dev Agent Record

### Agent Model Used



### Debug Log References

### Completion Notes List

### File List

