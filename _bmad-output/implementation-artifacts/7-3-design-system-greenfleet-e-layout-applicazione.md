# Story 7.3: Design System Greenfleet e Layout Applicazione

Status: done

## Story

As a **Utente**,
I want **un'interfaccia coerente, accessibile e professionale**,
So that **posso utilizzare la piattaforma in modo efficiente e intuitivo**.

## Acceptance Criteria

1. Il design system Greenfleet e applicato: palette teal 600 primary (hsl 168, 76%, 28%), tipografia Inter, spacing base 4px
2. Il layout include sidebar 256px (collassabile a 64px con solo icone), content area max-width 1280px, breadcrumb sempre visibile
3. Il dark mode e disponibile tramite toggle nell'header e rispetta le CSS variables (rispetta anche `prefers-color-scheme` del sistema come default)
4. L'accessibilita WCAG 2.1 AA e garantita: contrasto 4.5:1 per testo, keyboard navigation completa, screen reader support, focus visible ring su ogni elemento interattivo
5. I componenti custom sono implementati e coerenti: KPICard, DeltaBar, ProgressTarget, FuelFeed, VehicleHeader, StatusBadge, EmptyState
6. Il responsive funziona su desktop (>= 1280px sidebar espansa), tablet (768-1279px sidebar collassata), mobile (< 768px sidebar nascosta, bottom nav per Driver)

## Tasks / Subtasks

