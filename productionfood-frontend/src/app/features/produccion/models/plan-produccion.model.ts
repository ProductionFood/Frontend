export type EstadoPlan = 'PLANIFICADO' | 'EN_PROCESO' | 'COMPLETADO' | 'CANCELADO';
export interface DetallePlan { idDetallePlan?: number; idProducto?: number; producto?: { nombre: string; unidad?: { abreviatura: string } }; cantidadPlanificada: number; cantidadProducida: number; }
export interface ConsumoPlan { idConsumo?: number; cantidad: number; unidad?: { abreviatura: string }; }
export interface PlanProduccion { idPlanProduccion: number; fechaPlanificacion: string; fechaProduccion: string; estado: EstadoPlan; responsable?: { idUsuario: number; nombre: string }; observaciones?: string; detalles?: DetallePlan[]; consumos?: ConsumoPlan[]; cantidadProductos?: number; }
export interface CrearPlanProduccionDto { fechaPlanificacion: string; fechaProduccion: string; observaciones?: string; idResponsable?: number; }
export interface FiltroPlan { page: number; size: number; estado?: EstadoPlan; idResponsable?: number; fechaInicio?: string; fechaFin?: string; busqueda?: string; sort?: string; }
