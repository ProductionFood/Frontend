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
@Component({selector:'app-registrar-consumo-dialog',standalone:true,imports:[DecimalPipe,FormsModule,MatDialogModule,MatButtonModule,MatFormFieldModule,MatInputModule,MatSelectModule,MatProgressBarModule],templateUrl:'./registrar-consumo-dialog.component.html',styleUrl:'./registrar-consumo-dialog.component.scss'})
export class RegistrarConsumoDialogComponent {
 private readonly service=inject(ConsumoService);private readonly inventario=inject(InventarioService);private readonly destroy=inject(DestroyRef);private readonly ref=inject(MatDialogRef<RegistrarConsumoDialogComponent>);
 readonly cargando=signal(true);readonly guardando=signal(false);readonly error=signal('');readonly lineas=signal<Linea[]>([]);readonly extras=signal<{idMateriaPrima:number;nombre:string;disponible:number;unidad:string}[]>([]);
 rendimiento=0;cantidadPlanificada=0;sinReceta=false;extraId:number|null=null;registrados=new Set<number>();
 constructor(@Inject(MAT_DIALOG_DATA) readonly data:DatosRegistroConsumo){this.cargar();}
 cargar():void{this.cargando.set(true);this.error.set('');this.service.teorico(this.data.planId,this.data.detalleId).pipe(takeUntilDestroyed(this.destroy)).subscribe({next:r=>{this.rendimiento=r.rendimientoReceta??0;this.cantidadPlanificada=r.cantidadPlanificada??0;this.sinReceta=r.tieneReceta===false||r.ingredientes.length===0;this.lineas.set(r.ingredientes.map(i=>({...i,real:i.cantidadTeorica})));this.cargando.set(false);this.cargarExtras();},error:(e:HttpErrorResponse)=>{this.cargando.set(false);this.error.set(e.error?.message??'No se pudo consultar el consumo teórico.');}});}
 private cargarExtras():void{this.inventario.listar({page:0,size:1000}).pipe(takeUntilDestroyed(this.destroy)).subscribe({next:p=>this.extras.set(p.content.map(i=>({idMateriaPrima:i.idMateriaPrima,nombre:i.nombreMateriaPrima??i.materiaPrima?.nombre??i.nombre??`Materia prima #${i.idMateriaPrima}`,disponible:i.cantidadDisponible,unidad:i.unidad?.abreviatura??i.materiaPrima?.unidad?.abreviatura??''}))),error:()=>this.error.set('No fue posible comprobar todo el inventario. Reintente antes de registrar.')});}
 incluido(id:number):boolean{return this.lineas().some(l=>l.idMateriaPrima===id);}
 agregarExtra():void{const e=this.extras().find(x=>x.idMateriaPrima===this.extraId);if(e&&!this.lineas().some(l=>l.idMateriaPrima===e.idMateriaPrima))this.lineas.update(ls=>[...ls,{idMateriaPrima:e.idMateriaPrima,nombreMateriaPrima:e.nombre,cantidadTeorica:0,cantidadDisponible:e.disponible,unidad:e.unidad,real:0}]);this.extraId=null;}
 get invalido():boolean{return this.lineas().some(l=>!Number.isFinite(l.real)||l.real<0||Math.round(l.real*1000)!==l.real*1000||l.real>l.cantidadDisponible)||this.lineas().length===0;}
 get faltantes():Linea[]{return this.lineas().filter(l=>l.real>l.cantidadDisponible);}
 guardar():void{if(this.invalido||this.guardando()||this.error())return;this.guardando.set(true);const pendientes=this.lineas().filter(l=>!this.registrados.has(l.idMateriaPrima));const siguiente=(index:number)=>{if(index>=pendientes.length){this.ref.close(true);return;}const l=pendientes[index];this.service.registrar(this.data.planId,this.data.detalleId,{idMateriaPrima:l.idMateriaPrima,cantidadReal:l.real}).pipe(takeUntilDestroyed(this.destroy)).subscribe({next:()=>{this.registrados.add(l.idMateriaPrima);siguiente(index+1);},error:(e:HttpErrorResponse)=>{this.guardando.set(false);this.error.set(e.error?.message??'No se pudo registrar el consumo. Compruebe el inventario disponible.');}});};siguiente(0);}
}
