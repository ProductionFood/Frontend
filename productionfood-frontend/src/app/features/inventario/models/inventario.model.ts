import { UnidadMateriaPrima } from '../../materia-prima/models/materia-prima.model';

export type EstadoStock = 'AGOTADO' | 'BAJO' | 'OK';
export type DireccionMovimiento = 'ENTRADA' | 'SALIDA';

/** DTO de consulta del inventario agregado por materia prima. */
export interface InventarioMateriaPrima {
  idMateriaPrima: number;
  materiaPrima?: { idMateriaPrima?: number; nombre?: string; unidad?: UnidadMateriaPrima };
  nombreMateriaPrima?: string;
  nombre?: string;
  unidad?: UnidadMateriaPrima;
  cantidadDisponible: number;
  disponible?: number;
  stockMinimo: number;
  faltante?: number;
  estadoStock: EstadoStock;
  fechaActualizacion?: string | null;
  activo?: boolean;
}

/** DTO de cada movimiento consultado en el kardex. */
export interface MovimientoInventario {
  idMovimiento: number;
  fecha: string;
  tipoMovimiento: string;
  direccion?: DireccionMovimiento;
  cantidad: number;
  saldoAnterior: number;
  saldoPosterior: number;
  documentoOrigen?: string | null;
  tipoDocumentoOrigen?: string | null;
  idDocumentoOrigen?: number | null;
  usuario?: { idUsuario?: number; nombre?: string; apellido?: string; nombreCompleto?: string } | string | null;
  observacion?: string | null;
}

export interface KardexInventario {
  materiaPrima?: InventarioMateriaPrima;
  saldoActual?: number;
  movimientos: MovimientoInventario[];
}

/** DTO para registrar un nuevo movimiento de inventario (entrada/salida). */
export interface CrearMovimientoInventarioDto {
  idMateriaPrima: number;
  direccion: DireccionMovimiento;
  cantidad: number;
  tipoMovimiento?: string;
  observacion?: string | null;
}
