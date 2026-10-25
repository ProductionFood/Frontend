import { Component, DestroyRef, inject, signal } from '@angular/core';
import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { PageEvent } from '@angular/material/paginator';
import { Sort } from '@angular/material/sort';
import { Router } from '@angular/router';
import { EMPTY, Subject, catchError, debounceTime, distinctUntilChanged, switchMap, tap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatDialog } from '@angular/material/dialog';
import { SiRolDirective } from '../../../../shared/directives/si-rol.directive';
import { TablaColumnaDirective } from '../../../../shared/components/tabla-paginada/tabla-columna.directive';
import { ColumnaTabla, TablaPaginadaComponent } from '../../../../shared/components/tabla-paginada/tabla-paginada.component';
import { Receta } from '../../models/receta.model';
import { RecetaService } from '../../services/receta.service';
import { KpisCatalogoComponent } from '../../../../shared/components/kpis-catalogo/kpis-catalogo.component';
import { contarCatalogo } from '../../../../shared/utils/conteo-catalogo';
import { NotificacionService } from '../../../../core/ui/notificacion.service';
import { ConfirmarDialogComponent, ConfirmarDialogData } from '../../../../shared/components/confirmar-dialog/confirmar-dialog.component';

@Component({
  selector: 'app-receta-lista', standalone: true,
  imports: [ReactiveFormsModule, CurrencyPipe, DecimalPipe, MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule, MatSelectModule, MatTooltipModule, TablaPaginadaComponent, TablaColumnaDirective, SiRolDirective, KpisCatalogoComponent],
  templateUrl: './receta-lista.component.html', styleUrl: './receta-lista.component.scss'
})
export class RecetaListaComponent {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(RecetaService);
  private readonly dialog = inject(MatDialog);
  private readonly notificacion = inject(NotificacionService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  readonly columnas: ColumnaTabla[] = [
    { id: 'producto', titulo: 'Producto', ordenable: true },
    { id: 'nombre', titulo: 'Receta', ordenable: true },
    { id: 'rendimiento', titulo: 'Rendimiento', ordenable: false },
    { id: 'ingredientes', titulo: 'Ingredientes', ordenable: false },
    { id: 'costo', titulo: 'Costo estimado por tanda', ordenable: true },
    { id: 'estado', titulo: 'Estado', ordenable: false },
    { id: 'acciones', titulo: '', ordenable: false }
  ];
  readonly filtros = this.fb.group({ busqueda: this.fb.nonNullable.control(''), activa: this.fb.control<boolean | null>(true) });
  readonly recetas = signal<Receta[]>([]);
  readonly total = signal(0);
  readonly kpiTotal = signal(0);
  readonly kpiActivos = signal(0);
  readonly kpiInactivos = signal(0);
  readonly cargandoKpis = signal(true);
  readonly pagina = signal(0);
  readonly tamano = signal(20);
  readonly cargando = signal(false);
  readonly error = signal<string | null>(null);
  private readonly ordenCampo = signal('');
  private readonly ordenDireccion = signal<'asc' | 'desc' | ''>('');
  private readonly recargar$ = new Subject<void>();

  constructor() {
    this.recargar$.pipe(tap(() => { this.cargando.set(true); this.error.set(null); }), switchMap(() => this.peticion().pipe(catchError((e: HttpErrorResponse) => { this.recetas.set([]); this.total.set(0); this.error.set(this.mensajeError(e)); this.cargando.set(false); return EMPTY; }))), takeUntilDestroyed(this.destroyRef)).subscribe(r => { this.recetas.set(r.content); this.total.set(r.totalElements); this.cargando.set(false); this.error.set(null); });
    this.filtros.controls.busqueda.valueChanges.pipe(debounceTime(350), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef)).subscribe(() => { this.pagina.set(0); this.recargar(); });
    this.filtros.controls.activa.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => { this.pagina.set(0); this.recargar(); });
    this.recargar();
  }
  recargar(): void { this.recargar$.next(); this.cargarKpis(); }

  private cargarKpis(): void {
    this.cargandoKpis.set(true);
    contarCatalogo(activa => this.service.listar({ page: 0, size: 1, activa }))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ total, activos, inactivos }) => {
        this.kpiTotal.set(total);
        this.kpiActivos.set(activos);
        this.kpiInactivos.set(inactivos);
        this.cargandoKpis.set(false);
      });
  }
  onPagina(e: PageEvent): void { this.pagina.set(e.pageIndex); this.tamano.set(e.pageSize); this.recargar(); }
  onOrden(e: Sort): void { this.ordenCampo.set(e.direction ? e.active : ''); this.ordenDireccion.set(e.direction); this.pagina.set(0); this.recargar(); }
  abrir(receta: Receta): void { void this.router.navigate(['/app/recetas', receta.idReceta]); }
  nueva(): void { void this.router.navigate(['/app/recetas/nueva']); }
  mensajeVacio(): string { const q = this.filtros.controls.busqueda.value.trim(); return q ? `Ninguna receta coincide con «${q}».` : 'No hay recetas registradas.'; }
  cambiarEstado(receta: Receta): void {
    const activa = !(receta.activa ?? receta.activo ?? true);
    const data: ConfirmarDialogData = { titulo: activa ? 'Activar receta' : 'Desactivar receta', mensaje: `${activa ? '¿Activar' : '¿Desactivar'} la receta «${receta.nombre}»?`, textoConfirmar: activa ? 'Activar' : 'Desactivar', peligro: !activa };
    this.dialog.open(ConfirmarDialogComponent, { data, width: '440px' }).afterClosed().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(ok => {
      if (!ok) return;
      this.service.cambiarEstado(receta.idReceta, activa).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ next: () => { this.notificacion.exito('Estado de la receta actualizado.'); this.recargar(); }, error: (e: HttpErrorResponse) => this.notificacion.error(this.mensajeError(e)) });
    });
  }
  esIncompleta(r: Receta): boolean { return !r.ingredientes || r.ingredientes.length === 0; }
  costoTanda(r: Receta): number { return r.costoTotalEstimado ?? r.ingredientes?.reduce((s, i) => s + (i.costoEstimado ?? (i.costoUnitario ?? i.materiaPrima?.costoUnitario ?? 0) * i.cantidad), 0) ?? 0; }
  private peticion() { const v = this.filtros.getRawValue(); const c = this.ordenCampo(); const sort = c && this.ordenDireccion() ? `${c},${this.ordenDireccion()}` : undefined; return this.service.listar({ busqueda: v.busqueda.trim() || undefined, activa: v.activa ?? undefined, page: this.pagina(), size: this.tamano(), sort }); }
  private mensajeError(e: HttpErrorResponse): string { if (e.status === 0) return 'No fue posible conectar con el servidor. Verifica la conexión e inténtalo de nuevo.'; return e.error?.message ?? 'No se pudieron cargar las recetas. Inténtalo de nuevo.'; }
}
