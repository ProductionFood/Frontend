import {Component,DestroyRef,Input,OnChanges,SimpleChanges,inject,signal} from '@angular/core';
import {DatePipe,DecimalPipe} from '@angular/common';import {HttpErrorResponse} from '@angular/common/http';import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {MatButtonModule} from '@angular/material/button';import {MatCardModule} from '@angular/material/card';import {MatDialog} from '@angular/material/dialog';import {MatProgressBarModule} from '@angular/material/progress-bar';import {MatTooltipModule} from '@angular/material/tooltip';
import {ConsumoMateriaPrima} from '../../models/consumo.model';import {ConsumoService} from '../../services/consumo.service';import {IndicadorDesviacionComponent} from '../indicador-desviacion/indicador-desviacion.component';import {RegistrarConsumoDialogComponent} from '../registrar-consumo-dialog/registrar-consumo-dialog.component';
import {CorregirConsumoDialogComponent} from '../corregir-consumo-dialog/corregir-consumo-dialog.component';
@Component({selector:'app-consumo-tabla',standalone:true,imports:[DatePipe,DecimalPipe,MatButtonModule,MatCardModule,MatProgressBarModule,MatTooltipModule,IndicadorDesviacionComponent],templateUrl:'./consumo-tabla.component.html',styleUrl:'./consumo-tabla.component.scss'})
export class ConsumoTablaComponent implements OnChanges { @Input({required:true}) planId!:number;@Input({required:true}) detalleId!:number;@Input() producto='Producto';@Input() estado='PLANIFICADO';@Input() editable=false;
 private readonly service=inject(ConsumoService);private readonly dialog=inject(MatDialog);private readonly destroy=inject(DestroyRef);
 readonly consumos=signal<ConsumoMateriaPrima[]>([]);readonly cargando=signal(false);readonly error=signal('');
 ngOnChanges(changes:SimpleChanges):void{if((changes['detalleId']||changes['planId'])&&this.detalleId>0)this.cargar();}
 cargar():void{this.cargando.set(true);this.error.set('');this.service.listar(this.planId,this.detalleId).pipe(takeUntilDestroyed(this.destroy)).subscribe({next:items=>{this.consumos.set(items);this.cargando.set(false);},error:(e:HttpErrorResponse)=>{this.cargando.set(false);this.error.set(e.error?.message??'No se pudieron cargar los consumos.');}});}
 registrar():void{this.dialog.open(RegistrarConsumoDialogComponent,{width:'980px',maxWidth:'96vw',data:{planId:this.planId,detalleId:this.detalleId,producto:this.producto}}).afterClosed().pipe(takeUntilDestroyed(this.destroy)).subscribe(ok=>{if(ok)this.cargar();});}
 corregir(c:ConsumoMateriaPrima):void{this.dialog.open(CorregirConsumoDialogComponent,{width:'550px',maxWidth:'95vw',data:{planId:this.planId,detalleId:this.detalleId,consumo:c}}).afterClosed().pipe(takeUntilDestroyed(this.destroy)).subscribe(ok=>{if(ok)this.cargar();});}
 porcentaje(c:ConsumoMateriaPrima):number|null{if(c.desviacionPorcentaje!==undefined)return c.desviacionPorcentaje??null;const t=c.cantidadTeorica;if(t===undefined||t===null||t===0)return null;return (c.cantidadReal-t)*100/t;}
 eficiencia(c:ConsumoMateriaPrima):number|null{return c.eficiencia===undefined||c.eficiencia===null||!Number.isFinite(c.eficiencia)?null:c.eficiencia;}
}
