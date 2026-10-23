import { Component, DestroyRef, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTableModule } from '@angular/material/table';
import { AuthService } from '../../../../core/auth/auth.service';
import { NotificacionService } from '../../../../core/ui/notificacion.service';
import { EstadoPlan, PlanProduccion } from '../../models/plan-produccion.model';
import { PlanProduccionService } from '../../services/plan-produccion.service';
import { CancelarPlanDialogComponent } from '../../components/cancelar-plan-dialog/cancelar-plan-dialog.component';
@Component({selector:'app-plan-detalle',standalone:true,imports:[DatePipe,RouterLink,MatButtonModule,MatCardModule,MatChipsModule,MatDialogModule,MatProgressBarModule,MatTableModule],templateUrl:'./plan-detalle.component.html',styleUrl:'./plan-detalle.component.scss'})
export class PlanDetalleComponent {
 private readonly route=inject(ActivatedRoute);private readonly service=inject(PlanProduccionService);private readonly dialog=inject(MatDialog);private readonly notify=inject(NotificacionService);private readonly destroy=inject(DestroyRef);readonly auth=inject(AuthService);
 readonly plan=signal<PlanProduccion|null>(null);readonly cargando=signal(true);readonly guardando=signal(false);readonly error=signal('');readonly columnas=['producto','planificado','producido','avance'];readonly id=Number(this.route.snapshot.paramMap.get('id'));
 constructor(){this.cargar();}
 get editable():boolean{return this.auth.rol()==='ADMIN'||this.auth.rol()==='PRODUCCION';}
 cargar():void{if(!Number.isInteger(this.id)||this.id<1){this.error.set('Identificador inválido');this.cargando.set(false);return;}this.cargando.set(true);this.error.set('');this.service.obtener(this.id).pipe(takeUntilDestroyed(this.destroy)).subscribe({next:p=>{this.plan.set(p);this.cargando.set(false);},error:(e:HttpErrorResponse)=>{this.error.set(e.error?.message??'No fue posible cargar el plan');this.cargando.set(false);}});}
 avance(cantidad:number,planificada:number):number{return planificada>0?Math.min(100,Math.round(100*cantidad/planificada)):0;}
 iniciar():void{const p=this.plan();if(!p||p.estado!=='PLANIFICADO'||!(p.detalles?.length))return;this.actualizar('EN_PROCESO');}
 completar():void{const p=this.plan();if(p?.estado!=='EN_PROCESO')return;if(confirm('¿Completar este plan? Esta acción es definitiva.'))this.actualizar('COMPLETADO');}
 cancelar():void{const p=this.plan();if(!p||!['PLANIFICADO','EN_PROCESO'].includes(p.estado))return;this.dialog.open(CancelarPlanDialogComponent,{width:'550px',maxWidth:'95vw',data:p}).afterClosed().pipe(takeUntilDestroyed(this.destroy)).subscribe((confirmado:boolean|undefined)=>{if(confirmado)this.actualizar('CANCELADO');});}
 private actualizar(estado:EstadoPlan):void{this.guardando.set(true);this.error.set('');this.service.cambiarEstado(this.id,estado).pipe(takeUntilDestroyed(this.destroy)).subscribe({next:p=>{this.guardando.set(false);this.plan.set(p);this.notify.exito(`Plan actualizado a ${estado.replace('_',' ')}`);this.cargar();},error:(e:HttpErrorResponse)=>{this.guardando.set(false);this.error.set(e.error?.message??'No se pudo cambiar el estado');}});}
}
