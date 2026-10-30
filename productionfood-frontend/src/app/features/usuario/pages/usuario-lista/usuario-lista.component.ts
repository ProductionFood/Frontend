import { Component, DestroyRef, inject, signal, computed } from '@angular/core';

import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';

import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { PageEvent } from '@angular/material/paginator';
import { Sort } from '@angular/material/sort';

import {
  EMPTY,
  Subject,
  catchError,
  debounceTime,
  distinctUntilChanged,
  switchMap,
  tap
} from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { NotificacionService } from '../../../../core/ui/notificacion.service';
import { SiRolDirective } from '../../../../shared/directives/si-rol.directive';
import {
  ConfirmarDialogComponent,
  ConfirmarDialogData
} from '../../../../shared/components/confirmar-dialog/confirmar-dialog.component';
import { KpiCardComponent } from '../../../../shared/components/kpi-card/kpi-card.component';
import { TarjetaTablaComponent } from '../../../../shared/components/tarjeta-tabla/tarjeta-tabla.component';
import { TablaPaginadaComponent, ColumnaTabla } from '../../../../shared/components/tabla-paginada/tabla-paginada.component';
import { TablaColumnaDirective } from '../../../../shared/components/tabla-paginada/tabla-columna.directive';
import { EstadoVacioComponent } from '../../../../shared/components/estado-vacio/estado-vacio.component';
import { EstadoBadgeComponent } from '../../../../shared/components/estado-badge/estado-badge.component';
import { FiltroBusquedaComponent } from '../../../../shared/components/filtro-busqueda/filtro-busqueda.component';
import { Rol, Usuario } from '../../models/usuario.model';
import { RolService } from '../../services/rol.service';
import { UsuarioService } from '../../services/usuario.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-usuario-lista',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatProgressBarModule,
    MatTooltipModule,
    SiRolDirective,
    KpiCardComponent,
    TarjetaTablaComponent,
    TablaPaginadaComponent,
    TablaColumnaDirective,
    EstadoVacioComponent,
    EstadoBadgeComponent,
    FiltroBusquedaComponent,
  ],
  templateUrl: './usuario-lista.component.html',
  styleUrl: './usuario-lista.component.scss'
})
export class UsuarioListaComponent {
  private readonly fb = inject(FormBuilder);
  private readonly usuarioService = inject(UsuarioService);
  private readonly rolService = inject(RolService);
  private readonly notificacion = inject(NotificacionService);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly columnas: ColumnaTabla[] = [
    { id: 'usuario', titulo: 'Usuario', ordenable: true },
    { id: 'rol', titulo: 'Rol', ordenable: false },
    { id: 'estado', titulo: 'Estado', ordenable: false },
    { id: 'ultimoAcceso', titulo: 'Último acceso', ordenable: true },
    { id: 'acciones', titulo: 'Acciones', ordenable: false }
  ];

  readonly filtros = this.fb.group({
    busqueda: this.fb.nonNullable.control(''),
    rol: this.fb.control<string | null>(null),
    estado: this.fb.control<string | null>(null)
  });

  readonly usuarios = signal<Usuario[]>([]);
  /** Nombres ya recibidos: alimentan el autocompletado (Trie) del buscador. */
  readonly nombresBusqueda = computed(() => this.usuarios().map(u => u.nombre));
  readonly total = signal(0);
  readonly kpiTotal = signal(0);
  readonly kpiActivosAhora = signal(0);
  readonly kpiAdministradores = signal(0);
  readonly kpiUltimosAccesos = signal(0);
  readonly cargandoKpis = signal(true);
  readonly pagina = signal(0);
  readonly tamano = signal(20);
  readonly cargando = signal(false);
  readonly error = signal<string | null>(null);
  readonly roles = signal<Rol[]>([]);

  readonly totalPaginas = computed(() => Math.ceil(this.total() / this.tamano()) || 1);

  private readonly ordenCampo = signal('');
  private readonly ordenDireccion = signal<'asc' | 'desc' | ''>('');

  private readonly recargar$ = new Subject<void>();

  constructor() {
    this.recargar$
      .pipe(
        tap(() => {
          this.cargando.set(true);
          this.error.set(null);
        }),
        switchMap(() =>
          this.peticion().pipe(
            catchError((error: HttpErrorResponse) => {
              this.usuarios.set([]);
              this.total.set(0);
              this.error.set(this.mensajeError(error));
              this.cargando.set(false);
              return EMPTY;
            })
          )
        ),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(respuesta => {
        this.usuarios.set(respuesta.content);
        this.total.set(respuesta.totalElements);
        this.cargando.set(false);
        this.error.set(null);
      });

    this.filtros.controls.busqueda.valueChanges
      .pipe(
        debounceTime(350),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => {
        this.pagina.set(0);
        this.recargar();
      });

    this.filtros.controls.rol.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.pagina.set(0);
        this.recargar();
      });

