import {Component,Input} from '@angular/core';
import {DecimalPipe} from '@angular/common';
@Component({selector:'app-indicador-desviacion',standalone:true,imports:[DecimalPipe],template:`@if(valor !== null && valor !== undefined && esFinito(valor)){<strong [class.exceso]="valor>0" [class.ahorro]="valor<0" [class.igual]="valor===0">{{valor>0?'+':''}}{{valor|number:'1.1-1'}} %</strong>}@else{<span title="No se puede calcular la desviación">—</span>}`,styles:[`.exceso{color:#b3261e}.ahorro{color:#155ec2}.igual{color:#18713c}`]})
export class IndicadorDesviacionComponent { @Input() valor:number|null|undefined=null; esFinito(v:number):boolean{return Number.isFinite(v);} }
