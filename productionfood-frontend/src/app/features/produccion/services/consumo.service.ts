import {inject,Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable} from 'rxjs';
import {environment} from '../../../../environments/environment';
import {ConsumoMateriaPrima,ResumenConsumoTeorico,CrearConsumoDto,CorregirConsumoDto} from '../models/consumo.model';
@Injectable({providedIn:'root'}) export class ConsumoService {
 private readonly http=inject(HttpClient);
 private base(plan:number,detalle:number):string{return `${environment.apiUrl}/planes-produccion/${plan}/detalles/${detalle}`;}
 listar(plan:number,detalle:number):Observable<ConsumoMateriaPrima[]>{return this.http.get<ConsumoMateriaPrima[]>(`${this.base(plan,detalle)}/consumos`);}
 teorico(plan:number,detalle:number):Observable<ResumenConsumoTeorico>{return this.http.get<ResumenConsumoTeorico>(`${this.base(plan,detalle)}/consumo-teorico`);}
 registrar(plan:number,detalle:number,dto:CrearConsumoDto):Observable<ConsumoMateriaPrima>{return this.http.post<ConsumoMateriaPrima>(`${this.base(plan,detalle)}/consumos`,dto);}
 corregir(plan:number,detalle:number,id:number,dto:CorregirConsumoDto):Observable<ConsumoMateriaPrima>{return this.http.patch<ConsumoMateriaPrima>(`${this.base(plan,detalle)}/consumos/${id}`,dto);}
}
