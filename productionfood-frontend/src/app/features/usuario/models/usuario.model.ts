export type RolNombre =
  | 'ADMIN'
  | 'PRODUCCION'
  | 'COMPRAS'
  | 'VENTAS'
  | 'CONSULTA';

export interface Rol {
  idRol: number;
  nombre: RolNombre | string;
  descripcion: string;
}

export interface CrearUsuarioDto {
  nombre: string;
  correo: string;
  password: string;
  idRol: number;
}

export interface Usuario {
  idUsuario: number;
  nombre: string;
  correo: string;
  activo: boolean;
  rol: {
    idRol: number;
    nombre: string;
  };
}