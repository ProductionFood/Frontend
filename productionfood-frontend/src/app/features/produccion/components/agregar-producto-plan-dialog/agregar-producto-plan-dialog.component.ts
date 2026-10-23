import { Component, DestroyRef, inject, Inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormControl, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin } from 'rxjs';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { ProductoService } from '../../../producto/services/producto.service';
import { Producto } from '../../../producto/models/producto.model';
import { RecetaService } from '../../../receta/services/receta.service';
import { Receta } from '../../../receta/models/receta.model';
import { InventarioService } from '../../../inventario/services/inventario.service';
import { InventarioMateriaPrima } from '../../../inventario/models/inventario.model';
import { DetallePlanService } from '../../services/detalle-plan.service';
export interface DialogPlanData { planId:number; excluidos:number[]; }
interface Necesidad { nombre:string; unidad:string; requerida:number; disponible:number|null; }
@Component({selector:'app-agregar-producto-plan-dialog',standalone:true,imports:[ReactiveFormsModule,MatDialogModule,MatButtonModule,MatFormFieldModule,MatInputModule,MatSelectModule,MatProgressBarModule],templateUrl:'./agregar-producto-plan-dialog.component.html',styleUrl:'./agregar-producto-plan-dialog.component.scss'})
export class AgregarProductoPlanDialogComponent {
 private readonly productosService=inject(ProductoService);private readonly recetasService=inject(RecetaService);private readonly inventarioService=inject(InventarioService);private readonly detalleService=inject(DetallePlanService);private readonly destroy=inject(DestroyRef);private readonly ref=inject(MatDialogRef<AgregarProductoPlanDialogComponent>);
 readonly productoId=new FormControl<number|null>(null,{validators:[Validators.required]});readonly cantidad=new FormControl<number|null>(null,{validators:[Validators.required,Validators.min(0.000001)]});
 readonly productos=signal<Producto[]>([]);readonly recetas=signal<Receta[]>([]);readonly inventario=signal<InventarioMateriaPrima[]>([]);readonly cargando=signal(true);readonly calculando=signal(false);readonly guardando=signal(false);readonly error=signal('');readonly sinRecetaConfirmada=signal(false);
 constructor(@Inject(MAT_DIALOG_DATA) readonly data:DialogPlanData){forkJoin({productos:this.productosService.listar({page:0,size:1000,activo:true}),recetas:this.recetasService.listar({page:0,size:1000,activa:true}),inventario:this.inventarioService.listar({page:0,size:1000})}).pipe(takeUntilDestroyed(this.destroy)).subscribe({next:r=>{this.productos.set(r.productos.content.filter(x=>!data.excluidos.includes(x.idProducto)));this.recetas.set(r.recetas.content);this.inventario.set(r.inventario.content);this.cargando.set(false);},error:(e:HttpErrorResponse)=>{this.error.set(e.error?.message??'No fue posible consultar productos, recetas e inventario.');this.cargando.set(false);}});this.productoId.valueChanges.pipe(takeUntilDestroyed(this.destroy)).subscribe(()=>this.sinRecetaConfirmada.set(false));}
 get producto():Producto|undefined{return this.productos().find(p=>p.idProducto===this.productoId.value);}
 get receta():Receta|undefined{return this.recetas().find(r=>(r.idProducto??r.producto?.idProducto)===this.productoId.value && r.activa);}
 get necesidades():Necesidad[]{const r=this.receta;const cantidad=this.cantidad.value??0;if(!r||!r.cantidadProducir)return [];return r.ingredientes.map(i=>{const stock=this.inventario().find(x=>x.idMateriaPrima===i.idMateriaPrima);return {nombre:i.materiaPrima.nombre,unidad:i.materiaPrima.unidad?.abreviatura??'',requerida:i.cantidad*cantidad/r.cantidadProducir,disponible:stock?.cantidadDisponible??null};});}
 get faltantes():boolean{return this.necesidades.some(n=>n.disponible===null||n.disponible<n.requerida);}
 agregar():void{if(this.productoId.invalid||this.cantidad.invalid||this.guardando()||!this.producto)return;if(!this.receta&&!this.sinRecetaConfirmada()){this.sinRecetaConfirmada.set(true);return;}this.guardando.set(true);this.error.set('');this.detalleService.agregar(this.data.planId,{idProducto:this.producto.idProducto,cantidadPlanificada:this.cantidad.value!}).pipe(takeUntilDestroyed(this.destroy)).subscribe({next:()=>this.ref.close(true),error:(e:HttpErrorResponse)=>{this.guardando.set(false);this.error.set(e.error?.message??'No se pudo agregar el producto');}});}
}
