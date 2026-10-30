import { ApplicationConfig, LOCALE_ID, provideBrowserGlobalErrorListeners } from '@angular/core';

import { provideRouter, withComponentInputBinding } from '@angular/router';

import { provideHttpClient, withInterceptors } from '@angular/common/http';

import { MAT_DATE_LOCALE, provideNativeDateAdapter } from '@angular/material/core';

import { registerLocaleData } from '@angular/common';

import localeEsCO from '@angular/common/locales/es-CO';

import { routes } from './app.routes';

import { authInterceptor } from './core/auth/auth.interceptor';

import { errorInterceptor } from './core/http/error.interceptor';

import { conexionInterceptor } from './core/http/conexion.interceptor';

registerLocaleData(localeEsCO);

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),

    provideNativeDateAdapter(),

    provideRouter(routes, withComponentInputBinding()),

    provideHttpClient(withInterceptors([authInterceptor, conexionInterceptor, errorInterceptor])),

    {
      provide: MAT_DATE_LOCALE,
      useValue: 'es-CO',
    },

    {
      provide: LOCALE_ID,
      useValue: 'es-CO',
    },
  ],
};
