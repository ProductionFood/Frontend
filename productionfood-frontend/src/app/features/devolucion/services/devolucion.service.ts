import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { PageResponse } from '../../../shared/models/page-response.model';
import { CambiarEstadoDevolucionDto, CrearDevolucionDto, Devolucion, DevolucionFiltro } from '../models/devolucion.model';
@Injectable({providedIn:'root'})
export class DevolucionService {
 private readonly http=inject(HttpClient);
 private readonly url=`${environment.apiUrl}/devoluciones`;
 listar(f:DevolucionFiltro):Observable<PageResponse<Devolucion>> {let params=new HttpParams().set('page',f.page).set('size',f.size);if(f.estado)params=params.set('estado',f.estado);if(f.fechaInicio)params=params.set('fechaInicio',f.fechaInicio);if(f.fechaFin)params=params.set('fechaFin',f.fechaFin);if(f.idPedido!==undefined)params=params.set('idPedido',f.idPedido);if(f.sort)params=params.set('sort',f.sort);return this.http.get<PageResponse<Devolucion>>(this.url,{params});}
 crear(dto:CrearDevolucionDto):Observable<Devolucion>{return this.http.post<Devolucion>(this.url,dto);}
 cambiarEstado(id:number,dto:CambiarEstadoDevolucionDto):Observable<Devolucion>{return this.http.patch<Devolucion>(`${this.url}/${id}/estado`,dto);}
}
