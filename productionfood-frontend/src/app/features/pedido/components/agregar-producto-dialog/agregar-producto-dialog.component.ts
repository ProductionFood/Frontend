import { CurrencyPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, signal, computed } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { Producto } from '../../../producto/models/producto.model';
import { ProductoService } from '../../../producto/services/producto.service';
import { DetallePedidoService } from '../../services/detalle-pedido.service';
import { StockProducto } from '../../models/detalle-pedido.model';
@Component({selector:'app-agregar-producto-dialog',standalone:true,imports:[CurrencyPipe,ReactiveFormsModule,MatDialogModule,MatButtonModule,MatFormFieldModule,MatInputModule,MatSelectModule,MatProgressSpinnerModule,MatIconModule],templateUrl:'./agregar-producto-dialog.component.html',styleUrl:'./agregar-producto-dialog.component.scss'})
export class AgregarProductoDialogComponent {
 readonly data=inject<{idPedido:number; idsExcluidos:number[]}>(MAT_DIALOG_DATA);
 private readonly ref=inject(MatDialogRef<AgregarProductoDialogComponent>);
 private readonly productosService=inject(ProductoService);
 private readonly service=inject(DetallePedidoService);
 private readonly destroyRef=inject(DestroyRef);
 readonly productos=signal<Producto[]>([]);
 readonly producto=signal<Producto|null>(null);
 readonly stock=signal<StockProducto|null>(null);
 readonly cargando=signal(true); readonly cargandoStock=signal(false); readonly enviando=signal(false);
 readonly error=signal(''); readonly fieldError=signal('');
 readonly idProducto=new FormControl<number|null>(null,Validators.required);
 readonly cantidad=new FormControl<number>(1,{nonNullable:true,validators:[Validators.required,Validators.min(1)]});
 readonly cantidadActual=signal(1);
 readonly disponible=computed(()=>this.stock()?.stockDisponible??0);
 readonly insuficiente=computed(()=>this.cantidadActual()>this.disponible());
 readonly fefo=computed(()=>{let restante=this.cantidadActual();return [...(this.stock()?.lotes??[])].sort((a,b)=>a.fechaVencimiento.localeCompare(b.fechaVencimiento)).map(l=>{const tomar=Math.min(Math.max(restante,0),l.cantidadDisponible);restante-=tomar;return {...l,tomar};}).filter(l=>l.tomar>0);});
 readonly stockRestante=computed(()=>Math.max(0,this.disponible()-Math.min(this.disponible(),this.cantidadActual())));
 readonly subtotal=computed(()=>this.cantidadActual()*(this.producto()?.precioVenta??0));
 constructor(){this.cargar();this.cantidad.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(v=>this.cantidadActual.set(v));}
 cargar(){this.cargando.set(true);this.error.set('');this.productosService.listar({page:0,size:500,activo:true}).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({next:p=>{this.productos.set(p.content.filter(x=>x.stockDisponible>0&&!this.data.idsExcluidos.includes(x.idProducto)));this.cargando.set(false);},error:()=>{this.error.set('No fue posible cargar productos.');this.cargando.set(false);}});}
 seleccionar(id:number){this.idProducto.setValue(id);this.producto.set(this.productos().find(p=>p.idProducto===id)??null);this.stock.set(null);this.fieldError.set('');this.cargandoStock.set(true);this.service.stock(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({next:s=>{this.stock.set(s);this.cargandoStock.set(false);},error:()=>{this.fieldError.set('No se pudo consultar el stock. Reintente seleccionando el producto.');this.cargandoStock.set(false);}});}
 dias(fecha:string){const hoy=new Date();hoy.setHours(0,0,0,0);return Math.ceil((new Date(`${fecha}T00:00:00`).getTime()-hoy.getTime())/86400000);}
 guardar(){if(!this.idProducto.value||this.cantidad.invalid||!this.stock()||this.insuficiente()||this.enviando())return;this.enviando.set(true);this.fieldError.set('');this.service.agregar(this.data.idPedido,{idProducto:this.idProducto.value,cantidad:this.cantidad.value}).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({next:()=>this.ref.close(true),error:(e:HttpErrorResponse)=>{this.enviando.set(false);if(e.status===409){this.fieldError.set('El stock cambió mientras completaba el formulario. Consultando disponible actualizado…');this.seleccionar(this.idProducto.value!);}else this.fieldError.set(e.error?.message??'No fue posible agregar el producto.');}});}
 cerrar(){if(this.idProducto.value&& !confirm('¿Descartar los cambios sin guardar?'))return;this.ref.close();}
}
