export const ANALYSIS_PROVIDER = "OpenAI";

/** Modelo por defecto del endpoint de análisis cuando OPENAI_MODEL no está configurado. */
export const DEFAULT_ANALYSIS_MODEL = "gpt-5";

/**
 * Etiqueta que muestra el panel. OPENAI_MODEL es server-side, así que el cliente lee la
 * copia pública opcional; si no está definida cae al mismo default que usa la ruta.
 */
export const ANALYSIS_MODEL_LABEL = process.env.NEXT_PUBLIC_OPENAI_MODEL || DEFAULT_ANALYSIS_MODEL;
