# Story 7.2: Dashboard Personale Driver

Status: done

## Story

As a **Driver**,
I want **visualizzare una dashboard personale con il mio veicolo, km percorsi e emissioni**,
So that **posso monitorare il mio impatto ambientale e lo stato dei miei documenti**.

## Acceptance Criteria

1. Il Driver visualizza il proprio veicolo assegnato con immagine Codall tramite componente VehicleHeader (FR43)
2. La dashboard mostra KPI personali: km percorsi nel mese, emissioni personali, ultimo rifornimento registrato
3. Lo stato dei documenti del veicolo e visibile con scadenze evidenziate tramite StatusBadge (OK/scadenza vicina/scaduto)
4. I contratti attivi del veicolo assegnato sono visualizzati in formato compatto
5. Tutti i dati sono in sola lettura — nessuna azione di modifica consentita dalla dashboard
6. La dashboard e ottimizzata per mobile con bottom navigation bar per le azioni frequenti del Driver (Dashboard, Rifornimenti, Km, Profilo)
7. La dashboard carica con dati aggiornati in meno di 2 secondi (NFR3)

## Tasks / Subtasks

- [ ] Task 1: Pagina Dashboard Driver (AC: #1, #5, #7)
  - [ ] 1.1 Creare `src/app/(dashboard)/driver/page.tsx` come Server Component che carica dati veicolo e KPI personali
  - [ ] 1.2 Implementare role-based routing: il middleware redirect i Driver a `/driver` come dashboard, FM/Admin a `/` (dashboard FM)
  - [ ] 1.3 Recuperare il veicolo assegnato al Driver corrente dalla sessione Better Auth (userId + tenantId)
  - [ ] 1.4 Gestire caso "nessun veicolo assegnato": EmptyState con messaggio "Non hai ancora un veicolo assegnato. Contatta il tuo Fleet Manager." (variante `permission`)
  - [ ] 1.5 Creare `src/app/(dashboard)/driver/loading.tsx` con skeleton layout Driver (card veicolo placeholder + KPI placeholder + lista documenti placeholder)
  - [ ] 1.6 Creare `src/app/(dashboard)/driver/error.tsx` con messaggio user-friendly e bottone retry
- [ ] Task 2: Componente VehicleHeader (AC: #1)
  - [ ] 2.1 Creare `src/components/data-display/VehicleHeader.tsx` con layout: foto Codall (sinistra) + dati chiave inline (targa, marca/modello, stato, dipendente) + KPI sidebar (emissioni, km, contratto)
  - [ ] 2.2 Implementare props: `vehicle` (dati veicolo con relazioni), `showActions` (boolean, false per Driver), `showKPISidebar` (boolean)
  - [ ] 2.3 Foto veicolo: caricare immagine Codall tramite `<Image>` Next.js con placeholder blur. Fallback se immagine non disponibile: icona auto (Lucide `Car`) + marca/modello in testo
  - [ ] 2.4 Targa in font `mono` uppercase con stile prominente
  - [ ] 2.5 Stato veicolo con StatusBadge: Attivo (verde), In manutenzione (arancione), Dismesso (grigio)
  - [ ] 2.6 Layout CSS Grid responsive: desktop (3 colonne: foto + dati + KPI), tablet (2 colonne: foto+dati + KPI sotto), mobile (stack verticale)
  - [ ] 2.7 Accessibilita: foto con `alt` descrittivo ("Fiat 500X Cross, colore grigio"), dati chiave in struttura semantica con heading, KPI con labels esplicite
- [ ] Task 3: KPI Personali Driver (AC: #2)
  - [ ] 3.1 Creare `src/lib/services/driver-dashboard-service.ts` con funzione `getDriverKPIs(userId: string, tenantId: string, period: Date)`
  - [ ] 3.2 Calcolo km percorsi mese: differenza tra ultima e prima rilevazione km del mese corrente per il veicolo assegnato
  - [ ] 3.3 Calcolo emissioni personali mese: somma emissioni reali (quantita carburante x fattore emissione) dai rifornimenti del mese per il veicolo assegnato
  - [ ] 3.4 Ultimo rifornimento: data, quantita litri, importo del rifornimento piu recente
  - [ ] 3.5 Visualizzare KPI tramite KPICard variante `compact` (senza sparkline, adatto a layout Driver)
  - [ ] 3.6 Formattazione: km con separatore migliaia IT (18.400), emissioni con unita (1,2 tCO2e), importo con euro (€ 67,80), data rifornimento in formato "dd MMM yyyy"
- [ ] Task 4: Stato Documenti Veicolo (AC: #3)
  - [ ] 4.1 Creare `src/app/(dashboard)/driver/components/DocumentStatusList.tsx` come lista compatta dei documenti del veicolo assegnato
  - [ ] 4.2 Per ogni documento: tipo (assicurazione, revisione, bollo, carta di circolazione), data scadenza, StatusBadge
  - [ ] 4.3 StatusBadge documenti: OK verde (scadenza > 60gg), "Scade tra Xgg" arancione (scadenza <= 60gg), "Scaduto" rosso (scaduto)
  - [ ] 4.4 Ordinamento: documenti in scadenza/scaduti prima, poi per tipo
  - [ ] 4.5 Se nessun documento: EmptyState variante `info` con messaggio "Nessun documento registrato per questo veicolo"
- [ ] Task 5: Contratti Attivi (AC: #4)
  - [ ] 5.1 Creare `src/app/(dashboard)/driver/components/ContractSummary.tsx` con card compatta del contratto attivo
  - [ ] 5.2 Mostrare: tipo contratto, fornitore (se applicabile), data inizio/fine, StatusBadge stato
  - [ ] 5.3 Se piu contratti attivi (nesting): mostrare il contratto attivo piu recente con nota "Storico contrattuale disponibile"
  - [ ] 5.4 Se nessun contratto: EmptyState variante `info` con messaggio "Nessun contratto attivo"
- [ ] Task 6: Enforcement Sola Lettura (AC: #5)
  - [ ] 6.1 La pagina Driver non contiene form o bottoni di modifica — tutti i componenti sono in modalita read-only
  - [ ] 6.2 VehicleHeader con `showActions={false}` per nascondere dropdown azioni
  - [ ] 6.3 Il driver-dashboard-service filtra i dati per il solo veicolo assegnato al Driver corrente — nessun dato di altri veicoli/dipendenti accessibile
  - [ ] 6.4 Le Server Actions di modifica verificano il ruolo: se Driver, ritornano `ActionResult` con `code: FORBIDDEN` per qualsiasi tentativo di modifica da questa pagina
- [ ] Task 7: Bottom Navigation Mobile (AC: #6)
  - [ ] 7.1 Creare `src/components/layout/BottomNav.tsx` con 4 voci: Dashboard (icona Home), Rifornimenti (icona Fuel), Km (icona Gauge), Profilo (icona User)
  - [ ] 7.2 Visibile solo su mobile (< 768px) e solo per ruolo Driver — nascosta per FM/Admin
  - [ ] 7.3 Voce attiva: icona e testo in colore `primary`, voce inattiva in `muted-foreground`
  - [ ] 7.4 Posizione: fixed bottom, altezza 64px, background `card` con bordo superiore `border`
  - [ ] 7.5 Safe area inset per iPhone con notch: `padding-bottom: env(safe-area-inset-bottom)`
  - [ ] 7.6 Touch target: ogni voce minimo 44x44px con area tappabile generosa
  - [ ] 7.7 Link alle route: `/driver` (dashboard), `/fuel-records?mine=true` (rifornimenti personali), `/km-readings?mine=true` (rilevazioni km personali), `/settings/profile` (profilo)
  - [ ] 7.8 Accessibilita: `<nav>` con `aria-label="Navigazione principale"`, ogni link con `aria-current="page"` se attivo
- [ ] Task 8: Layout Mobile-First Driver (AC: #6)
  - [ ] 8.1 Mobile (< 768px): layout colonna singola, VehicleHeader stacked (foto sopra, dati sotto), KPI cards stacked, documenti e contratti come liste compatte, bottom nav visibile
  - [ ] 8.2 Tablet (768-1279px): VehicleHeader a 2 colonne, KPI cards griglia 2 colonne, sidebar collassata
  - [ ] 8.3 Desktop (>= 1280px): VehicleHeader completo a 3 colonne, KPI + documenti + contratti in griglia, sidebar espansa
  - [ ] 8.4 Su mobile la sidebar tradizionale e nascosta — la navigazione avviene esclusivamente tramite bottom nav
  - [ ] 8.5 Padding e spacing ottimizzati per touch: card con padding 16px, gap 12px tra elementi
- [ ] Task 9: Ottimizzazione Performance < 2s (AC: #7)
  - [ ] 9.1 Implementare dashboard Driver come React Server Component con async data fetching
  - [ ] 9.2 Query singola ottimizzata: recuperare veicolo + documenti + contratto attivo + ultimi rifornimenti + rilevazioni km in una sola query Prisma con `include`
  - [ ] 9.3 Streaming SSR: `<Suspense>` per VehicleHeader (priorita alta) e dettagli secondari (documenti, contratti)
  - [ ] 9.4 Immagine Codall: Next.js `<Image>` con `priority={true}` per LCP, `placeholder="blur"` con blur data URL
  - [ ] 9.5 Cache: `use cache` per dati veicolo (revalidazione 5 minuti) — i dati del veicolo cambiano raramente

## Dev Notes

### Stack Tecnologico e Versioni

- **Next.js 16.1**: React Server Components, Suspense streaming, `use cache`
- **shadcn/ui**: Card, Badge, Skeleton come base per componenti
- **Tailwind CSS 4.x**: Layout responsive mobile-first, CSS variables
- **Lucide Icons**: Icone per bottom nav e placeholder veicolo

### Decisioni Architetturali Rilevanti

- **FA-1 State Management**: RSC per read — la dashboard Driver e puramente read-only, zero client state
- **FA-2 Data Fetching**: Server Component async con Prisma query ottimizzata (include relations)
- **AS-2 RBAC**: Driver vede solo il proprio veicolo e i propri dati. Enforcement nel service layer
- **AS-3 Tenant Isolation**: tenantId dalla sessione, automaticamente filtrato dal Prisma client extension
- **DA-6 Caching**: `use cache` per dati veicolo con revalidazione 5 minuti

### Struttura Componenti Dashboard Driver

```
src/
├── app/(dashboard)/
│   └── driver/
│       ├── page.tsx                   # Dashboard Driver (RSC)
│       ├── loading.tsx                # Skeleton dashboard Driver
│       ├── error.tsx                  # Error boundary
│       └── components/
│           ├── DocumentStatusList.tsx  # Lista stato documenti
│           └── ContractSummary.tsx     # Riepilogo contratto attivo
├── components/
│   ├── data-display/
│   │   ├── VehicleHeader.tsx          # Header veicolo con foto Codall
│   │   ├── KPICard.tsx                # Riusato da Story 7.1 (variante compact)
│   │   ├── StatusBadge.tsx            # Badge stato unificato
│   │   └── EmptyState.tsx             # Stato vuoto con azione
│   └── layout/
│       └── BottomNav.tsx              # Bottom navigation mobile Driver
└── lib/services/
    └── driver-dashboard-service.ts    # Business logic KPI Driver
```

### VehicleHeader — Props Interface

```typescript
interface VehicleHeaderProps {
  vehicle: {
    id: string
    plate: string          // targa
    brand: string          // marca
    model: string          // modello
    trim?: string          // allestimento
    status: "active" | "maintenance" | "decommissioned"
    imageUrl?: string      // URL immagine Codall
    assignedTo?: {
      name: string
    }
    engines?: {
      fuelType: string
      powerKW: number
      powerCV: number
    }[]
    // KPI sidebar
    emissionsYTD?: number  // tCO2e da inizio anno
    kmYTD?: number
    activeContract?: {
      type: string
      endDate: Date
    }
  }
  showActions?: boolean    // default true, false per Driver
  showKPISidebar?: boolean // default true
}
```

### VehicleHeader — Layout Anatomy

```
Desktop (>= 1280px):
+--[ Foto 200x140 ]--+--[ Dati chiave ]--------+--[ KPI sidebar ]----+
|                     |  FR779VT (mono, bold)    | Emissioni: 12,4    |
|   [Codall image     |  Fiat 500X Cross        | tCO2e YTD          |
|    o placeholder]   |  ● Attivo               | Km: 18.400         |
|                     |  Diesel 1.6 130cv       | Contratto: LT      |
|                     |                          | Scade: 03/2027     |
+---------------------+--------------------------+--------------------+

Mobile (< 768px):
+--[ Foto full-width, 200px height ]-----+
|   [Codall image o placeholder]          |
+-----------------------------------------+
|  FR779VT  ● Attivo                      |
|  Fiat 500X Cross — Diesel 1.6 130cv    |
+-----------------------------------------+
|  Emissioni YTD: 12,4 tCO2e             |
|  Km YTD: 18.400 | Contratto: LT        |
+-----------------------------------------+
```

### Bottom Navigation — Specifiche

```typescript
interface BottomNavItem {
  label: string
  href: string
  icon: LucideIcon
  isActive: boolean
}

const driverNavItems: BottomNavItem[] = [
  { label: "Dashboard", href: "/driver", icon: Home },
  { label: "Rifornimenti", href: "/fuel-records?mine=true", icon: Fuel },
  { label: "Km", href: "/km-readings?mine=true", icon: Gauge },
  { label: "Profilo", href: "/settings/profile", icon: User },
]
```

### Esperienza Driver — Principi UX

- **Zero-click value**: Luca apre l'app e vede tutto senza fare niente. Nessun setup, nessuna selezione
- **Mobile-first mentale**: la dashboard Driver e pensata prima per 375px, poi adattata verso desktop
- **Curiosita, non controllo**: il confronto peer ("15% sotto la media") e una informazione positiva, mai punitiva
- **Foto veicolo prominente**: la foto Codall e il primo elemento visivo — crea connessione emotiva con il proprio veicolo
- **EmptyState accogliente**: se non c'e veicolo assegnato, messaggio gentile con indicazione su chi contattare

### Formattazione Dati

```typescript
// Km con separatore IT
formatNumber(18400)  // "18.400"

// Emissioni con unita
`${formatNumber(1.24, 2)} tCO2e`  // "1,24 tCO2e"

// Importo euro
`€ ${formatNumber(67.80, 2)}`  // "€ 67,80"

// Data
formatDate(new Date())  // "12 gen 2026"

// Targa
plate.toUpperCase()  // "FR779VT" — font mono
```

### Anti-Pattern da Evitare

- NON mostrare dati di altri veicoli o dipendenti — solo i propri
- NON aggiungere bottoni di modifica sulla dashboard Driver — e read-only
- NON nascondere la bottom nav su scroll — deve essere sempre visibile su mobile
- NON caricare la sidebar completa su mobile per il Driver — solo bottom nav
- NON usare la stessa dashboard per FM e Driver — sono esperienze separate
- NON mostrare "Nessun dato" senza contesto — usare sempre EmptyState con messaggio e azione suggerita

### Dipendenze da altre Story

- **Story 3.3 (Aggiunta Veicolo Operativo)**: Il veicolo deve essere assegnato al Driver
- **Story 3.4 (Assegnazione Dipendenti)**: L'assegnazione Driver-Veicolo deve esistere
- **Story 3.7 (Documenti Veicolo)**: I documenti devono essere registrati per mostrare le scadenze
- **Story 5.1 (Rifornimenti)**: I rifornimenti devono esistere per calcolare emissioni e ultimo rifornimento
- **Story 7.1 (Dashboard FM)**: KPICard e condiviso (variante compact)
- **Story 7.3 (Design System)**: StatusBadge, EmptyState, VehicleHeader possono essere sviluppati in parallelo
- **Story 2.3 (Integrazione Codall)**: Le immagini veicolo devono essere disponibili

### References

- [Source: architecture.md#AS-2] — RBAC con ruoli, Driver = read + write rifornimenti/km proprio veicolo
- [Source: architecture.md#FA-2] — Server Components per data fetching
- [Source: ux-design-specification.md#VehicleHeader] — Anatomia e specifiche componente
- [Source: ux-design-specification.md#Dashboard Driver] — Layout e contenuto
- [Source: ux-design-specification.md#Responsive Strategy] — Mobile: bottom nav per Driver
- [Source: ux-design-specification.md#Journey 4: Luca] — Primo accesso Driver flow
- [Source: epics.md#Story 7.2] — Acceptance criteria BDD
- [Source: prd.md#FR43] — Dashboard personale Driver
- [Source: prd.md#FR12] — Vista read-only Driver
- [Source: prd.md#NFR3] — Dashboard < 2s
