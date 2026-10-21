import { Component, DestroyRef, inject, signal } from '@angular/core';
import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { PageEvent } from '@angular/material/paginator';
import { Sort } from '@angular/material/sort';
import { RouterLink } from '@angular/router';
import { EMPTY, Subject, catchError, debounceTime, distinctUntilChanged, switchMap, tap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { NotificacionService } from '../../../../core/ui/notificacion.service';
import { SiRolDirective } from '../../../../shared/directives/si-rol.directive';
import { ConfirmarDialogComponent, ConfirmarDialogData } from '../../../../shared/components/confirmar-dialog/confirmar-dialog.component';
import { ColumnaTabla, TablaPaginadaComponent } from '../../../../shared/components/tabla-paginada/tabla-paginada.component';
import { TablaColumnaDirective } from '../../../../shared/components/tabla-paginada/tabla-columna.directive';
import { Producto } from '../../models/producto.model';
import { ProductoService } from '../../services/producto.service';
import { ProductoFormularioComponent } from '../producto-formulario/producto-formulario.component';

@Component({
  selector: 'app-producto-lista',
  standalone: true,
  imports: [ReactiveFormsModule, DecimalPipe, CurrencyPipe, MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule, MatCheckboxModule, MatIconModule, MatMenuModule, MatTooltipModule, RouterLink, TablaPaginadaComponent, TablaColumnaDirective, SiRolDirective],
  templateUrl: './producto-lista.component.html',
  styleUrl: './producto-lista.component.scss'
})
export class ProductoListaComponent {
  private readonly fb = inject(FormBuilder);
  private readonly productoService = inject(ProductoService);
  private readonly notificacion = inject(NotificacionService);
  private readonly dialog = inject(MatDialog);
  private readonly destroyRef = inject(DestroyRef);

  readonly columnas: ColumnaTabla[] = [
    { id: 'nombre', titulo: 'Producto', ordenable: true },
    { id: 'descripcion', titulo: 'Descripción', ordenable: false },
    { id: 'precioVenta', titulo: 'Precio', ordenable: true },
    { id: 'unidad', titulo: 'Unidad', ordenable: false },
    { id: 'receta', titulo: 'Receta', ordenable: false },
    { id: 'stockDisponible', titulo: 'Stock', ordenable: true },
    { id: 'estado', titulo: 'Estado', ordenable: false },
    { id: 'acciones', titulo: '', ordenable: false }
  ];

  readonly filtros = this.fb.group({
    busqueda: this.fb.nonNullable.control(''),
    activo: this.fb.control<boolean | null>(true),
    sinReceta: this.fb.nonNullable.control(false)
  });
  readonly productos = signal<Producto[]>([]);
  readonly total = signal(0);
  readonly pagina = signal(0);
  readonly tamano = signal(20);
  readonly cargando = signal(false);
  readonly error = signal<string | null>(null);
  private readonly ordenCampo = signal('');
  private readonly ordenDireccion = signal<'asc' | 'desc' | ''>('');
  private readonly recargar$ = new Subject<void>();
  puedeRegistrarPrimero(): boolean { return !this.filtros.controls.busqueda.value.trim() && !this.filtros.controls.sinReceta.value; }

  constructor() {
    this.recargar$.pipe(
      tap(() => { this.cargando.set(true); this.error.set(null); }),
      switchMap(() => this.peticion().pipe(catchError((error: HttpErrorResponse) => {
        this.productos.set([]); this.total.set(0); this.error.set(this.mensajeError(error)); this.cargando.set(false); return EMPTY;
      }))),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(respuesta => {
      this.productos.set(respuesta.content);
      this.total.set(respuesta.totalElements);
      this.cargando.set(false);
      this.error.set(null);
    });

    this.filtros.controls.busqueda.valueChanges.pipe(debounceTime(350), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.pagina.set(0); this.recargar();
    });
    this.filtros.controls.activo.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.pagina.set(0); this.recargar();
    });
    this.filtros.controls.sinReceta.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.pagina.set(0); this.recargar();
    });
    this.recargar();
  }

  recargar(): void { this.recargar$.next(); }
  onPagina(evento: PageEvent): void { this.pagina.set(evento.pageIndex); this.tamano.set(evento.pageSize); this.recargar(); }
  onOrden(orden: Sort): void { this.ordenCampo.set(orden.direction ? orden.active : ''); this.ordenDireccion.set(orden.direction); this.pagina.set(0); this.recargar(); }

  mensajeVacio(): string {
    if (this.filtros.controls.sinReceta.value) return 'Todos los productos tienen receta.';
    const busqueda = this.filtros.controls.busqueda.value.trim();
    if (busqueda) return `Ningún producto coincide con «${busqueda}».`;
    return 'No hay productos registrados.';
  }

  abrirFormulario(producto?: Producto): void {
    this.dialog.open(ProductoFormularioComponent, {
      data: { producto }, width: '620px', maxWidth: '95vw', autoFocus: 'first-tabbable', disableClose: true
    }).afterClosed().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(resultado => {
      if (resultado === true) {
        this.notificacion.exito(producto ? 'Producto actualizado correctamente.' : 'Producto registrado correctamente.');
        this.recargar();
      }
    });
  }

  cambiarEstado(producto: Producto): void {
    const activar = !producto.activo;
    const mensaje = activar
      ? `¿Activar «${producto.nombre}»? Volverá a estar disponible para nuevas ventas.`
      : producto.stockDisponible > 0
        ? `Este producto tiene ${producto.stockDisponible} unidades en estante. Desactivarlo impedirá nuevas ventas, pero el stock se conserva. ¿Deseas continuar?`
        : `¿Desactivar «${producto.nombre}»? No estará disponible para nuevas ventas.`;
    const data: ConfirmarDialogData = {
      titulo: activar ? 'Activar producto' : 'Desactivar producto',
      mensaje,
      textoConfirmar: activar ? 'Activar' : 'Desactivar',
      peligro: !activar
    };
    this.dialog.open(ConfirmarDialogComponent, { data, width: '480px', autoFocus: 'dialog' })
      .afterClosed().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(confirmado => {
        if (!confirmado) return;
        this.productoService.cambiarEstado(producto.idProducto, activar).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
          next: () => { this.notificacion.exito(activar ? 'Producto activado.' : 'Producto desactivado.'); this.recargar(); },
          error: (error: HttpErrorResponse) => this.notificacion.error(this.mensajeError(error))
        });
      });
  }

  private peticion() {
    const { busqueda, activo, sinReceta } = this.filtros.getRawValue();
    const campo = this.ordenCampo();
    const sort = campo && this.ordenDireccion() ? `${campo},${this.ordenDireccion()}` : undefined;
    return this.productoService.listar({
      busqueda: busqueda.trim() || undefined,
      activo: activo ?? undefined,
      sinReceta: sinReceta ? true : undefined,
      page: this.pagina(), size: this.tamano(), sort
    });
  }

  private mensajeError(error: HttpErrorResponse): string {
    if (error.status === 0) return 'No fue posible conectar con el servidor. Verifica tu conexión e inténtalo de nuevo.';
    return error.error?.message ?? 'No se pudieron cargar los productos. Inténtalo de nuevo.';
  }
}
