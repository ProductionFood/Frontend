import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatDialog } from '@angular/material/dialog';
import { SiRolDirective } from '../../../../shared/directives/si-rol.directive';
import { NotificacionService } from '../../../../core/ui/notificacion.service';
import { Devolucion, EstadoDevolucion } from '../../models/devolucion.model';
import { DevolucionService } from '../../services/devolucion.service';
import { AprobarDevolucionDialogComponent } from '../../components/aprobar-devolucion-dialog/aprobar-devolucion-dialog.component';
import { RechazarDevolucionDialogComponent } from '../../components/rechazar-devolucion-dialog/rechazar-devolucion-dialog.component';
import { EstadoBadgeComponent } from '../../../../shared/components/estado-badge/estado-badge.component';
import { EstadoVacioComponent } from '../../../../shared/components/estado-vacio/estado-vacio.component';
import { TarjetaTablaComponent } from '../../../../shared/components/tarjeta-tabla/tarjeta-tabla.component';
@Component({selector:'app-devolucion-lista',standalone:true,imports:[DatePipe,ReactiveFormsModule,RouterLink,MatButtonModule,MatTableModule,MatIconModule,MatMenuModule,MatFormFieldModule,MatSelectModule,MatDatepickerModule,MatInputModule,MatProgressBarModule,MatPaginatorModule,MatSortModule,SiRolDirective,EstadoBadgeComponent,EstadoVacioComponent,TarjetaTablaComponent],templateUrl:'./devolucion-lista.component.html',styleUrl:'./devolucion-lista.component.scss'})
export class DevolucionListaComponent {
 private readonly service=inject(DevolucionService);private readonly destroyRef=inject(DestroyRef);private readonly dialog=inject(MatDialog);private readonly notificacion=inject(NotificacionService);
 readonly cargando=signal(true);readonly error=signal('');readonly devoluciones=signal<Devolucion[]>([]);readonly total=signal(0);readonly pagina=signal(0);readonly tamano=signal(10);readonly orden=signal('fechaRegistro,desc');
 readonly estado=new FormControl<EstadoDevolucion|'TODAS'>('PENDIENTE',{nonNullable:true});readonly desde=new FormControl<Date|null>(null);readonly hasta=new FormControl<Date|null>(null);
 readonly columnas=['pedido','cliente','producto','cantidad','motivo','fecha','estado','acciones'];
 constructor(){this.cargar();}
 private fecha(d:Date|null):string|undefined {if(!d)return undefined;const yyyy=d.getFullYear();const mm=String(d.getMonth()+1).padStart(2,'0');const dd=String(d.getDate()).padStart(2,'0');return `${yyyy}-${mm}-${dd}`;}
 aplicar(){this.pagina.set(0);this.cargar();}
 paginar(event:PageEvent){this.pagina.set(event.pageIndex);this.tamano.set(event.pageSize);this.cargar();}
 ordenar(sort:Sort){this.orden.set(sort.direction?`${sort.active},${sort.direction}`:'fechaRegistro,desc');this.aplicar();}
 cargar(){this.cargando.set(true);this.error.set('');this.service.listar({page:this.pagina(),size:this.tamano(),sort:this.orden(),estado:this.estado.value==='TODAS'?undefined:this.estado.value,fechaInicio:this.fecha(this.desde.value),fechaFin:this.fecha(this.hasta.value)}).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({next:r=>{this.devoluciones.set(r.content);this.total.set(r.totalElements);this.cargando.set(false);},error:(e:HttpErrorResponse)=>{this.error.set(typeof e.error?.message==='string'?e.error.message:'No fue posible cargar devoluciones.');this.cargando.set(false);}});}
 tonoEstado(estado: EstadoDevolucion): 'pendiente' | 'completado' | 'peligro' {
  return estado === 'PENDIENTE' ? 'pendiente' : estado === 'APROBADA' ? 'completado' : 'peligro';
 }

 textoEstado(estado: EstadoDevolucion): string {
  return estado === 'PENDIENTE' ? 'Pendiente' : estado === 'APROBADA' ? 'Aprobada' : 'Rechazada';
 }

 revisar(d: Devolucion, accion: 'aprobar' | 'rechazar') {
  const config = { data: d, width: '560px', maxWidth: '95vw', disableClose: true };
  if (accion === 'aprobar') {
   this.dialog.open(AprobarDevolucionDialogComponent, config).afterClosed()
    .pipe(takeUntilDestroyed(this.destroyRef))
    .subscribe(ok => {
     if (ok) {
      this.notificacion.exito('Devolución aprobada. Stock actualizado por el servidor.');
      this.cargar();
     }
    });
  } else {
   this.dialog.open(RechazarDevolucionDialogComponent, config).afterClosed()
    .pipe(takeUntilDestroyed(this.destroyRef))
    .subscribe(ok => {
     if (ok) {
      this.notificacion.exito('Devolución rechazada.');
      this.cargar();
     }
    });
  }
 }
}
