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

interface PerfilResponse {
  idUsuario: number;
  nombre: string;
  correo: string;
  rol: string;
}

interface LoginResponse {
  token: string;
  tipo: string;
  expiraEn: number;
  usuario: PerfilResponse;
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
    const usuario = this.usuario();
    const token = this.obtenerToken();

    return token !== null &&
      usuario !== null &&
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
    this.migrarSesionLegada();
    this.restaurarSesion();
  }

  /**
   * El token vivía en `localStorage` (persistente). Ahora la sesión se guarda
   * en `sessionStorage`: sobrevive a recargas de la misma pestaña pero no a
   * cerrarla, lo que reduce el impacto de un XSS persistente. Se migra una vez
   * la sesión existente para no forzar un nuevo inicio de sesión tras
   * actualizar la aplicación.
   */
  private migrarSesionLegada(): void {
    const tokenLegado = window.localStorage.getItem(this.tokenKey);
    const usuarioLegado = window.localStorage.getItem(this.usuarioKey);

    if (tokenLegado && !sessionStorage.getItem(this.tokenKey)) {
      sessionStorage.setItem(this.tokenKey, tokenLegado);
    }

    if (usuarioLegado && !sessionStorage.getItem(this.usuarioKey)) {
      sessionStorage.setItem(this.usuarioKey, usuarioLegado);
    }

    window.localStorage.removeItem(this.tokenKey);
    window.localStorage.removeItem(this.usuarioKey);
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

  sessionStorage.removeItem(
    this.tokenKey
  );

  sessionStorage.removeItem(
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
    return sessionStorage.getItem(
      this.tokenKey
    );
  }

  /** Marca de tiempo (ms) en la que expira el JWT, o `null` si no hay token. */
  expiracionTokenMs(): number | null {
    const token = this.obtenerToken();

    if (!token) {
      return null;
    }

    const payload = this.decodificarToken(token);

    return payload?.exp ? payload.exp * 1000 : null;
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

    sessionStorage.setItem(
      this.tokenKey,
      response.token
    );

    const info = response.usuario;

    const usuario: Usuario = {
      idUsuario: info.idUsuario,
      nombre: info.nombre,
      correo: info.correo,
      activo: true,
      rol: {
        idRol: 0,
        nombre: info.rol
      }
    };

    sessionStorage.setItem(
      this.usuarioKey,
      JSON.stringify(usuario)
    );

    this.usuario.set(usuario);
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
      sessionStorage.getItem(
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

    sessionStorage.removeItem(
      this.tokenKey
    );

    sessionStorage.removeItem(
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