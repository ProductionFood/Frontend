export interface SaldoConsumo { idMateriaPrima:number; nombreMateriaPrima:string; unidad?:string; saldoAnterior:number; saldoPosterior:number; stockMinimo?:number; estadoStock?:'OK'|'BAJO'|'AGOTADO'; }
export interface ResultadoConsumoLote { saldos:SaldoConsumo[]; alertas?:SaldoConsumo[]; }
export interface RegistroConsumoLote { consumos:{idMateriaPrima:number;cantidadReal:number}[]; }
