import { Injectable, signal } from '@angular/core';

export type Tema = 'auto' | 'claro' | 'oscuro';

/**
 * Cambio de tema (guía §15 y arquitectura de tokens). Solo alterna
 * `data-theme` en <html> y guarda la preferencia; los valores viven en SCSS.
 */
@Injectable({ providedIn: 'root' })
export class TemaService {
  private readonly clave = 'pf-tema';
  private readonly consultaOscuro = window.matchMedia(
    '(prefers-color-scheme: dark)'
  );

  readonly tema = signal<Tema>(this.leerPreferencia());
  readonly oscuro = signal(false);

  constructor() {
    this.aplicar(this.tema());

    this.consultaOscuro.addEventListener('change', () => {
      if (this.tema() === 'auto') {
        this.aplicar('auto');
      }
    });
  }

  /** Alterna entre claro y oscuro; deja de seguir al sistema. */
  alternar(): void {
    this.aplicar(this.oscuro() ? 'claro' : 'oscuro');
  }

  aplicar(tema: Tema): void {
    const oscuro =
      tema === 'oscuro' || (tema === 'auto' && this.consultaOscuro.matches);

    this.tema.set(tema);
    this.oscuro.set(oscuro);
    document.documentElement.dataset['theme'] = oscuro ? 'dark' : 'light';

    try {
      localStorage.setItem(this.clave, tema);
    } catch {
      // Sin almacenamiento: la preferencia vive solo en esta sesión.
    }
  }

  private leerPreferencia(): Tema {
    try {
      const guardado = localStorage.getItem(this.clave);

      if (guardado === 'claro' || guardado === 'oscuro' || guardado === 'auto') {
        return guardado;
      }
    } catch {
      // Sin almacenamiento: se usa la preferencia del sistema.
    }

    return 'auto';
  }
}
