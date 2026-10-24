import { DecimalPipe } from '@angular/common';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { MatBadgeModule } from '@angular/material/badge';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';

import { catchError, filter, finalize, forkJoin, fromEvent, of } from 'rxjs';

import {
  AlertaStock,
  ResumenAlertas
} from '../../../features/inventario/models/alerta.model';
import { AlertaService } from '../../../features/inventario/services/alerta.service';

@Component({
  selector: 'app-indicador-alertas',
  standalone: true,
  imports: [
    DecimalPipe,
    RouterLink,
    MatBadgeModule,
    MatButtonModule,
    MatDividerModule,
    MatIconModule,
    MatMenuModule
  ],
  template: `
    <button
      type="button"
      class="alertas-trigger"
      [class.sin-alertas]="cantidad() === 0"
      [class.alerta-baja]="cantidad() > 0 && !hayAgotados()"
      [class.alerta-alta]="hayAgotados()"
      [matMenuTriggerFor]="menuAlertas"
      [attr.aria-label]="ariaLabel()"
    >
      <span
        class="icono"
        [matBadge]="badgeValue()"
        [matBadgeHidden]="cantidad() <= 0"
        matBadgeOverlap="false"
        matBadgeSize="small"
      >
        <mat-icon>{{ hayAgotados() ? 'notifications_active' : 'notifications' }}</mat-icon>
      </span>

      <span class="texto">
        <strong>{{ tituloBoton() }}</strong>
        <small>{{ subtituloBoton() }}</small>
      </span>

      <mat-icon class="chevron">expand_more</mat-icon>
    </button>

    <mat-menu #menuAlertas="matMenu" xPosition="before" class="menu-alertas">
      <div class="menu-panel" (click)="$event.stopPropagation()">
        <div class="menu-header">
          <div>
            <h3>Alertas de inventario</h3>
            <p>{{ resumenMenu() }}</p>
          </div>
          <mat-icon [class.alerta-alta]="hayAgotados()" [class.alerta-baja]="cantidad() > 0 && !hayAgotados()">
            {{ hayAgotados() ? 'error_outline' : 'inventory_2' }}
          </mat-icon>
        </div>

        <mat-divider></mat-divider>

        @if (cargando()) {
          <div class="menu-estado">Cargando alertas…</div>
        } @else if (error()) {
          <div class="menu-estado error">
            <p>No fue posible consultar las alertas en este momento.</p>
            <button type="button" class="link-like" (click)="recargar()">Reintentar</button>
          </div>
        } @else if (!alertas().length) {
          <div class="menu-estado vacio">
            <mat-icon>task_alt</mat-icon>
            <p>No hay materias primas en estado crítico.</p>
          </div>
        } @else {
          <div class="alertas-lista">
            @for (alerta of alertas(); track alerta.idMateriaPrima) {
              <div class="alerta-item">
                <div class="alerta-titulo">
                  <strong>{{ alerta.nombre }}</strong>
                  <span
                    class="estado-chip"
                    [class.agotado]="alerta.nivel === 'AGOTADO'"
                    [class.bajo]="alerta.nivel === 'BAJO'"
                  >
                    {{ alerta.nivel === 'AGOTADO' ? 'Agotado' : 'Stock bajo' }}
                  </span>
                </div>
                <p>
                  Disponible: {{ alerta.cantidadDisponible | number:'1.2-2' }} {{ alerta.unidad }} ·
                  Mínimo: {{ alerta.stockMinimo | number:'1.2-2' }} {{ alerta.unidad }}
                </p>
                <small>
                  Faltan {{ alerta.faltante | number:'1.2-2' }} {{ alerta.unidad }}
                  para llegar al mínimo.
                </small>
              </div>
            }
          </div>
        }

        <mat-divider></mat-divider>

        <div class="menu-actions">
          <a mat-button routerLink="/app/inventario/alertas">Ver alertas</a>
          <a mat-flat-button routerLink="/app/compras">Registrar compra</a>
        </div>
      </div>
    </mat-menu>
  `,
  styles: [
    `
      :host {
        display: inline-flex;
        margin-right: 10px;
      }

      .alertas-trigger {
        display: inline-flex;
        align-items: center;
        gap: 12px;
        min-height: 46px;
        padding: 8px 14px;
        border-radius: 999px;
        border: 1px solid var(--linea);
        background: #fff;
        color: var(--tinta-900);
        box-shadow: var(--sombra-1);
        transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
        cursor: pointer;
      }

      .alertas-trigger:hover {
        transform: translateY(-1px);
        box-shadow: var(--sombra-2);
      }

      .alertas-trigger:focus-visible {
        outline: 2px solid var(--verde-500);
        outline-offset: 2px;
      }

      .alertas-trigger.sin-alertas {
        border-color: var(--linea);
      }

      .alertas-trigger.alerta-baja {
        border-color: var(--naranja-100);
        background: var(--blanco);
      }

      .alertas-trigger.alerta-alta {
        border-color: var(--rojo-100);
        background: var(--blanco);
      }

      .icono {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 34px;
        height: 34px;
        border-radius: 50%;
        background: var(--fondo);
        color: var(--tinta-900);
        flex-shrink: 0;
      }

      .alerta-baja .icono {
        background: var(--naranja-100);
        color: #92610b;
      }

      .alerta-alta .icono {
        background: var(--rojo-100);
        color: #b02a2e;
      }

      .texto {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        line-height: 1.05;
      }

      .texto strong {
        font-size: 0.95rem;
        font-weight: 700;
      }

      .texto small {
        font-size: 0.78rem;
        color: var(--tinta-400);
      }

      .chevron {
        color: var(--tinta-400);
        flex-shrink: 0;
      }

      .menu-panel {
        width: 100%;
        min-width: 0;
        max-width: 100%;
        overflow: hidden;
        padding: 6px 0 0;
        box-sizing: border-box;
      }

      .menu-panel * {
        min-width: 0;
      }

      .menu-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 12px;
        padding: 10px 16px 14px;
      }

      .menu-header h3 {
        margin: 0 0 4px;
        font-size: 1rem;
        font-weight: 800;
        color: var(--tinta-900);
      }

      .menu-header p {
        margin: 0;
        color: var(--tinta-400);
        font-size: 0.84rem;
      }

      .menu-header mat-icon {
        margin-top: 2px;
        color: var(--verde-700);
      }

      .menu-header mat-icon.alerta-baja {
        color: #b97711;
      }

      .menu-header mat-icon.alerta-alta {
        color: #b02a2e;
      }

      .menu-estado {
        padding: 18px 16px;
        color: var(--tinta-600);
        font-size: 0.9rem;
      }

      .menu-estado.error p {
        margin: 0 0 8px;
      }

      .menu-estado.vacio {
        display: flex;
        align-items: center;
        gap: 10px;
      }

      .menu-estado.vacio mat-icon {
        color: var(--verde-500);
      }

      .link-like {
        border: 0;
        background: transparent;
        color: var(--verde-700);
        font-weight: 700;
        cursor: pointer;
        padding: 0;
      }

      .alertas-lista {
        max-height: 320px;
        overflow: auto;
      }

      .alerta-item {
        padding: 14px 16px;
        border-bottom: 1px solid var(--linea);
      }

      .alerta-item:last-child {
        border-bottom: 0;
      }

      .alerta-titulo {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        margin-bottom: 6px;
      }

      .alerta-item p,
      .alerta-item small {
        display: block;
        margin: 0;
        color: var(--tinta-600);
      }

      .alerta-item p {
        font-size: 0.88rem;
        margin-bottom: 4px;
      }

      .alerta-item small {
        font-size: 0.8rem;
      }

      .estado-chip {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 82px;
        padding: 4px 10px;
        border-radius: 999px;
        font-size: 0.72rem;
        font-weight: 700;
      }

      .estado-chip.bajo {
        background: var(--naranja-100);
        color: #92610b;
      }

      .estado-chip.agotado {
        background: var(--rojo-100);
        color: #b02a2e;
      }

      .menu-actions {
        display: flex;
        flex-wrap: wrap;
        justify-content: flex-end;
        align-items: center;
        gap: 8px;
        padding: 12px 16px 14px;
      }

      .menu-actions a {
        min-width: 0;
        max-width: 100%;
        white-space: normal;
        text-align: center;
      }

      .menu-header p, .alerta-item p, .alerta-item small {
        overflow-wrap: anywhere;
      }

      @media (max-width: 768px) {
        :host {
          margin-right: 0;
        }

        .alertas-trigger {
          padding: 8px 12px;
          gap: 10px;
        }

        .texto small {
          display: none;
        }

        .menu-actions {
          flex-direction: column;
        }
      }
    `
  ]
})
export class IndicadorAlertasComponent {
  private readonly alertasService = inject(AlertaService);
  private readonly destroy = inject(DestroyRef);

