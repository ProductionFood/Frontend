import { Component, signal, ViewEncapsulation } from '@angular/core';

import { RevealDirective } from '../../reveal.directive';

@Component({
  selector: 'app-landing-pricing',
  standalone: true,
  imports: [RevealDirective],
  templateUrl: './pricing.component.html',
  styleUrl: './pricing.component.scss',
  encapsulation: ViewEncapsulation.None
})
export class LandingPricingComponent {
  readonly anual = signal(false);
}
