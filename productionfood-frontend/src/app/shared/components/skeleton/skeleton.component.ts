import { Component, computed, input } from '@angular/core';

/**
 * Skeleton de carga (guía §09). Toda tabla o lista debe mostrar este estado
 * en lugar de dejar el área en blanco.
 */
@Component({
  selector: 'app-skeleton',
  standalone: true,
  template: `
    <div class="skeleton-grupo" role="status" aria-label="Cargando">
      @for (fila of filas(); track fila) {
        <span
          class="skeleton"
          [style.width.%]="anchoLinea(fila)"
          [style.height]="alto()"
          [style.border-radius]="radio()"
        ></span>
      }
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .skeleton-grupo {
        display: grid;
        gap: 8px;
        padding: 16px 20px;
      }

      .skeleton {
        display: block;
        background: linear-gradient(
          90deg,
          var(--superficie-suave) 25%,
          var(--superficie-hover) 50%,
          var(--superficie-suave) 75%
        );
        background-size: 200% 100%;
        animation: carga 1.4s infinite;
      }

      @keyframes carga {
        0% { background-position: 200% 0; }
        100% { background-position: -200% 0; }
      }

      @media (prefers-reduced-motion: reduce) {
        .skeleton { animation: none; }
      }
    `
  ]
})
export class SkeletonComponent {
  readonly lineas = input(4);
  readonly alto = input('14px');
  readonly radio = input('var(--radio-s)');

  readonly filas = computed(() =>
    Array.from({ length: this.lineas() }, (_, indice) => indice)
  );

  anchoLinea(indice: number): number {
    if (this.lineas() === 1) {
      return 100;
    }

    return [100, 80, 60][indice % 3];
  }
}