  readonly cargando = signal(true);
  readonly error = signal(false);
  readonly cantidad = signal(0);
  readonly alertas = signal<AlertaStock[]>([]);
  readonly resumen = signal<ResumenAlertas | null>(null);

  readonly hayAgotados = computed(() => (this.resumen()?.agotadas ?? 0) > 0);

  readonly tituloBoton = computed(() => {
    if (this.cargando()) return 'Consultando…';
    if (this.error()) return 'Alertas no disponibles';
    const cantidad = this.cantidad();
    if (cantidad === 0) {
      return 'Sin alertas';
    }
    return cantidad === 1 ? '1 alerta' : `${cantidad} alertas`;
  });

  readonly subtituloBoton = computed(() => {
    if (this.cargando()) {
      return 'Consultando inventario';
    }
    if (this.error()) {
      return 'No disponible';
    }
    if (this.cantidad() === 0) {
      return 'Inventario en control';
    }
    return this.hayAgotados() ? 'Requieren atención inmediata' : 'Revise stock bajo';
  });

  readonly ariaLabel = computed(() => {
    if (this.error()) {
      return 'No se pudieron cargar las alertas de inventario';
    }
    if (this.cargando()) {
      return 'Cargando alertas de inventario';
    }
    return `${this.tituloBoton()}. Abrir panel de alertas de inventario`;
  });

