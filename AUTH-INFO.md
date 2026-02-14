# Greenfleet — Credenziali di Test

## Utenti Demo

| Ruolo | Email | Password | Ruolo Better Auth |
|-------|-------|----------|-------------------|
| Platform Admin | `admin@greenfleet-demo.local` | `DemoAdmin2026!Pass` | `owner` |
| Fleet Manager | `fm@greenfleet-demo.local` | `DemoFM2026!Pass` | `admin` |
| Driver | `driver@greenfleet-demo.local` | `DemoDriver2026!Pass` | `member` |

## Organizzazione Demo

- **Nome:** Greenfleet Demo
- **Slug:** greenfleet-demo

## Mapping Ruoli

| Ruolo Greenfleet | Ruolo Better Auth | Permessi |
|------------------|-------------------|----------|
| Platform Admin | `owner` | Accesso completo cross-tenant, gestione globale |
| Fleet Manager | `admin` | Gestione flotta, veicoli, dipendenti, contratti, emissioni, report, export |
| Driver (Autista) | `member` | Dashboard personale, rifornimenti e km propri (sola lettura per il resto) |

## Setup Ambiente

1. Copiare `.env.example` in `.env` e configurare le variabili
2. Avviare SQL Server (via Docker: `docker-compose up -d`)
3. Eseguire le migrazioni: `npx prisma db push`
4. Generare il client Prisma: `npx prisma generate`
5. Popolare i dati demo: `npx prisma db seed`
6. Avviare il server: `npm run dev`

## Accesso

- URL: `http://localhost:3000`
- Login: `http://localhost:3000/login`
- Il **Platform Admin** e il **Fleet Manager** vedono la dashboard FM con KPI, grafici, target e notifiche
- Il **Driver** viene reindirizzato automaticamente alla dashboard personale (`/driver`)

## Feature Abilitate nel Tenant Demo

- VEHICLES
- FUEL_RECORDS
- DASHBOARD_FM
- DASHBOARD_DRIVER

## Configurazione Autenticazione

- Provider: Better Auth con email/password
- Password minima: 12 caratteri
- Hashing: scrypt (@noble/hashes)
- Rate limiting: 10 richieste / 60 secondi
- Tutte le email demo sono pre-verificate
