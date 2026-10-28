import { Component, DestroyRef, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatToolbarModule } from '@angular/material/toolbar';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { MateriaPrima } from '../../../materia-prima/models/materia-prima.model';
import { MateriaPrimaService } from '../../../materia-prima/services/materia-prima.service';
import { CrearMovimientoInventarioDto, DireccionMovimiento } from '../../models/inventario.model';
import { InventarioService } from '../../services/inventario.service';
import { NotificacionService } from '../../../../core/ui/notificacion.service';

@Component({
  selector: 'app-movimiento-formulario-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressBarModule,
    MatSelectModule,
    MatToolbarModule
  ],
  templateUrl: './movimiento-formulario-page.component.html',
  styleUrl: './movimiento-formulario-page.component.scss'
})
export class MovimientoFormularioPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(InventarioService);
  private readonly materiaService = inject(MateriaPrimaService);
  private readonly router = inject(Router);
  private readonly notificacion = inject(NotificacionService);
  private readonly destroyRef = inject(DestroyRef);

  readonly materias = signal<MateriaPrima[]>([]);
  readonly cargando = signal(true);
  readonly guardando = signal(false);
  readonly error = signal('');

  readonly direcciones: { clave: DireccionMovimiento; etiqueta: string }[] = [
    { clave: 'ENTRADA', etiqueta: 'Entrada (compra / recepción)' },
    { clave: 'SALIDA', etiqueta: 'Salida (consumo / producción)' }
  ];

  readonly form = this.fb.group({
    idMateriaPrima: [null as number | null, Validators.required],
    direccion: ['ENTRADA' as DireccionMovimiento, Validators.required],
    cantidad: [null as number | null, [Validators.required, Validators.min(0.000001)]],
    tipoMovimiento: ['', Validators.maxLength(100)],
    observacion: ['', Validators.maxLength(255)]
  });

  constructor() {
    this.cargarMaterias();
  }

  cargarMaterias(): void {
    this.materiaService.listar({ page: 0, size: 500, activo: true }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: r => { this.materias.set(r.content); this.cargando.set(false); },
      error: () => { this.error.set('No se pudieron cargar las materias primas.'); this.cargando.set(false); }
    });
  }

  volver(): void {
    void this.router.navigate(['/app/inventario']);
  }

  guardar(): void {
    this.form.markAllAsTouched();
    this.error.set('');
    if (this.form.invalid || this.guardando()) return;

    const v = this.form.getRawValue();
    const dto: CrearMovimientoInventarioDto = {
      idMateriaPrima: v.idMateriaPrima!,
      direccion: v.direccion!,
      cantidad: v.cantidad!,
      tipoMovimiento: v.tipoMovimiento?.trim() || undefined,
      observacion: v.observacion?.trim() || undefined
    };

    this.guardando.set(true);
    this.service.crearMovimiento(dto).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.guardando.set(false);
        this.notificacion.exito('Movimiento registrado correctamente.');
        void this.router.navigate(['/app/inventario']);
      },
      error: (e: HttpErrorResponse) => {
        this.guardando.set(false);
        this.error.set(e.error?.message ?? 'No fue posible registrar el movimiento. Reintente.');
      }
    });
  }

  errorCampo(campo: 'idMateriaPrima' | 'direccion' | 'cantidad' | 'tipoMovimiento' | 'observacion'): string {
    const control = this.form.controls[campo];
    if (control.hasError('required')) {
      if (campo === 'idMateriaPrima') return 'Seleccione una materia prima';
      if (campo === 'direccion') return 'Seleccione una dirección';
      return 'El campo es obligatorio';
    }
    if (control.hasError('min')) return 'Debe ser mayor que cero';
    if (control.hasError('maxlength')) return 'Texto demasiado largo';
    return '';
  }
}
