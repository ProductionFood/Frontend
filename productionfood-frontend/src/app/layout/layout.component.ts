import { Component, computed, inject, signal, ViewChild } from '@angular/core';
import {
  NavigationEnd,
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet
} from '@angular/router';
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
import {
  NavGrupo,
  NAV_GRUPOS
} from './nav-items';

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
    MatMenuModule
  ],
  templateUrl: './layout.component.html',
  styleUrl: './layout.component.scss'
})
export class LayoutComponent {
  readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly breakpoint = inject(BreakpointObserver);

  readonly grupos: NavGrupo[] = NAV_GRUPOS;
  readonly modoCompacto = signal(false);
  readonly tituloActual = signal('Dashboard');

  readonly iniciales = computed(() => {
    const nombre = this.authService.usuario()?.nombre ?? 'Usuario';
    return nombre
      .split(' ')
      .slice(0, 2)
      .map(parte => parte.charAt(0))
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
      CONSULTA: 'Consulta'
    };
    return nombres[rol] ?? rol;
  });

  @ViewChild('sidenav') private sidenav?: MatSidenav;

  constructor() {
    this.breakpoint
      .observe([Breakpoints.Handset, Breakpoints.TabletPortrait])
      .pipe(takeUntilDestroyed())
      .subscribe(estado => this.modoCompacto.set(estado.matches));

    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntilDestroyed()
      )
      .subscribe(() => {
        const datos =
          this.router.routerState.snapshot.root.firstChild?.firstChild?.data;
        this.tituloActual.set(
          (datos?.['titulo'] as string) ?? 'Dashboard'
        );
      });
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
      .map(grupo => ({
        ...grupo,
        items: grupo.items.filter(
          item => !item.roles || !rol || item.roles.includes(rol)
        )
      }))
      .filter(grupo => grupo.items.length > 0);
  });

  cerrarEnMovil(): void {
    if (this.modoCompacto()) {
      this.sidenav?.close();
    }
  }

  cerrarSesion(): void {
    this.authService.logout();
  }
}
