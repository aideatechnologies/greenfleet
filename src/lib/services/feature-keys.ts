export enum FeatureKey {
  VEHICLES = "VEHICLES",
  CONTRACTS = "CONTRACTS",
  FUEL_RECORDS = "FUEL_RECORDS",
  EMISSIONS = "EMISSIONS",
  DASHBOARD_FM = "DASHBOARD_FM",
  DASHBOARD_DRIVER = "DASHBOARD_DRIVER",
  IMPORT_EXPORT = "IMPORT_EXPORT",
  CARLIST = "CARLIST",
  ADVANCED_REPORTS = "ADVANCED_REPORTS",
  ALERTS = "ALERTS",
  ESG_EXPORT = "ESG_EXPORT",
  AUDIT_LOG = "AUDIT_LOG",
}

export const FEATURE_KEY_LABELS: Record<FeatureKey, string> = {
  [FeatureKey.VEHICLES]: "Gestione Veicoli",
  [FeatureKey.CONTRACTS]: "Contratti",
  [FeatureKey.FUEL_RECORDS]: "Rifornimenti e Km",
  [FeatureKey.EMISSIONS]: "Emissioni e Report",
  [FeatureKey.DASHBOARD_FM]: "Dashboard Fleet Manager",
  [FeatureKey.DASHBOARD_DRIVER]: "Dashboard Driver",
  [FeatureKey.IMPORT_EXPORT]: "Import/Export",
  [FeatureKey.CARLIST]: "Car List",
  [FeatureKey.ADVANCED_REPORTS]: "Report Certificabili",
  [FeatureKey.ALERTS]: "Notifiche Scadenze",
  [FeatureKey.ESG_EXPORT]: "Export ESG",
  [FeatureKey.AUDIT_LOG]: "Audit Log",
};

export const FEATURE_KEY_DESCRIPTIONS: Record<FeatureKey, string> = {
  [FeatureKey.VEHICLES]:
    "Gestione anagrafica veicoli, dati tecnici e documenti associati alla flotta.",
  [FeatureKey.CONTRACTS]:
    "Gestione contratti di leasing, noleggio e proprieta per i veicoli.",
  [FeatureKey.FUEL_RECORDS]:
    "Registrazione rifornimenti carburante e letture chilometriche.",
  [FeatureKey.EMISSIONS]:
    "Calcolo emissioni CO2, report ambientali e monitoraggio consumi.",
  [FeatureKey.DASHBOARD_FM]:
    "Dashboard riepilogativa per il Fleet Manager con KPI e grafici.",
  [FeatureKey.DASHBOARD_DRIVER]:
    "Dashboard personale per il Driver con i propri veicoli e rifornimenti.",
  [FeatureKey.IMPORT_EXPORT]:
    "Importazione ed esportazione massiva dati in formato CSV/Excel.",
  [FeatureKey.CARLIST]:
    "Catalogo veicoli con dati tecnici e fattori di emissione di riferimento.",
  [FeatureKey.ADVANCED_REPORTS]:
    "Report certificabili con metodologia GHG Protocol per audit esterni.",
  [FeatureKey.ALERTS]:
    "Notifiche automatiche per scadenze contratti, revisioni e tagliandi.",
  [FeatureKey.ESG_EXPORT]:
    "Esportazione dati in formato compatibile con framework ESG e CSRD.",
  [FeatureKey.AUDIT_LOG]:
    "Registro delle operazioni effettuate dagli utenti per tracciabilita.",
};

/** Features grouped by category for the toggle panel UI */
export const FEATURE_CATEGORIES = [
  {
    label: "Moduli Core",
    features: [
      FeatureKey.VEHICLES,
      FeatureKey.CONTRACTS,
      FeatureKey.FUEL_RECORDS,
      FeatureKey.EMISSIONS,
    ],
  },
  {
    label: "Dashboard",
    features: [FeatureKey.DASHBOARD_FM, FeatureKey.DASHBOARD_DRIVER],
  },
  {
    label: "Funzionalita Avanzate",
    features: [
      FeatureKey.IMPORT_EXPORT,
      FeatureKey.CARLIST,
      FeatureKey.ADVANCED_REPORTS,
      FeatureKey.ALERTS,
      FeatureKey.ESG_EXPORT,
      FeatureKey.AUDIT_LOG,
    ],
  },
] as const;

/** Default enabled features for new tenants */
export const DEFAULT_FEATURES: FeatureKey[] = [
  FeatureKey.VEHICLES,
  FeatureKey.FUEL_RECORDS,
  FeatureKey.DASHBOARD_FM,
  FeatureKey.DASHBOARD_DRIVER,
];

/** All feature keys as array */
export const ALL_FEATURE_KEYS = Object.values(FeatureKey);
