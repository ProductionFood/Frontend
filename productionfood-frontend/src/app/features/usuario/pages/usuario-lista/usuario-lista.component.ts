import { Component, DestroyRef, inject, signal } from '@angular/core';

import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { HttpErrorResponse } from '@angular/common/http';

import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';

import { PageEvent } from '@angular/material/paginator';
import { Sort } from '@angular/material/sort';

import {
  Subject,
  debounceTime,
  distinctUntilChanged,
  switchMap
} from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { NotificacionService } from '../../../../core/ui/notificacion.service';
import { Rol, Usuario } from '../../models/usuario.model';
import { RolService } from '../../services/rol.service';
import { UsuarioService } from '../../services/usuario.service';
import {
  ConfirmarDialogComponent,
  ConfirmarDialogData
} from '../../../../shared/components/confirmar-dialog/confirmar-dialog.component';
import {
  ColumnaTabla,
  TablaPaginadaComponent
} from '../../../../shared/components/tabla-paginada/tabla-paginada.component';
import { TablaColumnaDirective } from '../../../../shared/components/tabla-paginada/tabla-columna.directive';
import { UsuarioEditorComponent } from '../usuario-editor/usuario-editor.component';

/**
 * Listado de usuarios (HU-02): búsqueda con debounce, filtros por rol y
 * estado, paginación, edición y activación/desactivación. No existe acción
 * de eliminar (CA-05).
 */
@Component({
  selector: 'app-usuario-lista',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    TablaPaginadaComponent,
    TablaColumnaDirective
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
  private readonly destroyRef = inject(DestroyRef);

  readonly columnas: ColumnaTabla[] = [
    { id: 'id', titulo: 'Id', ordenable: true },
    { id: 'nombre', titulo: 'Nombre', ordenable: true },
    { id: 'correo', titulo: 'Correo', ordenable: true },
    { id: 'rol', titulo: 'Rol', ordenable: false },
    { id: 'estado', titulo: 'Estado', ordenable: false },
    { id: 'acciones', titulo: 'Acciones', ordenable: false }
  ];

  readonly filtros = this.fb.group({
    busqueda: this.fb.nonNullable.control(''),
    idRol: this.fb.control<number | null>(null),
    activo: this.fb.control<boolean | null>(null)
  });

  readonly usuarios = signal<Usuario[]>([]);
  readonly total = signal(0);
  readonly pagina = signal(0);
  readonly tamano = signal(10);
  readonly cargando = signal(false);
  readonly error = signal<string | null>(null);
  readonly roles = signal<Rol[]>([]);

  private readonly ordenCampo = signal<string>('');
  private readonly ordenDireccion = signal<'asc' | 'desc' | ''>('');

  private readonly recargar$ = new Subject<void>();

  constructor() {
    this.recargar$
      .pipe(
        switchMap(() => this.peticion()),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: respuesta => {
          this.usuarios.set(respuesta.content);
          this.total.set(respuesta.totalElements);
          this.cargando.set(false);
          this.error.set(null);
        },
        error: (error: HttpErrorResponse) => {
          this.usuarios.set([]);
          this.cargando.set(false);
          this.error.set(this.mensajeError(error));
        }
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

    this.filtros.controls.idRol.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.pagina.set(0);
        this.recargar();
      });

    this.filtros.controls.activo.valueChanges
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
    this.dialog
      .open(UsuarioEditorComponent, {
        data: { usuario },
        width: '460px',
        autoFocus: 'first-tabbable'
      })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(actualizado => {
        if (actualizado) {
          this.notificacion.exito('Usuario actualizado correctamente.');
          this.recargar();
        }
      });
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
    this.cargando.set(true);
    this.error.set(null);

    const { busqueda, idRol, activo } = this.filtros.getRawValue();
    const campo = this.ordenCampo();
    const direccion = this.ordenDireccion();

    return this.usuarioService.listar({
      page: this.pagina(),
      size: this.tamano(),
      busqueda: busqueda.trim() || undefined,
      idRol: idRol ?? undefined,
      activo: activo ?? undefined,
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
}
