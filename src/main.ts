import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppModule } from './app/app.module';
import { registerLocaleData } from '@angular/common';
import localeEsCo from '@angular/common/locales/es-CO';

// Registra los datos de localización para 'es-CO'
registerLocaleData(localeEsCo, 'es-CO');

platformBrowserDynamic().bootstrapModule(AppModule)
  .catch(err => console.error(err));
