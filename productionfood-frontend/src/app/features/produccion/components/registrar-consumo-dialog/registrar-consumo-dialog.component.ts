import {ResultadoConsumoLote} from '../../models/impacto-inventario.model';
import {ImpactoInventarioComponent} from '../impacto-inventario/impacto-inventario.component';
import {AlertasStockComponent} from '../../../../shared/components/alertas-stock/alertas-stock.component';
import {Component,DestroyRef,inject,Inject,signal} from '@angular/core';
import {DecimalPipe} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {HttpErrorResponse} from '@angular/common/http';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {MAT_DIALOG_DATA,MatDialogModule,MatDialogRef} from '@angular/material/dialog';
import {MatButtonModule} from '@angular/material/button';import {MatFormFieldModule} from '@angular/material/form-field';import {MatInputModule} from '@angular/material/input';import {MatSelectModule} from '@angular/material/select';import {MatProgressBarModule} from '@angular/material/progress-bar';
import {InventarioService} from '../../../inventario/services/inventario.service';
import {ConsumoService} from '../../services/consumo.service';
import {ConsumoTeorico} from '../../models/consumo.model';
interface Linea extends ConsumoTeorico { real:number; }
export interface DatosRegistroConsumo { planId:number; detalleId:number; producto:string; }
@Component({selector:'app-registrar-consumo-dialog',standalone:true,imports:[DecimalPipe,FormsModule,MatDialogModule,MatButtonModule,MatFormFieldModule,MatInputModule,MatSelectModule,MatProgressBarModule,ImpactoInventarioComponent,AlertasStockComponent],templateUrl:'./registrar-consumo-dialog.component.html',styleUrl:'./registrar-consumo-dialog.component.scss'})
export class RegistrarConsumoDialogComponent {
 private readonly service=inject(ConsumoService);private readonly inventario=inject(InventarioService);private readonly destroy=inject(DestroyRef);private readonly ref=inject(MatDialogRef<RegistrarConsumoDialogComponent>);
 readonly cargando=signal(true);readonly guardando=signal(false);readonly error=signal('');readonly lineas=signal<Linea[]>([]);readonly extras=signal<{idMateriaPrima:number;nombre:string;disponible:number;unidad:string;minimo?:number}[]>([]);
 resultado:ResultadoConsumoLote|null=null;stockError='';rendimiento=0;cantidadPlanificada=0;sinReceta=false;extraId:number|null=null;
 constructor(@Inject(MAT_DIALOG_DATA) readonly data:DatosRegistroConsumo){this.cargar();}
 cargar():void{this.cargando.set(true);this.error.set('');this.service.teorico(this.data.planId,this.data.detalleId).pipe(takeUntilDestroyed(this.destroy)).subscribe({next:r=>{this.rendimiento=r.rendimientoReceta??0;this.cantidadPlanificada=r.cantidadPlanificada??0;this.sinReceta=r.tieneReceta===false||r.ingredientes.length===0;this.lineas.set(r.ingredientes.map(i=>({...i,real:i.cantidadTeorica})));this.cargando.set(false);this.cargarExtras();},error:(e:HttpErrorResponse)=>{this.cargando.set(false);this.error.set(e.error?.message??'No se pudo consultar el consumo teórico.');}});}
 private cargarExtras():void{this.inventario.listar({page:0,size:1000}).pipe(takeUntilDestroyed(this.destroy)).subscribe({next:p=>this.extras.set(p.content.map(i=>({idMateriaPrima:i.idMateriaPrima,nombre:i.nombreMateriaPrima??i.materiaPrima?.nombre??i.nombre??`Materia prima #${i.idMateriaPrima}`,disponible:i.cantidadDisponible,minimo:i.stockMinimo,unidad:i.unidad?.abreviatura??i.materiaPrima?.unidad?.abreviatura??''}))),error:()=>this.error.set('No fue posible comprobar todo el inventario. Reintente antes de registrar.')});}
 incluido(id:number):boolean{return this.lineas().some(l=>l.idMateriaPrima===id);}
 agregarExtra():void{const e=this.extras().find(x=>x.idMateriaPrima===this.extraId);if(e&&!this.lineas().some(l=>l.idMateriaPrima===e.idMateriaPrima))this.lineas.update(ls=>[...ls,{idMateriaPrima:e.idMateriaPrima,nombreMateriaPrima:e.nombre,cantidadTeorica:0,cantidadDisponible:e.disponible,unidad:e.unidad,real:0}]);this.extraId=null;}
 get impacto(){return this.lineas().map(l=>({nombre:l.nombreMateriaPrima,unidad:l.unidad??'',disponible:l.cantidadDisponible,real:l.real,minimo:this.extras().find(e=>e.idMateriaPrima===l.idMateriaPrima)?.minimo}));}
 get alertas(){return this.resultado?.alertas??this.resultado?.saldos.filter(s=>s.estadoStock==='BAJO'||s.estadoStock==='AGOTADO')??[];}
 get invalido():boolean{return this.lineas().some(l=>!Number.isFinite(l.real)||l.real<0||Math.round(l.real*1000)!==l.real*1000||l.real>l.cantidadDisponible)||this.lineas().length===0;}
 get faltantes():Linea[]{return this.lineas().filter(l=>l.real>l.cantidadDisponible);}
 guardar():void{if(this.invalido||this.guardando()||this.error())return;this.guardando.set(true);this.stockError='';this.service.registrarLote(this.data.planId,this.data.detalleId,{consumos:this.lineas().map(l=>({idMateriaPrima:l.idMateriaPrima,cantidadReal:l.real}))}).pipe(takeUntilDestroyed(this.destroy)).subscribe({next:r=>{this.resultado=r;this.guardando.set(false);},error:(e:HttpErrorResponse)=>{this.guardando.set(false);const codigo=e.error?.code??e.error?.codigo;if(codigo==='INVENTARIO_NO_INICIALIZADO'){this.stockError='Esta materia prima no tiene inventario inicializado. Contacte al administrador.';}else if(e.status===409){this.stockError=`No se pudo registrar el consumo. ${e.error?.message??'Stock insuficiente.'} Disponible: ${e.error?.disponible??'no informado'}; requerido: ${e.error?.requerido??'no informado'}. Consulte un ajuste de inventario si las existencias fisicas difieren. Verifique con el backend que ningun consumo de esta operacion haya sido registrado.`;}else{this.stockError=e.error?.message??'No fue posible registrar los consumos.';}}});}
 cerrar():void{this.ref.close(this.resultado!==null);}
}
