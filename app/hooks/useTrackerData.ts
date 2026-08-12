"use client";

import { useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";
import { SUPABASE_CONTACT_ERROR, readableAuthError } from "@/lib/supabaseErrors";
import { loadCloudData } from "@/data/supabaseRepository";
import { normalizeLot } from "@/core/lots";
import type { InvestmentLot, MarketSnapshot, MonthlyAnalysis, TaxDeclarationRecord } from "@/core/types";

export type TrackerDataStatus = "loading" | "signed-out" | "ready";

/**
 * Sesión de Supabase más la data del usuario. Vive aquí y no en TrackerApp para que
 * las vistas secundarias (vencimientos, fiscal) usen la misma ruta de auth y carga.
 */
export function useTrackerData() {
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState<TrackerDataStatus>("loading");
  const [lots, setLots] = useState<InvestmentLot[]>([]);
  const [snapshots, setSnapshots] = useState<MarketSnapshot[]>([]);
  const [analyses, setAnalyses] = useState<MonthlyAnalysis[]>([]);
  const [taxRecords, setTaxRecords] = useState<TaxDeclarationRecord[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  const loadData = useCallback(async (userId: string) => {
    const data = await loadCloudData(userId);
    setLots(data.lots.map(normalizeLot));
    setSnapshots(data.snapshots);
    setAnalyses(data.analyses);
    setTaxRecords(data.taxRecords);
  }, []);

  useEffect(() => {
    let cancelled = false;

    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          setMessage(readableAuthError(error));
          setStatus("signed-out");
          return;
        }
        setSession(data.session);
        setStatus(data.session ? "ready" : "signed-out");
        if (data.session?.user.id) {
          void loadData(data.session.user.id);
        }
      })
      .catch(() => {
        if (cancelled) return;
        setSession(null);
        setStatus("signed-out");
        setMessage(SUPABASE_CONTACT_ERROR);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setStatus(nextSession ? "ready" : "signed-out");
      if (nextSession?.user.id) {
        void loadData(nextSession.user.id);
      } else {
        setLots([]);
        setSnapshots([]);
        setAnalyses([]);
        setTaxRecords([]);
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [loadData]);

  const userId = session?.user.id;
  const reload = useCallback(async () => {
    if (userId) await loadData(userId);
  }, [loadData, userId]);

  return {
    analyses,
    lots,
    message,
    reload,
    session,
    setMessage,
    snapshots,
    status,
    taxRecords,
    userId,
  };
}
