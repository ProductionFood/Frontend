import { IndicadorAlertasComponent } from './components/indicador-alertas/indicador-alertas.component';
import { MigasComponent } from './components/migas/migas.component';
import { BuscadorModulosComponent, ModuloBuscable } from './components/buscador-modulos/buscador-modulos.component';
import {
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  inject,
  signal,
  viewChild,
  ViewChild,
} from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenav, MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter, fromEvent, merge } from 'rxjs';

import { AuthService } from '../core/auth/auth.service';
import { TemaService } from '../core/ui/tema.service';
import { ContadoresNav, ContadoresNavService } from './contadores-nav.service';
import { MODULOS_REALES, NavGrupo, NavItem, NAV_GRUPOS } from './nav-items';

/** Espera mínima entre recargas de contadores al navegar. */
const REFRESCO_CONTADORES_MS = 30_000;

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
    BuscadorModulosComponent,
    MigasComponent,
  ],
  templateUrl: './layout.component.html',
  styleUrl: './layout.component.scss',
})
export class LayoutComponent {
  readonly authService = inject(AuthService);
  readonly tema = inject(TemaService);
  private readonly breakpoint = inject(BreakpointObserver);
  private readonly router = inject(Router);
  private readonly contadoresService = inject(ContadoresNavService);

  readonly grupos: NavGrupo[] = NAV_GRUPOS;
  readonly modoCompacto = signal(false);
  readonly colapsado = signal(false);
  readonly contadores = signal<ContadoresNav>({});
  private ultimaCargaContadores = 0;

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
  private readonly navLista = viewChild<string, ElementRef<HTMLElement>>('navLista', { read: ElementRef });

  /** Hay módulos ocultos bajo el borde del menú (muestra el degradado). */
  readonly hayMasAbajo = signal(false);

  /** Fondo verde compartido que se desliza hasta el ítem activo. */
  readonly indicador = signal<{ x: number; y: number; ancho: number; alto: number } | null>(null);
  /** La primera ubicación no se anima; las siguientes sí. */
  readonly animarIndicador = signal(false);

  constructor() {
    this.breakpoint
      .observe([Breakpoints.Handset, Breakpoints.TabletPortrait])
      .pipe(takeUntilDestroyed())
      .subscribe((estado) => this.modoCompacto.set(estado.matches));

    // Contadores: al entrar, al navegar y al volver a la pestaña (con un
    // mínimo de 30 s entre consultas para no recargar en cada clic).
    merge(
      this.router.events.pipe(filter((e) => e instanceof NavigationEnd)),
      fromEvent(document, 'visibilitychange').pipe(filter(() => document.visibilityState === 'visible')),
    )
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.cargarContadores());
    this.cargarContadores(true);

    // El menú cambia de alto al redimensionar la ventana o colapsar el sidebar.
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const nav = this.navLista()?.nativeElement;
      if (!nav) return;
      const observador = new ResizeObserver(() => {
        this.revisarScroll();
        this.actualizarIndicador();
      });
      observador.observe(nav);

      // routerLinkActive cambia la clase `activo` cuando termina la navegación:
      // se reubica el indicador justo cuando eso ocurre.
      const cambiosDeClase = new MutationObserver(() => this.actualizarIndicador());
      cambiosDeClase.observe(nav, { subtree: true, attributes: true, attributeFilter: ['class'] });
      this.actualizarIndicador();

      destroyRef.onDestroy(() => {
        observador.disconnect();
        cambiosDeClase.disconnect();
      });
    });
  }

  private actualizarIndicador(): void {
    const activo = this.navLista()?.nativeElement.querySelector<HTMLElement>('a.activo');
    if (!activo) {
      this.indicador.set(null);
      return;
    }
    const nuevo = {
      x: activo.offsetLeft,
      y: activo.offsetTop,
      ancho: activo.offsetWidth,
      alto: activo.offsetHeight,
    };
    const actual = this.indicador();
    const igual =
      actual &&
      actual.x === nuevo.x &&
      actual.y === nuevo.y &&
      actual.ancho === nuevo.ancho &&
      actual.alto === nuevo.alto;
    if (!igual) this.indicador.set(nuevo);
    // Habilita la animación después de la primera ubicación.
    if (!this.animarIndicador()) setTimeout(() => this.animarIndicador.set(true));
  }

  revisarScroll(): void {
    const nav = this.navLista()?.nativeElement;
    if (!nav) return;
    this.hayMasAbajo.set(nav.scrollHeight - nav.scrollTop - nav.clientHeight > 8);
  }

  private cargarContadores(forzar = false): void {
    const ahora = Date.now();
    if (!forzar && ahora - this.ultimaCargaContadores < REFRESCO_CONTADORES_MS) return;
    this.ultimaCargaContadores = ahora;
    this.contadoresService.cargar().subscribe((contadores) => this.contadores.set(contadores));
  }

  /** Tooltip del ítem en modo colapsado, con su contador si lo tiene. */
  tituloColapsado(item: NavItem): string | null {
    if (!this.colapsado()) return null;
    const contador = this.contadores()[item.ruta];
    return contador ? `${item.titulo} · ${contador.descripcion}` : item.titulo;
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

  /** Dashboard + módulos visibles, en el orden del sidebar, para Ctrl+K. */
  readonly modulosBuscables = computed<ModuloBuscable[]>(() => [
    { titulo: 'Dashboard', icono: 'dashboard', grupo: 'Inicio', enlace: ['/app', 'dashboard'] },
    ...this.gruposVisibles().flatMap((grupo) =>
      grupo.items.map((item) => ({
        titulo: item.titulo,
        icono: item.icono,
        grupo: grupo.titulo,
        enlace: this.enlaceItem(item),
      })),
    ),
  ]);

  abrirBuscador(buscador: BuscadorModulosComponent): void {
    this.cerrarEnMovil();
    buscador.abrir();
  }

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
    // Al terminar la animación del ancho (0.28 s) los ítems ya tienen su posición final.
    setTimeout(() => this.actualizarIndicador(), 320);
  }

  cerrarSesion(): void {
    this.authService.logout();
  }
}