    this.filtros.controls.estado.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.pagina.set(0);
        this.recargar();
      });

    this.cargarRoles();
    this.recargar();
  }

  recargar(): void {
    this.recargar$.next();
    this.cargarKpis();
  }

  private cargarKpis(): void {
    this.cargandoKpis.set(true);
    this.usuarioService.listar({ page: 0, size: 500 }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: r => {
        const items = r.content;
        this.kpiTotal.set(items.length);
        this.kpiActivosAhora.set(items.filter(u => u.activo).length); // TODO: backend - usuarios en línea
        this.kpiAdministradores.set(items.filter(u => u.rol?.nombre === 'ADMIN' || u.rol?.nombre === 'Administrador').length);
        this.kpiUltimosAccesos.set(0); // TODO: backend - accesos hoy
        this.cargandoKpis.set(false);
      },
      error: () => {
        this.kpiTotal.set(0);
        this.kpiActivosAhora.set(0);
        this.kpiAdministradores.set(0);
        this.kpiUltimosAccesos.set(0);
        this.cargandoKpis.set(false);
      }
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

  editar(usuario: Usuario): void {
    void this.router.navigate(['/app/usuarios', usuario.idUsuario, 'editar']);
  }

  cambiarEstado(usuario: Usuario): void {
    const activar = !usuario.activo;

    const data: ConfirmarDialogData = {
      titulo: activar ? 'Activar usuario' : 'Desactivar usuario',
      mensaje: activar
        ? `¿Activar a ${usuario.nombre}? Podrá volver a iniciar sesión.`
        : `¿Desactivar a ${usuario.nombre}? No podrá iniciar sesión.`,
      textoConfirmar: activar ? 'Activar' : 'Desactivar',
      peligro: !activar
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
        if (!confirmado) {
          return;
        }

        this.usuarioService
          .cambiarEstado(usuario.idUsuario, activar)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: () => {
              this.notificacion.exito(
                activar ? 'Usuario activado.' : 'Usuario desactivado.'
              );
              this.recargar();
            },
            error: (error: HttpErrorResponse) => {
              this.notificacion.error(this.mensajeError(error));
            }
          });
      });
  }

  private peticion() {
    const { busqueda, rol, estado } = this.filtros.getRawValue();
    const campo = this.ordenCampo();
    const direccion = this.ordenDireccion();

    return this.usuarioService.listar({
      page: this.pagina(),
      size: this.tamano(),
      busqueda: busqueda.trim() || undefined,
      idRol: rol ? parseInt(rol, 10) : undefined,
      activo: estado === 'true' ? true : estado === 'false' ? false : undefined,
      sort:
        campo && (direccion === 'asc' || direccion === 'desc')
          ? `${campo},${direccion}`
          : undefined
    });
  }

  private cargarRoles(): void {
    this.rolService
      .listar()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: roles => this.roles.set(roles),
        error: () => this.roles.set([])
      });
  }

  private mensajeError(error: HttpErrorResponse): string {
    const cuerpo = error.error as { message?: string } | null;

    if (cuerpo && typeof cuerpo.message === 'string') {
      return cuerpo.message;
    }

    return 'No se pudo cargar el listado de usuarios.';
  }

  getIniciales(nombre: string): string {
    return nombre
      .split(' ')
      .map(p => p[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  getAvatarClass(index: number): string {
    const classes = ['user-avatar v1', 'user-avatar v2', 'user-avatar v3', 'user-avatar v4', 'user-avatar v5', 'user-avatar v6'];
    return classes[index % classes.length];
  }

  getRolClass(rolNombre: string): string {
    const r = rolNombre.toLowerCase();
    if (r.includes('admin')) return 'role admin';
    if (r.includes('producc')) return 'role produccion';
    if (r.includes('invent')) return 'role inventario';
    if (r.includes('consulta')) return 'role consulta';
    return 'role';
  }

  getEstadoClass(activo: boolean): string {
    return activo ? 'user-status online' : 'user-status offline';
  }

  getEstadoText(activo: boolean): string {
    return activo ? 'En línea' : 'Desconectado';
  }

  getBadgeTono(rolNombre: string): 'neutro' | 'pendiente' | 'proceso' | 'completado' | 'peligro' {
    const r = rolNombre.toLowerCase();
    if (r.includes('admin')) return 'pendiente'; // morado
    if (r.includes('producc')) return 'proceso'; // azul
    if (r.includes('invent')) return 'pendiente'; // naranja
    if (r.includes('consulta')) return 'completado'; // verde
    return 'neutro';
  }

  getEstadoBadgeTono(activo: boolean): 'neutro' | 'pendiente' | 'proceso' | 'completado' | 'peligro' {
    return activo ? 'completado' : 'neutro';
  }
}