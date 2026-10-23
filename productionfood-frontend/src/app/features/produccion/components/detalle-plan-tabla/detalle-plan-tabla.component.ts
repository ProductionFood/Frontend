import { Component, DestroyRef, EventEmitter, Input, Output, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { EstadoPlan } from '../../models/plan-produccion.model';
import { DetallePlanProducto } from '../../models/detalle-plan.model';
import { DetallePlanService } from '../../services/detalle-plan.service';
import { AgregarProductoPlanDialogComponent } from '../agregar-producto-plan-dialog/agregar-producto-plan-dialog.component';
@Component({selector:'app-detalle-plan-tabla',standalone:true,imports:[FormsModule,RouterLink,MatButtonModule,MatCardModule,MatDialogModule,MatInputModule,MatFormFieldModule,MatProgressBarModule,MatTableModule,MatTooltipModule],templateUrl:'./detalle-plan-tabla.component.html',styleUrl:'./detalle-plan-tabla.component.scss'})
export class DetallePlanTablaComponent {
 @Input({required:true}) planId!:number;@Input({required:true}) estado!:EstadoPlan;@Input() detalles:DetallePlanProducto[]=[];@Input() editable=false;@Output() actualizado=new EventEmitter<void>();
 private readonly servicio=inject(DetallePlanService);private readonly dialog=inject(MatDialog);private readonly destroy=inject(DestroyRef);
 readonly columnas=['producto','planificado','producido','avance','receta','acciones'];readonly ocupado=signal(false);readonly error=signal('');readonly cantidades:Record<number,number>={}; readonly planificadas:Record<number,number>={};readonly mostrarRecordatorio=signal(false);
 get puedePlanificar():boolean{return this.editable&&this.estado==='PLANIFICADO';}get puedeProducir():boolean{return this.editable&&this.estado==='EN_PROCESO';}
 id(d:DetallePlanProducto):number{return d.idDetallePlan??d.idDetalle??0;}
 progreso(d:DetallePlanProducto):number{return d.cantidadPlanificada>0?Math.round(d.cantidadProducida/d.cantidadPlanificada*100):0;}
 agregar():void{this.dialog.open(AgregarProductoPlanDialogComponent,{width:'630px',maxWidth:'95vw',data:{planId:this.planId,excluidos:this.detalles.map(d=>d.idProducto??d.producto?.idProducto).filter((id):id is number=>id!==undefined)}}).afterClosed().pipe(takeUntilDestroyed(this.destroy)).subscribe(ok=>{if(ok)this.actualizado.emit();});}
 guardarProducido(d:DetallePlanProducto):void{const id=this.id(d),cantidad=this.cantidades[id]??d.cantidadProducida;if(!this.puedeProducir||this.ocupado()||cantidad===d.cantidadProducida)return;if(!Number.isFinite(cantidad)||cantidad<0){this.error.set('La cantidad producida no puede ser negativa.');return;}this.ejecutar(this.servicio.producido(this.planId,id,{cantidadProducida:cantidad}),true);}
 guardarPlanificado(d:DetallePlanProducto):void{const id=this.id(d),cantidad=this.planificadas[id]??d.cantidadPlanificada;if(!this.puedePlanificar||this.ocupado()||cantidad===d.cantidadPlanificada)return;if(!Number.isFinite(cantidad)||cantidad<=0){this.error.set('La cantidad planificada debe ser mayor que cero.');return;}this.ejecutar(this.servicio.actualizar(this.planId,id,{cantidadPlanificada:cantidad}),false);}
 quitar(d:DetallePlanProducto):void{if(!this.puedePlanificar||this.ocupado())return;if(!confirm(`¿Quitar ${d.producto?.nombre??'este producto'} del plan?`))return;this.ejecutar(this.servicio.quitar(this.planId,this.id(d)),false);}
 private ejecutar(obs:import('rxjs').Observable<unknown>,producido:boolean):void{this.ocupado.set(true);this.error.set('');obs.pipe(takeUntilDestroyed(this.destroy)).subscribe({next:()=>{this.ocupado.set(false);if(producido)this.mostrarRecordatorio.set(true);this.actualizado.emit();},error:(e:HttpErrorResponse)=>{this.ocupado.set(false);this.error.set(e.status===409?'No se puede modificar este detalle porque ya tiene consumos registrados o cambió el estado del plan.':(e.error?.message??'No se pudo guardar. Reintente.'));}});}
}
