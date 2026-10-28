import { Component, DestroyRef, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NotificacionService } from '../../../../core/ui/notificacion.service';
import { ConfirmarDialogComponent, ConfirmarDialogData } from '../../../../shared/components/confirmar-dialog/confirmar-dialog.component';
import { Producto } from '../../../producto/models/producto.model';
import { LoteProductoService } from '../../services/lote-producto.service';
import { CrearLoteProductoDto } from '../../models/lote-producto.model';

@Component({
  selector: 'app-lote-producto-formulario',
  standalone: true,
  imports: [ReactiveFormsModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatDatepickerModule, MatIconModule, MatProgressBarModule, MatProgressSpinnerModule],
  templateUrl: './lote-producto-formulario.component.html',
  styleUrl: './lote-producto-formulario.component.scss'
})
export class LoteProductoFormularioComponent {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(LoteProductoService);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);
  private readonly notify = inject(NotificacionService);
  private readonly destroyRef = inject(DestroyRef);
  readonly productos = signal<Producto[]>([]);
  readonly cargando = signal(true);
  readonly guardando = signal(false);
  readonly error = signal('');
  readonly fieldErrors = signal<Record<string, string>>({});
  readonly hoy = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
  readonly form = this.fb.group({
    codigoLote: ['', [Validators.required, Validators.maxLength(30)]],
    idProducto: [null as number | null, Validators.required],
    fechaProduccion: [null as Date | null, Validators.required],
    fechaVencimiento: [null as Date | null, Validators.required],
    cantidad: [null as number | null, [Validators.required, Validators.min(0.000001)]]
  });

  constructor() {
    this.service.productos().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: r => { this.productos.set(r.content); this.cargando.set(false); },
      error: () => { this.error.set('No se pudieron cargar los productos.'); this.cargando.set(false); }
    });
    this.form.controls.fechaProduccion.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      const f = this.form.controls.fechaVencimiento.value;
      if (f && this.fechaMinima && this.soloFecha(f) < this.soloFecha(this.fechaMinima)) this.form.controls.fechaVencimiento.setValue(null);
    });
    this.form.controls.idProducto.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(id => {
      const p = this.productos().find(x => x.idProducto === id);
      if (p && !this.form.controls.codigoLote.value) {
        const prefijo = p.nombre.split(/\s+/).map(x => x[0]).join('').slice(0, 3).toUpperCase();
        this.form.controls.codigoLote.setValue(`${prefijo}-${this.iso(this.hoy).replace(/-/g, '')}`);
      }
    });
  }

  get seleccionado(): Producto | undefined { return this.productos().find(p => p.idProducto === this.form.controls.idProducto.value); }
  get fechaMinima(): Date { const f = this.form.controls.fechaProduccion.value; return f && this.soloFecha(f) > this.soloFecha(this.hoy) ? f : this.hoy; }
  get vencimientoInvalido(): boolean { const v = this.form.controls.fechaVencimiento.value; return !!v && this.soloFecha(v) < this.soloFecha(this.fechaMinima); }
  get stockResultante(): number { return (this.seleccionado?.stockDisponible ?? 0) + Math.max(0, this.form.controls.cantidad.value ?? 0); }

  cancelar(): void {
    if (this.guardando()) return;
    this.confirmarSalida(() => void this.router.navigate(['/app/lotes-producto']));
  }

  private confirmarSalida(accion: () => void): void {
    if (!this.form.dirty) { accion(); return; }
    const data: ConfirmarDialogData = {
      titulo: 'Descartar cambios',
      mensaje: 'Hay cambios sin guardar. ¿Quieres salir y descartarlos?',
      textoConfirmar: 'Descartar cambios',
      textoCancelar: 'Seguir editando',
      peligro: true
    };
    // Modal deliberado (§19 desaconseja anidar): es el guard que evita descartar cambios sin preguntar.
    this.dialog.open(ConfirmarDialogComponent, { data, width: '420px', autoFocus: 'dialog' })
      .afterClosed().pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(confirmado => { if (confirmado) accion(); });
  }

  guardar(): void {
    this.form.markAllAsTouched(); this.error.set(''); this.fieldErrors.set({});
    if (this.form.invalid) return;
    if (this.vencimientoInvalido) {
      this.fieldErrors.set({ fechaVencimiento: 'No puede registrar un lote vencido ni anterior a la producción.' });
      return;
    }
    const v = this.form.getRawValue();
    const dto: CrearLoteProductoDto = {
      codigoLote: v.codigoLote!.trim(),
      idProducto: v.idProducto!,
      fechaProduccion: this.iso(v.fechaProduccion!),
      fechaVencimiento: this.iso(v.fechaVencimiento!),
      cantidad: v.cantidad!
    };
    this.guardando.set(true);
    this.service.crear(dto).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: r => {
        this.guardando.set(false);
        const mensaje = r.saldoAnterior !== undefined && r.saldoPosterior !== undefined ? ` Stock: ${r.saldoAnterior} → ${r.saldoPosterior}.` : '';
        this.notify.exito(`Lote registrado correctamente.${mensaje}`);
        void this.router.navigate(['/app/lotes-producto']);
      },
      error: (e: HttpErrorResponse) => {
        this.guardando.set(false);
        const body = e.error as { message?: string; fieldErrors?: { field: string; message: string }[] } | null;
        this.error.set(body?.message ?? 'No fue posible registrar el lote. Reintente.');
        const errors: Record<string, string> = {};
        for (const item of body?.fieldErrors ?? []) errors[item.field] = item.message;
        this.fieldErrors.set(errors);
      }
    });
  }

  errorCampo(c: string): string { return this.fieldErrors()[c] ?? ''; }
  private iso(f: Date): string { return `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}-${String(f.getDate()).padStart(2, '0')}`; }
  private soloFecha(f: Date): number { return new Date(f.getFullYear(), f.getMonth(), f.getDate()).getTime(); }
}
