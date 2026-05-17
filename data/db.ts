"use client";

import Dexie, { type EntityTable } from "dexie";
import type { InvestmentLot, MarketSnapshot, MonthlyAnalysis, TaxDeclarationRecord } from "@/core/types";

export class InvestmentDatabase extends Dexie {
  investmentLots!: EntityTable<InvestmentLot, "id">;
  marketSnapshots!: EntityTable<MarketSnapshot, "id">;
  monthlyAnalyses!: EntityTable<MonthlyAnalysis, "id">;
  taxDeclarationRecords!: EntityTable<TaxDeclarationRecord, "id">;

  constructor() {
    super("retirement_bonds_tracker");
    this.version(1).stores({
      investmentLots: "id, month, date, instrument, createdAt",
      marketSnapshots: "id, fetchedAt, status",
      monthlyAnalyses: "id, month, createdAt, recommendation",
    });
    this.version(2).stores({
      investmentLots: "id, month, date, maturityDate, instrument, createdAt",
      marketSnapshots: "id, fetchedAt, status",
      monthlyAnalyses: "id, month, createdAt, recommendation",
      taxDeclarationRecords: "id, fiscalYear, instrument, updatedAt",
    });
    this.version(3).stores({
      investmentLots: "id, month, date, maturityDate, instrument, createdAt",
      marketSnapshots: "id, fetchedAt, status",
      monthlyAnalyses: "id, month, createdAt, recommendation",
      taxDeclarationRecords: "id, fiscalYear, instrument, updatedAt",
    });
  }
}

export const db = new InvestmentDatabase();
