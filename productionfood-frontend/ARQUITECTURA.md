# Arquitectura Frontend — ProductionFood

**Aplicación web SPA (Single Page Application)** para la Planificación y Gestión de la Producción en Pymes de Alimentos.

> Stack: Angular 22 · TypeScript 6.0 · Angular Material 22 · componentes standalone · signals · Reactive Forms · SCSS · sin SSR · sin NgModules · sin NgRx.

---

## 1. Estructura de carpetas

```
src/
├── main.ts                          registerLocaleData(es-CO)
├── index.html
├── styles.scss                      tema Material (mat.theme) + estilos globales
├── environments/
│   ├── environment.ts               apiUrl: http://localhost:8080/api/v1
│   └── environment.prod.ts          apiUrl: /api/v1 (mismo origen, sin CORS)
└── app/
    ├── app.config.ts                providers: router, http+interceptors, animations, es-CO
    ├── app.routes.ts                rutas raíz con lazy loading
    ├── core/                        nunca importa de features ni shared
    │   ├── auth/
    │   │   ├── auth.service.ts      signals: usuario, autenticado, rol; login/logout
    │   │   ├── auth.guard.ts        canActivate → sesión válida
    │   │   ├── rol.guard.ts         canActivate → rol autorizado
    │   │   └── auth.interceptor.ts  adjunta Authorization: Bearer
    │   ├── http/
    │   │   ├── error.interceptor.ts  401→logout, 403→aviso, 5xx→snackbar, 0→sin conexión
    │   │   └── api.config.ts        baseUrl desde environment
    │   └── ui/
    │       ├── notificacion.service.ts   wrapper MatSnackBar (éxito/error/aviso)
    │       └── confirmacion.service.ts   wrapper MatDialog para confirmar
    ├── layout/                      shell autenticado (solo tras authGuard)
    │   ├── layout.component.{ts,html,scss}   barra superior + menú lateral por rol
    │   └── components/
    │       └── indicador-alertas/   MatBadge con /alertas/resumen (HU-27)
    ├── shared/                      reutilizable, sin conocimiento de features
    │   ├── components/
    │   │   ├── tabla-paginada/      MatPaginator + MatSort
    │   │   ├── barra-filtros/
    │   │   ├── estado-chip/
    │   │   ├── confirmar-dialog/
    │   │   └── alertas-stock/
    │   ├── directives/
    │   │   └── si-rol.directive.ts  *siRol → oculta elementos por rol (cosmético)
    │   ├── pipes/                   moneda, cantidad, estado-activo
    │   └── models/                  PageResponse<T>, ApiError
    └── features/
        ├── landing/                 página pública de entrada
        │   ├── landing.component.{ts,html,scss}
        │   └── components/          (opcional: hero, modulos, planes, faq)
        ├── auth/                    login, sin-acceso
        ├── usuario/                 HU-01, HU-02
        ├── bitacora/                HU-04
        ├── cliente/                 HU-05
        ├── proveedor/               HU-06
        ├── unidad-medida/           HU-07
        ├── materia-prima/           HU-08
        ├── lote/                    HU-09, HU-19
        ├── inventario/              HU-10, HU-27
        ├── producto/                HU-11
        ├── receta/                  HU-12
        ├── compra/                  HU-13, HU-14, HU-15
        ├── pedido/                  HU-16, HU-17, HU-25
        ├── devolucion/              HU-18
        ├── produccion/              HU-20–HU-23
        ├── dashboard/               HU-24
        └── reporte/                 HU-26
```

**Regla de dependencia:** `features/* → shared → core`. `core` no importa de nadie; `shared` no conoce `features`; un feature no importa de otro feature.

### Módulos de features (17 + landing pública)

| Feature | HU |
|---|---|
| `landing` | página pública, sin autenticación |
| `auth` (login, sin-acceso) | HU-03 |
| `usuario` | HU-01, HU-02 |
| `bitacora` | HU-04 |
| `cliente` | HU-05 |
| `proveedor` | HU-06 |
| `unidad-medida` | HU-07 |
| `materia-prima` | HU-08 |
| `lote` | HU-09, HU-19 |
| `inventario` (alertas, sugerencia-compra) | HU-10, HU-27 |
| `producto` | HU-11 |
| `receta` | HU-12 |
| `compra` | HU-13, HU-14, HU-15 |
| `pedido` | HU-16, HU-17, HU-25 |
| `devolucion` | HU-18 |
| `produccion` (plan, impacto-inventario) | HU-20–HU-23 |
| `dashboard` | HU-24 |
| `reporte` | HU-26 |

---

## 2. Rutas

```typescript
export const routes: Routes = [
  { path: '', loadComponent: () => import('./features/landing/landing.component').then(m => m.LandingComponent) },
  { path: 'login', loadComponent: () => import('./features/auth/login.component').then(m => m.LoginComponent) },
  {
    path: 'app',
    canActivate: [authGuard],
    loadComponent: () => import('./layout/layout.component').then(m => m.LayoutComponent),
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', loadChildren: () => import('./features/dashboard/dashboard.routes') },
      { path: 'clientes',  canActivate: [rolGuard(['ADMIN','VENTAS','PRODUCCION','CONSULTA'])],
                           loadChildren: () => import('./features/cliente/cliente.routes') },
      { path: 'usuarios',  canActivate: [rolGuard(['ADMIN'])],
                           loadChildren: () => import('./features/usuario/usuario.routes') }
    ]
  },
  { path: 'sin-acceso', loadComponent: () => import('./shared/sin-acceso.component').then(m => m.SinAccesoComponent) },
  { path: '**', redirectTo: '' }
];
```

