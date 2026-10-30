import { Component, ViewEncapsulation } from '@angular/core';

import { RevealDirective } from '../../reveal.directive';

@Component({
  selector: 'app-landing-faq',
  standalone: true,
  imports: [RevealDirective],
  templateUrl: './faq.component.html',
  styleUrl: './faq.component.scss',
  encapsulation: ViewEncapsulation.None
})
export class LandingFaqComponent {}
