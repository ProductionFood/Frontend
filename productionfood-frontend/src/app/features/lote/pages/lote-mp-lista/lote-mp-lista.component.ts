import { Component, DestroyRef, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { PageEvent } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EMPTY, Subject, catchError, switchMap, tap } from 'rxjs';
import { SiRolDirective } from '../../../../shared/directives/si-rol.directive';
import {
  ColumnaTabla,
  TablaPaginadaComponent
} from '../../../../shared/components/tabla-paginada/tabla-paginada.component';
import { TablaColumnaDirective } from '../../../../shared/components/tabla-paginada/tabla-columna.directive';
import { TarjetaTablaComponent } from '../../../../shared/components/tarjeta-tabla/tarjeta-tabla.component';
import { MateriaPrima } from '../../../materia-prima/models/materia-prima.model';
import { LoteMateriaPrima } from '../../models/lote.model';
import { LoteMateriaPrimaService } from '../../services/lote-materia-prima.service';

@Component({
  selector: 'app-lote-mp-lista', standalone: true,
  imports: [ReactiveFormsModule, DatePipe, DecimalPipe, MatButtonModule, MatCardModule, MatCheckboxModule, MatChipsModule, MatFormFieldModule, MatIconModule, MatSelectModule, SiRolDirective, TablaPaginadaComponent, TablaColumnaDirective, TarjetaTablaComponent],
  templateUrl: './lote-mp-lista.component.html', styleUrl: './lote-mp-lista.component.scss'
})
export class LoteMpListaComponent {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(LoteMateriaPrimaService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  readonly columnas: ColumnaTabla[] = [
    { id: 'codigoLote', titulo: 'Código', ordenable: false },
    { id: 'materiaPrima', titulo: 'Materia prima', ordenable: false },
    { id: 'fechaProduccion', titulo: 'Producción', ordenable: false },
    { id: 'fechaVencimiento', titulo: 'Vencimiento', ordenable: false },
    { id: 'cantidad', titulo: 'Cantidad', ordenable: false },
    { id: 'estado', titulo: 'Estado', ordenable: false }
  ];
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
    void this.router.navigate(['/app/lotes-materia-prima', 'nuevo']);
  }
  estado(lote: LoteMateriaPrima): { texto: string; clase: string; dias: number } {
    const hoy = new Date(); hoy.setHours(0,0,0,0); const vence = new Date(`${lote.fechaVencimiento}T00:00:00`); const dias = Math.ceil((vence.getTime()-hoy.getTime())/86400000);
    if (dias < 0) return { texto: 'Vencido', clase: 'vencido', dias };
    if (dias <= 7) return { texto: `Vence en ${dias} d`, clase: 'urgente', dias };
    if (dias <= 30) return { texto: `Vence en ${dias} d`, clase: 'proximo', dias };
    return { texto: 'Vigente', clase: 'vigente', dias };
  }
}
