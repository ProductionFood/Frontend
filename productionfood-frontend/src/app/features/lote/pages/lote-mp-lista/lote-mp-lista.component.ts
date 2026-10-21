import { Component, DestroyRef, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatSortModule, Sort } from '@angular/material/sort';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EMPTY, Subject, catchError, switchMap, tap } from 'rxjs';
import { SiRolDirective } from '../../../../shared/directives/si-rol.directive';
import { NotificacionService } from '../../../../core/ui/notificacion.service';
import { MateriaPrima } from '../../../materia-prima/models/materia-prima.model';
import { LoteMateriaPrima, ResultadoRegistroLote } from '../../models/lote.model';
import { LoteMateriaPrimaService } from '../../services/lote-materia-prima.service';
import { LoteMpFormularioComponent } from '../lote-mp-formulario/lote-mp-formulario.component';

@Component({
  selector: 'app-lote-mp-lista', standalone: true,
  imports: [ReactiveFormsModule, DatePipe, DecimalPipe, MatButtonModule, MatCardModule, MatCheckboxModule, MatChipsModule, MatDialogModule, MatFormFieldModule, MatIconModule, MatPaginatorModule, MatProgressBarModule, MatSelectModule, MatTableModule, MatSortModule, SiRolDirective],
  templateUrl: './lote-mp-lista.component.html', styleUrl: './lote-mp-lista.component.scss'
})
export class LoteMpListaComponent {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(LoteMateriaPrimaService);
  private readonly dialog = inject(MatDialog);
  private readonly notify = inject(NotificacionService);
  private readonly destroyRef = inject(DestroyRef);
  readonly columnas = ['codigoLote', 'materiaPrima', 'fechaProduccion', 'fechaVencimiento', 'cantidad', 'estado'];
  readonly filtros = this.fb.group({ idMateriaPrima: this.fb.control<number | null>(null), soloVencidos: false, vencenEn7Dias: false });
  readonly lotes = signal<LoteMateriaPrima[]>([]);
  readonly materias = signal<MateriaPrima[]>([]);
  readonly total = signal(0);
  readonly pagina = signal(0);
  readonly tamano = signal(10);
  readonly cargando = signal(false);
  readonly error = signal('');
  private readonly reload$ = new Subject<void>();

  constructor() {
    this.service.materiasPrimas().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ next: r => this.materias.set(r.content), error: () => this.materias.set([]) });
    this.reload$.pipe(tap(() => { this.cargando.set(true); this.error.set(''); }), switchMap(() => this.service.listar({ page: this.pagina(), size: this.tamano(), idMateriaPrima: this.filtros.controls.idMateriaPrima.value ?? undefined, soloVencidos: this.filtros.controls.soloVencidos.value ?? undefined, vencenEn7Dias: this.filtros.controls.vencenEn7Dias.value ?? undefined }).pipe(catchError((e: HttpErrorResponse) => { this.lotes.set([]); this.total.set(0); this.error.set(e.error?.message ?? 'No fue posible cargar los lotes.'); this.cargando.set(false); return EMPTY; }))), takeUntilDestroyed(this.destroyRef)).subscribe(r => { this.lotes.set(r.content); this.total.set(r.totalElements); this.cargando.set(false); });
    this.filtros.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => { this.pagina.set(0); this.recargar(); });
    this.recargar();
  }
  recargar(): void { this.reload$.next(); }
  onPagina(e: PageEvent): void { this.pagina.set(e.pageIndex); this.tamano.set(e.pageSize); this.recargar(); }
  abrirFormulario(): void {
    this.dialog.open(LoteMpFormularioComponent, { width: '680px', maxWidth: '96vw', disableClose: true, autoFocus: 'first-tabbable' }).afterClosed().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((r: ResultadoRegistroLote | false | undefined) => {
      if (r) { const unidad = r.unidad ?? ''; const saldo = r.saldoAnterior !== undefined && r.saldoPosterior !== undefined ? ` Inventario actualizado: ${r.saldoAnterior.toLocaleString('es-CO')} → ${r.saldoPosterior.toLocaleString('es-CO')} ${unidad}.` : ''; this.notify.exito(`Lote registrado correctamente.${saldo}`); this.recargar(); }
    });
  }
  estado(lote: LoteMateriaPrima): { texto: string; clase: string; dias: number } {
    const hoy = new Date(); hoy.setHours(0,0,0,0); const vence = new Date(`${lote.fechaVencimiento}T00:00:00`); const dias = Math.ceil((vence.getTime()-hoy.getTime())/86400000);
    if (dias < 0) return { texto: 'Vencido', clase: 'vencido', dias };
    if (dias <= 7) return { texto: `Vence en ${dias} d`, clase: 'urgente', dias };
    if (dias <= 30) return { texto: `Vence en ${dias} d`, clase: 'proximo', dias };
    return { texto: 'Vigente', clase: 'vigente', dias };
  }
}
