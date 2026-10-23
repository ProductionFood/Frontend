import { EstadoCompra, MateriaPrimaResumen } from './compra.model';

export interface DetalleCompraResponse {
  idDetalleCompra: number;
  materiaPrima: MateriaPrimaResumen;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
  /** Costo de referencia de HU-08 (R-04). */
  costoReferencia: number;
  /** `precioUnitario - costoReferencia` (R-04). */
  diferenciaCosto: number;
  /** Total de la compra recalculado por el backend (R-03). */
  totalCompra: number;
}

export interface DetalleCompraListaResponse {
  idCompra: number;
  estado: EstadoCompra;
  /** R-01: solo es editable mientras la compra está PENDIENTE. */
  editable: boolean;
  detalles: DetalleCompraResponse[];
  /** El total siempre lo calcula el backend, nunca el navegador (R-03). */
  totalCompra: number;
  cantidadItems: number;
}

export interface AgregarDetalleCompraDto {
  idMateriaPrima: number;
  cantidad: number;
  precioUnitario: number;
}

export interface ActualizarDetalleCompraDto {
  cantidad: number;
  precioUnitario: number;
}
