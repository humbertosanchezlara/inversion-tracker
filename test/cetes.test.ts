import { describe, expect, it } from "vitest";
import { parseCetesDirectoQuote } from "@/external/cetes";

describe("CETES Directo parser", () => {
  it("extracts a percent rate from public table text", () => {
    const quote = parseCetesDirectoQuote("<table><tr><td>BONOS 10 años</td><td>8.88%</td></tr></table>", "BONOS");

    expect(quote?.annualRate).toBeCloseTo(0.0888);
    expect(quote?.instrument).toBe("BONOS");
  });

  it("does not parse WAF blocks as market data", () => {
    const quote = parseCetesDirectoQuote("<h1>Web Application Firewall</h1><p>This transfer is blocked.</p>", "UDIBONOS");

    expect(quote).toBeNull();
  });
});
