import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';

import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

import {
  GenerarReporteDialogComponent,
  GenerarReporteResultado
} from '../../components/generar-reporte-dialog/generar-reporte-dialog.component';

interface ReporteDisponible {
  titulo: string;
  descripcion: string;
  hu: string;
  ruta: string;
  icono: string;
  tono: 'verde' | 'azul' | 'morado' | 'naranja';
}

/**
 * Hub de reportes (HU-25 a HU-27). Agrupa los reportes ya implementados para
 * no obligar a recordar en qué módulo vive cada uno. Los permisos reales
 * siguen viviendo en cada ruta.
 */
@Component({
  selector: 'app-reporte-inicio',
  standalone: true,
  imports: [RouterLink, MatButtonModule, MatIconModule],
  templateUrl: './reporte-inicio.component.html',
  styleUrl: './reporte-inicio.component.scss'
})
export class ReporteInicioComponent {
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly reportes: readonly ReporteDisponible[] = [
    {
      titulo: 'Eficiencia de producción',
      descripcion:
        'Cumplimiento del plan, rendimiento ajustado y desviación acumulada por materia prima.',
      hu: 'HU-26',
      ruta: '/app/reportes/eficiencia',
      icono: 'insights',
      tono: 'verde'
    },
    {
      titulo: 'Consulta de pedidos',
      descripcion:
        'Ventas por cliente, ranking de productos y detalle de pedidos por período.',
      hu: 'HU-25',
      ruta: '/app/pedidos/consulta',
      icono: 'receipt_long',
      tono: 'azul'
    },
    {
      titulo: 'Historial de compras',
      descripcion:
        'Gasto por proveedor, compras pendientes y detalle de cada compra recibida.',
      hu: 'HU-15',
      ruta: '/app/compras/historial',
      icono: 'history',
      tono: 'morado'
    },
    {
      titulo: 'Alertas de stock',
      descripcion:
        'Materias primas bajo mínimo, costo de reposición y sugerencia de compra.',
      hu: 'HU-27',
      ruta: '/app/inventario/alertas',
      icono: 'notification_important',
      tono: 'naranja'
    }
  ];

  generar(): void {
    this.dialog
      .open(GenerarReporteDialogComponent, {
        width: '480px',
        maxWidth: '95vw',
        autoFocus: 'first-tabbable'
      })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((resultado: GenerarReporteResultado | undefined) => {
        if (!resultado) {
          return;
        }

        void this.router.navigate([resultado.ruta], {
          queryParams: {
            fechaInicio: resultado.fechaInicio,
            fechaFin: resultado.fechaFin
          }
        });
      });
  }
}
