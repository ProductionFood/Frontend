import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

import { NAV_GRUPOS } from '../../layout/nav-items';

/**
 * Módulo "En construcción".
 *
 * Página genérica para todo módulo que aún no está implementado (o está en
 * mantenimiento). Se sirve en la ruta `/app/en-construccion/:ruta`: el param
 * `ruta` se enlaza al input y con él se resuelve título, HU, descripción e
 * icono desde `NAV_GRUPOS`. Si la ruta no existe se muestra un fallback.
 */
@Component({
  selector: 'app-en-construccion',
  standalone: true,
  imports: [RouterLink, MatButtonModule, MatCardModule, MatIconModule],
  templateUrl: './en-construccion.component.html',
  styleUrl: './en-construccion.component.scss'
})
export class EnConstruccionComponent {
  /** Key del módulo dentro de NAV_GRUPOS (param de la ruta). */
  readonly ruta = input('');

  private readonly item = computed(() =>
    NAV_GRUPOS.flatMap(grupo => grupo.items).find(
      item => item.ruta === this.ruta()
    )
  );

  readonly titulo = computed(() => this.item()?.titulo ?? 'Módulo');

  readonly descripcion = computed(
    () =>
      this.item()?.descripcion ??
      'La ruta solicitada no existe o aún no está habilitada.'
  );

  readonly hu = computed(() => this.item()?.hu);

  readonly icono = computed(() => this.item()?.icono ?? 'help');
}
