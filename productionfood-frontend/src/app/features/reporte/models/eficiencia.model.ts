import { EstadoPlan } from '../../produccion/models/plan-produccion.model';

export interface PeriodoReporte {
  /** yyyy-MM-dd */
  desde: string;
  /** yyyy-MM-dd */
  hasta: string;
}

export interface FiltroEficiencia {
  /** yyyy-MM-dd, sobre fecha_produccion (CA-04). */
  fechaInicio?: string;
  /** yyyy-MM-dd */
  fechaFin?: string;
}

/** CA-01: planificado vs producido por producto del plan. */
export interface ProductoPlanEficiencia {
  producto: string;
  planificada: number;
  producida: number;
  /** producido / planificado × 100 (R-01). */
  cumplimiento: number | null;
}

/** CA-02: consumo teórico vs real por materia prima. */
export interface ConsumoEficiencia {
  materiaPrima: string;
  teorica: number;
  real: number;
  /** (real − teórica) / teórica × 100 (R-04). `null` si no hay teórica. */
  desviacion: number | null;
  /** teórica / real × 100 (R-01). `null` si el consumo real es cero (R-03). */
  eficiencia: number | null;
}

export interface PlanEficiencia {
  idPlan: number;
  /** yyyy-MM-dd */
  fechaProduccion: string;
  estado: EstadoPlan;
  responsable: string | null;
  /** producido / planificado × 100. */
  cumplimiento: number | null;
  /** teórica / real × 100. No comparable entre planes con distinto cumplimiento (R-02). */
  rendimiento: number | null;
  /** (teórica × producido / planificado) / real × 100. Métrica comparable (R-02). */
  rendimientoAjustado: number | null;
  productos: ProductoPlanEficiencia[];
  consumos: ConsumoEficiencia[];
}

export interface ResumenEficiencia {
  planesAnalizados: number;
  /** Se informan aparte: su cumplimiento bajo es esperable (R-05). */
  planesCancelados: number;
  /** Promedios que excluyen los registros no calculables (R-03). */
  cumplimientoPromedio: number | null;
  rendimientoPromedio: number | null;
  rendimientoAjustadoPromedio: number | null;
  /** Consumos con cantidad real en cero, excluidos de los promedios (R-03). */
  registrosSinRendimiento: number;
  desviacionMateriaPrima: number | null;
}

/** Productos sin receta: sin consumo teórico no hay nada que comparar (R-07). */
export interface ProductoSinReceta {
  producto: string;
  planes: number;
  nota: string;
}

export interface ReporteEficiencia {
  periodo: PeriodoReporte;
  resumen: ResumenEficiencia;
  planes: PlanEficiencia[];
  sinReceta: ProductoSinReceta[];
}

export type TendenciaMateriaPrima =
  | 'CONSUMO_EXCESIVO'
  | 'NORMAL'
  | 'AHORRO';

/** Desviación acumulada del período por insumo (R-06). */
export interface DesviacionMateriaPrima {
  materiaPrima: string;
  unidad: string;
  teoricaAcumulada: number;
  realAcumulada: number;
  desviacion: number | null;
  planes: number;
  tendencia: TendenciaMateriaPrima;
}
