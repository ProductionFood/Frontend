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
  /** Campos ordenables: fecha, estado, id (HU-13 §4). */
  sort?: string;
}
