import { Component, DestroyRef, inject, signal, computed } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';

import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { PageEvent } from '@angular/material/paginator';
import { Sort } from '@angular/material/sort';

import {
  EMPTY,
  Subject,
  catchError,
  debounceTime,
  distinctUntilChanged,
  switchMap,
  tap
} from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { NotificacionService } from '../../../../core/ui/notificacion.service';
import { SiRolDirective } from '../../../../shared/directives/si-rol.directive';
import {
  ConfirmarDialogComponent,
  ConfirmarDialogData
} from '../../../../shared/components/confirmar-dialog/confirmar-dialog.component';
import { Receta } from '../../models/receta.model';
import { RecetaService } from '../../services/receta.service';

@Component({
  selector: 'app-receta-lista',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    DecimalPipe,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressBarModule,
    MatSelectModule,
    SiRolDirective
  ],
  templateUrl: './receta-lista.component.html',
  styleUrl: './receta-lista.component.scss'
})
export class RecetaListaComponent {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(RecetaService);
  private readonly dialog = inject(MatDialog);
  private readonly notificacion = inject(NotificacionService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly columnas = ['receta', 'producto', 'ingredientes', 'tiempo', 'rendimiento', 'estado', 'acciones'];

  readonly filtros = this.fb.group({
    busqueda: this.fb.nonNullable.control(''),
    estado: this.fb.control<boolean | null>(null)
  });

  readonly recetas = signal<Receta[]>([]);
  readonly total = signal(0);
  readonly kpiTotal = signal(0);
  readonly kpiActivas = signal(0);
  readonly kpiIngredientesPromedio = signal(0);
  readonly kpiTiempoPromedio = signal(0);
  readonly cargandoKpis = signal(true);
  readonly pagina = signal(0);
  readonly tamano = signal(20);
  readonly cargando = signal(false);
  readonly error = signal<string | null>(null);

  readonly totalPaginas = computed(() => Math.ceil(this.total() / this.tamano()) || 1);

  private readonly ordenCampo = signal('');
  private readonly ordenDireccion = signal<'asc' | 'desc' | ''>('');

  private readonly recargar$ = new Subject<void>();

  constructor() {
    this.recargar$
      .pipe(
        tap(() => {
          this.cargando.set(true);
          this.error.set(null);
        }),
        switchMap(() =>
          this.peticion().pipe(
            catchError((error: HttpErrorResponse) => {
              this.recetas.set([]);
              this.total.set(0);
              this.error.set(this.mensajeError(error));
              this.cargando.set(false);
              return EMPTY;
            })
          )
        ),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(respuesta => {
        this.recetas.set(respuesta.content);
        this.total.set(respuesta.totalElements);
        this.cargando.set(false);
        this.error.set(null);
      });

    this.filtros.controls.busqueda.valueChanges
      .pipe(
        debounceTime(350),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => {
        this.pagina.set(0);
        this.recargar();
      });

    this.filtros.controls.estado.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.pagina.set(0);
        this.recargar();
      });

    this.recargar();
  }

  recargar(): void {
    this.recargar$.next();
    this.cargarKpis();
  }

  private cargarKpis(): void {
    this.cargandoKpis.set(true);
    this.service.listar({ page: 0, size: 500 }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: r => {
        const items = r.content;
        this.kpiTotal.set(items.length);
        this.kpiActivas.set(items.filter(rec => rec.activa).length);
        const totalIngredientes = items.reduce((sum, rec) => sum + (rec.ingredientes?.length || 0), 0);
        this.kpiIngredientesPromedio.set(items.length > 0 ? Math.round((totalIngredientes / items.length) * 10) / 10 : 0);
        this.kpiTiempoPromedio.set(0); // TODO: backend - campo tiempoPreparacion
        this.cargandoKpis.set(false);
      },
      error: () => {
        this.kpiTotal.set(0);
        this.kpiActivas.set(0);
        this.kpiIngredientesPromedio.set(0);
        this.kpiTiempoPromedio.set(0);
        this.cargandoKpis.set(false);
      }
    });
  }

  onPagina(evento: PageEvent): void {
    this.pagina.set(evento.pageIndex);
    this.tamano.set(evento.pageSize);
    this.recargar();
  }

  onOrden(orden: Sort): void {
    this.ordenCampo.set(orden.direction ? orden.active : '');
    this.ordenDireccion.set(orden.direction);
    this.pagina.set(0);
    this.recargar();
  }

  abrir(receta: Receta): void {
    void this.router.navigate(['/app/recetas', receta.idReceta]);
  }

  nueva(): void {
    void this.router.navigate(['/app/recetas/nueva']);
  }

  cambiarEstado(receta: Receta): void {
    const activar = !(receta.activa ?? receta.activo ?? true);

    const data: ConfirmarDialogData = {
      titulo: activar ? 'Activar receta' : 'Desactivar receta',
      mensaje: `${activar ? '¿Activar' : '¿Desactivar'} la receta «${receta.nombre}»?`,
      textoConfirmar: activar ? 'Activar' : 'Desactivar',
      peligro: !activar
    };

    this.dialog
      .open(ConfirmarDialogComponent, {
        data,
        width: '440px'
      })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(ok => {
        if (!ok) return;
        this.service
          .cambiarEstado(receta.idReceta, activar)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: () => {
              this.notificacion.exito('Estado de la receta actualizado.');
              this.recargar();
            },
            error: (e: HttpErrorResponse) => this.notificacion.error(this.mensajeError(e))
          });
      });
  }

  esIncompleta(r: Receta): boolean {
    return !r.ingredientes || r.ingredientes.length === 0;
  }

  costoTanda(r: Receta): number {
    return r.costoTotalEstimado ?? r.ingredientes?.reduce((s, i) => s + (i.costoEstimado ?? (i.costoUnitario ?? i.materiaPrima?.costoUnitario ?? 0) * i.cantidad), 0) ?? 0;
  }

  private peticion() {
    const v = this.filtros.getRawValue();
    const c = this.ordenCampo();
    const sort = c && this.ordenDireccion() ? `${c},${this.ordenDireccion()}` : undefined;
    return this.service.listar({
      busqueda: v.busqueda.trim() || undefined,
      activa: v.estado ?? undefined,
      page: this.pagina(),
      size: this.tamano(),
      sort
    });
  }

  private mensajeError(e: HttpErrorResponse): string {
    if (e.status === 0) return 'No fue posible conectar con el servidor. Verifica la conexión e inténtalo de nuevo.';
    return e.error?.message ?? 'No se pudieron cargar las recetas. Inténtalo de nuevo.';
  }

  getRecetaIcon(nombre: string): string {
    const n = nombre.toLowerCase();
    if (n.includes('pan')) return '🍞';
    if (n.includes('galleta')) return '🍪';
    if (n.includes('yogur') || n.includes('leche')) return '🥛';
    if (n.includes('mermelada') || n.includes('fresa') || n.includes('dulce')) return '🍓';
    if (n.includes('queso')) return '🧀';
    if (n.includes('torta') || n.includes('pastel') || n.includes('chocolate')) return '🎂';
    return '📋';
  }

  getEstadoClass(activa: boolean): string {
    return activa ? 'status completed' : 'status cancelled';
  }

  getEstadoText(activa: boolean): string {
    return activa ? 'Activa' : 'Inactiva';
  }

  getProductoNombre(receta: Receta): string {
    return receta.producto?.nombre ?? '—';
  }
}