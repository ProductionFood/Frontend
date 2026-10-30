import { migasDeUrl } from './migas.component';

const textos = (url: string) => migasDeUrl(url).map(m => m.texto);

describe('migasDeUrl', () => {
  it('no muestra migas en el dashboard', () => {
    expect(migasDeUrl('/app/dashboard')).toEqual([]);
  });

  it('arma Inicio / grupo / módulo en un listado', () => {
    expect(textos('/app/productos')).toEqual(['Inicio', 'Operación', 'Productos']);
  });

  it('agrega la subruta y omite el id intermedio', () => {
    expect(textos('/app/clientes/nuevo')).toEqual(['Inicio', 'Comercial', 'Clientes', 'Nuevo']);
    expect(textos('/app/clientes/5/editar')).toEqual(['Inicio', 'Comercial', 'Clientes', 'Editar']);
    expect(textos('/app/lotes-producto/3/kardex')).toEqual([
      'Inicio',
      'Operación',
      'Lotes de producto terminado',
      'Kardex'
    ]);
  });

  it('marca como Detalle un id al final', () => {
    expect(textos('/app/compras/12')).toEqual(['Inicio', 'Comercial', 'Compras', 'Detalle']);
  });

  it('encadena subrutas anidadas con su enlace', () => {
    const migas = migasDeUrl('/app/inventario/alertas/sugerencia?x=1');
    expect(migas.map(m => m.texto)).toEqual([
      'Inicio',
      'Inventario',
      'Inventario de materias primas',
      'Alertas de stock',
      'Sugerencia de compra'
    ]);
    expect(migas[3].enlace).toBe('/app/inventario/alertas');
  });

  it('resuelve los módulos en construcción por su nombre', () => {
    expect(textos('/app/en-construccion/desconocido')).toEqual([]);
  });
});
