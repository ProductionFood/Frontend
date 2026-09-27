import { ApplicationConfig, LOCALE_ID, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
// TODO: requiere `npm i @angular/animations` (peer de @angular/material)
// import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { MAT_DATE_LOCALE } from '@angular/material/core';
import { registerLocaleData } from '@angular/common';
import localeEsCO from '@angular/common/locales/es-CO';

import { routes } from './app.routes';
// TODO: reactivar cuando existan los interceptores
// import { authInterceptor } from './core/auth/auth.interceptor';
// import { errorInterceptor } from './core/http/error.interceptor';

registerLocaleData(localeEsCO);

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    // TODO: provideHttpClient(withInterceptors([authInterceptor, errorInterceptor])),
    provideHttpClient(),
    // provideAnimationsAsync(),
    { provide: MAT_DATE_LOCALE, useValue: 'es-CO' },
    { provide: LOCALE_ID, useValue: 'es-CO' }
  ]
};