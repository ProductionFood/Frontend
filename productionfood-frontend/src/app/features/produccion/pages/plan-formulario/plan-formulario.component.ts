import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { AuthService } from '../../../../core/auth/auth.service';
import { NotificacionService } from '../../../../core/ui/notificacion.service';
import { PlanProduccionService } from '../../services/plan-produccion.service';
@Component({selector:'app-plan-formulario',standalone:true,imports:[ReactiveFormsModule,RouterLink,MatButtonModule,MatCardModule,MatDatepickerModule,MatFormFieldModule,MatIconModule,MatInputModule,MatSelectModule],templateUrl:'./plan-formulario.component.html',styleUrl:'./plan-formulario.component.scss'})
export class PlanFormularioComponent {
 private readonly fb=inject(FormBuilder);private readonly service=inject(PlanProduccionService);private readonly router=inject(Router);private readonly notify=inject(NotificacionService);readonly auth=inject(AuthService);
 readonly guardando=signal(false);readonly error=signal('');readonly fieldErrors=signal<Record<string,string>>({});
 readonly hoy=new Date();readonly form=this.fb.group({fechaPlanificacion:this.fb.control<Date|null>(new Date(),Validators.required),fechaProduccion:this.fb.control<Date|null>(new Date(),Validators.required),observaciones:this.fb.nonNullable.control('',Validators.maxLength(255)),idResponsable:this.fb.control<number|null>(null)});
 get minProduccion():Date {const f=this.form.controls.fechaPlanificacion.value;return f??this.hoy;}
 get fechaIncorrecta():boolean {const p=this.form.controls.fechaPlanificacion.value;const f=this.form.controls.fechaProduccion.value;return !!p&&!!f&&new Date(f.getFullYear(),f.getMonth(),f.getDate())<new Date(p.getFullYear(),p.getMonth(),p.getDate());}
 get nombreResponsable():string{return this.auth.usuario()?.nombre??'Usuario actual';}
 get esAdmin():boolean{return this.auth.rol()==='ADMIN';}
 private iso(f:Date):string{return `${f.getFullYear()}-${String(f.getMonth()+1).padStart(2,'0')}-${String(f.getDate()).padStart(2,'0')}`;}
 guardar():void {this.form.markAllAsTouched();if(this.form.invalid||this.fechaIncorrecta||this.guardando())return;const v=this.form.getRawValue();if(!v.fechaPlanificacion||!v.fechaProduccion)return;this.guardando.set(true);this.error.set('');this.fieldErrors.set({});this.service.crear({fechaPlanificacion:this.iso(v.fechaPlanificacion),fechaProduccion:this.iso(v.fechaProduccion),observaciones:v.observaciones.trim()||undefined,...(this.esAdmin&&v.idResponsable?{idResponsable:v.idResponsable}:{})}).subscribe({next:r=>{this.guardando.set(false);this.notify.exito('Plan creado en estado PLANIFICADO');void this.router.navigate(['/app/produccion',r.idPlanProduccion]);},error:(e:HttpErrorResponse)=>{this.guardando.set(false);this.error.set(e.error?.message??'No se pudo crear el plan');this.fieldErrors.set(e.error?.fieldErrors??{});}});}
 cancelar():void{if(this.form.dirty&&!confirm('¿Descartar los cambios sin guardar?'))return;void this.router.navigate(['/app/produccion']);}
}
