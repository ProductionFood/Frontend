import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter, map } from 'rxjs';

import { NAV_GRUPOS } from '../../nav-items';

export interface Miga {
  texto: string;
  enlace?: string;
}

/** Nombre visible de los segmentos de subrutas (después del módulo). */
const SUBRUTAS: Record<string, string> = {
  nuevo: 'Nuevo',
  nueva: 'Nueva',
  editar: 'Editar',
  historial: 'Historial',
  consulta: 'Consulta',
  alertas: 'Alertas de stock',
  sugerencia: 'Sugerencia de compra',
  movimientos: 'Movimientos',
  'nuevo-movimiento': 'Nuevo movimiento',
  kardex: 'Kardex',
  eficiencia: 'Eficiencia'
};

const esId = (segmento: string) => /^\d+$/.test(segmento);

/** Migas para una URL de la app; vacío en el dashboard o en rutas desconocidas. */
export function migasDeUrl(url: string): Miga[] {
  const segmentos = url.replace(/[?#].*$/, '').split('/').filter(Boolean).slice(1);
  if (segmentos[0] === 'en-construccion') segmentos.splice(0, 1);

  const [ruta, ...resto] = segmentos;
  // El dashboard es el inicio: no lleva migas.
  if (!ruta || ruta === 'dashboard') return [];

  const grupo = NAV_GRUPOS.find(g => g.items.some(i => i.ruta === ruta));
  const item = grupo?.items.find(i => i.ruta === ruta);
  if (!grupo || !item) return [];

  const migas: Miga[] = [
    { texto: 'Inicio', enlace: '/app/dashboard' },
    { texto: grupo.titulo },
    { texto: item.titulo, enlace: `/app/${ruta}` }
  ];

  resto.forEach((segmento, i) => {
    if (esId(segmento)) {
      // Un id al final es la vista de detalle; si sigue otra subruta, se omite.
      if (i === resto.length - 1) migas.push({ texto: 'Detalle' });
      return;
    }
    const texto = SUBRUTAS[segmento];
    if (texto) migas.push({ texto, enlace: `/app/${[ruta, ...resto.slice(0, i + 1)].join('/')}` });
  });

  return migas;
}

/**
 * Migas de pan sobre el título de cada página (guía §08: "el breadcrumb
 * siempre va sobre el título"). Se arman desde la URL y NAV_GRUPOS, la misma
 * fuente del sidebar, así ninguna página tiene que declararlas.
 * Ejemplo: Inicio / Comercial / Pedidos / Detalle.
 */
@Component({
  selector: 'app-migas',
  standalone: true,
  imports: [RouterLink],
  template: `
    @if (migas().length) {
      <nav class="migas" aria-label="Ruta de navegación">
        <ol>
          @for (miga of migas(); track $index; let ultima = $last) {
            <li>
              @if (miga.enlace && !ultima) {
                <a [routerLink]="miga.enlace">{{ miga.texto }}</a>
              } @else {
                <span [attr.aria-current]="ultima ? 'page' : null" [class.actual]="ultima">{{ miga.texto }}</span>
              }
            </li>
          }
        </ol>
      </nav>
    }
  `,
  styles: `
    .migas ol {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 4px;
      margin: 0 0 8px;
      padding: 0;
      list-style: none;
      font-size: 11px;
      color: var(--tinta-400);
    }

    li + li::before {
      content: '/';
      margin-right: 4px;
      color: var(--tinta-400);
    }

    a {
      color: var(--tinta-600);
      text-decoration: none;
      border-radius: 4px;
    }

    a:hover {
      color: var(--verde-700);
      text-decoration: underline;
    }

    .actual {
      font-weight: 700;
      color: var(--tinta-600);
    }
  `
})
export class MigasComponent {
  private readonly router = inject(Router);

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map(e => e.urlAfterRedirects)
    ),
    { initialValue: this.router.url }
  );

  readonly migas = computed(() => migasDeUrl(this.url()));
}
