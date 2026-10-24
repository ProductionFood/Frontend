export type NivelAlerta = 'AGOTADO' | 'BAJO';

export interface ResumenAlertas {
  total: number;
  agotadas: number;
  bajas: number;
}

/** Materia prima por debajo del mínimo (vista v_inventario_materia_prima). */
export interface AlertaStock {
  idMateriaPrima: number;
  nombre: string;
  unidad: string;
  cantidadDisponible: number;
  stockMinimo: number;
  /** GREATEST(minimo − disponible, 0). */
  faltante: number;
  nivel: NivelAlerta;
  /** Valor de referencia de HU-08; no es una cotización. */
  costoUnitario: number;
  costoReposicion: number;
  ultimaActualizacion: string;
}

export interface AlertasStockResponse {
  /** Momento del cálculo: se muestra en el estado vacío. */
  generadoEn: string;
  resumen: ResumenAlertas;
  items: AlertaStock[];
  costoReposicionTotal: number;
}

export interface SugerenciaItem {
  /**
   * Necesario para prellenar el detalle de la compra (HU-13). El backend
   * puede omitirlo; en ese caso solo se prellena el proveedor.
   */
  idMateriaPrima?: number;
  materiaPrima: string;
  faltante: number;
  /** Faltante + 20 %, redondeado hacia arriba (R-06). */
  cantidadSugerida: number;
  costoUnitario?: number;
  costoEstimado: number;
}

/** Propuesta de reposición agrupada por el proveedor de la última compra. */
export interface SugerenciaCompra {
  proveedor: { idProveedor: number; nombre: string } | null;
  items: SugerenciaItem[];
  totalEstimado: number;
}
