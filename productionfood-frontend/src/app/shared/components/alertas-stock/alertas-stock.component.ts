import {Component,Input} from '@angular/core';
import {DecimalPipe} from '@angular/common';
import {RouterLink} from '@angular/router';
import {SaldoConsumo} from '../../../features/produccion/models/impacto-inventario.model';
@Component({selector:'app-alertas-stock',standalone:true,imports:[DecimalPipe,RouterLink],template:`@if(alertas.length){<section class="alerta" role="status"><h3>Alertas de stock</h3>@for(a of alertas;track a.idMateriaPrima){<p><strong>{{a.estadoStock==='AGOTADO'?'Agotado':'Stock bajo'}}:</strong> {{a.nombreMateriaPrima}} quedó en {{a.saldoPosterior|number:'1.2-2'}} {{a.unidad}} (mínimo {{a.stockMinimo|number:'1.2-2'}}). Faltan {{faltante(a)|number:'1.2-2'}} {{a.unidad}} para alcanzar el mínimo.</p>}<a routerLink="/app/inventario">Ver inventario</a> · <a routerLink="/app/compras">Registrar compra</a></section>}`,styles:[`.alerta{padding:16px;border-left:5px solid #b97711;background:#fff6e2;border-radius:8px;margin:12px 0}.alerta h3{margin:0 0 8px}.alerta a{color:#164c35}`]})
export class AlertasStockComponent {@Input() alertas:SaldoConsumo[]=[];faltante(a:SaldoConsumo):number{return Math.max(0,(a.stockMinimo??0)-a.saldoPosterior);}}
