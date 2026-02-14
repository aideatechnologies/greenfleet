export const FUEL_UNITS = [
  { value: "L", label: "Litri (L)" },
  { value: "kg", label: "Chilogrammi (kg)" },
  { value: "kWh", label: "Kilowattora (kWh)" },
  { value: "Nm3", label: "Normal metro cubo (Nm\u00b3)" },
  { value: "UA", label: "UA" },
] as const;

export type FuelUnit = (typeof FUEL_UNITS)[number]["value"];

export const FUEL_UNIT_VALUES = FUEL_UNITS.map((u) => u.value);
