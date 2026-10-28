import { Component, signal } from '@angular/core';

import { RevealDirective } from '../../reveal.directive';

@Component({
  selector: 'app-landing-pricing',
  standalone: true,
  imports: [RevealDirective],
  templateUrl: './pricing.component.html'
})
export class LandingPricingComponent {
  readonly anual = signal(false);
}
