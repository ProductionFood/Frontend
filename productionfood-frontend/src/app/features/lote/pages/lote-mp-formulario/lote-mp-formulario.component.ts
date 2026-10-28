import { Component, DestroyRef, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MateriaPrima } from '../../../materia-prima/models/materia-prima.model';
import { LoteMateriaPrimaService } from '../../services/lote-materia-prima.service';
import { CrearLoteMateriaPrimaDto, ResultadoRegistroLote } from '../../models/lote.model';
import { NotificacionService } from '../../../../core/ui/notificacion.service';
import { ConfirmarDialogComponent, ConfirmarDialogData } from '../../../../shared/components/confirmar-dialog/confirmar-dialog.component';

@Component({
  selector: 'app-lote-mp-formulario', standalone: true,
  imports: [ReactiveFormsModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatDatepickerModule, MatCardModule, MatIconModule, MatProgressBarModule],
  templateUrl: './lote-mp-formulario.component.html', styleUrl: './lote-mp-formulario.component.scss'
})
export class LoteMpFormularioComponent {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly service = inject(LoteMateriaPrimaService);
  private readonly dialog = inject(MatDialog);
  private readonly notify = inject(NotificacionService);
  private readonly destroyRef = inject(DestroyRef);
  readonly materias = signal<MateriaPrima[]>([]);
  readonly guardando = signal(false);
  readonly errorGeneral = signal('');
  readonly fieldErrors = signal<Record<string, string>>({});
  readonly form = this.fb.group({
    codigoLote: ['', [Validators.required, Validators.maxLength(30)]],
    idMateriaPrima: [null as number | null, Validators.required],
    fechaProduccion: [null as Date | null, Validators.required],
    fechaVencimiento: [null as Date | null, Validators.required],
    cantidad: [null as number | null, [Validators.required, Validators.min(0.000001)]]
  });

  constructor() {
    this.service.materiasPrimas().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: r => this.materias.set(r.content),
      error: () => this.errorGeneral.set('No fue posible cargar las materias primas. Cierre y vuelva a intentar.')
    });
    this.form.controls.fechaProduccion.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(fecha => {
      const vencimiento = this.form.controls.fechaVencimiento.value;
      if (fecha && vencimiento && this.soloFecha(vencimiento) < this.soloFecha(fecha)) this.form.controls.fechaVencimiento.setValue(null);
    });
  }

  get materiaSeleccionada(): MateriaPrima | undefined { return this.materias().find(m => m.idMateriaPrima === this.form.controls.idMateriaPrima.value); }
  get fechaMinimaVencimiento(): Date | null { return this.form.controls.fechaProduccion.value; }
  get vencido(): boolean { const fecha = this.form.controls.fechaVencimiento.value; return !!fecha && this.soloFecha(fecha) < this.soloFecha(new Date()); }
  get impacto(): string {
    const materia = this.materiaSeleccionada;
    const cantidad = this.form.controls.cantidad.value;
    if (!materia || cantidad === null || cantidad <= 0) return 'Seleccione la materia prima e indique una cantidad para calcular el impacto.';
    const unidad = materia.unidad?.abreviatura ?? '';
    return `Registrar este lote sumará ${cantidad.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${unidad} al inventario de ${materia.nombre}.`;
  }
  cancelar(): void { if (this.form.dirty && !confirm('Hay cambios sin guardar. ¿Desea descartarlos?')) return;         void this.router.navigate(['/app/lotes-materia-prima']); }
  guardar(): void {
    this.form.markAllAsTouched(); this.fieldErrors.set({}); this.errorGeneral.set('');
    if (this.form.invalid) return;
    const v = this.form.getRawValue();
    if (v.fechaProduccion && v.fechaVencimiento && this.soloFecha(v.fechaVencimiento) < this.soloFecha(v.fechaProduccion)) {
      this.fieldErrors.set({ fechaVencimiento: 'No puede ser anterior a la producción' }); return;
    }
    const dto: CrearLoteMateriaPrimaDto = { codigoLote: v.codigoLote!.trim(), idMateriaPrima: v.idMateriaPrima!, fechaProduccion: this.iso(v.fechaProduccion!), fechaVencimiento: this.iso(v.fechaVencimiento!), cantidad: v.cantidad! };
    this.guardando.set(true);
    this.service.crear(dto).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: r => {
        this.guardando.set(false);
        const unidad = r.unidad ?? '';
        const saldo = r.saldoAnterior !== undefined && r.saldoPosterior !== undefined ? ` Inventario actualizado: ${r.saldoAnterior.toLocaleString('es-CO')} → ${r.saldoPosterior.toLocaleString('es-CO')} ${unidad}.` : '';
        this.notify.exito(`Lote registrado correctamente.${saldo}`);
        void this.router.navigate(['/app/lotes-materia-prima']);
      },
      error: (e: HttpErrorResponse) => {
        this.guardando.set(false); const body = e.error as { message?: string; fieldErrors?: { field: string; message: string }[] } | null;
        if (body?.fieldErrors?.length) { const errores: Record<string, string> = {}; for (const item of body.fieldErrors) errores[item.field] = item.message; this.fieldErrors.set(errores); }
        this.errorGeneral.set(body?.message ?? 'No fue posible registrar el lote. Verifique los datos e intente nuevamente.');
      }
    });
  }
  errorCampo(campo: string): string { return this.fieldErrors()[campo] ?? ''; }
  private iso(fecha: Date): string { return `${fecha.getFullYear()}-${String(fecha.getMonth()+1).padStart(2,'0')}-${String(fecha.getDate()).padStart(2,'0')}`; }
  private soloFecha(fecha: Date): number { return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate()).getTime(); }
}
