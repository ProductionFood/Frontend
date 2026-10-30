import { Component, computed, effect, input, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { startWith, switchMap } from 'rxjs';

import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';

import { Trie, normalizarTexto } from '../../utils/trie';

/**
 * Campo de búsqueda reutilizable de las barras de filtros (guía §07):
 * ícono de prefijo, etiqueta, control del formulario de la página y botón
 * de limpiar visible mientras haya texto.
 *
 * Autocompletado: los textos que llegan por `sugerencias` (normalmente los
 * nombres de la página que el backend acaba de devolver) se acumulan en un
 * Trie durante la vida de la pantalla. Al escribir, las sugerencias salen al
 * instante del Trie, mientras la tabla se sigue filtrando en el backend con
 * el debounce de la página.
 *
 * Uso desde la pantalla que filtra:
 *
 * ```html
 * <section class="filtros">
 *   <app-filtro-busqueda
 *     etiqueta="Buscar por nombre"
 *     [control]="filtros.controls.busqueda"
 *     [sugerencias]="nombres()"
 *   />
 *   ...
 * </section>
 * ```
 */
@Component({
  selector: 'app-filtro-busqueda',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatAutocompleteModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './filtro-busqueda.component.html',
  styleUrl: './filtro-busqueda.component.scss'
})
export class FiltroBusquedaComponent {
  /** Etiqueta flotante del campo; también nombra el botón de limpiar. */
  readonly etiqueta = input.required<string>();

  /** Control reactivo de la página que recibe el texto de búsqueda. */
  readonly control = input.required<FormControl<string>>();

  /** Ícono de prefijo (Material Symbols). */
  readonly icono = input('search');

  /** Textos a indexar para autocompletar; se acumulan, no se reemplazan. */
  readonly sugerencias = input<readonly (string | null | undefined)[]>([]);

  private readonly trie = new Trie();
  /** El Trie no es reactivo: este contador avisa que cambió su contenido. */
  private readonly versionTrie = signal(0);

  private readonly texto = toSignal(
    toObservable(this.control).pipe(
      switchMap(control => control.valueChanges.pipe(startWith(control.value)))
    ),
    { initialValue: '' }
  );

  readonly opciones = computed(() => {
    this.versionTrie();
    const texto = this.texto() ?? '';
    const exacto = normalizarTexto(texto);
    // Si ya está escrito el nombre completo, no hace falta sugerirlo.
    return this.trie.buscar(texto).filter(opcion => normalizarTexto(opcion) !== exacto);
  });

  constructor() {
    effect(() => {
      const antes = this.trie.tamano;
      for (const sugerencia of this.sugerencias()) {
        if (sugerencia) this.trie.insertar(sugerencia);
      }
      if (this.trie.tamano !== antes) this.versionTrie.update(v => v + 1);
    });
  }

  limpiar(): void {
    this.control().setValue('');
  }
}
