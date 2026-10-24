import {Component,Input} from '@angular/core';
import {DecimalPipe} from '@angular/common';
@Component({selector:'app-indicador-desviacion',standalone:true,imports:[DecimalPipe],template:`@if(valor !== null && valor !== undefined && esFinito(valor)){<strong [class.exceso]="valor>0" [class.ahorro]="valor<0" [class.igual]="valor===0">{{valor>0?'+':''}}{{valor|number:'1.1-1'}} %</strong>}@else{<span title="No se puede calcular la desviación">—</span>}`,styles:[`.exceso{color:#b45309}.ahorro{color:var(--verde-700)}.igual{color:var(--tinta-600)}`]})
export class IndicadorDesviacionComponent { @Input() valor:number|null|undefined=null; esFinito(v:number):boolean{return Number.isFinite(v);} }
