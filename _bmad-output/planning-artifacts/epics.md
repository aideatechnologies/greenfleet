---
stepsCompleted: [1, 2, 3, 4]
status: complete
inputDocuments: ['prd.md', 'architecture.md', 'ux-design-specification.md', 'brainstorming-session-2026-02-06.md']
---

# Greenfleet - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for Greenfleet, decomposing the requirements from the PRD, UX Design, Architecture, and Brainstorming into implementable stories.

## Requirements Inventory

### Functional Requirements

FR1: Il sistema puo importare e sincronizzare i dati tecnici dei veicoli dalla banca dati InfocarData (identificazione, dati tecnici base, motori, prestazioni, emissioni CO2, consumi)
FR2: Il sistema puo recuperare automaticamente l'immagine del veicolo dal servizio Codall a partire dal codice allestimento e data di registrazione
FR3: L'Admin puo cercare e selezionare veicoli dal catalogo InfocarData per aggiungerli al catalogo globale di Greenfleet
FR4: L'Admin puo integrare manualmente dati non presenti in InfocarData (es. veicoli non ancora censiti, veicoli speciali)
FR5: Il sistema espone per ogni veicolo nel catalogo i dati principali: marca, modello, allestimento, carrozzeria, normativa anti-inquinamento, motori (tipo combustibile, cilindrata, potenza KW/CV), emissioni CO2 g/km (WLTP/NEDC), consumi, capacita serbatoio, flag ibrido, immagine
FR6: L'Admin puo creare, modificare e disattivare societa (tenant) sulla piattaforma
FR7: L'Admin puo configurare le feature abilitate per ogni tenant
FR8: Il sistema isola i dati di ogni tenant impedendo accesso cross-tenant
FR9: L'Admin puo creare e gestire utenze con ruolo Admin, Fleet Manager o Driver su qualsiasi tenant
FR10: Il Fleet Manager puo creare e gestire utenze Fleet Manager e Driver sul proprio tenant
FR11: Il Fleet Manager puo eseguire tutte le operazioni che l'Admin puo eseguire, purche limitate al proprio tenant (inclusi CRUD dipendenti, veicoli, contratti, carlist, rifornimenti, fatture, documenti, configurazioni matching, target emissioni)
FR12: Il Driver puo visualizzare in sola lettura i propri dati personali, il proprio veicolo, i propri contratti e documenti
FR13: L'Admin/Fleet Manager puo creare, modificare e disattivare dipendenti (nel proprio ambito)
FR14: L'Admin/Fleet Manager puo assegnare dipendenti a veicoli
FR15: L'Admin/Fleet Manager puo importare dipendenti da file (CSV/Excel)
FR16: L'Admin/Fleet Manager puo aggiungere un veicolo operativo al proprio tenant selezionandolo dal catalogo globale InfocarData
FR17: L'Admin/Fleet Manager puo specificare i dati operativi del veicolo tenant (targa, data immatricolazione, assegnazione dipendente, stato)
FR18: Il sistema associa automaticamente i dati tecnici e l'immagine dal catalogo InfocarData/Codall al veicolo operativo
FR19: L'Admin/Fleet Manager puo gestire lo storico targhe di un veicolo (ritargatura)
FR20: L'Admin/Fleet Manager puo gestire i documenti associati a un veicolo (assicurazione, revisione, etc.)
FR21: L'Admin/Fleet Manager puo creare contratti di tipo Proprietario, Breve Termine, Lungo Termine o Leasing Finanziario per un veicolo
FR22: L'Admin/Fleet Manager puo gestire la successione temporale di contratti su un veicolo (nesting/matrioska)
FR23: Ogni tipo contratto espone i campi specifici della propria tipologia (es. franchise km, canone, scadenza, fornitore)
FR24: L'Admin/Fleet Manager puo visualizzare lo stato contrattuale di tutti i veicoli del tenant
FR25: L'Admin/Fleet Manager puo creare e gestire carlist (raggruppamenti di veicoli con nome)
FR26: L'Admin/Fleet Manager puo assegnare veicoli a una o piu carlist
FR27: L'Admin/Fleet Manager/Driver puo inserire manualmente un rifornimento (veicolo, data, tipo carburante, quantita, importo, km) - il Driver solo per il proprio veicolo
FR28: L'Admin/Fleet Manager puo importare rifornimenti da file (CSV/Excel)
FR29: L'Admin/Fleet Manager/Driver puo inserire una rilevazione chilometrica in una sezione dedicata, indipendente dal rifornimento - il Driver solo per il proprio veicolo
FR30: Il sistema utilizza le rilevazioni chilometriche (sia da rifornimento che da sezione dedicata) per i calcoli di emissione e i report
FR31: L'Admin/Fleet Manager puo visualizzare e correggere rifornimenti e rilevazioni km. Il Driver puo visualizzare i propri rifornimenti e le proprie rilevazioni km
FR32: Il sistema puo calcolare le emissioni teoriche di un veicolo (gCO2e/km da InfocarData x km percorsi)
FR33: Il sistema puo calcolare le emissioni reali di un veicolo (quantita carburante rifornita x fattore di emissione per tipo carburante)
FR34: Il sistema puo confrontare emissioni teoriche e reali evidenziando il delta
FR35: L'Admin puo gestire la tabella dei fattori di emissione per tipo carburante (fonte ISPRA/DEFRA) con data di efficacia
FR36: L'Admin/Fleet Manager puo configurare un target di emissioni per la flotta o per carlist
FR37: Il sistema puo aggregare le emissioni per veicolo, carlist, tipo carburante e periodo temporale
FR38: Il Fleet Manager puo generare report emissioni con doppio calcolo (teorico + reale) per periodo e aggregazione
FR39: Il Fleet Manager puo visualizzare il progresso verso il target configurato
FR40: Il Fleet Manager puo esportare report certificabili in formato PDF e CSV con metodologia di calcolo inclusa
FR41: Il Fleet Manager puo effettuare drill-down dai report aggregati al dettaglio per veicolo/carlist
FR42: Il Fleet Manager puo visualizzare una dashboard con KPI principali: emissioni correnti, trend, progresso vs target, notifiche
FR43: Il Driver puo visualizzare una dashboard personale con il proprio veicolo, km percorsi, emissioni personali e stato documenti
FR44: Il sistema puo mostrare l'immagine del veicolo (da Codall) nelle viste di dettaglio
FR45: Il Fleet Manager puo visualizzare lo stato di tutti i veicoli, contratti e dipendenti del proprio tenant

### NonFunctional Requirements

