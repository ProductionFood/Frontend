import { DecimalPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { EMPTY, Subject, catchError, switchMap, tap } from 'rxjs';
import { MateriaPrima } from '../../../materia-prima/models/materia-prima.model';
import { MateriaPrimaService } from '../../../materia-prima/services/materia-prima.service';
import { EstadoStock, InventarioMateriaPrima } from '../../models/inventario.model';
import { InventarioService } from '../../services/inventario.service';

@Component({
  selector: 'app-inventario-lista',
  standalone: true,
  imports: [DecimalPipe, ReactiveFormsModule, RouterLink, MatButtonModule, MatCardModule, MatCheckboxModule, MatFormFieldModule, MatIconModule, MatPaginatorModule, MatProgressBarModule, MatSelectModule, MatSortModule, MatTableModule],
  templateUrl: './inventario-lista.component.html',
  styleUrl: './inventario-lista.component.scss'
})
export class InventarioListaComponent {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(InventarioService);
  private readonly materiaService = inject(MateriaPrimaService);
  private readonly destroyRef = inject(DestroyRef);
  readonly columnas = ['materiaPrima', 'disponible', 'minimo', 'nivel', 'faltante', 'actualizado'];
  readonly filtros = this.fb.group({ idMateriaPrima: this.fb.control<number | null>(null), soloStockBajo: false, incluirInactivas: false });
  readonly filas = signal<InventarioMateriaPrima[]>([]);
  readonly materias = signal<MateriaPrima[]>([]);
  readonly total = signal(0);
  readonly totalMaterias = signal(0);
  readonly totalBajo = signal(0);
  readonly totalAgotadas = signal(0);
  readonly pagina = signal(0);
  readonly tamano = signal(20);
  readonly cargando = signal(false);
  readonly error = signal('');
  private readonly recargar$ = new Subject<void>();
  private readonly ordenCampo = signal('nombreMateriaPrima');
  private readonly ordenDireccion = signal<'asc' | 'desc'>('asc');

  constructor() {
    this.materiaService.listar({ page: 0, size: 200 }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ next: r => this.materias.set(r.content), error: () => this.materias.set([]) });
    this.cargarResumen();
    this.recargar$.pipe(
      tap(() => { this.cargando.set(true); this.error.set(''); }),
      switchMap(() => this.service.listar({ page: this.pagina(), size: this.tamano(), idMateriaPrima: this.filtros.controls.idMateriaPrima.value ?? undefined, soloStockBajo: this.filtros.controls.soloStockBajo.value || undefined, incluirInactivas: this.filtros.controls.incluirInactivas.value || undefined, sort: `${this.ordenCampo() },${this.ordenDireccion()}` }).pipe(catchError((e: HttpErrorResponse) => { this.filas.set([]); this.total.set(0); this.error.set(e.error?.message ?? 'No fue posible cargar el inventario.'); this.cargando.set(false); return EMPTY; }))),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(r => {
      this.filas.set(r.content); this.total.set(r.totalElements);
      this.cargando.set(false); this.error.set('');
    });
    this.filtros.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => { this.pagina.set(0); this.recargar(); });
    this.recargar();
  }

  recargar(): void { this.recargar$.next(); }
  private cargarResumen(): void {
    this.service.listar({ page: 0, size: 500, incluirInactivas: true }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: r => { this.totalMaterias.set(r.totalElements); this.totalBajo.set(r.content.filter(x => x.estadoStock === 'BAJO').length); this.totalAgotadas.set(r.content.filter(x => x.estadoStock === 'AGOTADO').length); },
      error: () => { this.totalMaterias.set(0); this.totalBajo.set(0); this.totalAgotadas.set(0); }
    });
  }
  onPagina(e: PageEvent): void { this.pagina.set(e.pageIndex); this.tamano.set(e.pageSize); this.recargar(); }
  onOrden(e: Sort): void { if (!e.direction) return; this.ordenCampo.set(e.active); this.ordenDireccion.set(e.direction); this.pagina.set(0); this.recargar(); }
  nombre(fila: InventarioMateriaPrima): string { return fila.materiaPrima?.nombre ?? fila.nombreMateriaPrima ?? fila.nombre ?? 'Materia prima'; }
  unidad(fila: InventarioMateriaPrima): string { return fila.materiaPrima?.unidad?.abreviatura ?? fila.unidad?.abreviatura ?? ''; }
  disponible(fila: InventarioMateriaPrima): number { return fila.disponible ?? fila.cantidadDisponible ?? 0; }
  faltante(fila: InventarioMateriaPrima): number { return fila.faltante ?? Math.max(0, fila.stockMinimo - this.disponible(fila)); }
  nivel(fila: InventarioMateriaPrima): number { return fila.stockMinimo > 0 ? Math.min(100, (this.disponible(fila) / fila.stockMinimo) * 100) : 100; }
  estado(fila: InventarioMateriaPrima): EstadoStock { if (fila.estadoStock) return fila.estadoStock; return this.disponible(fila) <= 0 ? 'AGOTADO' : this.disponible(fila) < fila.stockMinimo ? 'BAJO' : 'OK'; }
  colorEstado(fila: InventarioMateriaPrima): 'warn' | 'accent' | 'primary' { const estado = this.estado(fila); return estado === 'AGOTADO' ? 'warn' : estado === 'BAJO' ? 'accent' : 'primary'; }
  iconoEstado(fila: InventarioMateriaPrima): string { return this.estado(fila) === 'AGOTADO' ? 'error' : this.estado(fila) === 'BAJO' ? 'warning' : 'check_circle'; }
  fechaActualizacion(valor?: string | null): string { if (!valor) return '—'; const fecha = new Date(valor); if (Number.isNaN(fecha.getTime())) return '—'; const hoy = new Date(); if (fecha.toDateString() === hoy.toDateString()) return `hoy ${fecha.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false })}`; const ayer = new Date(); ayer.setDate(ayer.getDate() - 1); if (fecha.toDateString() === ayer.toDateString()) return `ayer ${fecha.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false })}`; return fecha.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit' }) + ' ' + fecha.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false }); }
}
