import { AgregarProductoDialogComponent } from '../../components/agregar-producto-dialog/agregar-producto-dialog.component';
import { DetallePedidoTablaComponent } from '../../components/detalle-pedido-tabla/detalle-pedido-tabla.component';
import { DetallePedidoService } from '../../services/detalle-pedido.service';
import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  DestroyRef,
  inject,
  signal
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTableModule } from '@angular/material/table';

import { EMPTY, Subject, catchError, switchMap, tap } from 'rxjs';

import { NotificacionService } from '../../../../core/ui/notificacion.service';
import { SiRolDirective } from '../../../../shared/directives/si-rol.directive';
import {
  ConfirmarDialogComponent,
  ConfirmarDialogData
} from '../../../../shared/components/confirmar-dialog/confirmar-dialog.component';
import { EstadoPedido, LineaPedido, Pedido } from '../../models/pedido.model';
import { PedidoService } from '../../services/pedido.service';
import { CancelarPedidoDialogComponent } from '../../components/cancelar-pedido-dialog/cancelar-pedido-dialog.component';

/**
 * Detalle de un pedido (HU-16): cabecera con estado, acciones de la máquina
 * de estados (R-02) y la zona de productos, que en esta historia muestra el
 * detalle existente o avisa que faltan; el CRUD de ítems es HU-17. Cancelar
 * abre el diálogo que explica la devolución de stock a los lotes (R-04).
 */
@Component({
  selector: 'app-pedido-detalle',
  standalone: true,
  imports: [
    DatePipe,
    CurrencyPipe,
    DecimalPipe,
    RouterLink,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatTableModule,
    SiRolDirective,
    DetallePedidoTablaComponent
  ],
  templateUrl: './pedido-detalle.component.html',
  styleUrl: './pedido-detalle.component.scss'
})
export class PedidoDetalleComponent {
  private readonly detalleService = inject(DetallePedidoService);
  private readonly route = inject(ActivatedRoute);
  private readonly pedidoService = inject(PedidoService);
  private readonly notificacion = inject(NotificacionService);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly idPedido = Number(this.route.snapshot.paramMap.get('id'));

  readonly pedido = signal<Pedido | null>(null);
  readonly cargando = signal(false);
  readonly error = signal<string | null>(null);

  readonly columnasDetalle = ['producto', 'cantidad', 'precioUnitario', 'subtotal'];

  private readonly recargar$ = new Subject<void>();

