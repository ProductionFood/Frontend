import { Component, DestroyRef, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTableModule } from '@angular/material/table';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin } from 'rxjs';
import { LoteProducto, MovimientoLoteProducto } from '../../models/lote-producto.model';
import { LoteProductoService } from '../../services/lote-producto.service';
import { SemaforoVencimientoComponent } from '../../components/semaforo-vencimiento/semaforo-vencimiento.component';
@Component({selector:'app-lote-producto-kardex',standalone:true,imports:[DatePipe,DecimalPipe,RouterLink,MatButtonModule,MatCardModule,MatIconModule,MatProgressBarModule,MatTableModule,SemaforoVencimientoComponent],templateUrl:'./lote-producto-kardex.component.html',styleUrl:'./lote-producto-kardex.component.scss'})
export class LoteProductoKardexComponent {
  private readonly service=inject(LoteProductoService);private readonly route=inject(ActivatedRoute);private readonly destroyRef=inject(DestroyRef);
  readonly lote=signal<LoteProducto|null>(null);readonly movimientos=signal<MovimientoLoteProducto[]>([]);readonly cargando=signal(true);readonly error=signal('');readonly columnas=['fecha','tipo','cantidad','saldoAnterior','saldoPosterior','origen'];
  constructor(){this.recargar();}
  recargar():void{const id=Number(this.route.snapshot.paramMap.get('id'));if(!Number.isInteger(id)||id<=0){this.error.set('Identificador de lote inválido.');this.cargando.set(false);return;}this.cargando.set(true);this.error.set('');forkJoin({lote:this.service.obtener(id),movimientos:this.service.kardex(id)}).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({next:r=>{this.lote.set(r.lote);this.movimientos.set(r.movimientos);this.cargando.set(false);},error:()=>{this.error.set('No se pudo consultar el lote o sus movimientos.');this.cargando.set(false);}});}
  esEntrada(m:MovimientoLoteProducto):boolean{return m.tipo.startsWith('ENTRADA')||m.tipo.includes('DEVOLUCION');}
}
