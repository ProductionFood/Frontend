import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';

interface ReporteOpcion {
  id: string;
  titulo: string;
  ruta: string;
}

export interface GenerarReporteResultado {
  ruta: string;
  fechaInicio: string;
  fechaFin: string;
}

/**
 * Diálogo "Generar reporte" (hub de Reportes). Elige el reporte y el período
 * y navega con `?fechaInicio=&fechaFin=`; no exporta archivos.
 */
@Component({
  selector: 'app-generar-reporte-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatSelectModule,
    MatDatepickerModule,
    MatButtonModule
  ],
  templateUrl: './generar-reporte-dialog.component.html',
  styleUrl: './generar-reporte-dialog.component.scss'
})
export class GenerarReporteDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly ref =
    inject<MatDialogRef<GenerarReporteDialogComponent>>(MatDialogRef);

  readonly reportes: readonly ReporteOpcion[] = [
    {
      id: 'eficiencia',
      titulo: 'Eficiencia de producción',
      ruta: '/app/reportes/eficiencia'
    },
    {
      id: 'pedidos',
      titulo: 'Consulta de pedidos',
      ruta: '/app/pedidos/consulta'
    },
    {
      id: 'compras',
      titulo: 'Historial de compras',
      ruta: '/app/compras/historial'
    }
  ];

  private readonly mesPorDefecto = this.rangoMesActual();

  readonly form = this.fb.group({
    reporte: this.fb.control<string>('eficiencia', {
      nonNullable: true,
      validators: [Validators.required]
    }),
    desde: this.fb.control<Date | null>(this.mesPorDefecto.desde),
    hasta: this.fb.control<Date | null>(this.mesPorDefecto.hasta)
  });

  get rangoInvalido(): boolean {
    const { desde, hasta } = this.form.getRawValue();

    return !!desde && !!hasta && desde.getTime() > hasta.getTime();
  }

  generar(): void {
    const { reporte, desde, hasta } = this.form.getRawValue();
    const opcion = this.reportes.find(item => item.id === reporte);

    if (!opcion || !desde || !hasta || this.rangoInvalido) {
      this.form.markAllAsTouched();
      return;
    }

    this.ref.close({
      ruta: opcion.ruta,
      fechaInicio: this.iso(desde),
      fechaFin: this.iso(hasta)
    } satisfies GenerarReporteResultado);
  }

  cancelar(): void {
    this.ref.close();
  }

  private rangoMesActual(): { desde: Date; hasta: Date } {
    const hoy = new Date();

    return {
      desde: new Date(hoy.getFullYear(), hoy.getMonth(), 1),
      hasta: new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0)
    };
  }

  private iso(fecha: Date): string {
    const anio = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');

    return `${anio}-${mes}-${dia}`;
  }
}
