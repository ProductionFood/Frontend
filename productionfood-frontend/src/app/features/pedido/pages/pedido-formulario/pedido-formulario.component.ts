import { Component, DestroyRef, inject, signal } from '@angular/core';

import {
  FormBuilder,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';

import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';

import { DatePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';

import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import {
  ConfirmarDialogComponent,
  ConfirmarDialogData
} from '../../../../shared/components/confirmar-dialog/confirmar-dialog.component';
import { Cliente } from '../../../cliente/models/cliente.model';
import { ClienteService } from '../../../cliente/services/cliente.service';
import { CrearPedidoDto, Pedido } from '../../models/pedido.model';
import { PedidoService } from '../../services/pedido.service';
import { NotificacionService } from '../../../../core/ui/notificacion.service';

interface CuerpoError {
  code?: string;
  message?: string;
  fieldErrors?: { field: string; message: string }[];
}

/**
 * Formulario de cabecera de pedido (HU-16) como página con router.
 * No ofrece fecha de pedido ni estado: los pone el servidor (R-01), y la nota
 * informativa muestra la fecha que se registrará sin presentarla como editable.
 * La fecha de entrega es opcional y no puede ser anterior a la del pedido (R-06).
 */
@Component({
  selector: 'app-pedido-formulario',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    DatePipe,
    MatCardModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './pedido-formulario.component.html',
  styleUrl: './pedido-formulario.component.scss'
})
export class PedidoFormularioComponent {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly pedidoService = inject(PedidoService);
  private readonly clienteService = inject(ClienteService);
  private readonly dialog = inject(MatDialog);
  private readonly notificacion = inject(NotificacionService);
  private readonly destroyRef = inject(DestroyRef);

  readonly idPedido = Number(this.route.snapshot.paramMap.get('id')) || null;
  readonly esEdicion = this.idPedido !== null;

  readonly guardando = signal(false);
  readonly errorGeneral = signal<string | null>(null);

  readonly pedido = signal<Pedido | null>(null);

  readonly clientes = signal<Cliente[]>([]);
  readonly cargandoClientes = signal(true);
  readonly errorClientes = signal<string | null>(null);

  /**
   * Límite inferior de fechaEntrega (R-06): al crear es hoy, porque el
   * servidor registrará el pedido con la fecha de hoy; al editar, la fecha
   * del propio pedido.
   */
  readonly minFecha = this.esEdicion
    ? this.aFecha(this.pedido()?.fechaPedido) ?? new Date()
    : new Date();

  /** La fecha del pedido no es editable: solo se informa (R-01). */
  readonly fechaPedidoInfo = this.esEdicion
    ? this.pedido()?.fechaPedido ?? ''
    : this.iso(new Date());

  readonly form = this.fb.group({
    idCliente: this.fb.control<number | null>(null, [Validators.required]),
    fechaEntrega: this.fb.control<Date | null>(null)
  });

  constructor() {
    this.cargarClientes();
    if (this.esEdicion) {
      this.cargarPedido(this.idPedido!);
    }
  }

  cargarPedido(id: number): void {
    this.pedidoService.obtener(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: p => {
        this.pedido.set(p);
        this.form.patchValue({
          idCliente: p.cliente.idCliente,
          fechaEntrega: this.aFecha(p.fechaEntrega)
        });
      },
      error: (e: HttpErrorResponse) => {
        this.errorGeneral.set(e.error?.message ?? 'No se pudo cargar el pedido.');
      }
    });
  }

  get sinClientes(): boolean {
    return !this.cargandoClientes() && this.clientes().length === 0;
  }

  /** Navega a HU-05 para registrar el primer cliente. */
  irAClientes(): void {
    this.router.navigate(['/app/clientes']);
  }

  guardar(): void {
    if (this.form.invalid || this.guardando()) {
      this.form.markAllAsTouched();
      return;
    }

    const valor = this.form.getRawValue();

    if (valor.idCliente === null) {
      return;
    }

    if (
      valor.fechaEntrega &&
      valor.fechaEntrega.getTime() < this.minFecha.getTime()
    ) {
      this.form.controls.fechaEntrega.setErrors({
        servidor: this.mensajeFechaAnterior
      });
      this.form.controls.fechaEntrega.markAsTouched();
      return;
    }

    const fechaEntrega = valor.fechaEntrega
      ? this.iso(valor.fechaEntrega)
      : null;

    this.guardando.set(true);
    this.errorGeneral.set(null);

    const dto: CrearPedidoDto = {
      idCliente: valor.idCliente,
      fechaEntrega
    };

    const peticion = this.esEdicion
      ? this.pedidoService.actualizar(this.idPedido!, dto)
      : this.pedidoService.crear(dto);

    peticion.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.notificacion.exito(
          this.esEdicion ? 'Pedido actualizado correctamente.' : 'Pedido creado correctamente.'
        );
        void this.router.navigate(['/app/pedidos']);
      },
      error: (error: HttpErrorResponse) => {
        this.guardando.set(false);
        this.aplicarError(error);
      }
    });
  }

  volver(): void {
    if (!this.form.dirty) {
      void this.router.navigate(['/app/pedidos']);
      return;
    }

    const data: ConfirmarDialogData = {
      titulo: 'Descartar cambios',
      mensaje:
        'Tienes cambios sin guardar. ¿Quieres cerrar el formulario y descartarlos?',
      textoConfirmar: 'Descartar cambios',
      textoCancelar: 'Seguir editando',
      peligro: true
    };

    this.dialog
      .open(ConfirmarDialogComponent, {
        data,
        width: '420px',
        autoFocus: 'dialog'
      })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(confirmado => {
        if (confirmado) {
          void this.router.navigate(['/app/pedidos']);
        }
      });
  }

  get clienteError(): string {
    const control = this.form.controls.idCliente;

    if (control.hasError('required')) {
      return 'Seleccione un cliente';
    }

    if (control.hasError('servidor')) {
      return control.getError('servidor');
    }

    return '';
  }

  get fechaError(): string {
    const control = this.form.controls.fechaEntrega;

    if (control.hasError('matDatepickerMin')) {
      return this.mensajeFechaAnterior;
    }

    if (control.hasError('servidor')) {
      return control.getError('servidor');
    }

    return '';
  }

  private get mensajeFechaAnterior(): string {
    return this.esEdicion
      ? 'No puede ser anterior a la fecha del pedido'
      : 'No puede ser anterior a hoy';
  }

  private cargarClientes(): void {
    this.clienteService
      .listar({ page: 0, size: 100, activo: true })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: respuesta => {
          this.clientes.set(respuesta.content);
          this.cargandoClientes.set(false);
        },
        error: (error: HttpErrorResponse) => {
          this.cargandoClientes.set(false);
          this.errorClientes.set(
            this.mensajeError(error) ?? 'No se pudo cargar el catálogo de clientes.'
          );
        }
      });
  }

  private aplicarError(error: HttpErrorResponse): void {
    const cuerpo = (error.error ?? null) as CuerpoError | null;

    if (!cuerpo) {
      this.errorGeneral.set('No se pudo guardar el pedido.');
      return;
    }

    if (cuerpo.code === 'CLIENTE_INEXISTENTE') {
      this.form.controls.idCliente.setErrors({
        servidor: cuerpo.message ?? 'El cliente seleccionado no existe.'
      });
      this.form.controls.idCliente.markAsTouched();
      return;
    }

    if (cuerpo.code === 'CLIENTE_INACTIVO') {
      this.form.controls.idCliente.setErrors({
        servidor:
          cuerpo.message ?? 'El cliente seleccionado está desactivado.'
      });
      this.form.controls.idCliente.markAsTouched();
      return;
    }

    if (cuerpo.code === 'FECHA_ENTREGA_INVALIDA') {
      this.form.controls.fechaEntrega.setErrors({
        servidor: cuerpo.message ?? 'La fecha de entrega no puede ser anterior a la del pedido.'
      });
      this.form.controls.fechaEntrega.markAsTouched();
      return;
    }

    if (cuerpo.fieldErrors?.length) {
      for (const fieldError of cuerpo.fieldErrors) {
        const control = this.form.get(fieldError.field);

        if (control) {
          control.setErrors({ servidor: fieldError.message });
          control.markAsTouched();
        }
      }
      return;
    }

    this.errorGeneral.set(
      cuerpo.message ?? 'No se pudo guardar el pedido.'
    );
  }

  private aFecha(valor: string | undefined | null): Date | null {
    if (!valor) {
      return null;
    }

    const [anio, mes, dia] = valor.split('-').map(Number);
    return new Date(anio, mes - 1, dia);
  }

  private iso(fecha: Date): string {
    const anio = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');

    return `${anio}-${mes}-${dia}`;
  }

  private mensajeError(error: HttpErrorResponse): string | null {
    const cuerpo = error.error as { message?: string } | null;

    return cuerpo && typeof cuerpo.message === 'string'
      ? cuerpo.message
      : null;
  }
}
