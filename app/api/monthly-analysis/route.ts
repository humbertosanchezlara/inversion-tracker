import { NextResponse } from "next/server";
import OpenAI from "openai";
import { randomUUID } from "node:crypto";
import { DEFAULT_ANALYSIS_MODEL } from "@/app/lib/analysis-model";
import type { InstrumentType, InvestmentLot, MarketSnapshot, MonthlyAnalysis, TaxDeclarationRecord } from "@/core/types";

type Body = {
  month: string;
  marketSnapshot: MarketSnapshot;
  portfolio?: {
    lots: InvestmentLot[];
    taxRecords: TaxDeclarationRecord[];
    totalInvested: number;
    currentAmountsByInstrument: Record<InstrumentType, number>;
    currentAllocation: Record<InstrumentType, number>;
    byInstrumentTerm: Array<{
      instrument: InstrumentType;
      termYears: number;
      amount: number;
      allocationPercent: number;
      lotsCount: number;
      weightedAnnualRate: number;
      nextMaturityDate?: string;
    }>;
    upcomingMaturities: Array<{
      instrument: InstrumentType;
      amount: number;
      maturityDate: string;
      annualRate: number;
      termYears: number;
      couponFrequencyMonths?: 6;
    }>;
  };
  currentAllocation?: Record<InstrumentType, number>;
  targetPolicyAllocation?: Record<InstrumentType, number>;
};

const schema = {
  name: "monthly_government_bond_analysis",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: [
      "recommendation",
      "targetAllocation",
      "confidence",
      "rationale",
      "risks",
      "dataUsed",
      "macroSummary",
      "curveSummary",
      "portfolioSummary",
      "actionItems",
      "watchConditions",
      "notFinancialAdvice",
    ],
    properties: {
      recommendation: {
        type: "string",
        enum: ["maintain_60_40", "adjust_mix", "consider_other_gov_instrument"],
      },
      targetAllocation: {
        type: "object",
        additionalProperties: false,
        required: ["BONOS", "UDIBONOS", "CETES", "BONDDIA"],
        properties: {
          BONOS: { type: "number", minimum: 0, maximum: 100 },
          UDIBONOS: { type: "number", minimum: 0, maximum: 100 },
          CETES: { type: "number", minimum: 0, maximum: 100 },
          BONDDIA: { type: "number", minimum: 0, maximum: 100 },
        },
      },
      confidence: { type: "string", enum: ["low", "medium", "high"] },
      rationale: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 5 },
      risks: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 5 },
      dataUsed: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 8 },
      macroSummary: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 6 },
      curveSummary: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 6 },
      portfolioSummary: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 6 },
      actionItems: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 5 },
      watchConditions: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 5 },
      notFinancialAdvice: { type: "boolean", const: true },
    },
  },
} as const;

function hasRequiredData(snapshot: MarketSnapshot) {
  const hasBonos = snapshot.quotes.some((quote) => quote.instrument === "BONOS");
  const hasUdibonos = snapshot.quotes.some((quote) => quote.instrument === "UDIBONOS");
  return hasBonos && hasUdibonos && typeof snapshot.inflationAnnual === "number";
}

export async function POST(request: Request) {
  const body = (await request.json()) as Body;

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "OPENAI_API_KEY no está configurada." }, { status: 400 });
  }

  if (!hasRequiredData(body.marketSnapshot)) {
    return NextResponse.json(
      {
        error:
          "Faltan datos automáticos de BONOS, UDIBONOS o inflación. Refresca fuentes antes de generar análisis.",
      },
      { status: 422 },
    );
  }

  let response;
  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const model = process.env.OPENAI_MODEL || DEFAULT_ANALYSIS_MODEL;
    response = await client.responses.create({
      model,
      reasoning: { effort: "low" },
      input: [
        {
          role: "system",
          content:
            "Eres un analista financiero prudente para una herramienta personal. No eres asesor financiero. Solo puedes considerar instrumentos gubernamentales mexicanos: BONOS, UDIBONOS, CETES y BONDDIA. No inventes datos, no recomiendes instrumentos fuera de ese universo y usa porcentajes que sumen 100.",
        },
        {
          role: "user",
          content: JSON.stringify({
            task:
              "Haz un análisis mensual integral: curva de tasas por plazos, inflación, condiciones macro de México/mundo inferibles de tasas/FX/inflación disponibles, y cartera acumulada. Usa currentAllocation como la asignación real actual. Usa targetPolicyAllocation solo como referencia base 60% UDIBONOS / 40% BONOS. En portfolio, considera lots, byInstrumentTerm y upcomingMaturities; distingue explícitamente BONOS/UDIBONOS por termYears, annualRate y maturityDate para no mezclar compras de 10 años con 30 años. Puedes recomendar un split distinto dentro de BONOS, UDIBONOS, CETES y BONDDIA. Devuelve solo el JSON del schema.",
            month: body.month,
            currentAllocation: body.currentAllocation ?? { BONOS: 0, UDIBONOS: 0, CETES: 0, BONDDIA: 0 },
            targetPolicyAllocation: body.targetPolicyAllocation ?? { BONOS: 40, UDIBONOS: 60, CETES: 0, BONDDIA: 0 },
            marketSnapshot: body.marketSnapshot,
            portfolio: body.portfolio,
          }),
        },
      ],
      text: {
        format: {
          type: "json_schema",
          ...schema,
        },
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido de OpenAI.";
    return NextResponse.json({ error: `OpenAI no pudo generar el análisis: ${message}` }, { status: 502 });
  }

  let parsed: Omit<MonthlyAnalysis, "id" | "month" | "createdAt">;
  try {
    parsed = JSON.parse(response.output_text) as Omit<MonthlyAnalysis, "id" | "month" | "createdAt">;
  } catch {
    return NextResponse.json({ error: "OpenAI devolvió una respuesta no interpretable." }, { status: 502 });
  }
  const total = Object.values(parsed.targetAllocation).reduce((sum, value) => sum + value, 0);

  if (Math.round(total) !== 100) {
    return NextResponse.json({ error: "OpenAI devolvió una asignación que no suma 100%." }, { status: 502 });
  }

  const analysis: MonthlyAnalysis = {
    ...parsed,
    id: randomUUID(),
    month: body.month,
    createdAt: new Date().toISOString(),
    notFinancialAdvice: true,
  };

  return NextResponse.json(analysis);
}
