import {
  Directive,
  Input,
  TemplateRef,
  ViewContainerRef,
  inject
} from '@angular/core';

import {
  AuthService
} from '../../core/auth/auth.service';

import {
  RolNombre
} from '../../features/usuario/models/usuario.model';

@Directive({
  selector: '[siRol]',
  standalone: true
})
export class SiRolDirective {

  private readonly template =
    inject(
      TemplateRef<unknown>
    );

  private readonly viewContainer =
    inject(
      ViewContainerRef
    );

  private readonly authService =
    inject(AuthService);

  @Input()
  set siRol(
    roles: RolNombre[]
  ) {

    this.viewContainer.clear();

    if (
      this.authService.tieneAlgunRol(
        roles
      )
    ) {

      this.viewContainer.createEmbeddedView(
        this.template
      );

    }

  }

}