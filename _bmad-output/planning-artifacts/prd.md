---
stepsCompleted: ['step-01-init', 'step-02-discovery', 'step-03-success', 'step-04-journeys', 'step-05-domain', 'step-06-innovation', 'step-07-project-type', 'step-08-scoping', 'step-09-functional', 'step-10-nonfunctional', 'step-11-polish', 'step-12-complete']
inputDocuments: ['_bmad-output/brainstorming/brainstorming-session-2026-02-06.md']
workflowType: 'prd'
documentCounts:
  briefs: 0
  research: 0
  brainstorming: 1
  projectDocs: 0
classification:
  projectType: saas_b2b
  domain: fleet_management_sustainability
  complexity: high
  projectContext: greenfield
---

# Product Requirements Document - Greenfleet

**Author:** Federico
**Date:** 2026-02-06

## Executive Summary

**Prodotto:** Greenfleet - piattaforma SaaS B2B multitenant per il monitoraggio e la certificazione delle emissioni delle flotte aziendali.

**Differenziatore:** Doppio calcolo emissioni (teorico da dati tecnici InfocarData + reale da rifornimenti) con delta analysis, progresso vs target configurabile, e export ESG-ready. Nessun competitor copre sia l'operativita flotta che la certificazione emissioni.

**Posizionamento:** Non "gestisco la flotta" ma "certifico le emissioni della flotta". Il buyer e il CFO/Sustainability Manager, l'utente quotidiano e il Fleet Manager.

**Utenti target:**
- **Admin** - Gestisce la piattaforma, il catalogo veicoli globale (da InfocarData), i fattori di emissione, e il provisioning dei tenant
- **Fleet Manager** - Gestisce la flotta del proprio cliente: veicoli, contratti, dipendenti, rifornimenti, report emissioni. Ha pieni poteri operativi sul proprio tenant
- **Driver** - Visualizza i propri dati, inserisce rifornimenti e rilevazioni km del proprio veicolo

**Contesto:** Greenfield. Il primo cliente migra dal tool PDF attuale (troppo complesso e lento). Flotte da 100 a 500 veicoli. Stack: Container Docker + SQL Server, API-first.

## Success Criteria

### User Success

- **Fleet Manager:** In meno di 30 secondi dall'apertura vede emissioni correnti, progresso vs target configurato, e stato di salute della flotta. Genera un report certificabile in meno di 2 minuti (vs il tool attuale che produce un PDF statico).
- **Fleet Manager:** Il matching fatture riduce il lavoro manuale di riconciliazione - i rifornimenti validati automaticamente superano l'80% del totale entro 3 mesi dall'onboarding.
- **Driver:** Accede ai propri dati (km, emissioni, documenti veicolo) senza dover chiedere al fleet manager. Adozione: almeno 50% dei driver accede almeno 1 volta al mese.

### Business Success

- **3 mesi:** Primo cliente migrato dal tool PDF attuale a Greenfleet, operativo con dati reali (100-500 veicoli), rifornimenti inseriti e report emissioni generati.
- **12 mesi:** 5+ societa attive sulla piattaforma, con dati sufficienti per benchmark cross-tenant. Retention del primo cliente confermata.
- **Differenziatore:** Nessun competitor offre doppio calcolo emissioni (teorico + reale) con progresso vs target configurabile e export ESG-ready. Questo e il posizionamento.

### Technical Success

- **Performance:** Report aggregati generati in meno di 3 secondi per flotte fino a 500 veicoli con 3 anni di storico.
- **Isolamento dati:** Zero data leak tra tenant in tutti gli scenari (report, export, API).
- **Disponibilita:** 99.5% uptime durante orario lavorativo.
- **Integrabilita:** API REST complete per ogni entita, pronte per integrazioni con telematica e ERP.

### Measurable Outcomes

| Metrica | Baseline (tool attuale) | Target Greenfleet |
|---|---|---|
| Tempo generazione report emissioni | Manuale/PDF | < 2 minuti |
| Riconciliazione fatture automatica | 0% | > 80% |
| Visibilita progresso vs target | Nessuna | Real-time dashboard |
| Tempo onboarding nuovo cliente | - | < 2 settimane |
| Adozione driver | 0% | > 50% attivi/mese |

## Product Scope

### MVP - Minimum Viable Product

Quello che serve per migrare il primo cliente dal tool PDF:

1. **Anagrafiche complete:** Societa, Dipendenti, Veicoli (con catalogo globale e multi-engine), Contratti (4 tipi polimorfici), Carlist
2. **Rifornimenti:** Inserimento manuale + import da file
3. **Report emissioni base:** Doppio calcolo (teorico + reale), progresso vs target configurabile, aggregazione per carburante e carlist
4. **Multitenancy e RBAC:** 3 ruoli (Admin, Fleet Manager con pieni poteri sul proprio tenant, Driver con inserimento rifornimenti/km e lettura propri dati)
5. **Export:** Report certificabili (PDF/CSV) che sostituiscano il tool attuale

