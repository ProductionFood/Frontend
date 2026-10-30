import { Component } from '@angular/core';

import { RevealDirective } from '../../reveal.directive';

@Component({
  selector: 'app-landing-modules',
  standalone: true,
  imports: [RevealDirective],
  templateUrl: './modules.component.html'
})
export class LandingModulesComponent {}
