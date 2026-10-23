export interface ConsumoMateriaPrima { idConsumo?:number; idMateriaPrima:number; materiaPrima?:{nombre:string;unidad?:{abreviatura:string}}; cantidadReal:number; cantidadTeorica?:number|null; desviacionPorcentaje?:number|null; eficiencia?:number|null; fueraReceta?:boolean; fechaRegistro?:string; }
export interface ConsumoTeorico { idMateriaPrima:number; nombreMateriaPrima:string; unidad?:string; cantidadTeorica:number; cantidadDisponible:number; }
export interface ResumenConsumoTeorico { cantidadPlanificada?:number; rendimientoReceta?:number; ingredientes:ConsumoTeorico[]; tieneReceta?:boolean; }
export interface CrearConsumoDto { idMateriaPrima:number; cantidadReal:number; }
export interface CorregirConsumoDto { cantidadReal:number; }
