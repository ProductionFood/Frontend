import {
  Injectable,
  computed,
  inject,
  signal
} from '@angular/core';

import {
  HttpClient
} from '@angular/common/http';

import {
  Observable,
  tap
} from 'rxjs';

import {
  Router
} from '@angular/router';

import {
  environment
} from '../../../environments/environment';

import {
  Usuario,
  RolNombre
} from '../../features/usuario/models/usuario.model';

interface LoginDto {
  correo: string;
  password: string;
}

interface LoginResponse {
  token: string;
  usuario: Usuario;
}

interface JwtPayload {
  sub?: string;
  exp?: number;
  iat?: number;
  idUsuario?: number;
  nombre?: string;
  correo?: string;
  rol?: string;
  role?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly tokenKey = 'productionfood_token';
  private readonly usuarioKey = 'productionfood_usuario';

  readonly usuario = signal<Usuario | null>(null);

  readonly autenticado = computed(() => {
    const token = this.obtenerToken();

    return token !== null &&
      this.usuario() !== null &&
      !this.tokenEstaExpirado(token);
  });

  readonly rol = computed<RolNombre | null>(() => {

    const usuario = this.usuario();

    if (!usuario) {
      return null;
    }

    return usuario.rol.nombre as RolNombre;

  });

  constructor() {
    this.restaurarSesion();
  }

  login(
    credentials: LoginDto
  ): Observable<LoginResponse> {

    const url =
      `${environment.apiUrl}/auth/login`;

    return this.http
      .post<LoginResponse>(
        url,
        credentials
      )
      .pipe(
        tap(response => {
          this.guardarSesion(response);
        })
      );
  }

  logout(redirigir = true): void {

  localStorage.removeItem(
    this.tokenKey
  );

  localStorage.removeItem(
    this.usuarioKey
  );

  this.usuario.set(null);

  if (redirigir) {

    void this.router.navigate([
      '/'
    ]);

  }
}

  obtenerToken(): string | null {
    return localStorage.getItem(
      this.tokenKey
    );
  }

  tieneAlgunRol(
    roles: RolNombre[]
  ): boolean {

    const rolActual = this.rol();

    if (!rolActual) {
      return false;
    }

    return roles.includes(rolActual);
  }

  private guardarSesion(
    response: LoginResponse
  ): void {

    localStorage.setItem(
      this.tokenKey,
      response.token
    );

    localStorage.setItem(
      this.usuarioKey,
      JSON.stringify(response.usuario)
    );

    this.usuario.set(
      response.usuario
    );
  }

  private restaurarSesion(): void {

    const token =
      this.obtenerToken();

    if (!token) {
      return;
    }

    if (
      this.tokenEstaExpirado(token)
    ) {

      this.limpiarSesion();

      return;
    }

    const usuarioGuardado =
      localStorage.getItem(
        this.usuarioKey
      );

    if (!usuarioGuardado) {
      return;
    }

    try {

      const usuario =
        JSON.parse(
          usuarioGuardado
        ) as Usuario;

      this.usuario.set(usuario);

    } catch {

      this.limpiarSesion();

    }
  }

  private limpiarSesion(): void {

    localStorage.removeItem(
      this.tokenKey
    );

    localStorage.removeItem(
      this.usuarioKey
    );

    this.usuario.set(null);
  }

  private tokenEstaExpirado(
    token: string
  ): boolean {

    const payload =
      this.decodificarToken(token);

    if (!payload) {
      return true;
    }

    if (!payload.exp) {
      return true;
    }

    return (
      payload.exp * 1000
      <= Date.now()
    );
  }

  private decodificarToken(
    token: string
  ): JwtPayload | null {

    try {

      const partes =
        token.split('.');

      if (partes.length !== 3) {
        return null;
      }

      const base64 =
        partes[1]
          .replace(/-/g, '+')
          .replace(/_/g, '/');

      const json =
        decodeURIComponent(
          atob(base64)
            .split('')
            .map(char =>
              `%${(
                '00' +
                char
                  .charCodeAt(0)
                  .toString(16)
              ).slice(-2)}`
            )
            .join('')
        );

      return JSON.parse(
        json
      ) as JwtPayload;

    } catch {

      return null;

    }
  }

}