  readonly resumenMenu = computed(() => {
    if (this.cargando()) {
      return 'Consultando materias primas bajo mínimo';
    }
    if (this.error()) {
      return 'No fue posible consultar el estado del inventario';
    }
    if (this.cantidad() === 0) {
      return 'Todo el inventario se encuentra dentro de los niveles esperados';
    }

    const resumen = this.resumen();

    return resumen
      ? `${resumen.agotadas} agotadas · ${resumen.bajas} bajo mínimo`
      : 'Hay materias primas por debajo del stock mínimo';
  });

  constructor() {
    this.consultarAlertas();

    // Sin sondeo agresivo: al cargar y al volver a la pestaña (HU-27).
    fromEvent(document, 'visibilitychange')
      .pipe(
        filter(() => document.visibilityState === 'visible'),
        takeUntilDestroyed(this.destroy)
      )
      .subscribe(() => this.consultarAlertas());
  }

  badgeValue(): number {
    return this.cantidad() > 99 ? 99 : this.cantidad();
  }

  recargar(): void {
    this.consultarAlertas();
  }

  private consultarAlertas(): void {
    this.cargando.set(true);
    this.error.set(false);

    forkJoin({
      resumen: this.alertasService.resumen().pipe(catchError(() => of(null))),
      listado: this.alertasService.alertas().pipe(catchError(() => of(null)))
    })
      .pipe(
        finalize(() => this.cargando.set(false)),
        takeUntilDestroyed(this.destroy)
      )
      .subscribe(({ resumen, listado }) => {
        if (!resumen) {
          this.alertas.set([]);
          this.cantidad.set(0);
          this.resumen.set(null);
          this.error.set(true);
          return;
        }

        this.resumen.set(resumen);
        this.cantidad.set(resumen.total);
        this.alertas.set((listado?.items ?? []).slice(0, 6));
      });
  }
}
