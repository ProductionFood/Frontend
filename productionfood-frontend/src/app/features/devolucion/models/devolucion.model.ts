export type EstadoDevolucion = 'PENDIENTE' | 'APROBADA' | 'RECHAZADA';
export interface LoteRepuesto { codigoLote: string; cantidad: number; fechaVencimiento: string; stockAnterior?: number; stockPosterior?: number; vendible?: boolean; }
export interface Devolucion { idDevolucion: number; idPedido: number; idDetallePedido: number; cliente?: { nombre: string }; producto?: { nombre: string }; cantidad: number; motivo: string; descripcion?: string | null; estado: EstadoDevolucion; fechaRegistro: string; motivoRechazo?: string | null; lotesRepuestos?: LoteRepuesto[]; lotesDestino?: LoteRepuesto[]; }
export interface CrearDevolucionDto { idDetallePedido: number; cantidad: number; motivo: string; descripcion?: string; }
export interface CambiarEstadoDevolucionDto { estado: 'APROBADA' | 'RECHAZADA'; motivoRechazo?: string; }
export interface DevolucionFiltro { estado?: EstadoDevolucion; fechaInicio?: string; fechaFin?: string; idPedido?: number; page: number; size: number; sort?: string; }
