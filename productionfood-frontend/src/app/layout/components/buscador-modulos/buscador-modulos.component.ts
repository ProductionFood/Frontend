import {
  Component,
  ElementRef,
  HostListener,
  computed,
  effect,
  inject,
  input,
  signal,
  viewChild
} from '@angular/core';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

import { Trie } from '../../../shared/utils/trie';

export interface ModuloBuscable {
  titulo: string;
  icono: string;
  grupo: string;
  enlace: string[];
}

/**
 * Paleta para saltar a cualquier módulo escribiendo su nombre (Ctrl+K o
 * Cmd+K). Los títulos se indexan en un Trie, así que "lot" encuentra los dos
 * módulos de lotes al instante. Se navega con flechas, Enter y Escape.
 */
@Component({
  selector: 'app-buscador-modulos',
  standalone: true,
  imports: [MatIconModule],
  templateUrl: './buscador-modulos.component.html',
  styleUrl: './buscador-modulos.component.scss'
})
export class BuscadorModulosComponent {
  private readonly router = inject(Router);

  /** Módulos visibles para el rol actual. */
  readonly modulos = input.required<ModuloBuscable[]>();

  readonly abierto = signal(false);
  readonly texto = signal('');
  readonly seleccionado = signal(0);

  private readonly campo = viewChild<ElementRef<HTMLInputElement>>('campo');

  private readonly indice = computed(() => {
    const trie = new Trie();
    const porTitulo = new Map<string, ModuloBuscable>();
    for (const modulo of this.modulos()) {
      trie.insertar(modulo.titulo);
      porTitulo.set(modulo.titulo, modulo);
    }
    return { trie, porTitulo };
  });

  readonly resultados = computed(() => {
    const texto = this.texto().trim();
    if (!texto) return this.modulos();
    const { trie, porTitulo } = this.indice();
    return trie
      .buscar(texto, 20)
      .map(titulo => porTitulo.get(titulo))
      .filter((modulo): modulo is ModuloBuscable => !!modulo);
  });

  constructor() {
    // Al abrir, el foco va directo al campo.
    effect(() => {
      if (this.abierto()) queueMicrotask(() => this.campo()?.nativeElement.focus());
    });
  }

  @HostListener('document:keydown', ['$event'])
  atajo(evento: KeyboardEvent): void {
    if ((evento.ctrlKey || evento.metaKey) && evento.key.toLowerCase() === 'k') {
      evento.preventDefault();
      this.abierto() ? this.cerrar() : this.abrir();
    }
  }

  abrir(): void {
    this.texto.set('');
    this.seleccionado.set(0);
    this.abierto.set(true);
  }

  cerrar(): void {
    this.abierto.set(false);
  }

  escribir(valor: string): void {
    this.texto.set(valor);
    this.seleccionado.set(0);
  }

  teclear(evento: KeyboardEvent): void {
    const total = this.resultados().length;
    switch (evento.key) {
      case 'ArrowDown':
        evento.preventDefault();
        if (total) this.seleccionado.update(i => (i + 1) % total);
        break;
      case 'ArrowUp':
        evento.preventDefault();
        if (total) this.seleccionado.update(i => (i - 1 + total) % total);
        break;
      case 'Enter': {
        evento.preventDefault();
        const modulo = this.resultados()[this.seleccionado()];
        if (modulo) this.ir(modulo);
        break;
      }
      case 'Escape':
        evento.preventDefault();
        this.cerrar();
        break;
    }
  }

  ir(modulo: ModuloBuscable): void {
    this.cerrar();
    void this.router.navigate(modulo.enlace);
  }
}
