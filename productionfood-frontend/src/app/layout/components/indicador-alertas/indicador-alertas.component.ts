import { CommonModule, DecimalPipe } from '@angular/common';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { MatBadgeModule } from '@angular/material/badge';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';

import { InventarioMateriaPrima } from '../../../features/inventario/models/inventario.model';
import { InventarioService } from '../../../features/inventario/services/inventario.service';

@Component({
  selector: 'app-indicador-alertas',
  standalone: true,
  imports: [
    CommonModule,
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
                  <strong>{{ nombreAlerta(alerta) }}</strong>
                  <span
                    class="estado-chip"
                    [class.agotado]="alerta.estadoStock === 'AGOTADO'"
                    [class.bajo]="alerta.estadoStock === 'BAJO'"
                  >
                    {{ alerta.estadoStock === 'AGOTADO' ? 'Agotado' : 'Stock bajo' }}
                  </span>
                </div>
                <p>
                  Disponible: {{ disponible(alerta) | number:'1.2-2' }} {{ unidad(alerta) }} ·
                  Mínimo: {{ alerta.stockMinimo | number:'1.2-2' }} {{ unidad(alerta) }}
                </p>
                <small>
                  Faltan {{ faltante(alerta) | number:'1.2-2' }} {{ unidad(alerta) }}
                  para llegar al mínimo.
                </small>
              </div>
            }
          </div>
        }

        <mat-divider></mat-divider>

        <div class="menu-actions">
          <a mat-button routerLink="/app/inventario">Ver alertas</a>
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
        border: 1px solid rgba(14, 31, 53, 0.12);
        background: #fff;
        color: #1d2939;
        box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08);
        transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
        cursor: pointer;
      }

      .alertas-trigger:hover {
        transform: translateY(-1px);
        box-shadow: 0 12px 28px rgba(15, 23, 42, 0.12);
      }

      .alertas-trigger:focus-visible {
        outline: 2px solid #1faa70;
        outline-offset: 2px;
      }

      .alertas-trigger.sin-alertas {
        border-color: rgba(22, 76, 53, 0.16);
      }

      .alertas-trigger.alerta-baja {
        border-color: rgba(185, 119, 17, 0.32);
        background: linear-gradient(180deg, #fffaf0 0%, #fff6e2 100%);
      }

      .alertas-trigger.alerta-alta {
        border-color: rgba(190, 24, 93, 0.28);
        background: linear-gradient(180deg, #fff5f5 0%, #fff1f2 100%);
      }

      .icono {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 34px;
        height: 34px;
        border-radius: 50%;
        background: rgba(14, 31, 53, 0.06);
        color: #0f172a;
        flex-shrink: 0;
      }

      .alerta-baja .icono {
        background: rgba(185, 119, 17, 0.12);
        color: #9a6700;
      }

      .alerta-alta .icono {
        background: rgba(190, 24, 93, 0.12);
        color: #be185d;
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
        color: #667085;
      }

      .chevron {
        color: #667085;
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
        color: #101828;
      }

      .menu-header p {
        margin: 0;
        color: #667085;
        font-size: 0.84rem;
      }

      .menu-header mat-icon {
        margin-top: 2px;
        color: #164c35;
      }

      .menu-header mat-icon.alerta-baja {
        color: #b97711;
      }

      .menu-header mat-icon.alerta-alta {
        color: #be185d;
      }

      .menu-estado {
        padding: 18px 16px;
        color: #475467;
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
        color: #1faa70;
      }

      .link-like {
        border: 0;
        background: transparent;
        color: #164c35;
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
        border-bottom: 1px solid rgba(15, 23, 42, 0.06);
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
        color: #475467;
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
        background: #fff6e2;
        color: #9a6700;
      }

      .estado-chip.agotado {
        background: #fff1f2;
        color: #be185d;
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
  private readonly inventario = inject(InventarioService);
  private readonly destroy = inject(DestroyRef);

  readonly cargando = signal(true);
  readonly error = signal(false);
  readonly cantidad = signal(0);
  readonly alertas = signal<InventarioMateriaPrima[]>([]);

  readonly hayAgotados = computed(() =>
    this.alertas().some(alerta => alerta.estadoStock === 'AGOTADO')
  );

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
    return this.hayAgotados()
      ? 'Hay materias primas agotadas o por debajo del mínimo'
      : 'Hay materias primas por debajo del stock mínimo';
  });

  constructor() {
    this.consultarAlertas();
  }

  badgeValue(): number {
    return this.cantidad() > 99 ? 99 : this.cantidad();
  }

  nombreAlerta(alerta: InventarioMateriaPrima): string {
    return alerta.nombreMateriaPrima ?? alerta.nombre ?? alerta.materiaPrima?.nombre ?? 'Materia prima';
  }

  unidad(alerta: InventarioMateriaPrima): string {
    return alerta.unidad?.abreviatura ?? alerta.materiaPrima?.unidad?.abreviatura ?? 'und';
  }

  disponible(alerta: InventarioMateriaPrima): number {
    return alerta.disponible ?? alerta.cantidadDisponible ?? 0;
  }

  faltante(alerta: InventarioMateriaPrima): number {
    return Math.max(0, (alerta.stockMinimo ?? 0) - this.disponible(alerta));
  }

  recargar(): void {
    this.consultarAlertas();
  }

  private consultarAlertas(): void {
    this.cargando.set(true);
    this.error.set(false);

    this.inventario
      .listar({
        page: 0,
        size: 6,
        soloStockBajo: true,
        sort: 'cantidadDisponible,asc'
      })
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: respuesta => {
          this.alertas.set(respuesta.content ?? []);
          this.cantidad.set(respuesta.totalElements ?? respuesta.content.length ?? 0);
          this.cargando.set(false);
        },
        error: () => {
          this.alertas.set([]);
          this.cantidad.set(0);
          this.error.set(true);
          this.cargando.set(false);
        }
      });
  }
}
