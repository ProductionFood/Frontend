import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { MatButtonModule } from '@angular/material/button';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Router, RouterLink } from '@angular/router';

import { catchError, finalize, of } from 'rxjs';

import {
  CompraPrefill,
  CompraPrefillItem
} from '../../../compra/models/compra.model';
import {
  SugerenciaCompra,
  SugerenciaItem
} from '../../models/alerta.model';
import { AlertaService } from '../../services/alerta.service';

type ItemConId = SugerenciaItem & { idMateriaPrima: number };

/**
 * Sugerencia de compra (HU-27 R-06). Agrupa por el proveedor de la última
 * compra recibida y aplica 20 % de margen sobre el faltante. El botón lleva a
 * HU-13 con el proveedor y los ítems prellenados: detectar y resolver sin
 * volver a teclear nada.
 */
@Component({
  selector: 'app-sugerencia-compra',
  standalone: true,
  imports: [
    CurrencyPipe,
    DecimalPipe,
    RouterLink,
    MatButtonModule,
    MatExpansionModule,
    MatIconModule,
    MatProgressBarModule
  ],
  templateUrl: './sugerencia-compra.component.html',
  styleUrl: './sugerencia-compra.component.scss'
})
export class SugerenciaCompraComponent {
  private readonly alertaService = inject(AlertaService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly datos = signal<SugerenciaCompra[]>([]);
  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);

  constructor() {
    this.cargar();
  }

  recargar(): void {
    this.cargar();
  }

  /** Lleva los ítems sugeridos al formulario de compra (HU-13). */
  crearCompra(grupo: SugerenciaCompra): void {
    const items: CompraPrefillItem[] = grupo.items
      .filter((item): item is ItemConId => item.idMateriaPrima !== undefined)
      .map(item => ({
        idMateriaPrima: item.idMateriaPrima,
        cantidad: item.cantidadSugerida,
        precioUnitario:
          item.costoUnitario ??
          (item.cantidadSugerida > 0
            ? item.costoEstimado / item.cantidadSugerida
            : 0)
      }));

    const prefill: CompraPrefill = {
      idProveedor: grupo.proveedor?.idProveedor ?? null,
      items
    };

    void this.router.navigate(['/app/compras'], {
      state: { compraSugerida: prefill }
    });
  }

  private cargar(): void {
    this.cargando.set(true);
    this.error.set(null);

    this.alertaService
      .sugerenciaCompra()
      .pipe(
        catchError(() => {
          this.error.set('No se pudo cargar la sugerencia de compra.');
          return of(null);
        }),
        finalize(() => this.cargando.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(datos => {
        if (datos) {
          this.datos.set(datos);
        }
      });
  }
}