- `/` → landing pública (puerta de entrada)
- `/login` → fuera del layout (sin menú)
- `/app/*` → shell autenticado con lazy loading por feature
- `*siRol` solo oculta enlaces: la autorización real está en el backend (`03-MATRIZ-ROLES.md`)

---

## 3. Flujo de autenticación

1. `login.component` llama `AuthService.login()` → `POST /auth/login`.
2. El token va a `localStorage`; el JWT se decodifica a `signal` de usuario.
3. `auth.interceptor` adjunta `Bearer` a cada petición.
4. `error.interceptor`: **401 → logout + aviso**, 403 → aviso (NO cierra sesión), 0/5xx → snackbar. 400/404/409/422 los maneja el componente.
5. Al refrescar: leer token → validar `exp` → si está vencido, sesión nula (evita "sesión fantasma").
6. Redirección post-login según rol (ADMIN → dashboard, VENTAS → pedidos, ...).

---

## 4. Patrón de componente de listado

Los **tres estados son obligatorios** (`05-ESTANDARES-QA.md` §7):

```typescript
readonly cargando = signal(false);
readonly error    = signal<string | null>(null);
readonly datos    = signal<PageResponse<T> | null>(null);
```

```html
@if (cargando()) {
  <mat-progress-bar mode="indeterminate" />
} @else if (error()) {
  <!-- mensaje + botón Reintentar -->
} @else if (datos()?.content?.length === 0) {
  <!-- estado vacío + acción sugerida (ej. "Registrar el primero") -->
} @else {
  <!-- tabla + mat-paginator -->
}
```

- Búsqueda con `debounceTime(350)` + `distinctUntilChanged()` en `valueChanges`.
- El componente solo llama a **su servicio**, nunca a `HttpClient`.

---

## 5. Formularios

- **Reactive Forms siempre** (nada de `ngModel` en formularios de dominio).
- Botón deshabilitado mientras `guardando()` → evita doble envío.
- Errores del servidor (`fieldErrors` de `ApiError`) se mapean al control correspondiente:
  `form.get(fe.field)?.setErrors({ servidor: fe.message })` — **junto al campo**, no en toast.
- Confirmación de contraseña: solo cliente, nunca se envía.
- Selector de roles/entidades: **siempre desde API**, nunca lista escrita a mano.

---

## 6. Presentación de datos

- `LOCALE_ID = 'es-CO'` + `MAT_DATE_LOCALE = 'es-CO'` en `app.config.ts`; `registerLocaleData(localeEsCO)` en `app.config.ts`.
- Precios: `{{ p.precio | currency:'COP':'symbol-narrow':'1.2-2' }}` → `$ 12.500,00`.
- **Los totales los calcula el backend.** El frontend solo muestra.
- Códigos de estado en BD; la etiqueta legible ("En preparación") se resuelve en el frontend.
- `NaN`/`Infinity` → mostrar `—`; nombres nulos → "Sistema".

---

## 7. Nomenclatura y reglas

| Elemento | Convención | Ejemplo |
|---|---|---|
| Archivo | kebab-case + sufijo | `materia-prima-lista.component.ts` |
| Clase | PascalCase + sufijo | `MateriaPrimaListaComponent` |
| Interface | PascalCase, sin `I` | `Cliente`, `PageResponse<T>` |
| Observable | sufijo `$` | `materiasPrimas$` |
| Ruta API | plural kebab-case | `/api/v1/materias-primas` |

- **Nunca `any`.** Modelos TypeScript espejo de los DTO del backend; si cambia el DTO, cambia la interfaz en el mismo PR.
- **Sin `console.log` ni `console.error`** en producción.
- Idioma de dominio: **español** (`MateriaPrimaService`, no `rawMaterial`).
- Estado local con **signals**; no se introduce NgRx en este alcance.
- Sin lógica de negocio duplicada: el cliente valida para UX, la autoridad es el backend.

---

## 8. Definición de Terminado (01 §7)

- [ ] Criterios de aceptación implementados y verificados.
- [ ] Tres estados: cargando / vacío / error.
- [ ] Errores del servidor junto al campo.
- [ ] Guard de rol aplicado y probado con rol no autorizado.
- [ ] Modelos espejo de los DTO.
- [ ] Probado en Chrome y Firefox a 1366×768.
- [ ] Sin `console.log`, sin `any`, sin código comentado.
- [ ] Commits atómicos con prefijo `feat(HU-XX): ...`; un PR por capa (< 250 líneas).

---

## 9. Comandos

```bash
npm install -g @angular/cli@22
ng new productionfood-frontend --routing --style=scss --ssr=false --interactive=false
ng add @angular/material@22
npm start          # ng serve → http://localhost:4200
npm run build      # ng build --configuration production
```