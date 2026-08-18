"use client";

import { useState } from "react";
import { saveAssetMovement } from "@/data/supabaseRepository";
import { readableError } from "@/lib/supabaseErrors";
import { ASSET_MOVEMENT_KINDS, ASSET_MOVEMENT_LABELS, type AssetMovement, type AssetMovementKind } from "@/core/types";
import { monthKey } from "@/lib/format";

type MovementFormProps = {
  existingMonths: Set<string>;
  onClose: () => void;
  onSaved: (message: string) => Promise<void>;
  userId: string;
};

const inputClass =
  "h-10 rounded-xl border border-[var(--hairline)] bg-white/[0.04] px-3 font-mono text-[12px] text-[var(--foreground)] outline-none focus:border-[rgba(103,232,200,0.45)]";
const labelClass = "grid gap-1.5 text-[12px] font-medium text-[var(--text-soft)]";

function newId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
}

function optionalNumber(value: string) {
  const parsed = Number(value);
  return value.trim() !== "" && Number.isFinite(parsed) ? parsed : undefined;
}

export default function MovementForm({ existingMonths, onClose, onSaved, userId }: MovementFormProps) {
  const [month, setMonth] = useState(monthKey());
  const [kind, setKind] = useState<AssetMovementKind>("BUY");
  const [occurredAt, setOccurredAt] = useState("");
  const [asset, setAsset] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [amount, setAmount] = useState("");
  const [quoteCurrency, setQuoteCurrency] = useState("MXN");
  const [feeAmount, setFeeAmount] = useState("");
  const [feeAsset, setFeeAsset] = useState("");
  const [venue, setVenue] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isNoActivity = kind === "NONE";
  const derivedTotal = (() => {
    const q = optionalNumber(quantity);
    const p = optionalNumber(unitPrice);
    return typeof q === "number" && typeof p === "number" ? q * p : undefined;
  })();

  async function save() {
    setError(null);

    if (!/^\d{4}-\d{2}$/.test(month)) {
      setError("Captura un mes válido.");
      return;
    }

    if (isNoActivity && existingMonths.has(month)) {
      setError(`${month} ya está marcado como mes sin movimientos.`);
      return;
    }

    if (!isNoActivity && !asset.trim()) {
      setError("Captura el activo, por ejemplo XRP o MXN.");
      return;
    }

    if (!isNoActivity && !/^[A-Za-z]{3,5}$/.test(quoteCurrency.trim())) {
      setError("La moneda de liquidación debe ser un código como MXN o USD.");
      return;
    }

    const movement: AssetMovement = {
      id: newId(),
      month,
      kind,
      quoteCurrency: quoteCurrency.trim().toUpperCase() || "MXN",
      createdAt: new Date().toISOString(),
      ...(isNoActivity
        ? {}
        : {
            occurredAt: occurredAt ? new Date(occurredAt).toISOString() : undefined,
            asset: asset.trim().toUpperCase(),
            quantity: optionalNumber(quantity),
            unitPrice: optionalNumber(unitPrice),
            amount: optionalNumber(amount) ?? derivedTotal,
            feeAmount: optionalNumber(feeAmount),
            feeAsset: feeAsset.trim().toUpperCase() || undefined,
            venue: venue.trim() || undefined,
          }),
      notes: notes.trim() || undefined,
    };

    try {
      setBusy(true);
      await saveAssetMovement(userId, movement);
      await onSaved(
        isNoActivity ? `${month} marcado como mes sin movimientos.` : `Movimiento de ${movement.asset} guardado.`,
      );
      onClose();
    } catch (caught) {
      setError(`No se pudo guardar: ${readableError(caught)}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-20 flex justify-end bg-black/45 backdrop-blur-sm" onClick={onClose}>
      <div
        className="h-full w-full max-w-md overflow-y-auto border-l border-[var(--hairline)] bg-[var(--background-2)] p-5 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">Otros movimientos</p>
            <h2 className="mt-1 text-[18px] font-semibold tracking-[-0.015em]">Registrar movimiento</h2>
          </div>
          <button
            className="rounded-full border border-[var(--hairline)] px-3 py-1.5 text-[12px] text-[var(--text-soft)]"
            onClick={onClose}
            type="button"
          >
            Cerrar
          </button>
        </div>

        <p className="mt-3 rounded-xl border border-[var(--hairline)] bg-white/[0.03] px-3 py-2 text-[11px] leading-5 text-[var(--muted)]">
          Para activos fuera del universo gubernamental. No entran a la proyección, la estimación fiscal ni el análisis
          mensual, que solo consideran BONOS, UDIBONOS, CETES y BONDDIA.
        </p>

        <div className="mt-5 grid gap-4">
          <label className={labelClass}>
            Mes
            <input className={inputClass} onChange={(event) => setMonth(event.target.value)} type="month" value={month} />
          </label>

          <label className={labelClass}>
            Tipo
            <select
              className={inputClass}
              onChange={(event) => setKind(event.target.value as AssetMovementKind)}
              value={kind}
            >
              {ASSET_MOVEMENT_KINDS.map((option) => (
                <option key={option} value={option}>
                  {ASSET_MOVEMENT_LABELS[option]}
                </option>
              ))}
            </select>
          </label>

          {!isNoActivity ? (
            <>
              <label className={labelClass}>
                Fecha y hora
                <input
                  className={inputClass}
                  onChange={(event) => setOccurredAt(event.target.value)}
                  type="datetime-local"
                  value={occurredAt}
                />
              </label>

              <label className={labelClass}>
                Activo
                <input
                  className={inputClass}
                  onChange={(event) => setAsset(event.target.value)}
                  placeholder="XRP"
                  value={asset}
                />
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className={labelClass}>
                  Cantidad
                  <input
                    className={inputClass}
                    onChange={(event) => setQuantity(event.target.value)}
                    placeholder="581.439473"
                    step="any"
                    type="number"
                    value={quantity}
                  />
                </label>
                <label className={labelClass}>
                  Precio unitario
                  <input
                    className={inputClass}
                    onChange={(event) => setUnitPrice(event.target.value)}
                    placeholder="17.21"
                    step="any"
                    type="number"
                    value={unitPrice}
                  />
                </label>
              </div>

              <div className="grid gap-3 sm:grid-cols-[1fr_110px]">
                <label className={labelClass}>
                  Total
                  <input
                    className={inputClass}
                    onChange={(event) => setAmount(event.target.value)}
                    placeholder={derivedTotal ? derivedTotal.toFixed(2) : "10011.69"}
                    step="any"
                    type="number"
                    value={amount}
                  />
                </label>
                <label className={labelClass}>
                  Moneda
                  <input
                    className={inputClass}
                    onChange={(event) => setQuoteCurrency(event.target.value)}
                    placeholder="MXN"
                    value={quoteCurrency}
                  />
                </label>
              </div>
              {derivedTotal && !amount ? (
                <span className="-mt-2 font-mono text-[10px] text-[var(--muted)]">
                  Si dejas el total vacío se guarda {derivedTotal.toFixed(2)} {quoteCurrency.toUpperCase()} (cantidad ×
                  precio).
                </span>
              ) : null}

              <div className="grid gap-3 sm:grid-cols-[1fr_110px]">
                <label className={labelClass}>
                  Comisión
                  <input
                    className={inputClass}
                    onChange={(event) => setFeeAmount(event.target.value)}
                    placeholder="4.535227"
                    step="any"
                    type="number"
                    value={feeAmount}
                  />
                </label>
                <label className={labelClass}>
                  Activo comisión
                  <input
                    className={inputClass}
                    onChange={(event) => setFeeAsset(event.target.value)}
                    placeholder="XRP"
                    value={feeAsset}
                  />
                </label>
              </div>

              <label className={labelClass}>
                Plataforma
                <input
                  className={inputClass}
                  onChange={(event) => setVenue(event.target.value)}
                  placeholder="Bitso"
                  value={venue}
                />
              </label>
            </>
          ) : null}

          <label className={labelClass}>
            Notas
            <input
              className={inputClass}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="opcional"
              value={notes}
            />
          </label>

          <button
            className="mt-1 h-10 rounded-full bg-[var(--foreground)] px-4 text-[12px] font-semibold text-[var(--background)]"
            disabled={busy}
            onClick={save}
            type="button"
          >
            {busy ? "Guardando" : "Guardar movimiento"}
          </button>

          {error ? (
            <div className="rounded-xl border border-[rgba(248,113,113,0.35)] bg-[rgba(248,113,113,0.10)] px-3 py-2 text-[12px] leading-5 text-[var(--warn)]">
              {error}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
