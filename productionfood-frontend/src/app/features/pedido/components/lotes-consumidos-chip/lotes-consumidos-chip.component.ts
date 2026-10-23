import { Component, input } from '@angular/core';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { LoteConsumido } from '../../models/pedido.model';
@Component({selector:'app-lotes-consumidos-chip',standalone:true,imports:[MatChipsModule,MatTooltipModule],template:`<mat-chip-set aria-label="Lotes consumidos">@for(l of lotes();track l.codigoLote){<mat-chip [matTooltip]="'Vence: '+l.vence">{{l.codigoLote}} ({{l.cantidad}}) @if(dias(l.vence)<=3){<span aria-label="Próximo a vencer">🟠</span>}</mat-chip>}</mat-chip-set>`})
export class LotesConsumidosChipComponent {readonly lotes=input<LoteConsumido[]>([]);dias(fecha:string){const hoy=new Date();hoy.setHours(0,0,0,0);return Math.ceil((new Date(`${fecha}T00:00:00`).getTime()-hoy.getTime())/86400000);}}
