export interface UnidadMateriaPrima {
  idUnidad: number;
  nombre: string;
  abreviatura: string;
}

export interface MateriaPrima {
  idMateriaPrima: number;
  nombre: string;
  unidad: UnidadMateriaPrima;
  stockMinimo: number;
  costoUnitario: number;
  activo: boolean;
  /** Existencia actual (fila de inventario creada al dar de alta, R-01). */
  cantidadDisponible: number;
}

export interface CrearMateriaPrimaDto {
  nombre: string;
  idUnidad: number;
  stockMinimo: number;
  costoUnitario: number;
}

export interface ActualizarMateriaPrimaDto {
  nombre: string;
  idUnidad: number;
  stockMinimo: number;
  costoUnitario: number;
}

export interface MateriaPrimaFiltro {
  nombre?: string;
  activo?: boolean;
  page: number;
  size: number;
  sort?: string;
}
