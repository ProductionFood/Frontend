import { FormControl, FormGroup } from '@angular/forms';

import { DEBOUNCE_BUSQUEDA_MS, cambiosDeFiltros } from './filtros-debounce';

describe('cambiosDeFiltros', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  function crear() {
    const filtros = new FormGroup({
      busqueda: new FormControl('', { nonNullable: true }),
      soloActivos: new FormControl(false, { nonNullable: true })
    });
    const emitidos: unknown[] = [];
    const sub = cambiosDeFiltros(filtros).subscribe(v => emitidos.push(v));
    return { filtros, emitidos, sub };
  }

  it('espera a que el usuario deje de escribir', () => {
    const { filtros, emitidos, sub } = crear();

    filtros.controls.busqueda.setValue('h');
    filtros.controls.busqueda.setValue('ha');
    filtros.controls.busqueda.setValue('har');
    vi.advanceTimersByTime(DEBOUNCE_BUSQUEDA_MS - 1);
    expect(emitidos).toHaveLength(0);

    vi.advanceTimersByTime(1);
    expect(emitidos).toEqual([{ busqueda: 'har', soloActivos: false }]);
    sub.unsubscribe();
  });

  it('aplica al instante los filtros que no son texto', () => {
    const { filtros, emitidos, sub } = crear();

    filtros.controls.soloActivos.setValue(true);
    expect(emitidos).toEqual([{ busqueda: '', soloActivos: true }]);
    sub.unsubscribe();
  });
});