### Growth Features (Post-MVP)

Quello che rende Greenfleet competitivo:

6. **Matching engine fatture XML** con configurazione campo-per-campo e tolleranze
7. **Tassonomia carburanti a 2 livelli** con aggregazione configurabile
8. **Sistema alert e scadenze** (documenti, contratti, km franchise)
9. **Dashboard homepage stile fintech** con "balance sheet" emissioni
10. **ESG-ready export** (Scope 1, GHG Protocol, metodologia inclusa)
11. **Onboarding progressivo** e seed data demo

### Vision (Futuro)

Quello che fa di Greenfleet una piattaforma di riferimento:

12. Simulatore "What-if" per transizione flotta
13. Benchmark anonimizzato cross-tenant
14. Carbon budget con progress bar e alert
15. Driver score e gamification ecologica
16. OCR/AI per fatture non-XML
17. Report builder drag & drop
18. Command palette e viste multiple (Kanban, calendario, mappa)

## User Journeys

### Journey 1: Marco, Fleet Manager - "Finalmente ci vedo chiaro"

**Persona:** Marco, 42 anni, Fleet Manager di una societa di servizi con 280 veicoli. Ogni trimestre passa 3 giorni a raccogliere dati da Excel, email dei fornitori e il vecchio tool PDF per produrre il report emissioni richiesto dal sustainability manager. Vive nel terrore di sbagliare un numero.

**Opening Scene:** Lunedi mattina, Marco apre Greenfleet. La dashboard gli mostra subito: emissioni del mese in corso, freccia verde -8% rispetto al mese scorso, e una progress bar che segna 62% del target annuale. Tre notifiche: 2 documenti in scadenza e 5 rifornimenti da validare.

**Rising Action:** Marco clicca sulla coda rifornimenti. Vede il feed cronologico: 47 rifornimenti importati dal CSV del fornitore, 42 gia matchati automaticamente, 5 con anomalie (quantita fuori tolleranza). Corregge 3 errori di digitazione, segnala 2 come effettivamente anomali. In 10 minuti ha finito quello che prima richiedeva mezza giornata. Poi apre la sezione contratti: il Kanban gli mostra 4 contratti in scadenza nei prossimi 90 giorni. Clicca su uno, vede la timeline del veicolo e decide di avviare il rinnovo.

**Climax:** Il CFO chiede il report emissioni per il board di giovedi. Marco apre i report, seleziona "Emissioni per carburante - YTD", vede il doppio calcolo (teorico: 145t CO2e, reale da rifornimenti: 158t CO2e). Il delta del 9% lo porta a investigare: drill-down per carlist, scopre che la "Carlist Commerciali" ha consumo reale molto piu alto del teorico. Esporta il report certificabile con metodologia inclusa. Tutto in 2 minuti.

**Resolution:** Marco invia il report al CFO con una nota: "Le emissioni reali della flotta commerciale sono il 9% sopra il teorico. Propongo di sostituire 15 diesel con ibridi dalla Carlist Eco - stimo un risparmio di 12t CO2e/anno." Il CFO risponde: "Dati chiarissimi, procedi." Marco sorride - prima ci metteva 3 giorni, ora 10 minuti.

### Journey 2: Marco, Fleet Manager - "Qualcosa non torna" (Edge Case)

**Opening Scene:** Marco riceve una fattura XML da un nuovo fornitore. La carica nel sistema ma il matching fallisce su tutte le 34 linee.

