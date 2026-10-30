import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { conexionInterceptor } from './conexion.interceptor';
import { ConexionService } from './conexion.service';

describe('conexionInterceptor', () => {
  let http: HttpClient;
  let backend: HttpTestingController;
  let conexion: ConexionService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([conexionInterceptor])),
        provideHttpClientTesting()
      ]
    });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
    conexion = TestBed.inject(ConexionService);
  });

  afterEach(() => backend.verify());

  it('marca sin servidor cuando la petición no llega (estado 0)', () => {
    http.get('/api/x').subscribe({ error: () => undefined });
    backend.expectOne('/api/x').error(new ProgressEvent('error'), { status: 0 });

    expect(conexion.estado()).toBe('sin-servidor');
  });

  it('vuelve a sincronizado con cualquier respuesta, aunque sea un error HTTP', () => {
    conexion.marcarSinServidor();

    http.get('/api/x').subscribe({ error: () => undefined });
    backend.expectOne('/api/x').flush('falló', { status: 500, statusText: 'Error' });

    expect(conexion.estado()).toBe('sincronizado');
  });
});
