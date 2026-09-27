# ProductionFood

**SPA para la Planificación y Gestión de la Producción en Pymes de Alimentos.**
Corporación Universitaria Antonio José de Sucre — Electiva Profesional II.

---

## Repositorios

| Repo | Contenido |
|---|---|
| `Frontend` (este) | Angular 22 — app en `productionfood-frontend/` |
| `Backend` | Spring Boot 4.1, MySQL 8.4, JWT → `http://localhost:8080/api/v1` |
| `PFDocs` | Convenciones, arquitectura y roadmap |

---

## Estructura

```
Frontend/
└── productionfood-frontend/        # app Angular
    ├── public/                     # logos e imágenes (Angular los copia al build)
    ├── angular.json
    └── src/
        ├── index.html              # fuentes, favicons SVG, SEO
        ├── styles.scss             # tokens, resets y estilos globales
        └── app/
            ├── app.config.ts       # HttpClient, LOCALE_ID es-CO (interceptores en TODO)
            ├── app.routes.ts       # landing en '/'; login y /app/* en TODO
            ├── core/               # auth, http (interceptores), ui
            ├── features/           # landing/ (HU-00) → login, dashboard, clientes, usuarios
            ├── layout/             # shell autenticado
            └── shared/             # componentes, directivas, pipes, modelos
```

---

## Puesta en marcha

```bash
cd productionfood-frontend

npm ci               # Node ≥ 22
npm start            # http://localhost:4200
npm run build        # dist/
npm test             # Vitest + jsdom
```

---

## Estado

- [x] **HU-00** Landing pública: hero, características, "¿Cómo funciona?", beneficios, FAQ, industrias, planes y footer
- [x] Header sticky con scroll-spy, menú hamburguesa móvil y animaciones `appReveal`
- [x] Assets en `public/` con rutas relativas y favicons SVG
- [ ] Login y shell autenticado (rutas comentadas con `TODO`)
- [ ] Interceptores de auth y manejo de errores (en `TODO`)

---

## Convenciones

- Rama por HU: `feat/HU-XX-...` · commits `feat(HU-XX): ...` · nunca push directo a `main`
- Standalone, Signals, Reactive Forms, sin `any` ni `console.log`
- Detalle completo en `PFDocs/00-base/01-CONVENCIONES.md`

---

Proyecto académico — Electiva Profesional II.
