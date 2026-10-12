export interface BitacoraUsuario {
  idUsuario: number;
  nombre: string;
}

export interface BitacoraRegistro {
  idBitacora: number;
  /** `null` cuando la acción no tiene usuario autenticado (sistema). */
  usuario: BitacoraUsuario | null;
  accion: string;
  tablaAfectada: string;
  detalle: string | null;
  /** Fecha en ISO (ej. `2026-09-18T14:32:11`). */
  fecha: string;
}

export interface BitacoraFiltro {
  idUsuario?: number;
  tabla?: string;
  accion?: string;
  /** `yyyy-MM-dd` */
  fechaInicio?: string;
  /** `yyyy-MM-dd` */
  fechaFin?: string;
  page: number;
  size: number;
}
