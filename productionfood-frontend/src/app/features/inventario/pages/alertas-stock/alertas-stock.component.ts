import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';

import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTableModule } from '@angular/material/table';
import { RouterLink } from '@angular/router';

import { catchError, finalize, of } from 'rxjs';

import { SiRolDirective } from '../../../../shared/directives/si-rol.directive';
import { NivelStockBarComponent } from '../../components/nivel-stock-bar/nivel-stock-bar.component';
import { AlertasStockResponse } from '../../models/alerta.model';
import { AlertaService } from '../../services/alerta.service';
import { EstadoBadgeComponent } from '../../../../shared/components/estado-badge/estado-badge.component';
import { EstadoVacioComponent } from '../../../../shared/components/estado-vacio/estado-vacio.component';
import { KpiCardComponent } from '../../../../shared/components/kpi-card/kpi-card.component';
import { TarjetaTablaComponent } from '../../../../shared/components/tarjeta-tabla/tarjeta-tabla.component';

/**
 * Alertas de stock (HU-27). Ordenadas por urgencia: agotadas primero aunque
 * el faltante sea menor (R-03). El estado vacío es una buena noticia y se
 * muestra en verde con la hora de la verificación.
 */
@Component({
  selector: 'app-alertas-stock',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    CurrencyPipe,
    DatePipe,
    DecimalPipe,
    RouterLink,
    MatButtonModule,
    MatCheckboxModule,
    MatIconModule,
    MatProgressBarModule,
    MatTableModule,
    SiRolDirective,
    NivelStockBarComponent,
    EstadoBadgeComponent,
    EstadoVacioComponent,
    KpiCardComponent,
    TarjetaTablaComponent
  ],
  templateUrl: './alertas-stock.component.html',
  styleUrl: './alertas-stock.component.scss'
})
export class AlertasStockComponent {
  private readonly fb = inject(FormBuilder);
  private readonly alertaService = inject(AlertaService);
  private readonly destroyRef = inject(DestroyRef);

  readonly columnas = [
    'materiaPrima',
    'disponible',
    'minimo',
    'nivel',
    'faltante',
    'reposicion'
  ];

  readonly filtros = this.fb.group({
    incluirInactivas: this.fb.control(false)
  });

  readonly datos = signal<AlertasStockResponse | null>(null);
  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);

  constructor() {
    this.filtros.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.cargar());

    this.cargar();
  }

  recargar(): void {
    this.cargar();
  }

  private cargar(): void {
    this.cargando.set(true);
    this.error.set(null);

    this.alertaService
      .alertas(this.filtros.controls.incluirInactivas.value ?? false)
      .pipe(
        catchError((error: HttpErrorResponse) => {
          const cuerpo = error.error as { message?: string } | null;
          this.error.set(
            cuerpo?.message ?? 'No se pudo cargar las alertas de stock.'
          );
          this.datos.set(null);
          return of(null);
        }),
        finalize(() => this.cargando.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(respuesta => {
        if (respuesta) {
          this.datos.set(respuesta);
        }
      });
  }
}
