/** Default page size for DataTables */
export const DEFAULT_PAGE_SIZE = 50;

/** Available page sizes for DataTable selectors */
export const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;

/** Search debounce delay in milliseconds */
export const SEARCH_DEBOUNCE_MS = 300;

/** Codall image cache TTL in milliseconds (24 hours) */
export const CODALL_CACHE_TTL_MS = 86_400_000;

/** Codall request timeout in milliseconds */
export const CODALL_TIMEOUT_MS = parseInt(
  process.env.CODALL_TIMEOUT_MS || "5000",
  10
);

/** Sentinel CatalogVehicle ID for vehicles without catalog association */
export const UNCATALOGED_VEHICLE_ID = 0;

/** Toast auto-dismiss delay for success messages */
export const TOAST_SUCCESS_DURATION = 5000;
