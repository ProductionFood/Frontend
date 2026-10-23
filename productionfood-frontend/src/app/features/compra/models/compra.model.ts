export type EstadoCompra = 'PENDIENTE' | 'RECIBIDA' | 'CANCELADA';

export interface ProveedorResumen {
  idProveedor: number;
  nombre: string;
}

export interface UnidadResumen {
  idUnidad: number;
  nombre: string;
  abreviatura: string;
}

export interface MateriaPrimaResumen {
  idMateriaPrima: number;
  nombre: string;
  unidad: UnidadResumen;
}

export interface LineaCompra {
  idDetalle: number;
  materiaPrima: MateriaPrimaResumen;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
  /**
   * Existencia actual de la materia prima. Solo en `GET /{id}`: es la base
   * del diálogo de recepción, que muestra el impacto sobre el inventario
   * antes de confirmar (HU-13, diseno.md §1).
   */
  stockActual?: number;
}

export interface Compra {
  idCompra: number;
  proveedor: ProveedorResumen;
  /** yyyy-MM-dd */
  fecha: string;
  estado: EstadoCompra;
  totalCompra: number;
  cantidadItems: number;
  /** R-04: solo es editable mientras está PENDIENTE. */
  editable: boolean;
  /** Solo se incluye en `GET /{id}`. */
  detalle?: LineaCompra[];
}

export interface MovimientoGenerado {
  materiaPrima: string;
  cantidad: number;
  saldoAnterior: number;
  saldoPosterior: number;
}

export interface RecepcionResultado {
  idCompra: number;
  estado: EstadoCompra;
  totalCompra: number;
  movimientosGenerados: MovimientoGenerado[];
}

export interface CrearCompraDto {
  idProveedor: number;
  /** yyyy-MM-dd */
  fecha: string;
  /** Al crear siempre es PENDIENTE; los cambios posteriores pasan por PATCH. */
  estado: EstadoCompra;
}

export interface ActualizarCompraDto {
  idProveedor: number;
  /** yyyy-MM-dd */
  fecha: string;
}

export interface CompraFiltro {
  idProveedor?: number;
  estado?: EstadoCompra;
  /** yyyy-MM-dd */
  fechaInicio?: string;
  /** yyyy-MM-dd */
  fechaFin?: string;
  page: number;
  size: number;
  /** Campos ordenables: fecha, estado, total, id (HU-15 §4). */
  sort?: string;
  /** R-06: con `true` el backend limita `size` a 20 e incluye el detalle. */
  incluirDetalle?: boolean;
}

/** Filtro de los endpoints de agregación de HU-15 (solo rango de fechas). */
export interface ResumenFiltro {
  /** yyyy-MM-dd */
  fechaInicio?: string;
  /** yyyy-MM-dd */
  fechaFin?: string;
}

export interface ConteoTotal {
  cantidad: number;
  total: number;
}

export interface PeriodoHistorial {
  /** yyyy-MM-dd */
  desde: string;
  /** yyyy-MM-dd */
  hasta: string;
}

/**
 * `GET /compras/resumen` (HU-15 R-04): recibidas, pendientes y canceladas
 * van por separado. `CANCELADA` se excluye del gasto porque nunca se pagó;
 * `gastoEjecutado` es lo recibido y `gastoComprometido` lo pendiente.
 */
export interface ResumenCompras {
  periodo: PeriodoHistorial;
  recibidas: ConteoTotal;
  pendientes: ConteoTotal;
  canceladas: ConteoTotal;
  gastoEjecutado: number;
  gastoComprometido: number;
}

/** `GET /compras/por-proveedor` (HU-15). */
export interface GastoProveedor {
  proveedor: string;
  cantidadCompras: number;
  total: number;
  /** Participación del proveedor en el gasto del período (%). */
  porcentaje: number;
}
