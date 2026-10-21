import { Producto } from '../../producto/models/producto.model';
import { UnidadMedida } from '../../unidad-medida/models/unidad-medida.model';
import { UnidadMateriaPrima } from '../../materia-prima/models/materia-prima.model';

export interface IngredienteReceta {
  idDetalleReceta?: number;
  idMateriaPrima: number;
  materiaPrima: { idMateriaPrima: number; nombre: string; unidad: UnidadMateriaPrima; costoUnitario?: number };
  cantidad: number;
  costoUnitario?: number;
  costoEstimado?: number;
}

export interface Receta {
  idReceta: number;
  idProducto?: number;
  producto: Producto;
  nombre: string;
  cantidadProducir: number;
  unidad: UnidadMedida;
  ingredientes: IngredienteReceta[];
  costoTotalEstimado?: number;
  costoPorUnidadEstimado?: number;
  activa: boolean;
  activo?: boolean;
}

export interface IngredienteRecetaDto {
  idMateriaPrima: number;
  cantidad: number;
}

export interface CrearRecetaDto {
  idProducto: number;
  nombre: string;
  cantidadProducir: number;
  idUnidad: number;
  ingredientes: IngredienteRecetaDto[];
}

export interface RecetaFiltro {
  busqueda?: string;
  activa?: boolean;
  page: number;
  size: number;
  sort?: string;
}
