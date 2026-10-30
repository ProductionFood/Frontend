import { IndicadorAlertasComponent } from './components/indicador-alertas/indicador-alertas.component';
import { Component, computed, inject, signal, ViewChild } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenav, MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { filter } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { AuthService } from '../core/auth/auth.service';
import { TemaService } from '../core/ui/tema.service';
import { MODULOS_REALES, NavGrupo, NavItem, NAV_GRUPOS } from './nav-items';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatToolbarModule,
    MatSidenavModule,
    MatListModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    IndicadorAlertasComponent,
  ],
  templateUrl: './layout.component.html',
  styleUrl: './layout.component.scss',
})
export class LayoutComponent {
  readonly authService = inject(AuthService);
  readonly tema = inject(TemaService);
  private readonly router = inject(Router);
  private readonly breakpoint = inject(BreakpointObserver);

  readonly grupos: NavGrupo[] = NAV_GRUPOS;
  readonly modoCompacto = signal(false);
  readonly colapsado = signal(false);
  readonly tituloActual = signal('Dashboard');

  readonly iniciales = computed(() => {
    const nombre = this.authService.usuario()?.nombre ?? 'Usuario';
    return nombre
      .split(' ')
      .slice(0, 2)
      .map((parte) => parte.charAt(0))
      .join('')
      .toUpperCase();
  });

  readonly nombreRol = computed(() => {
    const rol = this.authService.usuario()?.rol.nombre ?? '';
    const nombres: Record<string, string> = {
      ADMIN: 'Administrador',
      PRODUCCION: 'Producción',
      COMPRAS: 'Compras',
      VENTAS: 'Ventas',
      CONSULTA: 'Consulta',
    };
    return nombres[rol] ?? rol;
  });

  @ViewChild('sidenav') private sidenav?: MatSidenav;

  constructor() {
    this.breakpoint
      .observe([Breakpoints.Handset, Breakpoints.TabletPortrait])
      .pipe(takeUntilDestroyed())
      .subscribe((estado) => this.modoCompacto.set(estado.matches));

    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.actualizarTitulo());

    this.actualizarTitulo();
  }

  /**
   * Título del topbar para la ruta actual, resuelto desde NAV_GRUPOS (el
   * mismo origen que el navbar lateral): los nombres de módulo no se
   * duplican en las rutas de app.routes.ts.
   */
  private actualizarTitulo(): void {
    const segmentos = this.router.url
      .replace(/[?#].*$/, '')
      .split('/')
      .filter(Boolean);

    const ruta = segmentos[1] === 'en-construccion' ? segmentos[2] : segmentos[1];

    const item = NAV_GRUPOS.flatMap((grupo) => grupo.items).find((i) => i.ruta === ruta);

    this.tituloActual.set(item?.titulo ?? 'Dashboard');
  }

  /**
   * Grupos del sidebar visibles para el rol actual, precalculados con
   * `computed`: la referencia no cambia entre navigaciones, así el `@for`
   * del sidebar no vuelve a diferenciar el DOM al cambiar de módulo.
   * Ocultar el menú es cosmético (03-MATRIZ-ROLES.md §5); la autorización
   * real está en el backend.
   */
  readonly gruposVisibles = computed(() => {
    const rol = this.authService.rol();
    return this.grupos
      .map((grupo) => ({
        ...grupo,
        items: grupo.items.filter((item) => !item.roles || !rol || item.roles.includes(rol)),
      }))
      .filter((grupo) => grupo.items.length > 0);
  });

  cerrarEnMovil(): void {
    if (this.modoCompacto()) {
      this.sidenav?.close();
    }
  }

  /**
   * Ruta del sidebar para un módulo. Los implementados van a su ruta real; los
   * pendientes, directo a `/app/en-construccion/:ruta` para que `routerLinkActive`
   * coincida con la URL final y el ítem quede marcado (si solo redirigiera, el
   * link `/app/<ruta>` no coincidiría y no se resaltaría).
   */
  enlaceItem(item: NavItem): string[] {
    return MODULOS_REALES.includes(item.ruta)
      ? ['/app', item.ruta]
      : ['/app', 'en-construccion', item.ruta];
  }

  /**
   * En móvil abre/cierra el sidenav (modo over). En escritorio alterna el modo
   * colapsado (solo íconos). El ancho del sidebar y el margen del contenido se
   * animan por CSS (layout.component.scss), por eso no hay que forzar el
   * recálculo de márgenes de Material aquí.
   */
  alternarMenu(): void {
    if (this.modoCompacto()) {
      this.sidenav?.toggle();
      return;
    }

    this.colapsado.update((valor) => !valor);
  }

  cerrarSesion(): void {
    this.authService.logout();
  }
}
