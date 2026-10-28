import { bootstrapApplication } from '@angular/platform-browser';
import { App } from './app/app';
import { appConfig } from './app/app.config';

// Los errores globales se canalizan mediante provideBrowserGlobalErrorListeners()
// configurado en app.config.ts; evitamos registrar errores con console.error.
void bootstrapApplication(App, appConfig);
