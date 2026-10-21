import { DatePipe, DecimalPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTableModule } from '@angular/material/table';
import { EMPTY, catchError } from 'rxjs';
import { InventarioMateriaPrima, KardexInventario, MovimientoInventario } from '../../models/inventario.model';
import { InventarioService } from '../../services/inventario.service';

@Component({
  selector: 'app-inventario-movimientos',
  standalone: true,
  imports: [DatePipe, DecimalPipe, RouterLink, MatButtonModule, MatCardModule, MatIconModule, MatPaginatorModule, MatProgressBarModule, MatTableModule],
  templateUrl: './inventario-movimientos.component.html',
  styleUrl: './inventario-movimientos.component.scss'
})
export class InventarioMovimientosComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly service = inject(InventarioService);
  private readonly destroyRef = inject(DestroyRef);
  readonly columnas = ['fecha', 'movimiento', 'cantidad', 'antes', 'despues', 'usuario'];
  readonly materia = signal<InventarioMateriaPrima | null>(null);
  readonly movimientos = signal<MovimientoInventario[]>([]);
  readonly saldoActual = signal<number | null>(null);
  readonly cargando = signal(false);
  readonly error = signal('');
  readonly pagina = signal(0);
  readonly tamano = signal(20);
  readonly total = signal(0);
  readonly movimientosPagina = computed(() => this.movimientos().slice(this.pagina() * this.tamano(), (this.pagina() + 1) * this.tamano()));
  readonly desde = this.fechaISO(-30);
  readonly hasta = this.fechaISO(0);
  readonly idMateriaPrima = Number(this.route.snapshot.paramMap.get('idMateriaPrima'));

  constructor() { this.recargar(); }

  recargar(): void {
    if (!Number.isInteger(this.idMateriaPrima) || this.idMateriaPrima <= 0) { this.error.set('La materia prima solicitada no es válida.'); return; }
    this.cargando.set(true); this.error.set('');
    this.service.movimientos(this.idMateriaPrima, this.desde, this.hasta).pipe(
      catchError((e: HttpErrorResponse) => { this.movimientos.set([]); this.total.set(0); this.error.set(e.error?.message ?? 'No fue posible cargar los movimientos.'); this.cargando.set(false); return EMPTY; }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(respuesta => {
      if (Array.isArray(respuesta)) { this.movimientos.set(respuesta); this.total.set(respuesta.length); this.materia.set(null); this.saldoActual.set(respuesta.length ? respuesta[0].saldoPosterior : 0); }
      else if ('movimientos' in respuesta && Array.isArray(respuesta.movimientos)) { const kardex = respuesta as KardexInventario; this.movimientos.set(kardex.movimientos); this.total.set(kardex.movimientos.length); this.materia.set(kardex.materiaPrima ?? null); this.saldoActual.set(kardex.saldoActual ?? (kardex.movimientos[0]?.saldoPosterior ?? 0)); }
      else { const pagina = respuesta as { content: MovimientoInventario[]; totalElements: number }; this.movimientos.set(pagina.content); this.total.set(pagina.totalElements); this.saldoActual.set(pagina.content[0]?.saldoPosterior ?? 0); }
      this.cargando.set(false);
    });
  }

  onPagina(e: PageEvent): void { this.pagina.set(e.pageIndex); this.tamano.set(e.pageSize); }
  esEntrada(m: MovimientoInventario): boolean { return m.direccion ? m.direccion === 'ENTRADA' : /ENTRADA|COMPRA|LOTE|INGRESO|RECEPCI/i.test(m.tipoMovimiento); }
  tipo(m: MovimientoInventario): string { return m.tipoMovimiento.replaceAll('_', ' ').toLocaleLowerCase('es-CO').replace(/^./, c => c.toLocaleUpperCase('es-CO')); }
  nombreUsuario(m: MovimientoInventario): string { if (!m.usuario) return '—'; if (typeof m.usuario === 'string') return m.usuario; return (m.usuario.nombreCompleto ?? [m.usuario.nombre, m.usuario.apellido].filter(Boolean).join(' ')) || '—'; }
  nombreMateria(): string { return this.materia()?.materiaPrima?.nombre ?? this.materia()?.nombreMateriaPrima ?? this.materia()?.nombre ?? this.route.snapshot.queryParamMap.get('nombre') ?? 'Materia prima'; }
  unidad(): string { const m = this.materia(); return m?.materiaPrima?.unidad?.abreviatura ?? m?.unidad?.abreviatura ?? ''; }
  origenUrl(m: MovimientoInventario): string | null { const tipo = (m.tipoDocumentoOrigen ?? m.tipoMovimiento).toLocaleLowerCase('es-CO'); const id = m.idDocumentoOrigen; if (!id) return null; if (tipo.includes('lote')) return '/app/lotes-materia-prima'; if (tipo.includes('compra') || tipo.includes('recepcion')) return '/app/compras'; if (tipo.includes('consumo') || tipo.includes('produccion')) return '/app/produccion'; return null; }
  private fechaISO(offsetDias: number): string { const f = new Date(); f.setDate(f.getDate() + offsetDias); return `${f.getFullYear()}-${String(f.getMonth()+1).padStart(2,'0')}-${String(f.getDate()).padStart(2,'0')}`; }
}
