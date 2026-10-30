interface NodoTrie {
  hijos: Map<string, NodoTrie>;
  /** Textos originales que terminan en este nodo (con sus mayúsculas y tildes). */
  palabras: Set<string>;
}

const nuevoNodo = (): NodoTrie => ({ hijos: new Map(), palabras: new Set() });

/** Minúsculas y sin tildes: "Café" y "cafe" comparten el mismo camino. */
export function normalizarTexto(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Árbol de prefijos para autocompletar en el navegador. Cada carácter es un
 * nodo, así que buscar un prefijo cuesta lo que mide el prefijo, no lo que
 * mide la lista. Además de la frase completa indexa cada palabra, para que
 * "integral" encuentre "Pan integral".
 */
export class Trie {
  private readonly raiz = nuevoNodo();
  private readonly indexados = new Set<string>();

  get tamano(): number {
    return this.indexados.size;
  }

  insertar(texto: string): void {
    const original = texto.trim();
    if (!original || this.indexados.has(original)) return;
    this.indexados.add(original);

    const normalizado = normalizarTexto(original);
    const inicios = new Set([normalizado]);
    for (const palabra of normalizado.split(/\s+/)) {
      if (palabra) inicios.add(normalizado.slice(normalizado.indexOf(palabra)));
    }

    for (const clave of inicios) {
      let nodo = this.raiz;
      for (const caracter of clave) {
        let hijo = nodo.hijos.get(caracter);
        if (!hijo) {
          hijo = nuevoNodo();
          nodo.hijos.set(caracter, hijo);
        }
        nodo = hijo;
      }
      nodo.palabras.add(original);
    }
  }

  /** Hasta `limite` textos que completan el prefijo, en orden alfabético. */
  buscar(prefijo: string, limite = 8): string[] {
    const clave = normalizarTexto(prefijo);
    if (!clave) return [];

    let nodo: NodoTrie | undefined = this.raiz;
    for (const caracter of clave) {
      nodo = nodo.hijos.get(caracter);
      if (!nodo) return [];
    }

    const resultados = new Set<string>();
    const pendientes: NodoTrie[] = [nodo];
    while (pendientes.length) {
      const actual = pendientes.pop()!;
      for (const palabra of actual.palabras) resultados.add(palabra);
      pendientes.push(...actual.hijos.values());
    }

    return [...resultados].sort((a, b) => a.localeCompare(b, 'es')).slice(0, limite);
  }
}
