import { MatIconRegistry } from '@angular/material/icon';
import { DomSanitizer } from '@angular/platform-browser';
import {
  BookOpen,
  ChartColumn,
  Croissant,
  Factory,
  FlaskConical,
  History,
  LayoutDashboard,
  PackageCheck,
  Ruler,
  Search,
  ShoppingBag,
  ShoppingCart,
  Truck,
  Undo2,
  Users,
  UsersRound,
  Warehouse,
  Wheat
} from 'lucide-static';

/** Espacio de nombres de los iconos de navegación: `<mat-icon svgIcon="nav:factory">`. */
export const NAMESPACE_ICONOS_NAV = 'nav';

/**
 * Iconos lineales (Lucide, guía §11) para la navegación, indexados por el
 * nombre de Material Symbols que ya usa NAV_GRUPOS: así nav-items no cambia
 * y cada módulo conserva su significado. Solo se importan estos iconos.
 */
const ICONOS: Record<string, string> = {
  dashboard: LayoutDashboard,
  search: Search,
  factory: Factory,
  inventory_2: PackageCheck,
  menu_book: BookOpen,
  bakery_dining: Croissant,
  warehouse: Warehouse,
  grain: Wheat,
  science: FlaskConical,
  straighten: Ruler,
  shopping_cart: ShoppingCart,
  people: Users,
  shopping_bag: ShoppingBag,
  local_shipping: Truck,
  assignment_return: Undo2,
  group: UsersRound,
  history: History,
  assessment: ChartColumn
};

/** Registra los iconos una sola vez en el registro global de Material. */
export function registrarIconosNavegacion(registro: MatIconRegistry, sanitizer: DomSanitizer): void {
  for (const [nombre, svg] of Object.entries(ICONOS)) {
    // SVG estático del paquete lucide-static, no contenido de usuario.
    registro.addSvgIconLiteralInNamespace(NAMESPACE_ICONOS_NAV, nombre, sanitizer.bypassSecurityTrustHtml(svg));
  }
}
