import { AfterViewInit, Component, ElementRef, HostListener, OnDestroy, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { RevealDirective } from './reveal.directive';

const SECCIONES = ['inicio', 'caracteristicas', 'beneficios', 'precios', 'contacto'];

@Component({
  selector: 'app-landing',
  imports: [RouterLink, RevealDirective],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.scss'
})
export class LandingComponent implements AfterViewInit, OnDestroy {
  readonly anual = signal(false);
  readonly menuAbierto = signal(false);
  readonly seccionActiva = signal('inicio');

  private readonly spy = new IntersectionObserver(
    entradas => {
      for (const entrada of entradas) {
        if (entrada.isIntersecting) this.seccionActiva.set(entrada.target.id);
      }
    },
    { rootMargin: '-45% 0px -50% 0px' }
  );

  constructor(private readonly el: ElementRef<HTMLElement>) {}

  cambiarFacturacion(_evento: Event): void {
    this.anual.update(v => !v);
  }

  alternarMenu(): void {
    this.menuAbierto.update(v => !v);
  }

  cerrarMenu(): void {
    this.menuAbierto.set(false);
  }

  @HostListener('document:keydown.escape')
  cerrarMenuConEscape(): void {
    this.cerrarMenu();
  }

  ngAfterViewInit(): void {
    const raiz = this.el.nativeElement;
    for (const id of SECCIONES) {
      const seccion = raiz.querySelector<HTMLElement>(`#${id}`);
      if (seccion) this.spy.observe(seccion);
    }
  }

  ngOnDestroy(): void {
    this.spy.disconnect();
  }
}
