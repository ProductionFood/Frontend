import { Injectable, computed, signal } from '@angular/core';

export type EstadoConexion = 'sincronizado' | 'sin-servidor' | 'sin-internet';

/**
 * Estado de conexión que muestra el sidebar. Combina dos señales:
 * - Internet: eventos online/offline del navegador.
 * - Servidor: el resultado real de las peticiones HTTP (conexionInterceptor).
 *   Una respuesta, aunque sea 4xx/5xx, demuestra que el servidor responde;
 *   un estado 0 significa que no se pudo llegar a él.
 */
@Injectable({ providedIn: 'root' })
export class ConexionService {
  private readonly enLinea = signal(typeof navigator === 'undefined' ? true : navigator.onLine);
  private readonly servidorResponde = signal(true);

  readonly estado = computed<EstadoConexion>(() => {
    if (!this.enLinea()) return 'sin-internet';
    return this.servidorResponde() ? 'sincronizado' : 'sin-servidor';
  });

  constructor() {
    if (typeof window === 'undefined') return;
    window.addEventListener('online', () => this.enLinea.set(true));
    window.addEventListener('offline', () => this.enLinea.set(false));
  }

  marcarRespuesta(): void {
    this.servidorResponde.set(true);
  }

  marcarSinServidor(): void {
    this.servidorResponde.set(false);
  }
}
