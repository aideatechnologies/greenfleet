const itFormatter = new Intl.NumberFormat("it-IT");

function createFormatter(decimals: number) {
  return new Intl.NumberFormat("it-IT", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

const fmt0 = createFormatter(0);
const fmt1 = createFormatter(1);
const fmt2 = createFormatter(2);

function getFormatter(decimals: number) {
  switch (decimals) {
    case 0:
      return fmt0;
    case 1:
      return fmt1;
    case 2:
      return fmt2;
    default:
      return createFormatter(decimals);
  }
}

/** Format a number with Italian locale (1.234,56) */
export function formatNumber(value: number, decimals: number = 0): string {
  return getFormatter(decimals).format(value);
}

/** Format emissions: "123,4 g/km" */
export function formatEmissions(gKm: number): string {
  return `${fmt1.format(gKm)} g/km`;
}

/** Format power: "110 kW" */
export function formatPower(kw: number): string {
  return `${itFormatter.format(kw)} kW`;
}

/** Format power in CV: "150 CV" */
export function formatPowerCv(cv: number): string {
  return `${itFormatter.format(cv)} CV`;
}

/** Format consumption: "5,6 l/100km" */
export function formatConsumption(l100km: number): string {
  return `${fmt1.format(l100km)} l/100km`;
}

/** Format displacement: "1.598 cc" */
export function formatDisplacement(cc: number): string {
  return `${itFormatter.format(cc)} cc`;
}

/** Format tank capacity: "50 L" */
export function formatTankCapacity(liters: number): string {
  return `${itFormatter.format(liters)} L`;
}
