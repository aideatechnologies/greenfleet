/**
 * Circuit breaker semplice per il client InfocarData.
 *
 * Traccia i fallimenti consecutivi e determina se il servizio
 * e disponibile o meno. Se il numero di fallimenti consecutivi
 * supera la soglia, il circuito si apre e le chiamate vengono
 * bloccate fino al reset automatico dopo il cooldown.
 */

export interface HealthStatus {
  available: boolean;
  consecutiveFailures: number;
  lastFailureAt: Date | null;
  lastSuccessAt: Date | null;
  circuitOpen: boolean;
}

const DEFAULT_FAILURE_THRESHOLD = 5;
const DEFAULT_COOLDOWN_MS = 60_000; // 1 minuto

class InfocarDataHealthMonitor {
  private consecutiveFailures = 0;
  private lastFailureAt: Date | null = null;
  private lastSuccessAt: Date | null = null;
  private readonly failureThreshold: number;
  private readonly cooldownMs: number;

  constructor(
    failureThreshold = DEFAULT_FAILURE_THRESHOLD,
    cooldownMs = DEFAULT_COOLDOWN_MS
  ) {
    this.failureThreshold = failureThreshold;
    this.cooldownMs = cooldownMs;
  }

  /**
   * Registra un'operazione completata con successo.
   * Resetta il contatore dei fallimenti consecutivi.
   */
  recordSuccess(): void {
    this.consecutiveFailures = 0;
    this.lastSuccessAt = new Date();
  }

  /**
   * Registra un fallimento.
   * Incrementa il contatore dei fallimenti consecutivi.
   */
  recordFailure(): void {
    this.consecutiveFailures++;
    this.lastFailureAt = new Date();
  }

  /**
   * Verifica se il servizio e disponibile.
   *
   * Il servizio non e disponibile se il circuito e aperto
   * (troppi fallimenti consecutivi) E il cooldown non e ancora scaduto.
   */
  isAvailable(): boolean {
    if (this.consecutiveFailures < this.failureThreshold) {
      return true;
    }

    // Il circuito e aperto, ma controlliamo se il cooldown e scaduto
    if (this.lastFailureAt) {
      const elapsed = Date.now() - this.lastFailureAt.getTime();
      if (elapsed >= this.cooldownMs) {
        // Il cooldown e scaduto: permettiamo un tentativo (half-open)
        return true;
      }
    }

    return false;
  }

  /**
   * Restituisce lo stato completo del monitor di salute.
   */
  getStatus(): HealthStatus {
    const circuitOpen =
      this.consecutiveFailures >= this.failureThreshold &&
      (!this.lastFailureAt ||
        Date.now() - this.lastFailureAt.getTime() < this.cooldownMs);

    return {
      available: this.isAvailable(),
      consecutiveFailures: this.consecutiveFailures,
      lastFailureAt: this.lastFailureAt,
      lastSuccessAt: this.lastSuccessAt,
      circuitOpen,
    };
  }

  /**
   * Resetta manualmente il circuit breaker.
   */
  reset(): void {
    this.consecutiveFailures = 0;
    this.lastFailureAt = null;
  }
}

// Singleton - una sola istanza per tutta l'applicazione
export const infocarDataHealth = new InfocarDataHealthMonitor();
