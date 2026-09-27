import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import {
  CrearUsuarioDto,
  Usuario
} from '../models/usuario.model';

import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class UsuarioService {

  private readonly http = inject(HttpClient);

  private readonly url = `${environment.apiUrl}/usuarios`;

  crear(dto: CrearUsuarioDto): Observable<Usuario> {
    return this.http.post<Usuario>(this.url, dto);
  }
}