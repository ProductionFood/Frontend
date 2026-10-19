/**
 * Valida que un `returnUrl` apunte a una ruta interna de la aplicación.
 *
 * Evita *open redirect*: solo se aceptan rutas `/app` o `/app/...`. Se
 * rechazan URLs absolutas y protocol-relative (`//evil`), esquemas como
 * `javascript:`, barras invertidas, segmentos `..` y caracteres de control.
 */
export function esRutaInternaSegura(
  url: string | null | undefined
): url is string {
  if (!url) {
    return false;
  }

  if (url !== '/app' && !url.startsWith('/app/')) {
    return false;
  }

  if (url.startsWith('//') || url.includes('\\') || url.includes('..')) {
    return false;
  }

  // Caracteres de control (incluye saltos de línea y NUL).
  return !/[\u0000-\u001F]/.test(url);
}
