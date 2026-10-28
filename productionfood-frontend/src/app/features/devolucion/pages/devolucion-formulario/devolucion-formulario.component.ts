import { Component, DestroyRef, inject, signal, computed } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { Pedido, LineaPedido } from '../../../pedido/models/pedido.model';
import { DevolucionService } from '../../services/devolucion.service';
import { NotificacionService } from '../../../../core/ui/notificacion.service';
export interface FormularioDevolucionData { pedido: Pedido; linea: LineaPedido; }
@Component({selector:'app-devolucion-formulario',standalone:true,imports:[ReactiveFormsModule,RouterLink,MatButtonModule,MatIconModule,MatFormFieldModule,MatInputModule,MatSelectModule,MatProgressBarModule],templateUrl:'./devolucion-formulario.component.html',styleUrl:'./devolucion-formulario.component.scss'})
export class DevolucionFormularioComponent {
  private readonly route=inject(ActivatedRoute);private readonly router=inject(Router);private readonly service=inject(DevolucionService);private readonly notificacion=inject(NotificacionService);private readonly destroyRef=inject(DestroyRef);
  private readonly navegacion=this.router.getCurrentNavigation();
  readonly data=this.navegacion?.extras.state as FormularioDevolucionData;
  readonly cargando=signal(true);readonly enviando=signal(false);readonly error=signal('');readonly fieldErrors=signal<Record<string,string>>({});readonly previo=signal(0);
  readonly disponible=computed(()=>Math.max(0,this.data.linea.cantidad-this.previo()));
  readonly cantidad=new FormControl<number>(1,{nonNullable:true,validators:[Validators.required,Validators.min(1)]});
  readonly motivo=new FormControl<string>('',{nonNullable:true,validators:[Validators.required,Validators.maxLength(50)]});
  readonly otro=new FormControl<string>('',{nonNullable:true,validators:[Validators.maxLength(50)]});
  readonly descripcion=new FormControl<string>('',{nonNullable:true,validators:[Validators.maxLength(255)]});
  readonly motivos=['Producto en mal estado','Error en el pedido','Cliente insatisfecho','Producto incorrecto','Otro'];
  constructor(){this.cargar();}
  cargar(){this.cargando.set(true);this.error.set('');this.service.listar({idPedido:this.data.pedido.idPedido,page:0,size:500}).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({next:r=>{this.previo.set(r.content.filter(d=>d.idDetallePedido===this.data.linea.idDetallePedido&&d.estado!=='RECHAZADA').reduce((s,d)=>s+d.cantidad,0));this.cargando.set(false);},error:()=>{this.error.set('No se pudieron consultar devoluciones previas.');this.cargando.set(false);}});}
  guardar(){this.fieldErrors.set({});const m=this.motivo.value==='Otro'?this.otro.value.trim():this.motivo.value;if(this.cargando()||this.enviando()||this.cantidad.invalid||this.motivo.invalid||this.descripcion.invalid||!m||m.length>50)return;
  if(this.cantidad.value>this.disponible()){this.fieldErrors.set({cantidad:`Solo puede devolver ${this.disponible()} unidades.`});return;}
  this.enviando.set(true);this.service.crear({idDetallePedido:this.data.linea.idDetallePedido,cantidad:this.cantidad.value,motivo:m,descripcion:this.descripcion.value.trim()||undefined}).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({next:()=>{this.notificacion.exito('Devolución registrada, pendiente de aprobación.');void this.router.navigate(['/app/pedidos',this.data.pedido.idPedido]);},error:(e:HttpErrorResponse)=>{this.enviando.set(false);const mensaje=typeof e.error?.message==='string'?e.error.message:'No se pudo registrar la devolución.';if(e.status===422){this.fieldErrors.set({cantidad:mensaje});this.cargar();}else this.error.set(mensaje);}});}
  volver(){if((this.motivo.value||this.descripcion.value||this.cantidad.dirty)&&!confirm('¿Descartar los cambios sin guardar?'))return;void this.router.navigate(['/app/pedidos',this.data.pedido.idPedido]);}
}
