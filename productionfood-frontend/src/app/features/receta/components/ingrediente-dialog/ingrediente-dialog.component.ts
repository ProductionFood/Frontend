import { Component, DestroyRef, inject, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MateriaPrima } from '../../../materia-prima/models/materia-prima.model';
import { MateriaPrimaService } from '../../../materia-prima/services/materia-prima.service';
import { IngredienteRecetaDto } from '../../models/receta.model';

export interface IngredienteDialogData { idsExcluidos: number[]; ingrediente?: IngredienteRecetaDto; nombreActual?: string; }

@Component({
  selector: 'app-ingrediente-dialog', standalone: true,
  imports: [CurrencyPipe, ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule, MatSelectModule, MatProgressSpinnerModule],
  templateUrl: './ingrediente-dialog.component.html', styleUrl: './ingrediente-dialog.component.scss'
})
export class IngredienteDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly materiasService = inject(MateriaPrimaService);
  private readonly ref = inject<MatDialogRef<IngredienteDialogComponent>>(MatDialogRef);
  private readonly destroyRef = inject(DestroyRef);
  readonly datos = inject<IngredienteDialogData>(MAT_DIALOG_DATA);
  readonly materias = signal<MateriaPrima[]>([]);
  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);
  readonly form = this.fb.group({
    idMateriaPrima: this.fb.control<number | null>(this.datos.ingrediente?.idMateriaPrima ?? null, Validators.required),
    cantidad: this.fb.control<number | null>(this.datos.ingrediente?.cantidad ?? null, [Validators.required, Validators.min(0.0001), Validators.max(999999999)])
  });

  constructor() { this.cargar(); }
  get materiaSeleccionada(): MateriaPrima | undefined { return this.materias().find(m => m.idMateriaPrima === this.form.controls.idMateriaPrima.value); }
  get costoEstimado(): number { const m = this.materiaSeleccionada; return m ? Number(this.form.controls.cantidad.value ?? 0) * m.costoUnitario : 0; }

  cargar(): void {
    this.cargando.set(true); this.error.set(null);
    this.materiasService.listar({ activo: true, page: 0, size: 500, sort: 'nombre,asc' }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: r => { this.materias.set(r.content.filter(m => !this.datos.idsExcluidos.includes(m.idMateriaPrima) || m.idMateriaPrima === this.datos.ingrediente?.idMateriaPrima)); this.cargando.set(false); },
      error: (e: HttpErrorResponse) => { this.error.set(e.error?.message ?? 'No se pudieron cargar las materias primas.'); this.cargando.set(false); }
    });
  }

  guardar(): void {
    if (this.form.invalid || this.cargando()) { this.form.markAllAsTouched(); return; }
    const v = this.form.getRawValue();
    if (v.idMateriaPrima === null || v.cantidad === null) return;
    this.ref.close({ idMateriaPrima: v.idMateriaPrima, cantidad: Number(v.cantidad.toFixed(3)) } satisfies IngredienteRecetaDto);
  }
}
