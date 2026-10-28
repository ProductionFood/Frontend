import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NotificacionService } from '../../../../core/ui/notificacion.service';
import { ConfirmarDialogComponent, ConfirmarDialogData } from '@shared/components/confirmar-dialog/confirmar-dialog.component';
import { ActualizarProveedorDto, CrearProveedorDto, Proveedor } from '../../models/proveedor.model';
import { ProveedorService } from '../../services/proveedor.service';

interface CuerpoError { message?: string; fieldErrors?: { field: string; message: string }[]; }

@Component({
  selector: 'app-proveedor-formulario',
  standalone: true,
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './proveedor-formulario.component.html',
  styleUrl: './proveedor-formulario.component.scss'
})
export class ProveedorFormularioComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly proveedorService = inject(ProveedorService);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly notificacion = inject(NotificacionService);
  private readonly destroyRef = inject(DestroyRef);

  readonly id = Number(this.route.snapshot.paramMap.get('id')) || null;
  readonly esEdicion = this.id !== null;
  readonly proveedor = signal<Proveedor | null>(null);
  readonly cargando = signal(false);
  readonly guardando = signal(false);
  readonly errorGeneral = signal<string | null>(null);

  readonly form = this.fb.group({
    nombre: this.fb.nonNullable.control('', [Validators.required, Validators.maxLength(100)]),
    contacto: this.fb.nonNullable.control('', [Validators.maxLength(100)]),
    telefono: this.fb.nonNullable.control('', [Validators.maxLength(20)]),
    correo: this.fb.nonNullable.control('', [Validators.maxLength(100), Validators.email])
  });

  ngOnInit(): void {
    if (this.id !== null) this.cargar();
  }

  private cargar(): void {
    this.cargando.set(true);
    this.errorGeneral.set(null);
    this.proveedorService.obtener(this.id as number).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: proveedor => {
        this.proveedor.set(proveedor);
        this.form.patchValue({
          nombre: proveedor.nombre,
          contacto: proveedor.contacto ?? '',
          telefono: proveedor.telefono ?? '',
          correo: proveedor.correo ?? ''
        });
        this.form.markAsPristine();
        this.cargando.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.cargando.set(false);
        this.errorGeneral.set(error.error?.message ?? 'No se pudo cargar el proveedor.');
      }
    });
  }

  guardar(): void {
    if (this.form.invalid || this.guardando()) {
      this.form.markAllAsTouched();
      return;
    }
    const valor = this.form.getRawValue();
    const dto: CrearProveedorDto | ActualizarProveedorDto = {
      nombre: valor.nombre.trim(),
      contacto: valor.contacto.trim() || null,
      telefono: valor.telefono.trim() || null,
      correo: valor.correo.trim() || null
    };
    this.guardando.set(true);
    this.errorGeneral.set(null);
    const peticion = this.id !== null
      ? this.proveedorService.actualizar(this.id, dto)
      : this.proveedorService.crear(dto);

    peticion.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.guardando.set(false);
        this.notificacion.exito(this.esEdicion ? 'Proveedor actualizado correctamente.' : 'Proveedor registrado correctamente.');
        void this.router.navigate(['/app/proveedores']);
      },
      error: (error: HttpErrorResponse) => {
        this.guardando.set(false);
        this.aplicarError(error);
      }
    });
  }

  cancelar(): void {
    if (this.guardando()) return;
    this.confirmarSalida(() => void this.router.navigate(['/app/proveedores']));
  }

  private confirmarSalida(accion: () => void): void {
    if (!this.form.dirty) {
      accion();
      return;
    }
    const data: ConfirmarDialogData = {
      titulo: 'Descartar cambios',
      mensaje: 'Tienes cambios sin guardar. ¿Quieres salir y descartarlos?',
      textoConfirmar: 'Descartar cambios',
      textoCancelar: 'Seguir editando',
      peligro: true
    };
    // Modal deliberado (§19 desaconseja anidar): es el guard que evita descartar cambios sin preguntar.
    this.dialog.open(ConfirmarDialogComponent, { data, width: '420px', autoFocus: 'dialog' })
      .afterClosed().pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(confirmado => { if (confirmado) accion(); });
  }

  get nombreError(): string {
    const c = this.form.controls.nombre;
    if (c.hasError('required')) return 'El nombre es obligatorio';
    if (c.hasError('maxlength')) return 'Máximo 100 caracteres';
    if (c.hasError('servidor')) return c.getError('servidor') as string;
    return '';
  }

  get contactoError(): string {
    const c = this.form.controls.contacto;
    if (c.hasError('maxlength')) return 'Máximo 100 caracteres';
    if (c.hasError('servidor')) return c.getError('servidor') as string;
    return '';
  }

  get telefonoError(): string {
    const c = this.form.controls.telefono;
    if (c.hasError('maxlength')) return 'Máximo 20 caracteres';
    if (c.hasError('servidor')) return c.getError('servidor') as string;
    return '';
  }

  get correoError(): string {
    const c = this.form.controls.correo;
    if (c.hasError('email')) return 'Ingrese un correo válido';
    if (c.hasError('maxlength')) return 'Máximo 100 caracteres';
    if (c.hasError('servidor')) return c.getError('servidor') as string;
    return '';
  }

  private aplicarError(error: HttpErrorResponse): void {
    const cuerpo = (error.error ?? null) as CuerpoError | null;
    if (cuerpo?.fieldErrors?.length) {
      for (const fieldError of cuerpo.fieldErrors) {
        const control = this.form.get(fieldError.field);
        if (control) {
          control.setErrors({ servidor: fieldError.message });
          control.markAsTouched();
        }
      }
      return;
    }
    this.errorGeneral.set(cuerpo?.message ?? 'No se pudo guardar el proveedor.');
  }
}
