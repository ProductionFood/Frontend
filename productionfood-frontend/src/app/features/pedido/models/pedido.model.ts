export type EstadoPedido =
  | 'PENDIENTE'
  | 'EN_PREPARACION'
  | 'ENTREGADO'
  | 'CANCELADO';

export interface ClienteResumen {
  idCliente: number;
  nombre: string;
}

export interface ProductoResumen {
  idProducto: number;
  nombre: string;
  unidad: string;
}

/** Lote de producto terminado del que salió parte de una línea (FEFO, HU-17). */
export interface LoteConsumido {
  codigoLote: string;
  cantidad: number;
  /** yyyy-MM-dd */
  vence: string;
}

export interface LineaPedido {
  idDetallePedido: number;
  producto: ProductoResumen;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
  /**
   * Lotes FEFO que cubren la línea. Al cancelar el pedido cada lote recibe
   * el stock de vuelta (HU-16 R-04), por eso el diálogo de cancelación los
   * muestra.
   */
  lotesConsumidos?: LoteConsumido[];
}

export interface Pedido {
  idPedido: number;
  cliente: ClienteResumen;
  /** yyyy-MM-dd. La pone el servidor (R-01); el cuerpo del POST no la acepta. */
  fechaPedido: string;
  /** yyyy-MM-dd | null. Opcional (CA-03); si existe, no anterior a fechaPedido. */
  fechaEntrega: string | null;
  estado: EstadoPedido;
  totalPedido: number;
  cantidadItems: number;
  /** R-05: solo es editable mientras está PENDIENTE. */
  editable: boolean;
  /** Solo se incluye en `GET /{id}`. */
  detalle?: LineaPedido[];
}

export interface CrearPedidoDto {
  idCliente: number;
  /** yyyy-MM-dd | null. Sin `fechaPedido` ni `estado`: los pone el servidor (R-01). */
  fechaEntrega?: string | null;
}

export interface ActualizarPedidoDto {
  idCliente: number;
  /** yyyy-MM-dd | null. */
  fechaEntrega?: string | null;
}

export interface PedidoFiltro {
  idCliente?: number;
  estado?: EstadoPedido;
  /** yyyy-MM-dd, sobre fechaPedido. */
  fechaInicio?: string;
  /** yyyy-MM-dd, sobre fechaPedido. */
  fechaFin?: string;
  page: number;
  size: number;
  /** Campos ordenables: fechaPedido, fechaEntrega, estado, id (HU-16 §4). */
  sort?: string;
}

/** Fila del listado en la consulta de pedidos (HU-25): importes con devoluciones. */
export interface PedidoConsulta extends Pedido {
  /** SUM(cantidad * precio_unitario) del detalle (R-02). */
  totalBruto: number;
  /** Valor de las devoluciones aprobadas (R-04). */
  devoluciones: number;
  /** Bruto menos devoluciones. */
  totalNeto: number;
}

/** Filtro del período para las consultas de agregación (HU-25). */
export interface ResumenPedidosFiltro {
  /** yyyy-MM-dd */
  fechaInicio?: string;
  /** yyyy-MM-dd */
  fechaFin?: string;
}

export interface ConteoPedidos {
  cantidad: number;
  total: number;
}

export interface ResumenPedidos {
  periodo: { desde: string | null; hasta: string | null };
  /** Venta consumada (R-03). */
  entregados: ConteoPedidos;
  /** Venta comprometida: PENDIENTE + EN_PREPARACION (R-03). */
  enCurso: ConteoPedidos;
  /** Se informa aparte; no cuenta como venta (R-03). */
  cancelados: ConteoPedidos;
  ventaBruta: number;
  devoluciones: number;
  ventaNeta: number;
  ticketPromedio: number;
}

/** Ventas agrupadas por cliente (ranking del gráfico de barras). */
export interface VentaCliente {
  cliente: string;
  pedidos: number;
  total: number;
  /** Participación en la venta del período (%). */
  porcentaje: number;
}

/** Ranking de productos; se ordena por unidades, no por importe (R-07). */
export interface ProductoVendido {
  producto: string;
  unidadesVendidas: number;
  importe: number;
  pedidos: number;
}

