import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { CrearDetallePlanDto, ActualizarDetallePlanDto, RegistrarProducidoDto, DetallePlanProducto } from '../models/detalle-plan.model';
@Injectable({providedIn:'root'})
export class DetallePlanService {
 private readonly http=inject(HttpClient);
 private url(planId:number):string { return `${environment.apiUrl}/planes-produccion/${planId}/detalles`; }
 agregar(planId:number,dto:CrearDetallePlanDto):Observable<DetallePlanProducto>{return this.http.post<DetallePlanProducto>(this.url(planId),dto);}
 actualizar(planId:number,id:number,dto:ActualizarDetallePlanDto):Observable<DetallePlanProducto>{return this.http.put<DetallePlanProducto>(`${this.url(planId)}/${id}`,dto);}
 producido(planId:number,id:number,dto:RegistrarProducidoDto):Observable<DetallePlanProducto>{return this.http.patch<DetallePlanProducto>(`${this.url(planId)}/${id}/producido`,dto);}
 quitar(planId:number,id:number):Observable<void>{return this.http.delete<void>(`${this.url(planId)}/${id}`);}
}
