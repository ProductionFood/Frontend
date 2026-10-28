import { Component, DestroyRef, inject, signal } from '@angular/core';

import { DecimalPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';

import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
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
import {
  ColumnaTabla,
  TablaPaginadaComponent
} from '../../../../shared/components/tabla-paginada/tabla-paginada.component';
import { TablaColumnaDirective } from '../../../../shared/components/tabla-paginada/tabla-columna.directive';
import { FiltroBusquedaComponent } from '../../../../shared/components/filtro-busqueda/filtro-busqueda.component';
import { KpisCatalogoComponent } from '../../../../shared/components/kpis-catalogo/kpis-catalogo.component';
import { MateriaPrima } from '../../models/materia-prima.model';
import { MateriaPrimaService } from '../../services/materia-prima.service';
import { contarCatalogo } from '../../../../shared/utils/conteo-catalogo';
import { Router } from '@angular/router';

@Component({
  selector: 'app-materia-prima-lista',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    DecimalPipe,
    MatFormFieldModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatProgressBarModule,
    SiRolDirective,
    KpisCatalogoComponent,
    TablaPaginadaComponent,
    TablaColumnaDirective,
    FiltroBusquedaComponent
  ],
  templateUrl: './materia-prima-lista.component.html',
  styleUrl: './materia-prima-lista.component.scss'
})
export class MateriaPrimaListaComponent {
  private readonly fb = inject(FormBuilder);
  private readonly materiaPrimaService = inject(MateriaPrimaService);
  private readonly notificacion = inject(NotificacionService);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly columnas: ColumnaTabla[] = [
    { id: 'materiaPrima', titulo: 'Materia prima', ordenable: true },
    { id: 'categoria', titulo: 'Categoría', ordenable: false },
    { id: 'proveedor', titulo: 'Proveedor', ordenable: false },
    { id: 'stock', titulo: 'Stock', ordenable: false },
    { id: 'estado', titulo: 'Estado', ordenable: false },
    { id: 'acciones', titulo: '', ordenable: false }
  ];

  readonly filtros = this.fb.group({
    busqueda: this.fb.nonNullable.control(''),
    categoria: this.fb.control<string | null>(null),
    estado: this.fb.control<boolean | null>(null)
  });

  readonly materias = signal<MateriaPrima[]>([]);
  readonly total = signal(0);

  readonly kpiTotal = signal(0);
  readonly kpiActivas = signal(0);
  readonly kpiInactivas = signal(0);

  readonly cargandoKpis = signal(true);
  readonly pagina = signal(0);
  readonly tamano = signal(20);
  readonly cargando = signal(false);
  readonly error = signal<string | null>(null);

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
              this.materias.set([]);
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
        this.materias.set(respuesta.content);
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

    this.filtros.controls.categoria.valueChanges
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

