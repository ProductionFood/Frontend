import { Component } from '@angular/core';

import { RevealDirective } from '../../reveal.directive';

@Component({
  selector: 'app-landing-faq',
  standalone: true,
  imports: [RevealDirective],
  templateUrl: './faq.component.html'
})
export class LandingFaqComponent {}
