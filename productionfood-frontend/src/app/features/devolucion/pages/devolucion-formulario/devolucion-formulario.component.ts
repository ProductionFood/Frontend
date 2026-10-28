import { Component, DestroyRef, inject, signal, computed } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { NotificacionService } from '../../../../core/ui/notificacion.service';
import { ConfirmarDialogComponent, ConfirmarDialogData } from '../../../../shared/components/confirmar-dialog/confirmar-dialog.component';
import { Pedido } from '../../../pedido/models/pedido.model';
import { PedidoService } from '../../../pedido/services/pedido.service';
import { DevolucionService } from '../../services/devolucion.service';

@Component({
  selector: 'app-devolucion-formulario',
  standalone: true,
  imports: [ReactiveFormsModule, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatProgressBarModule, MatProgressSpinnerModule],
  templateUrl: './devolucion-formulario.component.html',
  styleUrl: './devolucion-formulario.component.scss'
})
export class DevolucionFormularioComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly pedidoService = inject(PedidoService);
  private readonly service = inject(DevolucionService);
  private readonly dialog = inject(MatDialog);
  private readonly notificacion = inject(NotificacionService);
  private readonly destroyRef = inject(DestroyRef);

  readonly idPedido = Number(this.route.snapshot.paramMap.get('idPedido'));
  readonly idDetalle = Number(this.route.snapshot.paramMap.get('idDetalle'));
  readonly pedido = signal<Pedido | null>(null);
  readonly cargando = signal(true);
  readonly enviando = signal(false);
  readonly error = signal('');
  readonly fieldErrors = signal<Record<string, string>>({});
  readonly previo = signal(0);

  readonly linea = computed(() => this.pedido()?.detalle?.find(l => l.idDetallePedido === this.idDetalle) ?? null);
  readonly disponible = computed(() => Math.max(0, (this.linea()?.cantidad ?? 0) - this.previo()));

  readonly cantidad = new FormControl<number>(1, { nonNullable: true, validators: [Validators.required, Validators.min(1)] });
  readonly motivo = new FormControl<string>('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(50)] });
  readonly otro = new FormControl<string>('', { nonNullable: true, validators: [Validators.maxLength(50)] });
  readonly descripcion = new FormControl<string>('', { nonNullable: true, validators: [Validators.maxLength(255)] });
  readonly motivos = ['Producto en mal estado', 'Error en el pedido', 'Cliente insatisfecho', 'Producto incorrecto', 'Otro'];

  constructor() {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.error.set('');
    this.pedidoService.obtener(this.idPedido).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: pedido => {
        this.pedido.set(pedido);
        this.cargarDevoluciones();
      },
      error: () => {
        this.cargando.set(false);
        this.error.set('No se pudo cargar el pedido.');
      }
    });
  }

  private cargarDevoluciones(): void {
    this.service.listar({ idPedido: this.idPedido, page: 0, size: 500 }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: r => {
        this.previo.set(r.content.filter(d => d.idDetallePedido === this.idDetalle && d.estado !== 'RECHAZADA').reduce((s, d) => s + d.cantidad, 0));
        this.cargando.set(false);
      },
      error: () => {
        this.error.set('No se pudieron consultar devoluciones previas.');
        this.cargando.set(false);
      }
    });
  }

  guardar(): void {
    this.fieldErrors.set({});
    const m = this.motivo.value === 'Otro' ? this.otro.value.trim() : this.motivo.value;
    if (this.cargando() || this.enviando() || this.cantidad.invalid || this.motivo.invalid || this.descripcion.invalid || !m || m.length > 50) return;
    if (this.cantidad.value > this.disponible()) {
      this.fieldErrors.set({ cantidad: `Solo puede devolver ${this.disponible()} unidades.` });
      return;
    }
    this.enviando.set(true);
    this.service.crear({
      idDetallePedido: this.idDetalle,
      cantidad: this.cantidad.value,
      motivo: m,
      descripcion: this.descripcion.value.trim() || undefined
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.enviando.set(false);
        this.notificacion.exito('Devolución registrada, pendiente de aprobación.');
        void this.router.navigate(['/app/pedidos', this.idPedido]);
      },
      error: (e: HttpErrorResponse) => {
        this.enviando.set(false);
        const mensaje = typeof e.error?.message === 'string' ? e.error.message : 'No se pudo registrar la devolución.';
        if (e.status === 422) {
          this.fieldErrors.set({ cantidad: mensaje });
          this.cargar();
        } else {
          this.error.set(mensaje);
        }
      }
    });
  }

  cerrar(): void {
    if (this.enviando()) return;
    const sucio = !!(this.motivo.value || this.descripcion.value || this.cantidad.dirty);
    if (!sucio) {
      void this.router.navigate(['/app/pedidos', this.idPedido]);
      return;
    }
    const data: ConfirmarDialogData = {
      titulo: 'Descartar cambios',
      mensaje: 'Tienes datos sin registrar. ¿Quieres salir y descartarlos?',
      textoConfirmar: 'Descartar cambios',
      textoCancelar: 'Seguir editando',
      peligro: true
    };
    // Modal deliberado (§19 desaconseja anidar): es el guard que evita descartar datos sin preguntar.
    this.dialog.open(ConfirmarDialogComponent, { data, width: '420px', autoFocus: 'dialog' })
      .afterClosed().pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(confirmado => {
        if (confirmado) void this.router.navigate(['/app/pedidos', this.idPedido]);
      });
  }
}
