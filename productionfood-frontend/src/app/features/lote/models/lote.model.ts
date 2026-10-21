export interface LoteMateriaPrima {
  idLote?: number;
  codigoLote: string;
  materiaPrima: { idMateriaPrima: number; nombre: string; unidad?: { abreviatura: string } };
  fechaProduccion: string;
  fechaVencimiento: string;
  cantidad: number;
  idDetalleCompra?: number | null;
}

export interface CrearLoteMateriaPrimaDto {
  codigoLote: string;
  idMateriaPrima: number;
  fechaProduccion: string;
  fechaVencimiento: string;
  cantidad: number;
  idDetalleCompra?: number | null;
}

export interface ResultadoRegistroLote {
  lote?: LoteMateriaPrima;
  saldoAnterior?: number;
  saldoPosterior?: number;
  unidad?: string;
  mensaje?: string;
}