    this.recargar();
  }

  recargar(): void {
    this.recargar$.next();
    this.cargarKpis();
  }

  private cargarKpis(): void {
    this.cargandoKpis.set(true);

    contarCatalogo(activo =>
      this.materiaPrimaService.listar({ page: 0, size: 1, activo })
    )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ total, activos, inactivos }) => {
          this.kpiTotal.set(total);
          this.kpiActivas.set(activos);
          this.kpiInactivas.set(inactivos);
          this.cargandoKpis.set(false);
        },
        error: () => {
          this.kpiTotal.set(0);
          this.kpiActivas.set(0);
          this.kpiInactivas.set(0);
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

  abrirFormulario(materia?: MateriaPrima): void {
    const ruta = materia ? ['/app/materias-primas', materia.idMateriaPrima, 'editar'] : ['/app/materias-primas', 'nuevo'];
    void this.router.navigate(ruta);
  }

  cambiarEstado(materia: MateriaPrima): void {
    const activar = !materia.activo;

    const data: ConfirmarDialogData = {
      titulo: activar ? 'Activar materia prima' : 'Desactivar materia prima',
      mensaje: activar
        ? `¿Activar «${materia.nombre}»? Volverá a estar disponible para compras y recetas.`
        : `¿Desactivar «${materia.nombre}»? Dejará de usarse en recetas nuevas y no se comprará, pero su stock actual se conserva.`,
      textoConfirmar: activar ? 'Activar' : 'Desactivar',
      peligro: !activar
    };

    this.dialog
      .open(ConfirmarDialogComponent, {
        data,
        width: '460px',
        autoFocus: 'dialog'
      })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((confirmado) => {
        if (!confirmado) {
          return;
        }

        this.materiaPrimaService
          .cambiarEstado(materia.idMateriaPrima, activar)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: () => {
              this.notificacion.exito(
                activar
                  ? 'Materia prima activada.'
                  : 'Materia prima desactivada.'
              );
              this.recargar();
            },
            error: (error: HttpErrorResponse) => {
              if (error.status === 409) {
                this.notificacion.advertencia(this.mensajeError(error));
                return;
              }
              this.notificacion.error(this.mensajeError(error));
            }
          });
      });
  }

  private peticion() {
    const { busqueda, categoria, estado } = this.filtros.getRawValue();
    const campo = this.ordenCampo();
    const direccion = this.ordenDireccion();

    // Nota: `categoria` se captura pero el servicio aún no lo usa.
    // Cuando el backend lo soporte, añádelo al payload de listar().
    return this.materiaPrimaService.listar({
      page: this.pagina(),
      size: this.tamano(),
      nombre: busqueda.trim() || undefined,
      activo: estado ?? undefined,
      sort:
        campo && (direccion === 'asc' || direccion === 'desc')
          ? `${campo},${direccion}`
          : undefined
    });
  }

  private mensajeError(error: HttpErrorResponse): string {
    const cuerpo = error.error as { message?: string } | null;

    if (cuerpo && typeof cuerpo.message === 'string') {
      return cuerpo.message;
    }

    return 'No se pudo cargar el listado de materias primas.';
  }

  getIconoCategoria(nombre: string): string {
    const n = nombre.toLowerCase();
    if (n.includes('harina') || n.includes('pan') || n.includes('trigo')) return '🌾';
    if (n.includes('leche') || n.includes('lacteo') || n.includes('yogur') || n.includes('mantequilla') || n.includes('queso')) return '🥛';
    if (n.includes('azucar') || n.includes('dulce') || n.includes('miel') || n.includes('chocolate')) return '🍬';
    if (n.includes('huevo')) return '🥚';
    if (n.includes('sal')) return '🧂';
    if (n.includes('aceite') || n.includes('grasa') || n.includes('manteca')) return '🫒';
    return '📦';
  }

  getCategoriaBadge(nombre: string): string {
    const n = nombre.toLowerCase();
    if (n.includes('harina') || n.includes('pan') || n.includes('trigo')) return 'Panadería';
    if (n.includes('leche') || n.includes('lacteo') || n.includes('yogur') || n.includes('mantequilla') || n.includes('queso')) return 'Lácteos';
    if (n.includes('azucar') || n.includes('dulce') || n.includes('miel') || n.includes('chocolate')) return 'Repostería';
    if (n.includes('huevo')) return 'Panadería';
    if (n.includes('sal')) return 'Conservas';
    if (n.includes('aceite') || n.includes('grasa') || n.includes('manteca')) return 'Conservas';
    return 'General';
  }

  getCategoriaClass(categoria: string): string {
    switch (categoria) {
      case 'Panadería': return 'category panaderia';
      case 'Lácteos': return 'category lacteos';
      case 'Repostería': return 'category reposteria';
      case 'Conservas': return 'category conservas';
      default: return 'category';
    }
  }

  getEstadoClass(activo: boolean): string {
    return activo ? 'status completed' : 'status cancelled';
  }

  getEstadoText(activo: boolean): string {
    return activo ? 'Adecuado' : 'Inactiva';
  }

  getStockClass(cantidad: number, minimo: number): string {
    if (minimo > 0 && cantidad === 0) return 'danger';
    if (minimo > 0 && cantidad < minimo) return 'warn';
    return '';
  }

  getStockIcon(cantidad: number, minimo: number): string {
    if (minimo > 0 && cantidad === 0) return 'error';
    if (minimo > 0 && cantidad < minimo) return 'warning';
    return '';
  }
}