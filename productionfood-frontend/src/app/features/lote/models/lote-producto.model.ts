export interface LoteProducto {
  idLote: number;
  codigoLote: string;
  producto: { idProducto: number; nombre: string; unidad?: { abreviatura: string } };
  fechaProduccion: string;
  fechaVencimiento: string;
  cantidadIngresada: number;
  cantidadDisponible: number;
}
export interface CrearLoteProductoDto {
  codigoLote: string;
  idProducto: number;
  fechaProduccion: string;
  fechaVencimiento: string;
  cantidad: number;
}
export interface ResultadoLoteProducto {
  lote?: LoteProducto;
  saldoAnterior?: number;
  saldoPosterior?: number;
  mensaje?: string;
}
export interface MovimientoLoteProducto {
  idMovimiento: number;
  fecha: string;
  tipo: string;
  cantidad: number;
  saldoAnterior: number;
  saldoPosterior: number;
  origen?: string;
  referenciaId?: number;
}