  constructor() {
    this.recargar$
      .pipe(
        tap(() => {
          this.cargando.set(true);
          this.error.set(null);
        }),
        switchMap(() =>
          this.pedidoService.obtener(this.idPedido).pipe(
            catchError((error: HttpErrorResponse) => {
              this.pedido.set(null);
              this.error.set(this.mensajeError(error));
              this.cargando.set(false);
              return EMPTY;
            })
          )
        ),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(pedido => {
        this.pedido.set(pedido);
        this.cargando.set(false);
        this.error.set(null);
      });

    this.recargar();
  }

  get titulo(): string {
    return `Pedido #${this.idPedido}`;
  }

  /** Las líneas del detalle vienen en `GET /{id}`; su CRUD es HU-17. */
  get detalle(): LineaPedido[] {
    return this.pedido()?.detalle ?? [];
  }

  get sinProductos(): boolean {
    return !this.cargando() && !this.error() && this.detalle.length === 0;
  }

  recargar(): void {
    this.recargar$.next();
  }

  estadoTexto(estado: EstadoPedido): string {
    switch (estado) {
      case 'PENDIENTE':
        return 'Pendiente';
      case 'EN_PREPARACION':
        return 'En preparación';
      case 'ENTREGADO':
        return 'Entregado';
      case 'CANCELADO':
        return 'Cancelado';
    }
  }

  editar(): void {
    const pedido = this.pedido();

    if (!pedido || !pedido.editable || pedido.estado !== 'PENDIENTE') {
      return;
    }

    void this.router.navigate(['/app/pedidos', pedido.idPedido, 'editar']);
  }

  iniciarPreparacion(): void {
    const pedido = this.pedido();

    if (!pedido || pedido.estado !== 'PENDIENTE') {
      return;
    }

    const data: ConfirmarDialogData = {
      titulo: 'Iniciar preparación',
      mensaje:
        `¿Marcar el pedido #${pedido.idPedido} de «${pedido.cliente.nombre}» ` +
        'como en preparación? Podrás entregarlo o cancelarlo desde su detalle.',
      textoConfirmar: 'Iniciar preparación'
    };

    this.confirmarCambioEstado(data, 'EN_PREPARACION');
  }

  marcarEntregado(): void {
    const pedido = this.pedido();

    if (!pedido || pedido.estado !== 'EN_PREPARACION') {
      return;
    }

    const data: ConfirmarDialogData = {
      titulo: 'Marcar como entregado',
      mensaje:
        `¿Confirmar que el pedido #${pedido.idPedido} de «${pedido.cliente.nombre}» ` +
        'fue entregado? Esta acción es definitiva: un pedido entregado no se ' +
        'cancela ni se reabre.',
      textoConfirmar: 'Marcar entregado'
    };

    this.confirmarCambioEstado(data, 'ENTREGADO');
  }

  cancelarPedido(): void {
    const pedido = this.pedido();

    if (
      !pedido ||
      (pedido.estado !== 'PENDIENTE' && pedido.estado !== 'EN_PREPARACION')
    ) {
      return;
    }

    this.dialog
      .open(CancelarPedidoDialogComponent, {
        data: { pedido },
        width: '640px',
        maxWidth: '95vw',
        autoFocus: 'dialog',
        disableClose: true
      })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(resultado => {
        if (resultado === true) {
          this.notificacion.exito(
            'Pedido cancelado. Los productos volvieron al inventario.'
          );
          this.recargar();
        }
      });
  }

  registrarDevolucion(linea: LineaPedido): void {
    const pedido=this.pedido();
    if(!pedido||pedido.estado!=='ENTREGADO')return;
    void this.router.navigate(['/app/devoluciones','nueva',pedido.idPedido,linea.idDetallePedido]);
  }
  agregarProducto(): void {
    if (!this.pedido()?.editable) return;
    this.dialog.open(AgregarProductoDialogComponent,{data:{idPedido:this.idPedido,idsExcluidos:this.detalle.map(l=>l.producto.idProducto)},width:'560px',maxWidth:'95vw',disableClose:true}).afterClosed().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(ok=>{if(ok)this.recargar();});
  }
  editarCantidad(linea: LineaPedido): void {
    if(!this.pedido()?.editable)return;
    const entrada=prompt(`Nueva cantidad de ${linea.producto.nombre}:`,String(linea.cantidad));
    if(entrada===null)return;
    const cantidad=Number(entrada);
    if(!Number.isFinite(cantidad)||cantidad<=0){this.notificacion.advertencia('Ingrese una cantidad válida.');return;}
    const delta=cantidad-linea.cantidad;
    if(!delta)return;
    if(!confirm(delta>0?`Se descontarán ${delta} unidades más. ¿Continuar?`:`Se devolverán ${-delta} unidades al inventario. ¿Continuar?`))return;
    this.detalleService.actualizar(this.idPedido,linea.idDetallePedido,{cantidad}).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({next:()=>this.recargar(),error:(e:HttpErrorResponse)=>{this.notificacion.error(this.mensajeError(e));this.recargar();}});
  }
  quitarProducto(linea: LineaPedido): void {
    if(!this.pedido()?.editable)return;
    const data:ConfirmarDialogData={titulo:'Quitar producto',mensaje:`¿Quitar ${linea.producto.nombre}? Las ${linea.cantidad} unidades volverán a sus lotes de inventario.`,textoConfirmar:'Quitar producto'};
    this.dialog.open(ConfirmarDialogComponent,{data,width:'460px'}).afterClosed().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(ok=>{if(ok)this.detalleService.eliminar(this.idPedido,linea.idDetallePedido).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({next:()=>this.recargar(),error:(e:HttpErrorResponse)=>this.notificacion.error(this.mensajeError(e))});});
  }

  private confirmarCambioEstado(
    data: ConfirmarDialogData,
    estado: EstadoPedido
  ): void {
    this.dialog
      .open(ConfirmarDialogComponent, {
        data,
        width: '460px',
        autoFocus: 'dialog'
      })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(confirmado => {
        if (!confirmado) {
          return;
        }

        this.pedidoService
          .cambiarEstado(this.idPedido, estado)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: () => {
              this.notificacion.exito(
                estado === 'EN_PREPARACION'
                  ? 'El pedido pasó a en preparación.'
                  : 'Pedido marcado como entregado.'
              );
              this.recargar();
            },
            error: (error: HttpErrorResponse) => {
              if (error.status === 409) {
                this.notificacion.advertencia(this.mensajeError(error));
                this.recargar();
                return;
              }
              this.notificacion.error(this.mensajeError(error));
            }
          });
      });
  }

  private mensajeError(error: HttpErrorResponse): string {
    const cuerpo = error.error as { message?: string } | null;

    if (cuerpo && typeof cuerpo.message === 'string') {
      return cuerpo.message;
    }

    return 'No se pudo cargar el pedido.';
  }
}
