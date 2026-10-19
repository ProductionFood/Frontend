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

  // Se valida la ruta ya decodificada para no dejar pasar
  // %2e%2e (..), %2F%2F (//) ni %5C (\).
  let ruta: string;

  try {
    ruta = decodeURIComponent(url);
  } catch {
    return false;
  }

  if (ruta !== '/app' && !ruta.startsWith('/app/')) {
    return false;
  }

  if (ruta.startsWith('//') || ruta.includes('\\') || ruta.includes('..')) {
    return false;
  }

  // Caracteres de control (incluye saltos de línea y NUL).
  return !/[\u0000-\u001F]/.test(ruta);
}
