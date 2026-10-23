import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { PageResponse } from '../../../shared/models/page-response.model';
import { CrearPlanProduccionDto, EstadoPlan, FiltroPlan, PlanProduccion } from '../models/plan-produccion.model';
@Injectable({providedIn:'root'})
export class PlanProduccionService {
 private readonly http=inject(HttpClient); private readonly url=`${environment.apiUrl}/planes-produccion`;
 listar(f:FiltroPlan):Observable<PageResponse<PlanProduccion>> { let p=new HttpParams().set('page',f.page).set('size',f.size); if(f.estado)p=p.set('estado',f.estado);if(f.idResponsable!==undefined)p=p.set('idResponsable',f.idResponsable);if(f.fechaInicio)p=p.set('fechaInicio',f.fechaInicio);if(f.fechaFin)p=p.set('fechaFin',f.fechaFin);if(f.sort)p=p.set('sort',f.sort);return this.http.get<PageResponse<PlanProduccion>>(this.url,{params:p}); }
 obtener(id:number):Observable<PlanProduccion>{return this.http.get<PlanProduccion>(`${this.url}/${id}`);}
 crear(dto:CrearPlanProduccionDto):Observable<PlanProduccion>{return this.http.post<PlanProduccion>(this.url,dto);}
 cambiarEstado(id:number,estado:EstadoPlan):Observable<PlanProduccion>{return this.http.patch<PlanProduccion>(`${this.url}/${id}/estado`,{estado});}
}