**Rising Action:** Apre la coda eccezioni. Vede che il problema e nel formato: il fornitore usa un tag XML diverso per la quantita. Marco va nelle configurazioni di matching (ereditate dall'Admin), crea un override per questo fornitore specifico, mappa il campo XML corretto sulla quantita del rifornimento. Usa la preview su dati campione per verificare che il matching funzioni.

**Climax:** Rilancia il matching. 31 su 34 vengono validati. I 3 rimanenti hanno la targa in un formato diverso (con spazi). Marco aggiunge una tolleranza sul formato targa. 33 su 34 matchano. L'ultimo ha una data fuori range - e effettivamente un errore del fornitore.

**Resolution:** Marco salva la configurazione. Da ora in poi, tutte le fatture di questo fornitore verranno matchate automaticamente. Il rifornimento anomalo lo segnala al fornitore per correzione.

### Journey 3: Admin (Giulia) - "La piattaforma gira"

**Persona:** Giulia, 35 anni, dipendente della societa che gestisce Greenfleet. Gestisce la piattaforma, configura i tenant, e mantiene il catalogo veicoli globale.

**Opening Scene:** Arriva un nuovo cliente: una societa di logistica con 150 veicoli. Giulia crea la societa nel sistema, configura le credenziali del Fleet Manager, e verifica che il catalogo globale contenga gia i modelli della loro flotta.

**Rising Action:** Mancano 3 modelli nuovi (Fiat E-Ducato, Iveco eDaily, MAN eTGE). Giulia li cerca su InfocarData, li seleziona e li aggiunge al catalogo globale: i dati tecnici, i motori (elettrici), i gCO2e/km WLTP e le immagini vengono importati automaticamente dalla banca dati. Configura i fattori di emissione per kWh per il nuovo anno (aggiornamento ISPRA). Poi verifica le regole di matching fatture default - funzionano per il fornitore principale del nuovo cliente.

**Climax:** Giulia crea l'utenza del Fleet Manager del nuovo cliente, gli assegna il ruolo, e verifica che il tenant sia isolato correttamente: accedendo come il Fleet Manager, vede solo i dati della sua societa. Zero leak. Prepara i seed data di esempio per l'onboarding.

**Resolution:** Il nuovo Fleet Manager riceve le credenziali, accede, trova il wizard di onboarding: "1. Importa veicoli -> 2. Aggiungi dipendenti -> 3. Crea carlist -> 4. Primo rifornimento." In 2 ore ha la flotta caricata e il primo report di test generato. Giulia monitora da admin che tutto fili liscio.

### Journey 4: Luca, Driver - "Almeno so cosa guido"

**Persona:** Luca, 28 anni, agente commerciale. Guida una Toyota Yaris Hybrid aziendale. Non gli interessa la gestione flotta, ma gli piacerebbe sapere se la sua auto e "green" come dicono.

**Opening Scene:** Luca riceve un'email: "Il tuo accesso a Greenfleet e attivo." Clicca, accede. Vede una dashboard personale: il suo veicolo (foto, modello, targa), i km percorsi nell'ultimo mese, e le sue emissioni personali: 89 kg CO2e.

**Rising Action:** Luca nota un confronto: "Le tue emissioni sono il 15% sotto la media aziendale." Si sente bene. Vede anche lo stato dei documenti del suo veicolo: assicurazione OK, revisione scaduta tra 45 giorni. Nota che il suo contratto e a lungo termine con franchise 20.000 km/anno e lui e a 16.800 a ottobre - tutto tranquillo.

**Climax:** Luca non deve fare niente. L'app gli da visibilita senza chiedergli nulla. La prossima volta che il collega chiede "ma quanto inquini?", Luca apre l'app e lo sa.

**Resolution:** Luca accede una volta al mese per curiosita. Quando gli propongono di cambiare auto, apre la carlist assegnata, confronta 2 modelli, e sceglie l'ibrido plug-in. Il fleet manager riceve la scelta automaticamente.

### Journey Requirements Summary

| Journey | Capabilities rivelate |
|---|---|
| Marco - Happy path | Dashboard emissioni, feed rifornimenti, matching automatico, report con doppio calcolo, drill-down, export certificabile, Kanban contratti, timeline veicolo |
| Marco - Edge case | Configurazione matching per fornitore, override regole tenant, preview matching, coda eccezioni, tolleranze personalizzabili |
| Giulia - Admin | Gestione tenant, catalogo veicoli globale (import da InfocarData), gestione fattori emissione, regole matching default, verifica isolamento, monitoring onboarding |
| Luca - Driver | Dashboard personale, KPI personali, confronto con media, stato documenti, stato contratto, visualizzazione carlist, scelta veicolo, inserimento rifornimenti e km |

## Domain-Specific Requirements

### Compliance & Normativa

- **Reporting ESG:** Il sistema deve produrre dati compatibili con i framework CSRD (Corporate Sustainability Reporting Directive), GRI, CDP e GHG Protocol. Le emissioni della flotta rientrano nello **Scope 1 - Mobile Combustion**.
- **Fattori di emissione:** Devono seguire standard riconosciuti (ISPRA per l'Italia, DEFRA per UK/internazionale). Aggiornamento annuale con storico versioni.
- **Standard di misurazione:** Supporto WLTP (veicoli recenti) e NEDC (veicoli pre-2018) con coefficiente di conversione per comparabilita.
- **GDPR:** I dati dei driver (nome, email, km percorsi, sede di lavoro) sono dati personali. Serve consenso, data retention policy, diritto all'oblio. L'isolamento multitenant protegge gia parzialmente.

### Vincoli Tecnici

- **Isolamento multitenant rigoroso:** Ogni query filtra per tenant_id. Nessuna eccezione, nemmeno nei report aggregati. Test automatici di leak detection. (Vedi NFR6, NFR13)
- **Audit trail:** Ogni modifica a dati che impattano le emissioni deve essere tracciata: chi, quando, valore precedente, valore nuovo. (Vedi NFR10)
- **Parsing XML eterogeneo:** Ogni fornitore di carburante ha il proprio formato XML. Configurazione per fornitore senza hardcoding. (Vedi NFR25)
- **Storico targhe:** La ritargatura deve mantenere continuita storica. Il matching fatture cerca sia targa corrente che targhe storiche nel periodo della fattura.

### Requisiti di Integrazione

- **InfocarData:** Catalogo veicoli globale alimentato dalla banca dati Quattroruote (dati tecnici, motori, emissioni CO2, consumi). Import batch e aggiornamenti incrementali. (Vedi FR1-FR5, NFR23)
- **Codall:** Immagini veicoli recuperate automaticamente dal servizio via CODALL+ANNOXX+MESEXX. (Vedi FR2, NFR24)
- **Import fatture XML:** Fatture elettroniche in formato XML (SDI/FatturaPA o formati custom fornitore carburante)
- **Import massivo:** CSV/Excel per rifornimenti, anagrafiche veicoli, dipendenti
- **Export certificabile:** PDF con metodologia di calcolo, fattori usati, periodo, confini organizzativi
- **Predisposizione API:** Architettura API-first pronta per integrazioni future con telematica (km automatici) e ERP (centri di costo). (Vedi NFR27)

### Rischi di Dominio e Mitigazioni

| Rischio | Impatto | Mitigazione |
|---|---|---|
| Dati emissione incoerenti (teorico vs reale divergono troppo) | Report inattendibili | Anomaly detection con soglie configurabili, alert al fleet manager |
| Matching fatture fallisce per formato XML inatteso | Rifornimenti non validati | Modalita "best effort", coda eccezioni, sandbox di test |
| Ritargatura rompe continuita storica | Matching fatture post-ritargatura fallisce | Storico targhe con date validita, ricerca su targa corrente + storiche |
| Fattori emissione obsoleti | Report con dati errati | Tabella fattori con data efficacia, notifica aggiornamento annuale |
| Veicoli ibridi: split emissioni tra motori | Report per tipo carburante inaccurati | Uso CO2eRC combinato + logica split basata su rifornimenti reali |

## Innovation & Novel Patterns

### Aree di Innovazione Rilevate

**1. Doppio calcolo emissioni come KPI differenziante**
I tool di fleet management calcolano le emissioni in un modo solo (tipicamente teorico da dati tecnici). Greenfleet incrocia due fonti indipendenti: emissioni teoriche (gCO2e/km x km) e emissioni reali (litri riforniti x fattore emissione). Il **delta tra teorico e reale** diventa un KPI unico che rivela inefficienze invisibili: guida aggressiva, problemi meccanici, uso improprio.

**2. Da fleet management a ESG certification platform**
Il posizionamento non e "gestisco la flotta" ma "certifico le emissioni della flotta". Questo sposta il buyer da Operations a Sustainability/Finance. Il fleet manager e l'utente, ma il valore si vende al CFO e al sustainability manager. E un cambio di mercato, non solo di feature.

**3. Matching engine con inheritance pattern**
La configurazione del matching fatture con ereditarieta (Admin default -> Tenant override) e un pattern architetturale che rende il sistema scalabile: ogni nuovo cliente funziona out-of-the-box con le regole default, ma puo personalizzare senza toccare la configurazione globale.

### Contesto Competitivo

- **Fleet management tradizionale** (Geotab, Webfleet, Verizon Connect): Focus su GPS tracking e manutenzione. Emissioni come feature secondaria, calcolo singolo.
- **ESG platforms** (Watershed, Persefoni): Focus su reporting multi-scope. Non gestiscono il dettaglio operativo della flotta (rifornimenti, contratti, carlist).
- **Greenfleet si posiziona nell'intersezione:** Operativita flotta + certificazione emissioni. Nessun competitor copre entrambi i lati.

### Approccio di Validazione

1. **Doppio calcolo:** Validare con il primo cliente che il delta teorico/reale produce insight actionable (es: identificare veicoli con consumo anomalo)
2. **Matching engine:** Validare con almeno 3 formati XML di fornitori diversi che la configurazione campo-per-campo copre i casi reali
3. **Posizionamento ESG:** Validare che il primo cliente usa effettivamente i report per compliance ESG (non solo per gestione operativa)

### Mitigazione Rischi Innovazione

| Innovazione | Rischio | Fallback |
|---|---|---|
| Doppio calcolo emissioni | Delta non significativo o fuorviante | Offrire entrambi i metodi separati, lasciare al fleet manager la scelta di quale usare |
| Posizionamento ESG | Il mercato non e pronto, i clienti vogliono solo fleet management | Il core funziona comunque come fleet management, ESG diventa un upsell |
| Matching con inheritance | Troppo complesso da configurare | Admin pre-configura tutto, tenant usa solo i default senza override |

## Requisiti Specifici SaaS B2B

### Panoramica Architetturale

Greenfleet e un'applicazione SaaS B2B multi-tenant con deployment condiviso. Tutti i clienti condividono la stessa infrastruttura (container + SQL Server) con isolamento logico dei dati a livello di database.

### Modello Tenant

- **Isolamento:** Logico (stesso database, filtro tenant_id su ogni query). Non schema-per-tenant, non database-per-tenant.
- **Dati globali:** Catalogo veicoli, fattori emissione, configurazioni default matching - condivisi e gestiti dall'Admin.
- **Dati tenant:** Dipendenti, veicoli operativi, contratti, carlist, rifornimenti, fatture, documenti - isolati per tenant.
- **Provisioning:** L'Admin crea la societa (tenant), configura le utenze, assegna feature abilitate. Nessun self-service.

### Matrice RBAC

| Capability | Admin | Fleet Manager | Driver |
|---|---|---|---|
| Gestione tenant (CRUD societa) | RW | - | - |
| Catalogo veicoli globale | RW | R | - |
| Fattori emissione | RW | R | - |
| Configurazione matching default | RW | - | - |
| Configurazione matching tenant | RW | RW (proprio tenant) | - |
| Utenze (CRUD) | RW (tutti) | RW FM/Driver (proprio tenant) | - |
| Dipendenti | RW (tutti) | RW (proprio tenant) | R (solo se stesso) |
| Veicoli operativi | RW (tutti) | RW (proprio tenant) | R (proprio veicolo) |
| Contratti | RW (tutti) | RW (proprio tenant) | R (proprio contratto) |
| Carlist | RW (tutti) | RW (proprio tenant) | R (carlist assegnata) |
| Rifornimenti | RW (tutti) | RW (proprio tenant) | RW (proprio veicolo) |
| Rilevazioni km | RW (tutti) | RW (proprio tenant) | RW (proprio veicolo) |
| Fatture | RW (tutti) | RW (proprio tenant) | - |
| Documenti veicolo | RW (tutti) | RW (proprio tenant) | R (proprio veicolo) |
| Report emissioni | Tutti i tenant | Proprio tenant | Propri dati |
| Configurazione target emissioni | RW (tutti) | RW (proprio tenant) | - |
| Feature toggle per tenant | RW | - | - |

**Principio RBAC:** Il Fleet Manager puo eseguire tutte le operazioni dell'Admin, purche limitate al proprio tenant. Il Driver puo inserire rifornimenti e rilevazioni km per il proprio veicolo.

### Feature Toggle per Tenant

- **Modello:** Canone unico, feature abilitate/disabilitate per tenant dall'Admin.
- **Granularita:** Per modulo funzionale (es: matching fatture, report avanzati, alert, export ESG).
- **Implementazione:** Tabella `tenant_features` con flag per ogni modulo. Controllo a livello di API e UI.
- **Evoluzione futura:** Predisposto per diventare subscription tiers (raggruppamento di feature in piani) quando il modello commerciale lo richiedera.

### Infrastruttura e Deployment

- **Runtime:** Container (Docker)
- **Database:** SQL Server (singola istanza, multi-tenant logico)
- **Deployment:** Ambiente condiviso per tutti i tenant
- **Scalabilita:** Orizzontale sui container applicativi, verticale sul database
- **Backup:** Strategia di backup SQL Server con point-in-time recovery

### Considerazioni di Implementazione

- **Row-Level Security:** Considerare l'uso di RLS di SQL Server per enforcement del tenant_id a livello di database, come seconda linea di difesa oltre al filtro applicativo.
- **Connection pooling:** Gestione efficiente delle connessioni SQL Server con pool condiviso tra tenant.
- **Migrations:** Schema unico per tutti i tenant, migrations applicate atomicamente.
- **Monitoring:** Metriche per-tenant (query count, storage, utenti attivi) per capacity planning e potenziale billing futuro.

## Project Scoping & Phased Development

### MVP Strategy & Philosophy

**Approccio MVP:** Problem-solving MVP - risolvere il problema core (report emissioni lenti e complessi) in modo drasticamente migliore del tool attuale.

**Vantaggio competitivo:** Il primo cliente migra a prescindere perche il tool attuale e troppo complesso e lento. L'MVP non deve raggiungere feature parity - deve essere **piu veloce, piu semplice, e produrre report certificabili**. Ogni feature in piu e un bonus, non un requisito.

**Risorse:** Sviluppo iniziale focalizzato su un team snello. Stack: Container + SQL Server, API-first.

### MVP Feature Set (Fase 1)

**Journey supportate:** Marco (happy path), Giulia (Admin base), Luca (Driver base)

**Must-Have:**

| # | Capability | Rationale |
|---|---|---|
| 1 | CRUD Societa (tenant) | Base multitenancy |
| 2 | CRUD Dipendenti | Anagrafica necessaria per assegnazioni |
| 3 | CRUD Veicoli con dati tecnici e multi-engine | Core del sistema, necessario per calcolo emissioni |
| 4 | Catalogo veicoli globale (Admin) | Base dati tecnici condivisa |
| 5 | CRUD Contratti (4 tipi polimorfici) | Necessario per gestione flotta completa |
| 6 | CRUD Carlist (nome + veicoli) | Necessario per organizzazione flotta |
| 7 | Rifornimenti: inserimento manuale + import CSV | Fonte dati per calcolo emissioni reali |
| 8 | Report emissioni: doppio calcolo (teorico + reale) | Differenziatore core, motivo per cui il prodotto esiste |
| 9 | Progresso vs target configurabile | L'aha moment: "certifico e vedo i progressi" |
| 10 | Export report certificabile (PDF/CSV) | Sostituisce il tool PDF attuale |
| 11 | RBAC: Admin + Fleet Manager (pieni poteri su proprio tenant) + Driver (R + inserimento rifornimenti/km) | 3 ruoli base |
| 12 | Dashboard Fleet Manager con KPI emissioni | Valore immediato all'apertura |
| 13 | Dashboard Driver con dati personali | Valore per il driver, adozione |
| 14 | Multitenancy con isolamento logico | Fondamentale per SaaS |
| 15 | Feature toggle per tenant | Flessibilita commerciale |

**Escluso dall'MVP (puo essere manuale):**
- Matching fatture XML (il fleet manager valida manualmente i rifornimenti)
- Alert e notifiche (il fleet manager controlla periodicamente)
- Onboarding wizard (l'Admin supporta il primo onboarding)
- Tassonomia carburanti a 2 livelli (aggregazione semplice per tipo)

### Post-MVP Features

**Fase 2 - Growth (mesi 4-9):**

| # | Capability | Valore aggiunto |
|---|---|---|
| 16 | Matching engine fatture XML | Automazione riconciliazione, -80% lavoro manuale |
| 17 | Tassonomia carburanti 2 livelli (tipo/sottotipo) | Report flessibili, supporto HVO e biocarburanti |
| 18 | Sistema alert scadenze (documenti, contratti, km) | Prevenzione problemi, valore operativo quotidiano |
| 19 | Configurazione matching con inheritance Admin->Tenant | Scalabilita per nuovi clienti |
| 20 | Dashboard homepage stile fintech | Impatto visivo, engagement |
| 21 | Storico targhe per ritargatura | Continuita matching post-ritargatura |
| 22 | Audit trail su entita critiche | Compliance ESG |

**Fase 3 - Expansion (mesi 10+):**

| # | Capability | Valore aggiunto |
|---|---|---|
| 23 | ESG-ready export (Scope 1, GHG Protocol) | Compliance reporting internazionale |
| 24 | Onboarding wizard progressivo | Riduzione time-to-value nuovi clienti |
| 25 | Kanban contratti + timeline veicolo | UX avanzata |
| 26 | Anomaly detection emissioni | Intelligence proattiva |
| 27 | Simulatore what-if transizione flotta | Decision support per CFO |
| 28 | Benchmark cross-tenant | Network effect, retention |
| 29 | Carbon budget con progress bar | Governance target emissioni |
| 30 | Report builder drag & drop | Self-service per power user |

### Risk Mitigation Strategy

**Rischi Tecnici:**

| Rischio | Probabilita | Mitigazione |
|---|---|---|
| Performance report su grandi volumi (500 veicoli x 3 anni) | Media | Pre-calcolo aggregazioni, indici SQL Server ottimizzati, test di carico con dati realistici prima del go-live |
| Complessita form contratti polimorfici | Media | Pattern Record Type collaudato, prototipo UI prima dello sviluppo backend |
| Multi-engine complica calcolo emissioni | Bassa | Usare CO2eRC come dato combinato per MVP, split per tipo motore in Fase 2 |

**Rischi di Mercato:**

| Rischio | Probabilita | Mitigazione |
|---|---|---|
| Primo cliente non trova valore sufficiente nell'MVP | Bassa (migra a prescindere) | Feedback loop settimanale durante onboarding, prioritizzazione feature su richiesta |
| Posizionamento ESG prematuro per il mercato | Media | Core funziona come fleet management puro, ESG e un layer aggiuntivo |

**Rischi di Risorse:**

| Rischio | Probabilita | Mitigazione |
|---|---|---|
| Meno risorse del previsto | Media | MVP gia tagliato all'osso, ulteriore fallback: escludere Driver read-only e contratti polimorfici (solo tipo "generico") |
| Timeline 3 mesi troppo aggressiva | Media | Concordare con il primo cliente un onboarding progressivo: prima anagrafiche, poi rifornimenti, poi report |

## Requisiti Funzionali

### Catalogo Veicoli e Dati Tecnici

- FR1: Il sistema puo importare e sincronizzare i dati tecnici dei veicoli dalla banca dati InfocarData (identificazione, dati tecnici base, motori, prestazioni, emissioni CO2, consumi)
- FR2: Il sistema puo recuperare automaticamente l'immagine del veicolo dal servizio Codall a partire dal codice allestimento e data di registrazione
- FR3: L'Admin puo cercare e selezionare veicoli dal catalogo InfocarData per aggiungerli al catalogo globale di Greenfleet
- FR4: L'Admin puo integrare manualmente dati non presenti in InfocarData (es. veicoli non ancora censiti, veicoli speciali)
- FR5: Il sistema espone per ogni veicolo nel catalogo i dati principali: marca, modello, allestimento, carrozzeria, normativa anti-inquinamento, motori (tipo combustibile, cilindrata, potenza KW/CV), emissioni CO2 g/km (WLTP/NEDC), consumi, capacita serbatoio, flag ibrido, immagine

### Gestione Societa e Tenant

- FR6: L'Admin puo creare, modificare e disattivare societa (tenant) sulla piattaforma
- FR7: L'Admin puo configurare le feature abilitate per ogni tenant
- FR8: Il sistema isola i dati di ogni tenant impedendo accesso cross-tenant

### Gestione Utenti e Permessi

- FR9: L'Admin puo creare e gestire utenze con ruolo Admin, Fleet Manager o Driver su qualsiasi tenant
- FR10: Il Fleet Manager puo creare e gestire utenze Fleet Manager e Driver sul proprio tenant
- FR11: Il Fleet Manager puo eseguire tutte le operazioni che l'Admin puo eseguire, purche limitate al proprio tenant (inclusi CRUD dipendenti, veicoli, contratti, carlist, rifornimenti, fatture, documenti, configurazioni matching, target emissioni)
- FR12: Il Driver puo visualizzare in sola lettura i propri dati personali, il proprio veicolo, i propri contratti e documenti

### Gestione Dipendenti

- FR13: L'Admin/Fleet Manager puo creare, modificare e disattivare dipendenti (nel proprio ambito)
- FR14: L'Admin/Fleet Manager puo assegnare dipendenti a veicoli
- FR15: L'Admin/Fleet Manager puo importare dipendenti da file (CSV/Excel)

### Gestione Veicoli Operativi

- FR16: L'Admin/Fleet Manager puo aggiungere un veicolo operativo al proprio tenant selezionandolo dal catalogo globale InfocarData
- FR17: L'Admin/Fleet Manager puo specificare i dati operativi del veicolo tenant (targa, data immatricolazione, assegnazione dipendente, stato)
- FR18: Il sistema associa automaticamente i dati tecnici e l'immagine dal catalogo InfocarData/Codall al veicolo operativo
- FR19: L'Admin/Fleet Manager puo gestire lo storico targhe di un veicolo (ritargatura)
- FR20: L'Admin/Fleet Manager puo gestire i documenti associati a un veicolo (assicurazione, revisione, etc.)

### Gestione Contratti

- FR21: L'Admin/Fleet Manager puo creare contratti di tipo Proprietario, Breve Termine, Lungo Termine o Leasing Finanziario per un veicolo
- FR22: L'Admin/Fleet Manager puo gestire la successione temporale di contratti su un veicolo (nesting/matrioska)
- FR23: Ogni tipo contratto espone i campi specifici della propria tipologia (es. franchise km, canone, scadenza, fornitore)
- FR24: L'Admin/Fleet Manager puo visualizzare lo stato contrattuale di tutti i veicoli del tenant

### Gestione Carlist

- FR25: L'Admin/Fleet Manager puo creare e gestire carlist (raggruppamenti di veicoli con nome)
- FR26: L'Admin/Fleet Manager puo assegnare veicoli a una o piu carlist

### Rifornimenti e Rilevazioni Chilometriche

- FR27: L'Admin/Fleet Manager/Driver puo inserire manualmente un rifornimento (veicolo, data, tipo carburante, quantita, importo, km) - il Driver solo per il proprio veicolo
- FR28: L'Admin/Fleet Manager puo importare rifornimenti da file (CSV/Excel)
- FR29: L'Admin/Fleet Manager/Driver puo inserire una rilevazione chilometrica in una sezione dedicata, indipendente dal rifornimento - il Driver solo per il proprio veicolo
- FR30: Il sistema utilizza le rilevazioni chilometriche (sia da rifornimento che da sezione dedicata) per i calcoli di emissione e i report
- FR31: L'Admin/Fleet Manager puo visualizzare e correggere rifornimenti e rilevazioni km. Il Driver puo visualizzare i propri rifornimenti e le proprie rilevazioni km

### Calcolo Emissioni

- FR32: Il sistema puo calcolare le emissioni teoriche di un veicolo (gCO2e/km da InfocarData x km percorsi)
- FR33: Il sistema puo calcolare le emissioni reali di un veicolo (quantita carburante rifornita x fattore di emissione per tipo carburante)
- FR34: Il sistema puo confrontare emissioni teoriche e reali evidenziando il delta
- FR35: L'Admin puo gestire la tabella dei fattori di emissione per tipo carburante (fonte ISPRA/DEFRA) con data di efficacia
- FR36: L'Admin/Fleet Manager puo configurare un target di emissioni per la flotta o per carlist
- FR37: Il sistema puo aggregare le emissioni per veicolo, carlist, tipo carburante e periodo temporale

### Report e Export

- FR38: Il Fleet Manager puo generare report emissioni con doppio calcolo (teorico + reale) per periodo e aggregazione
- FR39: Il Fleet Manager puo visualizzare il progresso verso il target configurato
- FR40: Il Fleet Manager puo esportare report certificabili in formato PDF e CSV con metodologia di calcolo inclusa
- FR41: Il Fleet Manager puo effettuare drill-down dai report aggregati al dettaglio per veicolo/carlist

### Dashboard e Visualizzazione

- FR42: Il Fleet Manager puo visualizzare una dashboard con KPI principali: emissioni correnti, trend, progresso vs target, notifiche
- FR43: Il Driver puo visualizzare una dashboard personale con il proprio veicolo, km percorsi, emissioni personali e stato documenti
- FR44: Il sistema puo mostrare l'immagine del veicolo (da Codall) nelle viste di dettaglio
- FR45: Il Fleet Manager puo visualizzare lo stato di tutti i veicoli, contratti e dipendenti del proprio tenant

## Requisiti Non-Funzionali

### Performance

- NFR1: Le azioni utente standard (navigazione, CRUD, ricerca) completano in meno di 1 secondo per il 95esimo percentile
- NFR2: La generazione di report emissioni aggregati completa in meno di 3 secondi per flotte fino a 500 veicoli con 3 anni di storico
- NFR3: La dashboard Fleet Manager carica con KPI aggiornati in meno di 2 secondi
- NFR4: L'import CSV/Excel di rifornimenti processa fino a 10.000 righe in meno di 30 secondi
- NFR5: Il sistema supporta almeno 50 utenti concorrenti per tenant senza degradazione percepibile

### Sicurezza

- NFR6: Isolamento multitenant: zero data leak tra tenant in tutti gli scenari (query, report, export, API). Test automatici di leak detection obbligatori
- NFR7: Tutti i dati in transito sono protetti con TLS 1.2+
- NFR8: Tutti i dati a riposo (database, backup, file) sono cifrati
- NFR9: Autenticazione con password policy robusta (minimo 12 caratteri, complessita). Predisposizione per SSO/OIDC futuro
- NFR10: Ogni modifica a dati che impattano le emissioni (km, rifornimenti, fattori emissione, dati tecnici) tracciata con audit trail: chi, quando, valore precedente, valore nuovo
- NFR11: Conformita GDPR per dati dei driver: consenso, data retention policy, diritto all'oblio, minimizzazione dati
- NFR12: Enforcement RBAC a livello API - nessun bypass possibile dalla UI
- NFR13: Row-Level Security SQL Server come seconda linea di difesa per isolamento tenant

### Scalabilita

- NFR14: Il sistema supporta fino a 20 tenant attivi con 500 veicoli ciascuno (10.000 veicoli totali) senza re-architettura
- NFR15: Il volume dati cresce linearmente (rifornimenti, km, audit) senza degradazione: il sistema mantiene le performance con 3+ anni di storico per tenant
- NFR16: Scalabilita orizzontale sui container applicativi, verticale sul database
- NFR17: Metriche per-tenant (query count, storage, utenti attivi) disponibili per capacity planning

### Affidabilita

- NFR18: Disponibilita 99.5% durante orario lavorativo (lun-ven 8:00-20:00)
- NFR19: Recovery Point Objective (RPO): massimo 1 ora di dati persi in caso di disaster
- NFR20: Recovery Time Objective (RTO): massimo 4 ore per ripristino completo
- NFR21: I calcoli emissioni producono risultati deterministici e riproducibili: stesso input = stesso output, sempre
- NFR22: Il sistema gestisce graceful degradation in caso di indisponibilita dei servizi esterni (InfocarData, Codall) senza bloccare le operazioni core

### Integrazione

- NFR23: L'integrazione con InfocarData supporta import batch e aggiornamenti incrementali del catalogo veicoli
- NFR24: L'integrazione con Codall gestisce timeout e immagini non disponibili con fallback (icona placeholder)
- NFR25: Il parsing XML fatture supporta formati eterogenei senza hardcoding, con configurazione per fornitore
- NFR26: Import/export CSV supporta encoding UTF-8 e separatori configurabili
- NFR27: Architettura API-first: ogni entita esposta via REST API, pronta per integrazioni future (telematica, ERP)
