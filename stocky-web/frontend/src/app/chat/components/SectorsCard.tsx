"use client";
import { useState } from "react";
import { Factory } from "lucide-react";
import MarkdownRich from "./MarkdownRich";
import CardWrapper from "./ui/CardWrapper";
import Disclaimer from "./ui/Disclaimer";
import CardActions from "./ui/CardActions";
import TickerLink from "./ui/TickerLink";

interface SectorItem {
  name: string;
  value: number;
  change_1d: number;
  change_1w: number;
  change_1m: number;
  top_stock: string;
}

interface Props {
  data: Record<string, unknown>;
  onSend?: (text: string) => void;
}

const INITIAL_ROWS = 5;

function PctCell({ value }: { value: number }) {
  const isPositive = value >= 0;
  return (
    <span
      className="tabular-nums text-[11px] font-medium"
      style={{ color: isPositive ? "var(--positive)" : "var(--negative)" }}
    >
      {isPositive ? "+" : ""}{value.toFixed(2)}%
    </span>
  );
}

export default function SectorsCard({ data, onSend }: Props) {
  const [showAll, setShowAll] = useState(false);

  const sectors = (data.sectors as SectorItem[]) || [];
  const bestSector = data.best_sector as string | undefined;
  const worstSector = data.worst_sector as string | undefined;

  const visibleSectors = showAll ? sectors : sectors.slice(0, INITIAL_ROWS);

  return (
    <CardWrapper
      icon={<Factory size={16} style={{ color: "var(--accent)" }} />}
      title="Sector Performance"
      badge={
        <span
          className="rounded-full px-2 py-0.5 text-[10px] font-medium"
          style={{ background: "rgba(201,169,110,0.1)", color: "var(--accent)" }}
        >
          {sectors.length} sectors
        </span>
      }
    >
      {/* Best / Worst summary */}
      {(bestSector || worstSector) && (
        <div className="mb-3 flex flex-wrap gap-2">
          {bestSector && (
            <span
              className="rounded-full px-2.5 py-1 text-[10px] font-semibold"
              style={{ background: "rgba(34,197,94,0.1)", color: "var(--positive)" }}
            >
              Best: {bestSector}
            </span>
          )}
          {worstSector && (
            <span
              className="rounded-full px-2.5 py-1 text-[10px] font-semibold"
              style={{ background: "rgba(239,68,68,0.1)", color: "var(--negative)" }}
            >
              Worst: {worstSector}
            </span>
          )}
        </div>
      )}

      {sectors.length > 0 ? (
        <>
          <div
            className="overflow-x-auto rounded-xl"
            style={{ border: "1px solid var(--card-border)" }}
          >
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--card-border)" }}>
                  <th className="px-3 py-2 text-left font-medium" style={{ color: "var(--muted)" }}>Sector</th>
                  <th className="px-3 py-2 text-right font-medium" style={{ color: "var(--muted)" }}>1D</th>
                  <th className="px-3 py-2 text-right font-medium" style={{ color: "var(--muted)" }}>1W</th>
                  <th className="px-3 py-2 text-right font-medium" style={{ color: "var(--muted)" }}>1M</th>
                  <th className="px-3 py-2 text-left font-medium" style={{ color: "var(--muted)" }}>Top Stock</th>
                </tr>
              </thead>
              <tbody>
                {visibleSectors.map((sector, i) => {
                  const isBest = sector.name === bestSector;
                  const isWorst = sector.name === worstSector;
                  return (
                    <tr
                      key={i}
                      style={{
                        borderBottom: i < visibleSectors.length - 1 ? "1px solid var(--card-border)" : undefined,
                        background: isBest
                          ? "rgba(34,197,94,0.04)"
                          : isWorst
                            ? "rgba(239,68,68,0.04)"
                            : i % 2 === 0
                              ? "rgba(255,255,255,0.02)"
                              : "transparent",
                      }}
                    >
                      <td className="px-3 py-2 font-medium" style={{ color: "var(--foreground)" }}>
                        {sector.name}
                      </td>
                      <td className="px-3 py-2 text-right"><PctCell value={sector.change_1d} /></td>
                      <td className="px-3 py-2 text-right"><PctCell value={sector.change_1w} /></td>
                      <td className="px-3 py-2 text-right"><PctCell value={sector.change_1m} /></td>
                      <td className="px-3 py-2">
                        {sector.top_stock ? (
                          <TickerLink symbol={sector.top_stock} onSend={onSend} />
                        ) : (
                          <span style={{ color: "var(--muted)" }}>—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {sectors.length > INITIAL_ROWS && (
            <button
              onClick={() => setShowAll((v) => !v)}
              className="mt-2 text-xs underline-offset-2 hover:underline"
              style={{ color: "var(--muted)" }}
            >
              {showAll ? "Show less ↑" : `Show ${sectors.length - INITIAL_ROWS} more ↓`}
            </button>
          )}
        </>
      ) : (
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          No sector data available.
        </p>
      )}

      {/* Stocky's Take */}
      {(data.ai_analysis as string) && (
        <div
          className="rounded-xl border-l-2 px-4 py-3 mt-3"
          style={{
            borderColor: "var(--accent)",
            background: "linear-gradient(135deg, rgba(201,169,110,0.04) 0%, var(--surface) 100%)",
          }}
        >
          <p className="text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--accent)" }}>
            Stocky&apos;s Take
          </p>
          <div className="text-sm leading-relaxed" style={{ color: "var(--foreground)" }}>
            <MarkdownRich text={data.ai_analysis as string} />
          </div>
        </div>
      )}

      <Disclaimer />
      <CardActions cardType="sectors" cardData={data} />
    </CardWrapper>
  );
}
