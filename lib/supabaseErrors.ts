export const SUPABASE_CONTACT_ERROR =
  "No pude contactar Supabase. Revisa que NEXT_PUBLIC_SUPABASE_URL apunte a un proyecto activo.";

/** Supabase pausado o sin red devuelve errores de fetch crudos; se normalizan a un mensaje accionable. */
export function readableAuthError(error: { message?: string } | null | undefined) {
  const message = error?.message;
  if (!message) return SUPABASE_CONTACT_ERROR;
  const normalized = message.toLowerCase();

  if (normalized.includes("failed to fetch") || normalized.includes("fetch failed") || normalized.includes("load failed")) {
    return SUPABASE_CONTACT_ERROR;
  }

  return message;
}

export function readableError(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error && "message" in error) {
    return String((error as { message?: unknown }).message);
  }
  return "Error desconocido.";
}
