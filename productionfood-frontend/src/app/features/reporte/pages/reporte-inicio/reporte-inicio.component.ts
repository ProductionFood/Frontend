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
  tono: 'verde' | 'azul' | 'morado' | 'naranja' | 'rojo';
}

interface ReporteReciente {
  nombre: string;
  fecha: string;
  tipo: 'pdf' | 'xls' | 'csv';
  icono: string;
  iconoColor: string;
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

  readonly kpiReportesGenerados = 32;
  readonly kpiProgramados = 4;
  readonly kpiCompartidos = 18;
  readonly kpiExportaciones = 57;

  readonly reportes: readonly ReporteDisponible[] = [
    {
      titulo: 'Producción general',
      descripcion: 'Resumen de todos los planes ejecutados en un rango de fechas con detalle por producto.',
      hu: 'HU-26',
      ruta: '/app/reportes/eficiencia',
      icono: 'insights',
      tono: 'verde'
    },
    {
      titulo: 'Inventario valorizado',
      descripcion: 'Existencias actuales con costo unitario, valor total por categoría y proyección de compras.',
      hu: 'HU-27',
      ruta: '/app/inventario/alertas',
      icono: 'warehouse',
      tono: 'azul'
    },
    {
      titulo: 'Rendimiento de recetas',
      descripcion: 'Comparativa entre producción planificada vs. real por receta, con mermas y eficiencia.',
      hu: 'HU-26',
      ruta: '/app/recetas',
      icono: 'menu_book',
      tono: 'morado'
    },
    {
      titulo: 'Cumplimiento de planes',
      descripcion: 'Estado de los planes por período, cumplimiento de fechas y porcentaje de completitud.',
      hu: 'HU-26',
      ruta: '/app/reportes/eficiencia',
      icono: 'event_available',
      tono: 'naranja'
    },
    {
      titulo: 'Alertas y mermas',
      descripcion: 'Registro histórico de alertas de stock bajo, productos vencidos y pérdidas por merma.',
      hu: 'HU-27',
      ruta: '/app/inventario/alertas',
      icono: 'warning_amber',
      tono: 'rojo'
    },
    {
      titulo: 'Compras por proveedor',
      descripcion: 'Historial de compras agrupado por proveedor con materias primas y montos totales.',
      hu: 'HU-15',
      ruta: '/app/compras/historial',
      icono: 'local_shipping',
      tono: 'verde'
    }
  ];

  readonly reportesRecientes: readonly ReporteReciente[] = [
    {
      nombre: 'Producción - Semana 36',
      fecha: '09 Sep 2026 · 08:45 · Por Natalia Gongora',
      tipo: 'pdf',
      icono: 'insights',
      iconoColor: 'verde'
    },
    {
      nombre: 'Inventario valorizado - Agosto',
      fecha: '08 Sep 2026 · 17:20 · Por Natalia Gongora',
      tipo: 'xls',
      icono: 'warehouse',
      iconoColor: 'azul'
    },
    {
      nombre: 'Rendimiento de recetas Q3',
      fecha: '07 Sep 2026 · 11:05 · Por Natalia Gongora',
      tipo: 'csv',
      icono: 'menu_book',
      iconoColor: 'morado'
    },
    {
      nombre: 'Alertas y mermas - Agosto',
      fecha: '06 Sep 2026 · 16:30 · Por Sistema',
      tipo: 'pdf',
      icono: 'warning_amber',
      iconoColor: 'rojo'
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

  getTipoBadgeClass(tipo: string): string {
    switch (tipo) {
      case 'pdf': return 'badge-type pdf';
      case 'xls': return 'badge-type xls';
      case 'csv': return 'badge-type csv';
      default: return 'badge-type';
    }
  }

  getIconoColorClass(tono: string): string {
    switch (tono) {
      case 'verde': return 'icon-sm verde';
      case 'azul': return 'icon-sm azul';
      case 'morado': return 'icon-sm morado';
      case 'naranja': return 'icon-sm naranja';
      case 'rojo': return 'icon-sm rojo';
      default: return 'icon-sm';
    }
  }
}