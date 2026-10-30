import { AfterViewInit, Component, ElementRef, HostListener, OnDestroy, ViewEncapsulation, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { RevealDirective } from './reveal.directive';
import { LandingFaqComponent } from './components/faq/faq.component';
import { LandingPricingComponent } from './components/pricing/pricing.component';
import { LandingHeroComponent } from './components/hero/hero.component';
import { LandingModulesComponent } from './components/modules/modules.component';

const SECCIONES = ['inicio', 'caracteristicas', 'beneficios', 'precios', 'contacto'];

@Component({
  selector: 'app-landing',
  imports: [RouterLink, RevealDirective, LandingFaqComponent, LandingPricingComponent, LandingHeroComponent, LandingModulesComponent],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.scss',
  encapsulation: ViewEncapsulation.None,
  host: { class: 'landing-page' }
})
export class LandingComponent implements AfterViewInit, OnDestroy {
  readonly menuAbierto = signal(false);
  readonly seccionActiva = signal('inicio');
  readonly suscrito = signal<string | null>(null);
  readonly anioActual = new Date().getFullYear();

  private readonly spy = new IntersectionObserver(
    entradas => {
      for (const entrada of entradas) {
        if (entrada.isIntersecting) this.seccionActiva.set(entrada.target.id);
      }
    },
    { rootMargin: '-45% 0px -50% 0px' }
  );

  constructor(private readonly el: ElementRef<HTMLElement>) {}

  suscribir(evento: Event, email: string): void {
    evento.preventDefault();
    const limpio = email.trim();
    if (!limpio) return;
    this.suscrito.set(limpio);
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
