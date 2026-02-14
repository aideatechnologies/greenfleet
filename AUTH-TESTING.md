# Greenfleet -- Credenziali di Test

## Tenant Demo: Greenfleet Demo

### Utenti Demo

| Ruolo | Email | Password | Descrizione |
|-------|-------|----------|-------------|
| Platform Admin | admin@greenfleet-demo.local | DemoAdmin2026!Pass | Accesso completo cross-tenant, gestione piattaforma |
| Fleet Manager | fm@greenfleet-demo.local | DemoFM2026!Pass | Gestione flotta sul proprio tenant |
| Driver | driver@greenfleet-demo.local | DemoDriver2026!Pass | Visualizzazione propri dati, inserimento rifornimenti/km |

### Setup

1. Avviare il database SQL Server (Docker):
   ```bash
   docker compose up -d
   ```

2. Eseguire le migrazioni:
   ```bash
   npx prisma migrate deploy
   ```

3. Eseguire il seed:
   ```bash
   npx prisma db seed
   ```

4. Avviare l'applicazione:
   ```bash
   npm run dev
   ```

5. Accedere su http://localhost:3000/login

### Mapping Ruoli

| Ruolo Greenfleet | Ruolo Better Auth | Scope |
|---|---|---|
| Platform Admin | owner | Cross-tenant: gestisce tutti i tenant |
| Fleet Manager | admin | Single-tenant: gestisce la propria flotta |
| Driver | member | Single-tenant: sola lettura + rifornimenti/km propri |

### Note

- Il tenant demo non può essere disattivato né eliminato
- Le password rispettano la policy: minimo 12 caratteri, maiuscola, minuscola, numero, carattere speciale
- I dati demo sono sintetici e conformi al GDPR (nessun dato personale reale)
