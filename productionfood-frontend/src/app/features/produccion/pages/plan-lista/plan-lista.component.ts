import { Component, DestroyRef, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatSortModule, Sort } from '@angular/material/sort';
import { AuthService } from '../../../../core/auth/auth.service';
import { EstadoPlan, PlanProduccion } from '../../models/plan-produccion.model';
import { PlanProduccionService } from '../../services/plan-produccion.service';
import { EstadoBadgeComponent } from '../../../../shared/components/estado-badge/estado-badge.component';
import { EstadoVacioComponent } from '../../../../shared/components/estado-vacio/estado-vacio.component';
import { TarjetaTablaComponent } from '../../../../shared/components/tarjeta-tabla/tarjeta-tabla.component';
@Component({selector:'app-plan-lista',standalone:true,imports:[DatePipe,ReactiveFormsModule,RouterLink,MatButtonModule,MatDatepickerModule,MatFormFieldModule,MatIconModule,MatInputModule,MatPaginatorModule,MatProgressBarModule,MatSelectModule,MatTableModule,MatSortModule,EstadoBadgeComponent,EstadoVacioComponent,TarjetaTablaComponent],templateUrl:'./plan-lista.component.html',styleUrl:'./plan-lista.component.scss'})
export class PlanListaComponent {
 private readonly fb=inject(FormBuilder);private readonly service=inject(PlanProduccionService);private readonly destroy=inject(DestroyRef);readonly auth=inject(AuthService);
 readonly filtro=this.fb.group({estado:this.fb.control<EstadoPlan|null>(null),idResponsable:this.fb.control<number|null>(null),inicio:this.fb.control<Date|null>(null),fin:this.fb.control<Date|null>(null)});
 readonly columnas=['numero','fecha','responsable','productos','avance','estado','acciones'];readonly datos=signal<PlanProduccion[]>([]);readonly cargando=signal(false);readonly error=signal('');readonly total=signal(0);readonly page=signal(0);readonly size=signal(10);readonly sort=signal('fechaProduccion,desc');
 constructor(){this.filtro.valueChanges.pipe(takeUntilDestroyed(this.destroy)).subscribe(()=>{this.page.set(0);this.cargar();});this.cargar();}
 private iso(d:Date|null):string|undefined{return d?`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`:undefined;}
 cargar():void{this.cargando.set(true);this.error.set('');const f=this.filtro.getRawValue();this.service.listar({page:this.page(),size:this.size(),estado:f.estado??undefined,idResponsable:f.idResponsable??undefined,fechaInicio:this.iso(f.inicio),fechaFin:this.iso(f.fin),sort:this.sort()}).pipe(takeUntilDestroyed(this.destroy)).subscribe({next:r=>{this.datos.set(r.content);this.total.set(r.totalElements);this.cargando.set(false);},error:(e:HttpErrorResponse)=>{this.error.set(e.status===404?'El servicio de planes de producción no está disponible (HTTP 404). Verifique que el backend implemente GET /api/v1/planes-produccion.':(typeof e.error?.message==='string'?e.error.message:'No se pudieron cargar los planes. Compruebe la conexión con el servidor.'));this.cargando.set(false);}});}
 cambiarPagina(e:PageEvent):void{this.page.set(e.pageIndex);this.size.set(e.pageSize);this.cargar();}
 ordenar(e:Sort):void{this.sort.set(e.direction?`${e.active},${e.direction}`:'fechaProduccion,desc');this.cargar();}
 hoy(p:PlanProduccion):boolean{const d=new Date();return p.fechaProduccion===`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
 avance(p:PlanProduccion):number{const det=p.detalles??[];const total=det.reduce((s,l)=>s+l.cantidadPlanificada,0);return total?Math.min(100,Math.round(det.reduce((s,l)=>s+l.cantidadProducida,0)*100/total)):0;}
 tonoEstado(estado:EstadoPlan):'pendiente'|'proceso'|'completado'|'peligro'{switch(estado){case'PLANIFICADO':return'pendiente';case'EN_PROCESO':return'proceso';case'COMPLETADO':return'completado';case'CANCELADO':return'peligro';}}
 textoEstado(estado:EstadoPlan):string{switch(estado){case'PLANIFICADO':return'Planificado';case'EN_PROCESO':return'En proceso';case'COMPLETADO':return'Completado';case'CANCELADO':return'Cancelado';}}
}
