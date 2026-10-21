import { UnidadMedida } from '../../unidad-medida/models/unidad-medida.model';

export interface Producto {
  idProducto: number;
  nombre: string;
  descripcion: string | null;
  precioVenta: number;
  unidad: UnidadMedida;
  tieneReceta: boolean;
  stockDisponible: number;
  activo: boolean;
}

export interface CrearProductoDto {
  nombre: string;
  descripcion?: string | null;
  precioVenta: number;
  idUnidad: number;
}

export interface ActualizarProductoDto extends CrearProductoDto {}

export interface ProductoFiltro {
  busqueda?: string;
  activo?: boolean;
  sinReceta?: boolean;
  page: number;
  size: number;
  sort?: string;
}
