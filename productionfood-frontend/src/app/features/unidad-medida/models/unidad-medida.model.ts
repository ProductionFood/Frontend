export interface UnidadMedida {
  idUnidad: number;
  nombre: string;
  abreviatura: string;
  /**
   * Número de referencias (materias primas, productos, recetas). El contrato
   * de HU-07 no lo incluye todavía en el listado; si no viene, la interfaz
   * muestra "—".
   */
  enUso?: number;
}

export interface CrearUnidadDto {
  nombre: string;
  abreviatura: string;
}

export interface ActualizarUnidadDto {
  nombre: string;
  abreviatura: string;
}
