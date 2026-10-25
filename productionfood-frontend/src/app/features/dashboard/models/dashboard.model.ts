import { EstadoPedido } from '../../pedido/models/pedido.model';
import { EstadoPlan } from '../../produccion/models/plan-produccion.model';

/** Nivel de existencias de una materia prima (vista de inventario, V2). */
export type NivelStock = 'BAJO' | 'AGOTADO';

export interface ResumenPedidosHoy {
  cantidad: number;
  total: number;
  porEstado: Partial<Record<EstadoPedido, number>>;
}

export interface CompraMasAntigua {
  idCompra: number;
  /** yyyy-MM-dd */
  fecha: string;
  diasPendiente: number;
}

/** Compras en estado PENDIENTE, sin filtro de fecha (HU-24 R-02). */
export interface ResumenComprasPendientes {
  cantidad: number;
  total: number;
  masAntigua: CompraMasAntigua | null;
}

export interface ItemStockBajo {
  nombre: string;
  disponible: number;
  minimo: number;
  faltante: number;
  nivel: NivelStock;
}

export interface ResumenStockBajo {
  cantidad: number;
  agotadas: number;
  items: ItemStockBajo[];
}

export interface ResumenProduccionHoy {
  cantidad: number;
  porEstado: Partial<Record<EstadoPlan, number>>;
  avancePromedio: number | null;
}

export interface ItemPorVencer {
  codigoLote: string;
  producto: string;
  /** yyyy-MM-dd */
  vence: string;
  /** Negativo cuando el lote ya está vencido (R-03). */
  diasParaVencer: number;
  disponible: number;
}

/** Lotes con stock que vencen dentro del horizonte (R-03). */
export interface ResumenPorVencer {
  cantidad: number;
  vencidos: number;
  items: ItemPorVencer[];
}

export interface DashboardResumen {
  /** yyyy-MM-dd calculado por el servidor con `curdate()` (R-01). */
  fecha: string;
  pedidosHoy: ResumenPedidosHoy;
  comprasPendientes: ResumenComprasPendientes;
  stockBajo: ResumenStockBajo;
  produccionHoy: ResumenProduccionHoy;
  porVencer: ResumenPorVencer;
}

export interface ConteosDashboard {
  productos: number | null;
  materiasPrimas: number | null;
  recetas: number | null;
  planes: number | null;
  inventario: number | null;
}
