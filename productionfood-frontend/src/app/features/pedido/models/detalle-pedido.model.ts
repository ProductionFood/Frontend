export interface LoteFefo { codigoLote: string; cantidadDisponible: number; fechaVencimiento: string; }
export interface StockProducto { stockDisponible: number; lotes: LoteFefo[]; }
export interface AgregarDetallePedidoDto { idProducto: number; cantidad: number; }
export interface ActualizarDetallePedidoDto { cantidad: number; }
