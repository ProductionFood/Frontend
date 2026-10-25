import { Component, DestroyRef, inject, signal, computed } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatSortModule, Sort } from '@angular/material/sort';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EMPTY, Subject, catchError, switchMap, tap } from 'rxjs';
import { Producto } from '../../../producto/models/producto.model';
import { SiRolDirective } from '../../../../shared/directives/si-rol.directive';
import { NotificacionService } from '../../../../core/ui/notificacion.service';
import { LoteProducto, ResultadoLoteProducto } from '../../models/lote-producto.model';
import { LoteProductoService } from '../../services/lote-producto.service';
import { SemaforoVencimientoComponent } from '../../components/semaforo-vencimiento/semaforo-vencimiento.component';
import { LoteProductoFormularioComponent } from '../lote-producto-formulario/lote-producto-formulario.component';
import { EstadoVacioComponent } from '../../../../shared/components/estado-vacio/estado-vacio.component';
import { KpiCardComponent } from '../../../../shared/components/kpi-card/kpi-card.component';
import { TarjetaTablaComponent } from '../../../../shared/components/tarjeta-tabla/tarjeta-tabla.component';
@Component({selector:'app-lote-producto-lista',standalone:true,imports:[DatePipe,DecimalPipe,ReactiveFormsModule,MatButtonModule,MatCheckboxModule,MatDialogModule,MatFormFieldModule,MatIconModule,MatPaginatorModule,MatProgressBarModule,MatSelectModule,MatTableModule,MatSortModule,RouterLink,SiRolDirective,SemaforoVencimientoComponent,EstadoVacioComponent,KpiCardComponent,TarjetaTablaComponent],templateUrl:'./lote-producto-lista.component.html',styleUrl:'./lote-producto-lista.component.scss'})
export class LoteProductoListaComponent {
  private readonly fb=inject(FormBuilder);private readonly service=inject(LoteProductoService);private readonly dialog=inject(MatDialog);private readonly notify=inject(NotificacionService);private readonly destroyRef=inject(DestroyRef);
  readonly columnas=['codigoLote','producto','fechaProduccion','fechaVencimiento','cantidadIngresada','cantidadDisponible','estado','acciones'];
  readonly filtros=this.fb.group({idProducto:this.fb.control<number|null>(null),soloConStock:true,incluirVencidos:true,proximos:false});
  readonly lotes=signal<LoteProducto[]>([]);readonly productos=signal<Producto[]>([]);readonly total=signal(0);readonly pagina=signal(0);readonly tamano=signal(10);readonly sort=signal('fechaVencimiento,asc');readonly cargando=signal(false);readonly error=signal('');private readonly reload$=new Subject<void>();
  readonly vigentes=computed(()=>this.lotes().filter(l=>l.cantidadDisponible>0&&this.dias(l)>=0).length);
  readonly proximos=computed(()=>this.lotes().filter(l=>l.cantidadDisponible>0&&this.dias(l)>=0&&this.dias(l)<=3).length);
  readonly vencidos=computed(()=>this.lotes().filter(l=>l.cantidadDisponible>0&&this.dias(l)<0).length);
  constructor(){this.service.productos().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({next:r=>this.productos.set(r.content),error:()=>this.productos.set([])});
    this.reload$.pipe(tap(()=>{this.cargando.set(true);this.error.set('');}),switchMap(()=>this.service.listar({page:this.pagina(),size:this.tamano(),idProducto:this.filtros.controls.idProducto.value??undefined,soloConStock:this.filtros.controls.soloConStock.value??false,incluirVencidos:this.filtros.controls.incluirVencidos.value??true,proximos:this.filtros.controls.proximos.value??false,sort:this.sort()}).pipe(catchError((e:HttpErrorResponse)=>{this.lotes.set([]);this.total.set(0);this.error.set(e.error?.message??'No fue posible cargar los lotes.');this.cargando.set(false);return EMPTY;}))),takeUntilDestroyed(this.destroyRef)).subscribe(r=>{this.lotes.set(r.content);this.total.set(r.totalElements);this.cargando.set(false);});
    this.filtros.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(()=>{this.pagina.set(0);this.recargar();});this.recargar();}
  dias(l:LoteProducto):number{const h=new Date();h.setHours(0,0,0,0);return Math.round((new Date(`${l.fechaVencimiento}T00:00:00`).getTime()-h.getTime())/86400000);}
  recargar():void{this.reload$.next();}
  cambiarPagina(e:PageEvent):void{this.pagina.set(e.pageIndex);this.tamano.set(e.pageSize);this.recargar();}
  ordenar(e:Sort):void{this.sort.set(e.direction?`${e.active},${e.direction}`:'fechaVencimiento,asc');this.recargar();}
  abrirFormulario():void{this.dialog.open(LoteProductoFormularioComponent,{width:'680px',maxWidth:'96vw',disableClose:true}).afterClosed().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((r:ResultadoLoteProducto|undefined)=>{if(r){const mensaje=r.saldoAnterior!==undefined&&r.saldoPosterior!==undefined?` Stock: ${r.saldoAnterior} → ${r.saldoPosterior}.`:'';this.notify.exito(`Lote registrado correctamente.${mensaje}`);this.recargar();}});}
}
