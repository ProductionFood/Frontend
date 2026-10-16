export interface Proveedor {
  idProveedor: number;
  nombre: string;
  contacto: string | null;
  telefono: string | null;
  correo: string | null;
  activo: boolean;
}

export interface CrearProveedorDto {
  nombre: string;
  contacto?: string | null;
  telefono?: string | null;
  correo?: string | null;
}

export interface ActualizarProveedorDto {
  nombre: string;
  contacto?: string | null;
  telefono?: string | null;
  correo?: string | null;
}

export interface ProveedorFiltro {
  busqueda?: string;
  activo?: boolean;
  page: number;
  size: number;
  sort?: string;
}
