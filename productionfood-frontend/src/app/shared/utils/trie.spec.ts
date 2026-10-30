import { Trie, normalizarTexto } from './trie';

describe('Trie', () => {
  let trie: Trie;

  beforeEach(() => {
    trie = new Trie();
    ['Casa', 'Castillo', 'Casino', 'Café molido', 'Pan integral'].forEach(t => trie.insertar(t));
  });

  it('devuelve todo lo que completa el prefijo', () => {
    expect(trie.buscar('cas')).toEqual(['Casa', 'Casino', 'Castillo']);
  });

  it('ignora mayúsculas y tildes', () => {
    expect(trie.buscar('CAFE')).toEqual(['Café molido']);
    expect(normalizarTexto('  Áéí ')).toBe('aei');
  });

  it('encuentra por cualquier palabra del nombre', () => {
    expect(trie.buscar('integ')).toEqual(['Pan integral']);
    expect(trie.buscar('mol')).toEqual(['Café molido']);
  });

  it('no duplica textos repetidos y respeta el límite', () => {
    trie.insertar('Casa');
    expect(trie.tamano).toBe(5);
    expect(trie.buscar('c', 2)).toEqual(['Café molido', 'Casa']);
  });

  it('devuelve vacío sin prefijo o sin coincidencias', () => {
    expect(trie.buscar('')).toEqual([]);
    expect(trie.buscar('xyz')).toEqual([]);
  });
});
