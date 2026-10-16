export interface Cliente {
  idCliente: number;
  nombre: string;
  contacto: string | null;
  telefono: string | null;
  activo: boolean;
}

export interface CrearClienteDto {
  nombre: string;
  contacto?: string | null;
  telefono?: string | null;
}

export interface ActualizarClienteDto {
  nombre: string;
  contacto?: string | null;
  telefono?: string | null;
}

export interface ClienteFiltro {
  busqueda?: string;
  activo?: boolean;
  page: number;
  size: number;
  sort?: string;
}