- [ ] Task 1: Configurazione Palette Greenfleet (AC: #1)
  - [ ] 1.1 Configurare `src/app/globals.css` con CSS variables Greenfleet per light mode e dark mode:
    - `--primary: hsl(168, 76%, 28%)` (Teal 600)
    - `--primary-foreground: hsl(0, 0%, 100%)` (White)
    - `--success: hsl(152, 69%, 40%)` (Emerald 500)
    - `--warning: hsl(38, 92%, 50%)` (Amber 500)
    - `--destructive: hsl(0, 72%, 51%)` (Red 500)
    - `--info: hsl(217, 91%, 60%)` (Blue 500)
    - `--background`, `--card`, `--muted`, `--muted-foreground`, `--border`, `--foreground` per light e dark
  - [ ] 1.2 Configurare colori grafici emissioni come CSS variables:
    - `--chart-theoretical: hsl(168, 65%, 45%)` (Teal 400)
    - `--chart-actual: hsl(215, 16%, 47%)` (Slate 500)
    - Colori per tipo carburante: diesel, benzina, elettrico, GPL/metano, ibrido
  - [ ] 1.3 Verificare che shadcn/ui utilizzi le CSS variables Greenfleet (aggiornare `components.json` se necessario)
  - [ ] 1.4 Verificare contrasto WCAG 2.1 AA: teal 600 su white >= 4.5:1 (atteso 7.2:1), muted-foreground su white >= 4.5:1
- [ ] Task 2: Setup Tipografia Inter (AC: #1)
  - [ ] 2.1 Configurare font Inter in `src/app/layout.tsx` tramite `next/font/google` con subset `latin` e fallback `system-ui, -apple-system, sans-serif`
  - [ ] 2.2 Definire scale tipografico in globals.css o Tailwind:
    - `hero`: 36px/2.25rem, 700 bold, line-height 1.1 (KPI hero)
    - `h1`: 28px/1.75rem, 600 semibold, line-height 1.2 (titolo pagina)
    - `h2`: 22px/1.375rem, 600 semibold, line-height 1.3 (titolo sezione)
    - `h3`: 18px/1.125rem, 600 semibold, line-height 1.4 (titolo card)
    - `body`: 14px/0.875rem, 400 regular, line-height 1.5 (testo corpo)
    - `small`: 12px/0.75rem, 400 regular, line-height 1.5 (caption)
    - `mono`: 13px/0.8125rem, 500 medium, line-height 1.4 (targhe, codici)
  - [ ] 2.3 Applicare `font-variant-numeric: tabular-nums` globalmente su tabelle e KPI per allineamento numerico
  - [ ] 2.4 Spacing base 4px: configurare in Tailwind la scale 0(0) 1(4px) 2(8px) 3(12px) 4(16px) 5(20px) 6(24px) 8(32px) 10(40px) 12(48px) 16(64px)
- [ ] Task 3: Componente Sidebar (AC: #2, #6)
  - [ ] 3.1 Creare `src/components/layout/Sidebar.tsx` con layout 256px espansa, 64px collassata (solo icone)
  - [ ] 3.2 Sezioni raggruppate con label uppercase small muted-foreground:
    - **Operativita**: Veicoli, Contratti, Dipendenti, Carlist
    - **Dati**: Rifornimenti, Rilevazioni Km
    - **Analisi**: Emissioni, Report
    - **Configurazione**: Impostazioni, Utenti
  - [ ] 3.3 Stile voce attiva: `bg-primary-soft` + bordo sinistro 3px `primary` + testo `foreground` bold
  - [ ] 3.4 Stile voce hover: `bg-accent`
  - [ ] 3.5 Toggle collapse: bottone in fondo alla sidebar per espandere/collassare. Stato persiste in localStorage
  - [ ] 3.6 Sidebar collassata: solo icone Lucide con tooltip che mostra il nome della sezione
  - [ ] 3.7 Badge counter sulle voci con pending items (es. rifornimenti da validare)
  - [ ] 3.8 Logo Greenfleet in cima alla sidebar (full in espansa, icona in collassata)
  - [ ] 3.9 Responsive: desktop espansa (>= 1280px), tablet collassata (768-1279px), mobile nascosta (< 768px)
  - [ ] 3.10 Sticky: `position: sticky`, `height: 100vh`, `overflow-y: auto`
  - [ ] 3.11 Accessibilita: `<nav>` con `aria-label="Navigazione principale"`, voce attiva con `aria-current="page"`
- [ ] Task 4: Header con Breadcrumb (AC: #2)
  - [ ] 4.1 Creare `src/components/layout/Header.tsx` con altezza 64px contenente: breadcrumb, search (placeholder per futuro), tenant badge (per Admin), user menu, dark mode toggle
  - [ ] 4.2 Creare `src/components/layout/Breadcrumb.tsx` con formato "Dashboard > Emissioni > Diesel > Carlist Commerciali"
  - [ ] 4.3 Ogni segmento del breadcrumb e un link cliccabile. Ultimo segmento in `foreground` bold (non cliccabile), precedenti in `muted-foreground`
  - [ ] 4.4 Breadcrumb generato automaticamente dal pathname della route (App Router)
  - [ ] 4.5 User menu (dropdown in alto a destra): nome utente, ruolo, tenant, link a Profilo, Logout
  - [ ] 4.6 Accessibilita: `<header>` semantico, breadcrumb con `<nav aria-label="Breadcrumb">` e `<ol>` con schema.org markup
- [ ] Task 5: Dashboard Layout (AC: #2, #6)
  - [ ] 5.1 Creare `src/app/(dashboard)/layout.tsx` con struttura: Sidebar (sinistra) + Content area (destra con Header + Breadcrumb + page content)
  - [ ] 5.2 Content area: fluida, max-width 1280px centrato, padding 24px
  - [ ] 5.3 Desktop (>= 1280px): sidebar 256px + content area fluida
  - [ ] 5.4 Tablet (768-1279px): sidebar collassata 64px + content area full-width
  - [ ] 5.5 Mobile (< 768px): sidebar nascosta + content area full-width + hamburger menu in header + bottom nav per Driver
  - [ ] 5.6 Card spacing: gap 16px tra cards, padding interno 24px
  - [ ] 5.7 Table density: row height 48px, header 40px con background muted
- [ ] Task 6: Dark Mode (AC: #3)
  - [ ] 6.1 Creare `src/components/layout/ThemeProvider.tsx` usando `next-themes` per gestione dark/light/system
  - [ ] 6.2 Implementare toggle dark mode nell'header (icona Sun/Moon) con transizione fluida
  - [ ] 6.3 Default: rispetta `prefers-color-scheme` del sistema. Toggle manuale persiste in localStorage
  - [ ] 6.4 Verificare che tutte le CSS variables abbiano le varianti dark definite in globals.css (palette neutra dark gia definita)
  - [ ] 6.5 Verificare contrasto WCAG 2.1 AA anche in dark mode
  - [ ] 6.6 `<html lang="it">` nel root layout per screen reader italiani
- [ ] Task 7: Componenti Custom — Data Display (AC: #5)
  - [ ] 7.1 **KPICard** (`src/components/data-display/KPICard.tsx`): card con hero metric + trend arrow + sparkline. Varianti: default, compact, hero. Composizione: Card shadcn + Typography + Recharts sparkline + Lucide icon. [Dettagli in Story 7.1]
  - [ ] 7.2 **DeltaBar** (`src/components/data-display/DeltaBar.tsx`): barra comparativa doppia emissioni teoriche vs reali. Varianti: inline, full, mini. Composizione: Div Tailwind (barre CSS) + Typography + Badge delta. [Dettagli in Story 7.1]
  - [ ] 7.3 **ProgressTarget** (`src/components/data-display/ProgressTarget.tsx`): progress bar con milestone per target emissioni. Varianti: full, compact. Composizione: Progress shadcn esteso + milestone dots + Badge + Typography. [Dettagli in Story 7.1]
  - [ ] 7.4 **VehicleHeader** (`src/components/data-display/VehicleHeader.tsx`): header pagina veicolo con foto Codall + dati chiave + KPI sidebar. Composizione: CSS Grid + Image/Avatar + Badge + Typography + DropdownMenu. [Dettagli in Story 7.2]
  - [ ] 7.5 **StatusBadge** (`src/components/data-display/StatusBadge.tsx`): badge stato unificato per matching, contratti, documenti, veicoli. Dot colorato + label testuale. Composizione: Badge shadcn + dot SVG + varianti Tailwind
  - [ ] 7.6 **EmptyState** (`src/components/data-display/EmptyState.tsx`): stato vuoto con azione suggerita. Varianti: action (con bottoni CTA), info (solo messaggio), permission (dati non accessibili). Composizione: Layout centrato + icona Lucide + Typography + Button shadcn
  - [ ] 7.7 **FuelFeed** (`src/components/data-display/FuelFeed.tsx`): feed cronologico rifornimenti stile Revolut. Varianti: full (pagina dedicata), compact (widget dashboard, ultimi 5), validation (coda matching). Composizione: ScrollArea + custom list items + Badge + DropdownMenu
- [ ] Task 8: StatusBadge — Implementazione Dettagliata (AC: #5)
  - [ ] 8.1 Props interface: `{ status: string, domain: "matching" | "document" | "contract" | "vehicle", size?: "sm" | "md" }`
  - [ ] 8.2 Mappatura colori per dominio e stato:
    - Matching: Validato (success), Da validare (warning), Anomalia (destructive)
    - Documento: OK (success), "Scade tra Xgg" (warning, X calcolato), Scaduto (destructive)
    - Contratto: Attivo (success), "Scade tra Xgg" (warning), Scaduto (destructive)
    - Veicolo: Attivo (success), Manutenzione (warning), Dismesso (muted)
  - [ ] 8.3 Dot SVG 8px colorato + testo label — il testo e sufficiente senza il colore (indipendenza dal colore)
  - [ ] 8.4 Accessibilita: `role="status"`, screen reader legge solo il testo
- [ ] Task 9: EmptyState — Implementazione Dettagliata (AC: #5)
  - [ ] 9.1 Props interface: `{ title: string, description?: string, icon?: LucideIcon, variant: "action" | "info" | "permission", actions?: { label: string, href?: string, onClick?: () => void, variant: "default" | "secondary" }[] }`
  - [ ] 9.2 Layout: icona Lucide 48px in `muted-foreground`, titolo in `h3`, descrizione in `muted-foreground body`, bottoni sotto
  - [ ] 9.3 Variante `action`: 1-2 bottoni CTA (primary + secondary)
  - [ ] 9.4 Variante `info`: solo testo, nessun bottone (es. "Nessun risultato per i filtri applicati")
  - [ ] 9.5 Variante `permission`: icona Lock, testo "Non hai accesso a questa sezione"
  - [ ] 9.6 Centrato verticalmente e orizzontalmente nel container
- [ ] Task 10: FuelFeed — Implementazione Dettagliata (AC: #5)
  - [ ] 10.1 Props interface: `{ items: FuelFeedItem[], variant: "full" | "compact" | "validation", onItemClick?: (id: string) => void }`
  - [ ] 10.2 `FuelFeedItem` type: `{ id, vehiclePlate, fuelType, quantity, amount, km, date, status: "validated" | "pending" | "anomaly" | "manual" }`
  - [ ] 10.3 Singolo item: icona carburante (colore per tipo), targa mono uppercase, quantita litri, importo euro, data formato "dd MMM yyyy, HH:mm", StatusBadge
  - [ ] 10.4 Click su item: espansione inline con dettagli extra (km, note, fornitore)
  - [ ] 10.5 Click su targa: navigazione a pagina veicolo
  - [ ] 10.6 Variante `compact`: ultimi 5 items, nessun filtro, link "Vedi tutti"
  - [ ] 10.7 Variante `full`: con filtri rapidi in header (periodo, carburante, stato, veicolo)
  - [ ] 10.8 Variante `validation`: solo items `pending`, con azioni batch (approva, segnala)
  - [ ] 10.9 Accessibilita: `role="feed"`, ogni item `role="article"` con `aria-label`, keyboard nav con arrow keys
  - [ ] 10.10 Creare `src/components/data-display/FuelFeedItem.tsx` come sotto-componente
- [ ] Task 11: Responsive Breakpoints (AC: #6)
  - [ ] 11.1 Usare esclusivamente breakpoint standard Tailwind: default (< 768px), `md:` (768px+), `lg:` (1024px+), `xl:` (1280px+)
  - [ ] 11.2 Nessun breakpoint custom — coerenza e manutenibilita
  - [ ] 11.3 Container query (`@container` Tailwind CSS 4.x) per componenti che si adattano al container (es. KPICard in sidebar vs griglia)
  - [ ] 11.4 Touch target minimo 44x44px su mobile (`@media (pointer: coarse)` per aumentare su touch)
  - [ ] 11.5 Verificare: nessun layout shift tra breakpoint, transizioni CSS fluide dove necessario
- [ ] Task 12: WCAG Accessibility Audit (AC: #4)
  - [ ] 12.1 Semantic HTML: `<nav>` per sidebar, `<main>` per content area, `<header>` per page header, `<section>` con `aria-labelledby`
  - [ ] 12.2 Skip link "Vai al contenuto" come primo elemento focusabile nel root layout
  - [ ] 12.3 Focus visible: ring 2px `primary` con offset 2px su ogni elemento interattivo (configurare in Tailwind `focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2`)
  - [ ] 12.4 Keyboard navigation: Tab order logico (skip link → sidebar → header → content), arrow keys per sidebar e tabs (gestito da Radix UI)
  - [ ] 12.5 Screen reader landmarks: `role="navigation"`, `role="main"`, `role="complementary"`
  - [ ] 12.6 Live regions: `aria-live="polite"` per toast e aggiornamenti KPI, `aria-live="assertive"` per errori
  - [ ] 12.7 Form accessibility: `aria-required`, `aria-invalid`, `aria-describedby` per helper text/errori
  - [ ] 12.8 `@media (prefers-reduced-motion: reduce)`: disabilitare animazioni e transizioni
  - [ ] 12.9 Indipendenza dal colore: ogni informazione via colore ha secondo indicatore (icona, testo, pattern)
  - [ ] 12.10 Viewport meta: `width=device-width, initial-scale=1` senza `user-scalable=no`

## Dev Notes

### Stack Tecnologico e Versioni

- **Tailwind CSS 4.x**: CSS variables, dark mode nativo, container queries, responsive utilities
- **shadcn/ui**: Componenti base (Card, Badge, Progress, Button, ScrollArea, DropdownMenu, Skeleton, Tooltip, Sheet)
- **next-themes**: Gestione dark/light/system mode
- **Lucide Icons**: Iconografia coerente
- **Recharts**: Via shadcn/ui Charts per sparkline in KPICard
- **Inter (Google Fonts)**: Font primario tramite `next/font/google`

### Decisioni Architetturali Rilevanti

- **FA-1 State Management**: Sidebar collapse state in localStorage + `useState`. Dark mode in localStorage via next-themes
- **FA-4 Charts**: Recharts per sparkline KPICard, DeltaBar usa solo CSS (nessuna libreria chart)
- **FA-5 Tabelle**: TanStack Table + shadcn/ui DataTable — stile integrato nel design system

### Struttura Directory Componenti

```
src/
├── app/
│   ├── globals.css                     # Palette Greenfleet CSS variables (light + dark)
│   ├── layout.tsx                      # Root layout (ThemeProvider, Inter font, html lang="it")
│   └── (dashboard)/
│       └── layout.tsx                  # Dashboard layout (Sidebar + Header + Content)
├── components/
│   ├── ui/                             # shadcn/ui (auto-generated)
│   ├── layout/
│   │   ├── Sidebar.tsx                 # Sidebar navigazione 256px/64px
│   │   ├── Header.tsx                  # Header con breadcrumb + user menu + dark toggle
│   │   ├── Breadcrumb.tsx              # Breadcrumb auto-generated da pathname
│   │   ├── ThemeProvider.tsx           # next-themes provider
│   │   └── BottomNav.tsx               # Bottom nav mobile Driver (da Story 7.2)
│   └── data-display/
│       ├── KPICard.tsx                 # Hero metric + trend + sparkline
│       ├── DeltaBar.tsx                # Barra comparativa teorico vs reale
│       ├── ProgressTarget.tsx          # Progress bar con milestone
│       ├── VehicleHeader.tsx           # Header veicolo con foto Codall
│       ├── StatusBadge.tsx             # Badge stato unificato
│       ├── EmptyState.tsx              # Stato vuoto con azione
│       ├── FuelFeed.tsx                # Feed cronologico rifornimenti
│       └── FuelFeedItem.tsx            # Singolo item del feed
```

### CSS Variables Greenfleet — Riepilogo Completo

```css
/* globals.css — Light mode */
:root {
  --primary: 168 76% 28%;           /* Teal 600 */
  --primary-foreground: 0 0% 100%;  /* White */
  --success: 152 69% 40%;           /* Emerald 500 */
  --warning: 38 92% 50%;            /* Amber 500 */
  --destructive: 0 72% 51%;         /* Red 500 */
  --info: 217 91% 60%;              /* Blue 500 */
  --background: 0 0% 100%;          /* White */
  --card: 0 0% 100%;                /* White */
  --muted: 210 40% 96%;             /* Gray 50 */
  --muted-foreground: 215 16% 47%;  /* Gray 500 */
  --border: 214 32% 91%;            /* Gray 200 */
  --foreground: 222 47% 11%;        /* Gray 900 */
  --chart-theoretical: 168 65% 45%; /* Teal 400 */
  --chart-actual: 215 16% 47%;      /* Slate 500 */
}

/* Dark mode */
.dark {
  --background: 222 47% 8%;
  --card: 222 47% 11%;
  --muted: 215 25% 15%;
  --muted-foreground: 215 16% 65%;
  --border: 215 25% 20%;
  --foreground: 210 40% 96%;
  /* primary, success, warning, destructive rimangono invariati */
}
```

### Sidebar — Sezioni e Icone

| Sezione | Voce | Icona Lucide | Route |
|---|---|---|---|
| Operativita | Veicoli | `Car` | `/vehicles` |
| Operativita | Contratti | `FileText` | `/contracts` |
| Operativita | Dipendenti | `Users` | `/employees` |
| Operativita | Carlist | `ListChecks` | `/carlist` |
| Dati | Rifornimenti | `Fuel` | `/fuel-records` |
| Dati | Rilevazioni Km | `Gauge` | `/km-readings` |
| Analisi | Emissioni | `BarChart3` | `/emissions` |
| Analisi | Report | `FileBarChart` | `/emissions/report` |
| Configurazione | Impostazioni | `Settings` | `/settings` |
| Configurazione | Utenti | `UserCog` | `/settings/users` |

### Principi Design System

1. **Token-first**: ogni componente custom usa CSS variables (`--primary`, `--success`, etc.). Zero colori hardcoded
2. **Composizione > Ereditarieta**: i custom components compongono shadcn/ui primitives, non li estendono
3. **Server Component by default**: componenti che leggono dati sono RSC. Solo quelli con interattivita sono Client Component
4. **Densita calibrata**: abbastanza denso per 280 veicoli, abbastanza arioso per non soffocare. Riferimento Stripe, non Jira
5. **Gerarchia spaziale**: piu spazio = piu importanza. Hero KPI con margin generosi, tabelle compatte

### Anti-Pattern da Evitare

- NON usare colori hardcoded (es. `#0D9488`) — usare sempre CSS variables o Tailwind tokens
- NON creare componenti UI custom quando esiste l'equivalente shadcn/ui
- NON usare `<div onClick>` per elementi interattivi — usare `<button>` o `<a>`
- NON usare `outline: none` senza alternativa per focus visible
- NON usare `user-scalable=no` nel viewport meta
- NON creare breakpoint custom — usare solo quelli standard Tailwind
- NON rimuovere le animazioni senza rispettare `prefers-reduced-motion`
- NON mettere business logic nei componenti layout — solo presentazione

### Ordine di Implementazione Suggerito

1. **globals.css** (palette + typography + spacing) — fondazione
2. **ThemeProvider + dark mode** — serve per tutto il resto
3. **Sidebar + Header + Breadcrumb + Dashboard layout** — struttura navigazione
4. **StatusBadge + EmptyState** — componenti base riusati ovunque
5. **KPICard + DeltaBar + ProgressTarget** — componenti dashboard
6. **VehicleHeader** — componente pagina veicolo
7. **FuelFeed** — componente feed rifornimenti
8. **WCAG audit** — verifica finale accessibilita

### References

- [Source: architecture.md#Starter Template] — shadcn/ui + Tailwind CSS 4.x + Inter
- [Source: architecture.md#Structure Patterns] — directory structure components
- [Source: architecture.md#Enforcement Guidelines] — regole per agenti AI
- [Source: ux-design-specification.md#Design System Foundation] — palette, typography, spacing
- [Source: ux-design-specification.md#Color System] — CSS variables complete
- [Source: ux-design-specification.md#Typography System] — scale tipografico Inter
- [Source: ux-design-specification.md#Spacing & Layout Foundation] — layout strutturale
- [Source: ux-design-specification.md#Custom Components] — anatomia tutti e 7 i componenti
- [Source: ux-design-specification.md#Responsive Strategy] — breakpoints e adattamenti
- [Source: ux-design-specification.md#Accessibility Strategy] — WCAG 2.1 AA, keyboard, screen reader
- [Source: ux-design-specification.md#Navigation Patterns] — sidebar sezioni, breadcrumb, drill-down
- [Source: epics.md#Story 7.3] — Acceptance criteria BDD
