import { Component, DestroyRef, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import { PageEvent } from '@angular/material/paginator';
import { Sort } from '@angular/material/sort';
import { EMPTY, Subject, catchError, debounceTime, distinctUntilChanged, switchMap, tap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { NotificacionService } from '@core/ui/notificacion.service';
import { SiRolDirective } from '@shared/directives/si-rol.directive';
import { ConfirmarDialogComponent, ConfirmarDialogData } from '@shared/components/confirmar-dialog/confirmar-dialog.component';
import { FiltroBusquedaComponent } from '@shared/components/filtro-busqueda/filtro-busqueda.component';
import { ColumnaTabla, TablaPaginadaComponent } from '@shared/components/tabla-paginada/tabla-paginada.component';
import { TablaColumnaDirective } from '@shared/components/tabla-paginada/tabla-columna.directive';
import { Cliente } from '../../models/cliente.model';
import { ClienteService } from '../../services/cliente.service';
import { KpisCatalogoComponent } from '@shared/components/kpis-catalogo/kpis-catalogo.component';
import { contarCatalogo } from '@shared/utils/conteo-catalogo';
import { Router } from '@angular/router';

@Component({
  selector: 'app-cliente-lista',
  standalone: true,
  imports: [ReactiveFormsModule, MatFormFieldModule, MatSelectModule, MatButtonModule, MatIconModule, MatMenuModule, TablaPaginadaComponent, TablaColumnaDirective, SiRolDirective, KpisCatalogoComponent, FiltroBusquedaComponent],
  templateUrl: './cliente-lista.component.html',
  styleUrl: './cliente-lista.component.scss'
})
export class ClienteListaComponent {
  private readonly fb = inject(FormBuilder);
  private readonly clienteService = inject(ClienteService);
  private readonly notificacion = inject(NotificacionService);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly columnas: ColumnaTabla[] = [
    { id: 'nombre', titulo: 'Nombre', ordenable: true },
    { id: 'contacto', titulo: 'Contacto', ordenable: true },
    { id: 'telefono', titulo: 'Teléfono', ordenable: false },
    { id: 'estado', titulo: 'Estado', ordenable: false },
    { id: 'acciones', titulo: '', ordenable: false }
  ];
  readonly filtros = this.fb.group({
    busqueda: this.fb.nonNullable.control(''),
    activo: this.fb.control<boolean | null>(true)
  });
  readonly clientes = signal<Cliente[]>([]);
  readonly total = signal(0);
  readonly kpiTotal = signal(0);
  readonly kpiActivos = signal(0);
  readonly kpiInactivos = signal(0);
  readonly cargandoKpis = signal(true);
  readonly pagina = signal(0);
  readonly tamano = signal(20);
  readonly cargando = signal(false);
  readonly error = signal<string | null>(null);
  readonly filtroAplicado = signal(false);
  private readonly ordenCampo = signal('');
  private readonly ordenDireccion = signal<'asc' | 'desc' | ''>('');
  private readonly recargar$ = new Subject<void>();

  constructor() {
    this.recargar$.pipe(
      tap(() => { this.cargando.set(true); this.error.set(null); }),
      switchMap(() => this.peticion().pipe(
        catchError((error: HttpErrorResponse) => {
          this.clientes.set([]);
          this.total.set(0);
          this.error.set(this.mensajeError(error));
          this.cargando.set(false);
          return EMPTY;
        })
      )),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(respuesta => {
      this.clientes.set(respuesta.content);
      this.total.set(respuesta.totalElements);
      this.cargando.set(false);
      this.error.set(null);
      const { busqueda, activo } = this.filtros.getRawValue();
      this.filtroAplicado.set(!!busqueda.trim() || activo !== true);
    });

    this.filtros.controls.busqueda.valueChanges.pipe(
      debounceTime(350), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef)
    ).subscribe(() => { this.pagina.set(0); this.recargar(); });
    this.filtros.controls.activo.valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => { this.pagina.set(0); this.recargar(); });
    this.recargar();
  }

  recargar(): void { this.recargar$.next(); this.cargarKpis(); }

  private cargarKpis(): void {
    this.cargandoKpis.set(true);
    contarCatalogo(activo => this.clienteService.listar({ page: 0, size: 1, activo }))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ total, activos, inactivos }) => {
        this.kpiTotal.set(total);
        this.kpiActivos.set(activos);
        this.kpiInactivos.set(inactivos);
        this.cargandoKpis.set(false);
      });
  }

  onPagina(evento: PageEvent): void {
    this.pagina.set(evento.pageIndex);
    this.tamano.set(evento.pageSize);
    this.recargar();
  }

  onOrden(orden: Sort): void {
    this.ordenCampo.set(orden.direction ? orden.active : '');
    this.ordenDireccion.set(orden.direction);
    this.pagina.set(0);
    this.recargar();
  }

  limpiarFiltros(): void {
    this.filtros.setValue({ busqueda: '', activo: true });
    this.pagina.set(0);
    this.recargar();
  }

  abrirFormulario(cliente?: Cliente): void {
    const ruta = cliente ? ['/app/clientes', cliente.idCliente, 'editar'] : ['/app/clientes', 'nuevo'];
    void this.router.navigate(ruta);
  }

  cambiarEstado(cliente: Cliente): void {
    const activar = !cliente.activo;
    const data: ConfirmarDialogData = {
      titulo: activar ? 'Activar cliente' : 'Desactivar cliente',
      mensaje: activar
        ? `¿Quieres activar a ${cliente.nombre}? Volverá a estar disponible para las operaciones del sistema.`
        : `¿Quieres desactivar a ${cliente.nombre}? Dejará de aparecer en los listados de clientes activos y no estará disponible para nuevas operaciones que requieran un cliente activo.`,
      textoConfirmar: activar ? 'Activar cliente' : 'Desactivar cliente',
      peligro: !activar
    };
    this.dialog.open(ConfirmarDialogComponent, { data, width: '440px', autoFocus: 'dialog' })
      .afterClosed().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(confirmado => {
        if (!confirmado) return;
        this.clienteService.cambiarEstado(cliente.idCliente, activar)
          .pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
            next: () => { this.notificacion.exito(activar ? 'Cliente activado.' : 'Cliente desactivado.'); this.recargar(); },
            error: (error: HttpErrorResponse) => this.notificacion.error(this.mensajeError(error))
          });
      });
  }

  private peticion() {
    const { busqueda, activo } = this.filtros.getRawValue();
    const campo = this.ordenCampo();
    const direccion = this.ordenDireccion();
    return this.clienteService.listar({
      page: this.pagina(), size: this.tamano(), busqueda: busqueda.trim() || undefined,
      activo: activo ?? undefined,
      sort: campo && direccion ? `${campo},${direccion}` : undefined
    });
  }

  private mensajeError(error: HttpErrorResponse): string {
    const cuerpo = error.error as { message?: string } | null;
    return cuerpo && typeof cuerpo.message === 'string' ? cuerpo.message : 'No se pudo cargar el listado de clientes.';
  }
}