NFR1: Le azioni utente standard (navigazione, CRUD, ricerca) completano in meno di 1 secondo per il 95esimo percentile
NFR2: La generazione di report emissioni aggregati completa in meno di 3 secondi per flotte fino a 500 veicoli con 3 anni di storico
NFR3: La dashboard Fleet Manager carica con KPI aggiornati in meno di 2 secondi
NFR4: L'import CSV/Excel di rifornimenti processa fino a 10.000 righe in meno di 30 secondi
NFR5: Il sistema supporta almeno 50 utenti concorrenti per tenant senza degradazione percepibile
NFR6: Isolamento multitenant: zero data leak tra tenant in tutti gli scenari (query, report, export, API). Test automatici di leak detection obbligatori
NFR7: Tutti i dati in transito sono protetti con TLS 1.2+
NFR8: Tutti i dati a riposo (database, backup, file) sono cifrati
NFR9: Autenticazione con password policy robusta (minimo 12 caratteri, complessita). Predisposizione per SSO/OIDC futuro
NFR10: Ogni modifica a dati che impattano le emissioni (km, rifornimenti, fattori emissione, dati tecnici) tracciata con audit trail: chi, quando, valore precedente, valore nuovo
NFR11: Conformita GDPR per dati dei driver: consenso, data retention policy, diritto all'oblio, minimizzazione dati
NFR12: Enforcement RBAC a livello API - nessun bypass possibile dalla UI
NFR13: Row-Level Security SQL Server come seconda linea di difesa per isolamento tenant
NFR14: Il sistema supporta fino a 20 tenant attivi con 500 veicoli ciascuno (10.000 veicoli totali) senza re-architettura
NFR15: Il volume dati cresce linearmente (rifornimenti, km, audit) senza degradazione: il sistema mantiene le performance con 3+ anni di storico per tenant
NFR16: Scalabilita orizzontale sui container applicativi, verticale sul database
NFR17: Metriche per-tenant (query count, storage, utenti attivi) disponibili per capacity planning
NFR18: Disponibilita 99.5% durante orario lavorativo (lun-ven 8:00-20:00)
NFR19: Recovery Point Objective (RPO): massimo 1 ora di dati persi in caso di disaster
NFR20: Recovery Time Objective (RTO): massimo 4 ore per ripristino completo
NFR21: I calcoli emissioni producono risultati deterministici e riproducibili: stesso input = stesso output, sempre
NFR22: Il sistema gestisce graceful degradation in caso di indisponibilita dei servizi esterni (InfocarData, Codall) senza bloccare le operazioni core
NFR23: L'integrazione con InfocarData supporta import batch e aggiornamenti incrementali del catalogo veicoli
NFR24: L'integrazione con Codall gestisce timeout e immagini non disponibili con fallback (icona placeholder)
NFR25: Il parsing XML fatture supporta formati eterogenei senza hardcoding, con configurazione per fornitore
NFR26: Import/export CSV supporta encoding UTF-8 e separatori configurabili
NFR27: Architettura API-first: ogni entita esposta via REST API, pronta per integrazioni future (telematica, ERP)

### Additional Requirements

**Da Architecture — Starter e Infrastruttura:**
- Starter template: `create-next-app@16` + `shadcn@latest init` + Prisma 7.x + Better Auth (prima story di implementazione)
- Docker setup: docker-compose con app (Next.js standalone) + SQL Server
- Prisma client extension per auto-filter tenantId su ogni query e insert
- RLS SQL Server con SESSION_CONTEXT come seconda linea di difesa
- Better Auth con organization plugin (Organization = Tenant, 3 ruoli)
- Environment: .env.local (dev), .env.production (prod)
- Logging: Pino per logging strutturato JSON in produzione
- Backup SQL Server automatizzato per RPO 1h

**Da Architecture — Pattern Implementativi:**
- Server Actions per mutations, Route Handlers solo per endpoints esterni (export PDF, webhook, Codall proxy)
- ActionResult<T> pattern per error handling tipizzato su ogni Server Action
- Zod schema condivisi tra frontend (React Hook Form) e backend (Server Action validation)
- React Server Components come pattern primario di data fetching
- React Hook Form + Zod + shadcn/ui Form per ogni form
- Recharts via shadcn/ui Charts per grafici emissioni
- TanStack Table + shadcn/ui DataTable per tabelle dati
- Feature-based directory structure dentro App Router
- Librerie da valutare: PDF generation (react-pdf/puppeteer), XML parsing (fast-xml-parser), testing (Vitest), CSV (papaparse)

**Da Architecture — Sequenza di Implementazione:**
1. Scaffold progetto (create-next-app + shadcn/ui + Prisma + Better Auth)
2. Schema Prisma con modello multi-tenant + RLS SQL Server
3. Better Auth setup con organization plugin + RBAC
4. Middleware auth + tenant injection nel Prisma client
5. CRUD base (veicoli, motori, contratti) con Server Actions
6. Import InfocarData + Codall integration
7. Calcolo emissioni (teorico + reale)
8. Dashboard + report con Recharts
9. Import/Export (CSV, XML, PDF)
10. Feature toggle, audit trail, polish

**Da UX Design — Componenti Custom:**
- KPICard: hero metric con trend arrow + sparkline (varianti: default, compact, hero)
- DeltaBar: barra comparativa emissioni teoriche vs reali (varianti: inline, full, mini)
- ProgressTarget: progress bar con milestone per target emissioni
- FuelFeed: feed cronologico rifornimenti stile Revolut (varianti: full, compact, validation)
- VehicleHeader: header pagina veicolo con foto Codall + dati chiave + KPI sidebar
- StatusBadge: badge stato unificato per matching, contratti, documenti, veicoli
- EmptyState: stato vuoto con azione suggerita (varianti: action, info, permission)

**Da UX Design — Design System e Visual:**
- Palette Greenfleet: teal 600 primary (hsl 168, 76%, 28%), palette semantica (success/warning/destructive/info)
- Typography: Inter, scale da hero (36px) a small (12px), tabular-nums per KPI
- Layout: sidebar 256px (collapsabile a 64px), content max-width 1280px, spacing base 4px
- Dark mode nativo via Tailwind dark variant + CSS variables
- Accessibilita WCAG 2.1 AA (contrasto 4.5:1, keyboard nav, screen reader, focus visible)

**Da UX Design — Pattern di Interazione:**
- Button hierarchy: Primary (una per vista) / Secondary / Ghost / Destructive (con conferma)
- Feedback: Toast (auto-dismiss 5s successo, persistente errori), inline validation on-blur, skeleton loading
- Form: grid 2 colonne desktop, label sopra input, Record Type per contratti, import CSV con preview + validazione
- Navigation: sidebar con sezioni raggruppate, breadcrumb sempre visibile, drill-down progressivo, tabs veicolo
- DataTable: sorting, filtri come chip, search debounce 300ms, paginazione 50 righe default, azioni riga
- Responsive: desktop-first, tablet (sidebar collassata), mobile (bottom nav per Driver, card-view per tabelle)
- Formattazione: numeri locale IT (1.234,56), date dd MMM yyyy, targhe mono uppercase, emissioni con unita

