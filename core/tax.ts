import type { TaxDeclarationRecord, TaxDeclarationSummary } from "./types";

export function summarizeTaxDeclaration(records: TaxDeclarationRecord[], fiscalYear: number): TaxDeclarationSummary {
  const filtered = records.filter((record) => record.fiscalYear === fiscalYear);

  return filtered.reduce<TaxDeclarationSummary>(
    (summary, record) => ({
      fiscalYear,
      nominalInterest: summary.nominalInterest + record.nominalInterest,
      realInterest: summary.realInterest + record.realInterest,
      isrWithheld: summary.isrWithheld + record.isrWithheld,
      records: [...summary.records, record],
    }),
    {
      fiscalYear,
      nominalInterest: 0,
      realInterest: 0,
      isrWithheld: 0,
      records: [],
    },
  );
}
