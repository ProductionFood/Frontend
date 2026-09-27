import { AfterViewInit, Directive, ElementRef, inject } from '@angular/core';

@Directive({
  selector: '[appReveal]',
  host: { class: 'reveal' }
})
export class RevealDirective implements AfterViewInit {
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);

  ngAfterViewInit(): void {
    const observer = new IntersectionObserver(
      entradas => {
        for (const entrada of entradas) {
          if (entrada.isIntersecting) {
            entrada.target.classList.add('visible');
            observer.unobserve(entrada.target);
          }
        }
      },
      { threshold: 0.12 }
    );
    observer.observe(this.el.nativeElement);
  }
}