**Da Brainstorming — Requisiti Aggiuntivi (non gia coperti da PRD):**
- Pool come pseudo-driver per veicoli condivisi (idea #2)
- Seed data e demo tenant precaricato per onboarding e prospect (idea #69)
- Standard WLTP vs NEDC con coefficiente di conversione per comparabilita (idea #40)

### FR Coverage Map

| FR | Epic | Descrizione |
|---|---|---|
| FR1 | Epic 2 | Import/sync dati tecnici da InfocarData |
| FR2 | Epic 2 | Recupero immagini veicolo da Codall |
| FR3 | Epic 2 | Ricerca e selezione veicoli dal catalogo InfocarData |
| FR4 | Epic 2 | Inserimento manuale veicoli non censiti |
| FR5 | Epic 2 | Esposizione dati principali veicolo nel catalogo |
| FR6 | Epic 1 | CRUD societa/tenant |
| FR7 | Epic 1 | Configurazione feature per tenant |
| FR8 | Epic 1 | Isolamento dati cross-tenant |
| FR9 | Epic 1 | Gestione utenze Admin/FM/Driver (Admin) |
| FR10 | Epic 1 | Gestione utenze FM/Driver (Fleet Manager) |
| FR11 | Epic 1 | Permessi FM limitati al proprio tenant |
| FR12 | Epic 1 | Vista read-only Driver |
| FR13 | Epic 3 | CRUD dipendenti |
| FR14 | Epic 3 | Assegnazione dipendenti a veicoli |
| FR15 | Epic 3 | Import dipendenti CSV/Excel |
| FR16 | Epic 3 | Aggiunta veicolo operativo da catalogo globale |
| FR17 | Epic 3 | Dati operativi veicolo tenant (targa, immatricolazione, stato) |
| FR18 | Epic 3 | Associazione automatica dati tecnici/immagine da catalogo |
| FR19 | Epic 3 | Storico targhe (ritargatura) |
| FR20 | Epic 3 | Documenti associati a veicolo |
| FR21 | Epic 4 | Creazione contratti 4 tipi |
| FR22 | Epic 4 | Successione temporale contratti (nesting/matrioska) |
| FR23 | Epic 4 | Campi specifici per tipologia contratto |
| FR24 | Epic 4 | Vista stato contrattuale complessiva |
| FR25 | Epic 3 | CRUD carlist |
| FR26 | Epic 3 | Assegnazione veicoli a carlist |
| FR27 | Epic 5 | Inserimento manuale rifornimento |
| FR28 | Epic 5 | Import rifornimenti CSV/Excel |
| FR29 | Epic 5 | Rilevazione chilometrica dedicata |
| FR30 | Epic 5 | Utilizzo rilevazioni km per calcoli e report |
| FR31 | Epic 5 | Visualizzazione e correzione rifornimenti/km |
| FR32 | Epic 6 | Calcolo emissioni teoriche |
| FR33 | Epic 6 | Calcolo emissioni reali |
| FR34 | Epic 6 | Confronto emissioni teoriche vs reali (delta) |
| FR35 | Epic 6 | Gestione fattori emissione per carburante |
| FR36 | Epic 6 | Target emissioni per flotta/carlist |
| FR37 | Epic 6 | Aggregazione emissioni per veicolo/carlist/carburante/periodo |
| FR38 | Epic 6 | Report emissioni doppio calcolo |
| FR39 | Epic 6 | Progresso verso target configurato |
| FR40 | Epic 6 | Export report certificabili PDF/CSV |
| FR41 | Epic 6 | Drill-down da aggregato a dettaglio |
| FR42 | Epic 7 | Dashboard Fleet Manager con KPI |
| FR43 | Epic 7 | Dashboard personale Driver |
| FR44 | Epic 2 | Immagine veicolo nelle viste di dettaglio |
| FR45 | Epic 3 | Vista stato globale veicoli/contratti/dipendenti |

## Epic List

### Epic 1: Piattaforma Multi-Tenant & Autenticazione
L'Admin puo creare e gestire societa (tenant), configurare le feature abilitate per ciascuno, e gestire utenti con ruoli differenziati (Admin, Fleet Manager, Driver). Ogni tenant opera in completo isolamento dati. Include lo scaffold del progetto, Docker, Prisma, Better Auth, RBAC e RLS.

**FRs coperti:** FR6, FR7, FR8, FR9, FR10, FR11, FR12
**NFRs chiave:** NFR6 (isolamento tenant), NFR7-NFR8 (encryption), NFR9 (password policy), NFR11 (GDPR), NFR12 (RBAC API-level), NFR13 (RLS)
**Requisiti aggiuntivi:** Scaffold (create-next-app + shadcn + Prisma + Better Auth), Docker compose, Pino logging, seed data/demo tenant
**Dipendenze:** Nessuna (epic fondazionale)

---

### Epic 2: Catalogo Veicoli Globale
L'Admin puo importare e sincronizzare il catalogo veicoli da InfocarData, recuperare immagini da Codall, cercare e selezionare veicoli, e integrare manualmente veicoli non censiti. Ogni veicolo espone i dati tecnici completi (marca, modello, motori, emissioni CO2, consumi).

**FRs coperti:** FR1, FR2, FR3, FR4, FR5, FR44
**NFRs chiave:** NFR22 (graceful degradation servizi esterni), NFR23 (batch/incrementale InfocarData), NFR24 (fallback immagini Codall)
**Requisiti aggiuntivi:** Conversione WLTP/NEDC con coefficiente, VehicleHeader component
**Dipendenze:** Epic 1

---

### Epic 3: Gestione Flotta Operativa
Il Fleet Manager puo gestire la propria flotta: aggiungere veicoli dal catalogo globale specificando dati operativi (targa, immatricolazione, assegnazione), gestire dipendenti (CRUD + import CSV), organizzare veicoli in carlist, gestire documenti veicolo e storico targhe. Vista complessiva dello stato flotta.

**FRs coperti:** FR13, FR14, FR15, FR16, FR17, FR18, FR19, FR20, FR25, FR26, FR45
**NFRs chiave:** NFR1 (performance <1s), NFR4 (import CSV <30s), NFR26 (CSV UTF-8)
**Requisiti aggiuntivi:** Pool come pseudo-driver per veicoli condivisi, StatusBadge component, EmptyState component
**Dipendenze:** Epic 1, Epic 2

---

### Epic 4: Contratti Veicoli
Il Fleet Manager puo gestire il ciclo di vita contrattuale dei veicoli: creare contratti dei 4 tipi (Proprietario, Breve Termine, Lungo Termine, Leasing Finanziario), gestire la successione temporale (nesting/matrioska), visualizzare lo stato contrattuale complessivo. Ogni tipo espone i campi specifici della propria tipologia.

**FRs coperti:** FR21, FR22, FR23, FR24
**NFRs chiave:** NFR25 (XML fatture configurabile per fornitore)
**Dipendenze:** Epic 3

---

### Epic 5: Rifornimenti & Rilevazioni Chilometriche
Admin, Fleet Manager e Driver possono tracciare rifornimenti (manuale + import CSV) e rilevazioni km (sezione dedicata indipendente). Possibilita di correzione e visualizzazione, con il Driver limitato ai propri dati. I dati alimentano il calcolo emissioni.

**FRs coperti:** FR27, FR28, FR29, FR30, FR31
**NFRs chiave:** NFR4 (import 10K righe <30s), NFR10 (audit trail modifiche), NFR26 (CSV UTF-8)
**Requisiti aggiuntivi:** FuelFeed component
**Dipendenze:** Epic 3

---

### Epic 6: Calcolo Emissioni & Reportistica
Il Fleet Manager puo calcolare le emissioni con doppio metodo (teorico: gCO2e/km x km percorsi; reale: carburante x fattore emissione), confrontare con delta, configurare target per flotta/carlist, aggregare per veicolo/carlist/carburante/periodo, generare report con drill-down, ed esportare report certificabili in PDF e CSV con metodologia inclusa.

**FRs coperti:** FR32, FR33, FR34, FR35, FR36, FR37, FR38, FR39, FR40, FR41
**NFRs chiave:** NFR2 (report <3s per 500 veicoli x 3 anni), NFR21 (calcoli deterministici/riproducibili)
**Requisiti aggiuntivi:** DeltaBar component, ProgressTarget component, Recharts via shadcn/ui Charts
**Dipendenze:** Epic 2, Epic 3, Epic 5

---

### Epic 7: Dashboard & Esperienza Utente Finale
Il Fleet Manager visualizza una dashboard con KPI principali (emissioni correnti, trend, progresso vs target, notifiche). Il Driver ha una dashboard personale con veicolo assegnato, km percorsi, emissioni personali e stato documenti. Include polish finale, feature toggle e audit trail completo.

**FRs coperti:** FR42, FR43
**NFRs chiave:** NFR3 (dashboard <2s), NFR10 (audit trail completo), NFR17 (metriche per-tenant)
**Requisiti aggiuntivi:** KPICard component, design system completo (palette Greenfleet, dark mode, responsive), feature toggle
**Dipendenze:** Epic 3, Epic 5, Epic 6

---

### Grafo Dipendenze

```
Epic 1 (Multi-Tenant & Auth)
  └─> Epic 2 (Catalogo Veicoli)
        └─> Epic 3 (Gestione Flotta)
              ├─> Epic 4 (Contratti)
              ├─> Epic 5 (Rifornimenti & Km)
              │     └─> Epic 6 (Emissioni & Report)
              │           └─> Epic 7 (Dashboard)
              └─────────────> Epic 7 (Dashboard)
```

---

## Epic 1: Piattaforma Multi-Tenant & Autenticazione

### Story 1.1: Scaffold Progetto con Autenticazione Base

As a **Utente**,
I want **registrarmi e autenticarmi sulla piattaforma Greenfleet**,
So that **posso accedere in modo sicuro alle funzionalita della piattaforma**.

**Acceptance Criteria:**

**Given** un ambiente di sviluppo vuoto
**When** il progetto viene inizializzato
**Then** l'applicazione Next.js 16 e funzionante con shadcn/ui, Prisma 7 configurato per SQL Server, Docker compose (app + SQL Server), Pino logging, e struttura directory feature-based
**And** esiste una pagina di login e registrazione funzionanti con Better Auth
**And** la password policy richiede minimo 12 caratteri con complessita (NFR9)
**And** tutti i dati in transito sono protetti con TLS 1.2+ (NFR7)
**And** la sessione utente e gestita correttamente con cookie sicuri

### Story 1.2: Gestione Multi-Tenant con Organizzazioni

As a **Admin**,
I want **creare, modificare e disattivare societa (tenant) sulla piattaforma**,
So that **ogni azienda cliente abbia il proprio spazio di lavoro isolato**.

**Acceptance Criteria:**

**Given** un Admin autenticato
**When** crea una nuova societa specificando nome e configurazione
**Then** una nuova Organization viene creata tramite Better Auth organization plugin
**And** il Prisma schema include tenantId su tutte le entita multi-tenant
**And** il Prisma client extension applica automaticamente il filtro tenantId su ogni query e insert
**And** l'Admin puo modificare i dati della societa e disattivarla
**And** le societa disattivate non permettono login ai propri utenti (FR6)

### Story 1.3: Isolamento Dati Tenant e RLS

As a **Admin**,
I want **la garanzia che nessun dato sia accessibile tra tenant diversi**,
So that **ogni azienda operi in completo isolamento e sicurezza**.

**Acceptance Criteria:**

**Given** due o piu tenant esistenti con dati propri
**When** un utente del Tenant A esegue qualsiasi query
**Then** zero dati del Tenant B sono visibili o accessibili (NFR6)
**And** Row-Level Security SQL Server e configurata con SESSION_CONTEXT come seconda linea di difesa (NFR13)
**And** esistono test automatici di leak detection che verificano l'isolamento su query, API e report
**And** i dati a riposo (database, backup) sono cifrati (NFR8)

### Story 1.4: Gestione Utenti e Ruoli RBAC

As a **Admin**,
I want **creare e gestire utenti con ruoli Admin, Fleet Manager o Driver su qualsiasi tenant**,
So that **ogni utente abbia l'accesso appropriato alle funzionalita della piattaforma**.

**Acceptance Criteria:**

**Given** un Admin autenticato
**When** crea un utente specificando ruolo (Admin/Fleet Manager/Driver) e tenant
**Then** l'utente viene creato con il ruolo assegnato nell'organizzazione corretta (FR9)
**And** il Fleet Manager puo creare e gestire utenti FM e Driver solo sul proprio tenant (FR10)
**And** il Fleet Manager puo eseguire tutte le operazioni Admin limitate al proprio tenant (FR11)
**And** il Driver puo visualizzare in sola lettura solo i propri dati (FR12)
**And** l'enforcement RBAC e a livello API — nessun bypass possibile dalla UI (NFR12)
**And** il middleware auth inietta il tenant context nel Prisma client ad ogni richiesta

### Story 1.5: Configurazione Feature per Tenant

As a **Admin**,
I want **configurare le feature abilitate per ogni tenant**,
So that **posso offrire livelli di servizio differenziati a ciascuna azienda cliente**.

**Acceptance Criteria:**

**Given** un Admin autenticato nella gestione di un tenant
**When** abilita o disabilita una feature per quel tenant
**Then** la feature e immediatamente visibile/nascosta per tutti gli utenti del tenant (FR7)
**And** le feature disabilitate non sono accessibili ne da UI ne da API
**And** la configurazione feature e persistita nel database e caricata ad ogni sessione
**And** esiste un elenco predefinito di feature toggle corrispondenti ai moduli della piattaforma

### Story 1.6: Seed Data e Demo Tenant

As a **Admin**,
I want **un tenant demo precaricato con dati di esempio**,
So that **posso dimostrare la piattaforma a prospect e facilitare l'onboarding**.

**Acceptance Criteria:**

**Given** un'installazione fresh della piattaforma
**When** viene eseguito il seed
**Then** viene creato un tenant demo con nome "Greenfleet Demo"
**And** il tenant demo contiene utenti esempio per ogni ruolo (Admin, FM, Driver)
**And** il tenant demo e marcato come demo e non cancellabile
**And** il seed e idempotente (eseguibile piu volte senza duplicati)
**And** la conformita GDPR e garantita — i dati demo non contengono dati personali reali (NFR11)

---

## Epic 2: Catalogo Veicoli Globale

### Story 2.1: Schema Catalogo e Import Dati InfocarData

As a **Admin**,
I want **importare e sincronizzare i dati tecnici dei veicoli dalla banca dati InfocarData**,
So that **il catalogo globale Greenfleet contenga informazioni tecniche accurate e aggiornate**.

**Acceptance Criteria:**

**Given** un Admin autenticato con accesso al modulo catalogo
**When** avvia un import dalla banca dati InfocarData
**Then** i dati tecnici dei veicoli vengono importati: identificazione, dati tecnici base, motori, prestazioni, emissioni CO2, consumi (FR1)
**And** il sistema espone per ogni veicolo: marca, modello, allestimento, carrozzeria, normativa anti-inquinamento, motori (tipo combustibile, cilindrata, potenza KW/CV), emissioni CO2 g/km (WLTP/NEDC), consumi, capacita serbatoio, flag ibrido (FR5)
**And** l'import supporta sia batch iniziale che aggiornamenti incrementali (NFR23)
**And** il sistema gestisce graceful degradation in caso di indisponibilita InfocarData senza bloccare le operazioni core (NFR22)
**And** lo schema Prisma include le tabelle catalogo veicoli, motori e dati tecnici

### Story 2.2: Ricerca e Selezione Veicoli dal Catalogo

As a **Admin**,
I want **cercare e selezionare veicoli dal catalogo InfocarData**,
So that **posso trovare rapidamente i veicoli da aggiungere al catalogo globale Greenfleet**.

**Acceptance Criteria:**

**Given** un Admin autenticato nel modulo catalogo
**When** effettua una ricerca per marca, modello, allestimento o altri criteri
**Then** i risultati vengono visualizzati in una DataTable con sorting, filtri e paginazione (FR3)
**And** la ricerca completa in meno di 1 secondo per il 95esimo percentile (NFR1)
**And** il search ha debounce 300ms
**And** l'Admin puo selezionare un veicolo per visualizzarne il dettaglio completo
**And** i dati sono formattati con numeri in locale IT (1.234,56), emissioni con unita g/km

### Story 2.3: Integrazione Immagini Codall

As a **Admin**,
I want **che il sistema recuperi automaticamente l'immagine del veicolo dal servizio Codall**,
So that **ogni veicolo nel catalogo abbia una rappresentazione visiva per facilitare l'identificazione**.

**Acceptance Criteria:**

**Given** un veicolo presente nel catalogo con codice allestimento
**When** il sistema richiede l'immagine a Codall a partire dal codice allestimento e data di registrazione
**Then** l'immagine viene recuperata e associata al veicolo (FR2)
**And** l'immagine e visibile nelle viste di dettaglio tramite il componente VehicleHeader (FR44)
**And** in caso di timeout o immagine non disponibile, viene mostrata un'icona placeholder (NFR24)
**And** le immagini sono cachate localmente per evitare richieste ripetute
**And** il Route Handler proxy per Codall gestisce errori e retry con graceful degradation

### Story 2.4: Inserimento Manuale Veicoli

As a **Admin**,
I want **integrare manualmente dati di veicoli non presenti in InfocarData**,
So that **posso gestire nel catalogo anche veicoli speciali o non ancora censiti**.

**Acceptance Criteria:**

**Given** un Admin autenticato nel modulo catalogo
**When** inserisce manualmente i dati di un veicolo (marca, modello, allestimento, motori, emissioni, consumi)
**Then** il veicolo viene salvato nel catalogo globale con gli stessi campi dei veicoli importati (FR4)
**And** il form utilizza React Hook Form + Zod per validazione frontend e backend
**And** il form ha layout a 2 colonne su desktop con label sopra input
**And** i campi obbligatori sono validati con inline validation on-blur
**And** il veicolo manuale e distinguibile da quelli importati tramite un flag sorgente

### Story 2.5: Gestione Standard Emissioni WLTP vs NEDC

As a **Admin**,
I want **gestire entrambi gli standard di emissione WLTP e NEDC con conversione automatica**,
So that **i dati di emissione siano comparabili indipendentemente dallo standard di origine**.

**Acceptance Criteria:**

**Given** un veicolo nel catalogo con dati emissione in uno dei due standard
**When** il sistema visualizza o utilizza i dati di emissione
**Then** entrambi i valori (WLTP e NEDC) sono disponibili, con quello mancante calcolato tramite coefficiente di conversione
**And** il coefficiente di conversione e configurabile dall'Admin
**And** lo standard di origine e sempre indicato chiaramente
**And** i calcoli di emissione successivi utilizzano il valore WLTP come default

---

## Epic 3: Gestione Flotta Operativa

### Story 3.1: CRUD Dipendenti

As a **Fleet Manager**,
I want **creare, modificare e disattivare dipendenti nel mio tenant**,
So that **posso gestire l'anagrafica dei conducenti della mia flotta**.

**Acceptance Criteria:**

**Given** un Fleet Manager autenticato sul proprio tenant
**When** crea un nuovo dipendente specificando dati anagrafici
**Then** il dipendente viene salvato con tenantId automatico (FR13)
**And** il FM puo modificare i dati del dipendente
**And** il FM puo disattivare un dipendente (soft delete, non cancellazione fisica)
**And** i dipendenti disattivati non sono selezionabili per nuove assegnazioni ma restano nello storico
**And** il form utilizza React Hook Form + Zod con validazione on-blur
**And** la lista dipendenti e visualizzata in DataTable con sorting, filtri e paginazione
**And** l'Admin puo eseguire le stesse operazioni su qualsiasi tenant

### Story 3.2: Import Dipendenti da CSV/Excel

As a **Fleet Manager**,
I want **importare dipendenti da file CSV o Excel**,
So that **posso caricare massivamente l'anagrafica senza inserimento manuale uno per uno**.

**Acceptance Criteria:**

**Given** un Fleet Manager con un file CSV/Excel contenente dati dipendenti
**When** carica il file tramite il flusso di import
**Then** il sistema mostra un'anteprima dei dati con validazione pre-import (FR15)
**And** il flusso segue i 6 step: upload, mapping colonne, anteprima, validazione, conferma, risultato
**And** l'import supporta encoding UTF-8 e separatori configurabili (NFR26)
**And** gli errori di validazione sono evidenziati riga per riga con possibilita di correzione
**And** l'import di 10.000 righe completa in meno di 30 secondi (NFR4)

### Story 3.3: Aggiunta Veicolo Operativo da Catalogo

As a **Fleet Manager**,
I want **aggiungere un veicolo operativo al mio tenant selezionandolo dal catalogo globale**,
So that **posso iniziare a tracciare un nuovo veicolo nella mia flotta con tutti i dati tecnici precompilati**.

**Acceptance Criteria:**

**Given** un Fleet Manager autenticato sul proprio tenant
**When** seleziona un veicolo dal catalogo globale e specifica i dati operativi (targa, data immatricolazione, stato)
**Then** il veicolo operativo viene creato nel tenant con associazione automatica dei dati tecnici e immagine dal catalogo (FR16, FR17, FR18)
**And** i dati tecnici (emissioni, consumi, motori) sono ereditati dal catalogo e non modificabili
**And** i dati operativi (targa, immatricolazione, assegnazione, stato) sono editabili dal FM
**And** la targa e formattata in maiuscolo monospace
**And** il veicolo appare nella lista veicoli del tenant

### Story 3.4: Assegnazione Dipendenti a Veicoli

As a **Fleet Manager**,
I want **assegnare dipendenti a veicoli**,
So that **posso tracciare chi utilizza quale veicolo nella mia flotta**.

**Acceptance Criteria:**

**Given** un Fleet Manager con dipendenti e veicoli nel proprio tenant
**When** assegna un dipendente a un veicolo
**Then** l'assegnazione viene salvata con data di inizio (FR14)
**And** un veicolo puo avere un solo dipendente assegnato alla volta (o Pool per veicoli condivisi)
**And** lo storico delle assegnazioni precedenti e mantenuto
**And** il dipendente assegnato e visibile nella vista dettaglio del veicolo
**And** il veicolo assegnato e visibile nella vista dettaglio del dipendente

### Story 3.5: Pool Pseudo-Driver per Veicoli Condivisi

As a **Fleet Manager**,
I want **assegnare veicoli condivisi a un Pool invece che a un singolo dipendente**,
So that **posso gestire veicoli usati da piu persone senza creare assegnazioni fittizie**.

**Acceptance Criteria:**

**Given** un Fleet Manager con veicoli condivisi nel proprio tenant
**When** assegna un veicolo al Pool
**Then** il veicolo risulta assegnato a "Pool" come pseudo-driver
**And** il Pool e disponibile come opzione di assegnazione in ogni tenant
**And** i veicoli Pool sono distinguibili visivamente nella lista veicoli tramite StatusBadge
**And** i veicoli Pool partecipano normalmente ai calcoli di emissione e report

### Story 3.6: Storico Targhe e Ritargatura

As a **Fleet Manager**,
I want **gestire lo storico targhe di un veicolo in caso di ritargatura**,
So that **posso mantenere la tracciabilita del veicolo anche dopo un cambio targa**.

**Acceptance Criteria:**

**Given** un Fleet Manager con un veicolo operativo nel proprio tenant
**When** registra una ritargatura specificando nuova targa e data
**Then** la targa precedente viene archiviata nello storico con data inizio e data fine (FR19)
**And** la targa corrente e sempre quella piu recente
**And** lo storico targhe e visibile nella vista dettaglio del veicolo
**And** la ricerca veicoli funziona anche per targhe storiche

### Story 3.7: Documenti Veicolo

As a **Fleet Manager**,
I want **gestire i documenti associati a un veicolo (assicurazione, revisione, etc.)**,
So that **posso tracciare le scadenze documentali e mantenere la conformita della flotta**.

**Acceptance Criteria:**

**Given** un Fleet Manager con un veicolo operativo nel proprio tenant
**When** aggiunge un documento specificando tipo, data scadenza e allegato
**Then** il documento viene associato al veicolo con tipo, scadenza e file allegato (FR20)
**And** i documenti in scadenza sono evidenziati tramite StatusBadge (warning/destructive)
**And** il FM puo visualizzare, modificare e rimuovere documenti
**And** i tipi documento includono almeno: assicurazione, revisione, bollo, carta di circolazione
**And** i documenti sono accessibili dalla vista dettaglio veicolo in un tab dedicato

### Story 3.8: Gestione Carlist

As a **Fleet Manager**,
I want **creare e gestire carlist (raggruppamenti di veicoli con nome)**,
So that **posso organizzare la flotta in gruppi logici per analisi e reportistica**.

**Acceptance Criteria:**

**Given** un Fleet Manager autenticato sul proprio tenant
**When** crea una carlist specificando nome e veicoli
**Then** la carlist viene salvata con nome e lista veicoli associati (FR25)
**And** un veicolo puo appartenere a piu carlist contemporaneamente (FR26)
**And** il FM puo aggiungere e rimuovere veicoli dalle carlist
**And** il FM puo rinominare e cancellare carlist
**And** le carlist sono disponibili come filtro nelle viste veicoli e nei report

### Story 3.9: Vista Stato Flotta Complessiva

As a **Fleet Manager**,
I want **visualizzare lo stato complessivo di tutti i veicoli, contratti e dipendenti del mio tenant**,
So that **posso avere una panoramica immediata della situazione della mia flotta**.

**Acceptance Criteria:**

**Given** un Fleet Manager autenticato sul proprio tenant
**When** accede alla vista stato flotta
**Then** visualizza tutti i veicoli con stato corrente (attivo/inattivo, assegnato/libero) (FR45)
**And** visualizza lo stato contrattuale di ogni veicolo
**And** visualizza i dipendenti con lo stato di assegnazione
**And** la vista supporta filtri, sorting e ricerca
**And** gli stati sono rappresentati con StatusBadge coerente
**And** la vista mostra EmptyState appropriato quando non ci sono dati

---

## Epic 4: Contratti Veicoli

### Story 4.1: Creazione Contratti con Tipi Specifici

As a **Fleet Manager**,
I want **creare contratti per i veicoli scegliendo tra Proprietario, Breve Termine, Lungo Termine o Leasing Finanziario**,
So that **posso registrare la situazione contrattuale di ogni veicolo della flotta**.

**Acceptance Criteria:**

**Given** un Fleet Manager con un veicolo operativo nel proprio tenant
**When** crea un nuovo contratto selezionando il tipo tramite Record Type selector
**Then** il form mostra i campi specifici della tipologia selezionata (FR21, FR23)
**And** il tipo Proprietario include: data acquisto, prezzo, valore residuo
**And** il tipo Breve Termine include: fornitore, data inizio/fine, canone giornaliero, km inclusi
**And** il tipo Lungo Termine include: fornitore, data inizio/fine, canone mensile, franchise km, penali km extra, servizi inclusi
**And** il tipo Leasing Finanziario include: societa leasing, data inizio/fine, canone mensile, valore riscatto, maxiscontone
**And** il form utilizza React Hook Form + Zod con validazione specifica per tipo
**And** il contratto viene salvato con associazione al veicolo e al tenant

### Story 4.2: Successione Temporale Contratti (Nesting)

As a **Fleet Manager**,
I want **gestire la successione temporale di contratti su un veicolo**,
So that **posso tracciare l'intera storia contrattuale senza perdere i dati dei contratti precedenti**.

**Acceptance Criteria:**

**Given** un veicolo con un contratto esistente
**When** il FM crea un nuovo contratto per lo stesso veicolo
**Then** il sistema gestisce la successione temporale (nesting/matrioska) (FR22)
**And** il contratto precedente viene chiuso con data fine effettiva
**And** il nuovo contratto inizia dalla data specificata
**And** lo storico contrattuale completo e visibile nella vista dettaglio veicolo
**And** non sono permesse sovrapposizioni temporali tra contratti dello stesso veicolo
**And** il FM puo modificare i contratti attivi e visualizzare quelli chiusi

### Story 4.3: Vista Stato Contrattuale

As a **Fleet Manager**,
I want **visualizzare lo stato contrattuale di tutti i veicoli del mio tenant**,
So that **posso monitorare scadenze, rinnovi e situazioni contrattuali critiche**.

**Acceptance Criteria:**

**Given** un Fleet Manager autenticato sul proprio tenant
**When** accede alla vista stato contrattuale
**Then** visualizza tutti i veicoli con il contratto attivo corrente e la scadenza (FR24)
**And** i contratti in scadenza entro 30/60/90 giorni sono evidenziati con StatusBadge warning
**And** i veicoli senza contratto attivo sono evidenziati con StatusBadge destructive
**And** la vista supporta filtri per tipo contratto, stato e scadenza
**And** il FM puo cliccare su un veicolo per vedere il dettaglio contrattuale completo
**And** la DataTable include sorting, paginazione e ricerca

---

## Epic 5: Rifornimenti & Rilevazioni Chilometriche

### Story 5.1: Inserimento Manuale Rifornimento

As a **Fleet Manager/Driver**,
I want **inserire manualmente un rifornimento per un veicolo**,
So that **posso tracciare i consumi di carburante per il calcolo delle emissioni**.

**Acceptance Criteria:**

**Given** un utente autenticato (FM o Driver)
**When** inserisce un rifornimento specificando veicolo, data, tipo carburante, quantita litri, importo euro, km
**Then** il rifornimento viene salvato con tutti i dati e il tenantId (FR27)
**And** il Driver puo inserire rifornimenti solo per il proprio veicolo assegnato
**And** il FM puo inserire rifornimenti per qualsiasi veicolo del tenant
**And** ogni modifica e tracciata con audit trail: chi, quando, valore precedente, valore nuovo (NFR10)
**And** il form ha validazione: quantita > 0, importo > 0, km >= km precedente
**And** il rifornimento appare nel FuelFeed cronologico del veicolo
**And** i numeri sono formattati in locale IT (1.234,56)

### Story 5.2: Import Rifornimenti da CSV/Excel

As a **Fleet Manager**,
I want **importare rifornimenti da file CSV o Excel**,
So that **posso caricare massivamente i dati di rifornimento senza inserimento manuale**.

**Acceptance Criteria:**

**Given** un Fleet Manager con un file CSV/Excel contenente rifornimenti
**When** carica il file tramite il flusso di import
**Then** il sistema mostra anteprima con validazione pre-import (FR28)
**And** il flusso segue i 6 step: upload, mapping colonne, anteprima, validazione, conferma, risultato
**And** l'import supporta encoding UTF-8 e separatori configurabili (NFR26)
**And** l'import di 10.000 righe completa in meno di 30 secondi (NFR4)
**And** gli errori sono evidenziati riga per riga (veicolo non trovato, targa non valida, km inconsistenti)
**And** ogni rifornimento importato e tracciato con audit trail indicando sorgente "import CSV"

### Story 5.3: Rilevazioni Chilometriche Dedicate

As a **Fleet Manager/Driver**,
I want **inserire rilevazioni chilometriche in una sezione dedicata, indipendente dal rifornimento**,
So that **posso tracciare i km percorsi anche senza un rifornimento associato**.

**Acceptance Criteria:**

**Given** un utente autenticato (FM o Driver)
**When** inserisce una rilevazione km specificando veicolo, data e km attuali
**Then** la rilevazione viene salvata nella sezione dedicata (FR29)
**And** il Driver puo inserire rilevazioni solo per il proprio veicolo
**And** il sistema utilizza le rilevazioni km (sia da rifornimento che da sezione dedicata) per calcoli e report (FR30)
**And** il sistema valida che i km inseriti siano >= all'ultima rilevazione nota
**And** ogni modifica e tracciata con audit trail (NFR10)

### Story 5.4: Visualizzazione e Correzione Rifornimenti e Km

As a **Fleet Manager**,
I want **visualizzare e correggere i rifornimenti e le rilevazioni km**,
So that **posso garantire l'accuratezza dei dati utilizzati per il calcolo emissioni**.

**Acceptance Criteria:**

**Given** un Fleet Manager autenticato sul proprio tenant
**When** accede alla vista rifornimenti o rilevazioni km
**Then** visualizza tutti i dati in DataTable con sorting, filtri e paginazione (FR31)
**And** il FM puo modificare qualsiasi rifornimento o rilevazione del tenant
**And** il Driver puo visualizzare solo i propri rifornimenti e rilevazioni (sola lettura)
**And** ogni correzione e tracciata con audit trail: valore precedente e nuovo (NFR10)
**And** i rifornimenti sono visualizzabili anche nel FuelFeed cronologico per veicolo
**And** il FuelFeed mostra variante validation per dati con anomalie (es. consumo fuori range)

---

## Epic 6: Calcolo Emissioni & Reportistica

### Story 6.1: Gestione Fattori di Emissione

As a **Admin**,
I want **gestire la tabella dei fattori di emissione per tipo carburante con data di efficacia**,
So that **i calcoli di emissione utilizzino i fattori corretti secondo fonte ISPRA/DEFRA**.

**Acceptance Criteria:**

**Given** un Admin autenticato
**When** inserisce o modifica un fattore di emissione specificando tipo carburante, valore kgCO2e/litro, fonte e data efficacia
**Then** il fattore viene salvato con storico temporale (FR35)
**And** i tipi carburante includono almeno: benzina, diesel, GPL, metano, elettrico, ibrido benzina, ibrido diesel
**And** per ogni tipo carburante possono coesistere piu fattori con date di efficacia diverse
**And** il sistema utilizza il fattore con data efficacia piu recente rispetto alla data del rifornimento
**And** ogni modifica e tracciata con audit trail (NFR10)
**And** i calcoli producono risultati deterministici e riproducibili: stesso input = stesso output (NFR21)

### Story 6.2: Calcolo Emissioni Teoriche e Reali con Delta

As a **Fleet Manager**,
I want **calcolare le emissioni di ogni veicolo con doppio metodo (teorico e reale) e confrontarle**,
So that **posso valutare l'impatto ambientale effettivo della flotta rispetto ai dati dichiarati**.

**Acceptance Criteria:**

**Given** un veicolo con dati tecnici (emissioni gCO2e/km), rilevazioni km e rifornimenti registrati
**When** il sistema calcola le emissioni
**Then** le emissioni teoriche sono calcolate come: gCO2e/km da InfocarData x km percorsi (FR32)
**And** le emissioni reali sono calcolate come: quantita carburante rifornita x fattore di emissione per tipo carburante (FR33)
**And** il sistema confronta emissioni teoriche e reali evidenziando il delta assoluto e percentuale (FR34)
**And** il delta e visualizzato tramite il componente DeltaBar
**And** i calcoli sono deterministici e riproducibili (NFR21)
**And** i risultati sono espressi in kgCO2e con precisione a 2 decimali

### Story 6.3: Target Emissioni per Flotta e Carlist

As a **Fleet Manager**,
I want **configurare un target di emissioni per la mia flotta o per singole carlist**,
So that **posso definire obiettivi di riduzione e monitorare il progresso**.

**Acceptance Criteria:**

**Given** un Fleet Manager autenticato sul proprio tenant
**When** configura un target di emissioni specificando valore obiettivo, periodo e ambito (flotta o carlist)
**Then** il target viene salvato e associato alla flotta o alla carlist specificata (FR36)
**And** il FM puo definire target annuali e/o mensili
**And** il FM puo modificare target esistenti
**And** il progresso verso il target e calcolato automaticamente
**And** il progresso e visualizzato tramite il componente ProgressTarget con milestone

### Story 6.4: Aggregazione Emissioni e Report

As a **Fleet Manager**,
I want **aggregare le emissioni e generare report con doppio calcolo per periodo e aggregazione**,
So that **posso analizzare l'impatto ambientale della flotta a diversi livelli di dettaglio**.

**Acceptance Criteria:**

**Given** un Fleet Manager con dati di emissione calcolati
**When** genera un report specificando periodo temporale e livello di aggregazione
**Then** le emissioni sono aggregate per veicolo, carlist, tipo carburante e periodo temporale (FR37)
**And** il report include doppio calcolo (teorico + reale) con delta per ogni aggregazione (FR38)
**And** la generazione di report completa in meno di 3 secondi per 500 veicoli con 3 anni di storico (NFR2)
**And** i grafici utilizzano Recharts via shadcn/ui Charts
**And** i dati sono formattati in locale IT con unita di misura appropriate

### Story 6.5: Drill-Down e Progresso Target

As a **Fleet Manager**,
I want **effettuare drill-down dai report aggregati al dettaglio e visualizzare il progresso verso il target**,
So that **posso identificare i veicoli o le carlist che contribuiscono maggiormente alle emissioni**.

**Acceptance Criteria:**

**Given** un Fleet Manager che visualizza un report aggregato
**When** clicca su un elemento del report (veicolo, carlist, periodo)
**Then** il sistema mostra il dettaglio per veicolo o carlist con emissioni individuali (FR41)
**And** il FM puo visualizzare il progresso verso il target configurato (FR39)
**And** il drill-down e progressivo: flotta > carlist > veicolo
**And** ogni livello mostra il contributo percentuale al totale
**And** il componente ProgressTarget mostra la posizione attuale rispetto al target

### Story 6.6: Export Report Certificabili PDF e CSV

As a **Fleet Manager**,
I want **esportare report certificabili in formato PDF e CSV**,
So that **posso produrre documentazione ufficiale delle emissioni con metodologia di calcolo inclusa**.

**Acceptance Criteria:**

**Given** un Fleet Manager che visualizza un report emissioni
**When** esporta il report in formato PDF o CSV
**Then** il PDF include: intestazione azienda, periodo, dati aggregati, grafici, dettaglio veicoli, metodologia di calcolo (FR40)
**And** il CSV include tutti i dati tabulari con encoding UTF-8 e separatori configurabili (NFR26)
**And** la metodologia di calcolo descrive: fonte dati tecnici, formula teorica, formula reale, fonte fattori emissione, periodo di riferimento
**And** il PDF e generato tramite Route Handler dedicato
**And** il report e scaricabile con nome file che include tenant, periodo e data generazione

---

## Epic 7: Dashboard & Esperienza Utente Finale

### Story 7.1: Dashboard Fleet Manager

As a **Fleet Manager**,
I want **visualizzare una dashboard con KPI principali della mia flotta**,
So that **posso monitorare a colpo d'occhio emissioni, trend, progresso target e notifiche**.

**Acceptance Criteria:**

**Given** un Fleet Manager autenticato sul proprio tenant
**When** accede alla dashboard principale
**Then** visualizza KPI principali tramite KPICard: emissioni correnti (mese), trend vs mese precedente, numero veicoli attivi, km totali (FR42)
**And** ogni KPICard mostra trend arrow e sparkline
**And** il progresso verso il target e visibile tramite ProgressTarget
**And** il DeltaBar hero mostra emissioni teoriche vs reali della flotta
**And** le notifiche includono: contratti in scadenza, documenti in scadenza, anomalie rifornimenti
**And** la dashboard carica con KPI aggiornati in meno di 2 secondi (NFR3)
**And** la dashboard e responsive (desktop, tablet, mobile)

### Story 7.2: Dashboard Personale Driver

As a **Driver**,
I want **visualizzare una dashboard personale con il mio veicolo, km percorsi e emissioni**,
So that **posso monitorare il mio impatto ambientale e lo stato dei miei documenti**.

**Acceptance Criteria:**

**Given** un Driver autenticato
**When** accede alla propria dashboard
**Then** visualizza il proprio veicolo assegnato con immagine Codall tramite VehicleHeader (FR43)
**And** visualizza KPI personali: km percorsi (mese), emissioni personali, ultimo rifornimento
**And** visualizza lo stato dei propri documenti (scadenze)
**And** visualizza i propri contratti attivi
**And** tutti i dati sono in sola lettura
**And** la dashboard e ottimizzata per mobile con bottom nav
**And** la dashboard carica in meno di 2 secondi (NFR3)

### Story 7.3: Design System Greenfleet e Layout Applicazione

As a **Utente**,
I want **un'interfaccia coerente, accessibile e professionale**,
So that **posso utilizzare la piattaforma in modo efficiente e intuitivo**.

**Acceptance Criteria:**

**Given** un utente autenticato su qualsiasi ruolo
**When** naviga nell'applicazione
**Then** il design system Greenfleet e applicato: palette teal 600 primary, tipografia Inter, spacing base 4px
**And** il layout include sidebar 256px (collassabile a 64px), content max-width 1280px, breadcrumb sempre visibile
**And** il dark mode e disponibile tramite toggle e rispetta le CSS variables
**And** l'accessibilita WCAG 2.1 AA e garantita: contrasto 4.5:1, keyboard nav, screen reader, focus visible
**And** i componenti custom (KPICard, DeltaBar, ProgressTarget, FuelFeed, VehicleHeader, StatusBadge, EmptyState) sono implementati e coerenti
**And** il responsive funziona su desktop (>1280px), tablet (768-1279px sidebar collassata), mobile (<768px bottom nav Driver)

### Story 7.4: Audit Trail Completo e Metriche Tenant

As a **Admin**,
I want **un audit trail completo di tutte le modifiche che impattano le emissioni e metriche per-tenant**,
So that **posso garantire la tracciabilita dei dati e pianificare la capacita della piattaforma**.

**Acceptance Criteria:**

**Given** un Admin autenticato
**When** consulta l'audit trail
**Then** ogni modifica a km, rifornimenti, fattori emissione e dati tecnici e tracciata con: chi, quando, valore precedente, valore nuovo (NFR10)
**And** l'audit trail e consultabile con filtri per entita, utente, periodo e tipo modifica
**And** le metriche per-tenant sono disponibili: query count, storage, utenti attivi (NFR17)
**And** le metriche supportano il capacity planning per i 20 tenant x 500 veicoli target (NFR14)
**And** i dati audit sono immutabili e non cancellabili
