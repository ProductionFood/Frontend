export interface DetallePlanProducto { idDetallePlan?: number; idDetalle?: number; idProducto?: number; producto?: { idProducto?: number; nombre: string; tieneReceta?: boolean; unidad?: { abreviatura: string } }; cantidadPlanificada: number; cantidadProducida: number; }
export interface CrearDetallePlanDto { idProducto: number; cantidadPlanificada: number; }
export interface ActualizarDetallePlanDto { cantidadPlanificada: number; }
export interface RegistrarProducidoDto { cantidadProducida: number; }
