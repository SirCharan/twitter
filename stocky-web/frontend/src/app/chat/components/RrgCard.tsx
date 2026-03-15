"use client";
import MarkdownRich from "./MarkdownRich";

interface TailPoint {
  rs_ratio: number;
  rs_momentum: number;
}

interface SectorData {
  name: string;
  rs_ratio: number;
  rs_momentum: number;
  quadrant: string;
  color: string;
  recommendation: string;
  tail: TailPoint[];
}

interface Props {
  data: Record<string, unknown>;
}

const QUADRANT_COLORS: Record<string, string> = {
  green: "#22c55e",
  yellow: "#eab308",
  red: "#ef4444",
  blue: "#3b82f6",
};

const QUADRANT_LABELS = [
  { label: "Improving", x: 0.25, y: 0.25 },
  { label: "Leading", x: 0.75, y: 0.25 },
  { label: "Lagging", x: 0.25, y: 0.75 },
  { label: "Weakening", x: 0.75, y: 0.75 },
];

const QUADRANT_LABEL_COLORS: Record<string, string> = {
  Leading: "#22c55e",
  Weakening: "#eab308",
  Lagging: "#ef4444",
  Improving: "#3b82f6",
};

const REC_COLORS: Record<string, string> = {
  Buy: "#4ade80",
  Hold: "#C9A96E",
  Sell: "#f87171",
  Watch: "#3b82f6",
};

export default function RrgCard({ data }: Props) {
  const sectors = (data.sectors as SectorData[]) || [];
  const benchmark = (data.benchmark as string) || "Nifty 50";
  const asOf = data.as_of as string;
  const error = data.error as string | undefined;

  if (error || !sectors.length) {
    return (
      <div
        className="rounded-2xl border px-3 py-3 sm:px-5 sm:py-4"
        style={{ borderColor: "var(--card-border)", background: "var(--surface)" }}
      >
        <div className="mb-2 flex items-center gap-2">
          <span style={{ fontSize: 15 }}>🔄</span>
          <span className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
            Relative Rotation Graph
          </span>
        </div>
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          {error || "No RRG data available. Markets may be closed."}
        </p>
      </div>
    );
  }

  // Compute SVG bounds — center at 100 with symmetric range
  const allPoints = sectors.flatMap((s) => s.tail);
  const allRatios = allPoints.map((p) => p.rs_ratio);
  const allMomentums = allPoints.map((p) => p.rs_momentum);

  const maxDeviation =
    Math.max(
      Math.abs(Math.min(...allRatios) - 100),
      Math.abs(Math.max(...allRatios) - 100),
      Math.abs(Math.min(...allMomentums) - 100),
      Math.abs(Math.max(...allMomentums) - 100),
      2,
    ) * 1.3;

  const minVal = 100 - maxDeviation;
  const maxVal = 100 + maxDeviation;

  const W = 400;
  const H = 400;
  const PAD = 40;

  function mapX(ratio: number) {
    return PAD + ((ratio - minVal) / (maxVal - minVal)) * (W - 2 * PAD);
  }
  function mapY(momentum: number) {
    return PAD + ((maxVal - momentum) / (maxVal - minVal)) * (H - 2 * PAD);
  }

  return (
    <div
      className="rounded-2xl border px-3 py-3 sm:px-5 sm:py-4"
      style={{ borderColor: "var(--card-border)", background: "var(--surface)" }}
    >
      {/* Header */}
      <div className="mb-4 flex items-center gap-2">
        <span style={{ fontSize: 15 }}>🔄</span>
        <span className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
          Relative Rotation Graph
        </span>
        <div
          className="ml-auto rounded-full px-2 py-0.5 text-[10px] font-medium"
          style={{ background: "rgba(201,169,110,0.1)", color: "var(--accent)" }}
        >
          vs {benchmark}
        </div>
      </div>

      {/* SVG Chart */}
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full"
          style={{ maxWidth: 500, margin: "0 auto", display: "block" }}
        >
          {/* Quadrant backgrounds */}
          <rect x={mapX(100)} y={PAD} width={mapX(maxVal) - mapX(100)} height={mapY(100) - PAD} fill="rgba(34,197,94,0.06)" />
          <rect x={PAD} y={PAD} width={mapX(100) - PAD} height={mapY(100) - PAD} fill="rgba(59,130,246,0.06)" />
          <rect x={PAD} y={mapY(100)} width={mapX(100) - PAD} height={H - PAD - mapY(100)} fill="rgba(239,68,68,0.06)" />
          <rect x={mapX(100)} y={mapY(100)} width={mapX(maxVal) - mapX(100)} height={H - PAD - mapY(100)} fill="rgba(234,179,8,0.06)" />

          {/* Crosshairs at 100,100 */}
          <line x1={mapX(100)} y1={PAD} x2={mapX(100)} y2={H - PAD} stroke="rgba(255,255,255,0.15)" strokeWidth="1" strokeDasharray="4,4" />
          <line x1={PAD} y1={mapY(100)} x2={W - PAD} y2={mapY(100)} stroke="rgba(255,255,255,0.15)" strokeWidth="1" strokeDasharray="4,4" />

          {/* Quadrant labels */}
          {QUADRANT_LABELS.map((q) => (
            <text
              key={q.label}
              x={PAD + q.x * (W - 2 * PAD)}
              y={PAD + q.y * (H - 2 * PAD)}
              textAnchor="middle"
              fontSize="10"
              fill={QUADRANT_LABEL_COLORS[q.label]}
              opacity={0.4}
            >
              {q.label}
            </text>
          ))}

          {/* Axis labels */}
          <text x={W / 2} y={H - 5} textAnchor="middle" fontSize="9" fill="rgba(255,255,255,0.4)">
            RS-Ratio →
          </text>
          <text
            x={10}
            y={H / 2}
            textAnchor="middle"
            fontSize="9"
            fill="rgba(255,255,255,0.4)"
            transform={`rotate(-90, 10, ${H / 2})`}
          >
            RS-Momentum →
          </text>

          {/* Sector tails + dots */}
          {sectors.map((sector) => {
            const color = QUADRANT_COLORS[sector.color] || "#888";
            const tail = sector.tail;
            const points = tail.map((p) => `${mapX(p.rs_ratio)},${mapY(p.rs_momentum)}`).join(" ");
            const last = tail[tail.length - 1];
            return (
              <g key={sector.name}>
                {tail.length > 1 && (
                  <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" opacity={0.6} />
                )}
                <circle cx={mapX(last.rs_ratio)} cy={mapY(last.rs_momentum)} r="5" fill={color} />
                <text
                  x={mapX(last.rs_ratio) + 8}
                  y={mapY(last.rs_momentum) + 3}
                  fontSize="8"
                  fill="rgba(255,255,255,0.7)"
                >
                  {sector.name.replace("Nifty ", "")}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Sector Table */}
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr style={{ color: "var(--muted)" }}>
              <th className="pb-2 text-left font-medium">Sector</th>
              <th className="pb-2 text-center font-medium">Quadrant</th>
              <th className="pb-2 text-right font-medium">RS-Ratio</th>
              <th className="pb-2 text-right font-medium">RS-Mom</th>
              <th className="pb-2 text-right font-medium">Call</th>
            </tr>
          </thead>
          <tbody>
            {sectors.map((s) => (
              <tr
                key={s.name}
                className="border-t"
                style={{ borderColor: "rgba(255,255,255,0.04)" }}
              >
                <td className="py-2 font-medium" style={{ color: "var(--foreground)" }}>
                  {s.name}
                </td>
                <td className="py-2 text-center">
                  <span
                    className="inline-block rounded-full px-2 py-0.5 text-[10px] font-medium"
                    style={{
                      background: `${QUADRANT_COLORS[s.color]}15`,
                      color: QUADRANT_COLORS[s.color],
                    }}
                  >
                    {s.quadrant}
                  </span>
                </td>
                <td className="py-2 text-right tabular-nums" style={{ color: "var(--foreground)" }}>
                  {s.rs_ratio.toFixed(2)}
                </td>
                <td className="py-2 text-right tabular-nums" style={{ color: "var(--foreground)" }}>
                  {s.rs_momentum.toFixed(2)}
                </td>
                <td className="py-2 text-right font-medium" style={{ color: REC_COLORS[s.recommendation] }}>
                  {s.recommendation}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Stocky's Rotation Read */}
      {(data.ai_analysis as string) && (
        <div
          className="rounded-xl border-l-2 px-4 py-3 mt-3"
          style={{
            borderColor: "var(--accent)",
            background: "linear-gradient(135deg, rgba(201,169,110,0.04) 0%, var(--surface) 100%)",
          }}
        >
          <p className="text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--accent)" }}>
            Stocky&apos;s Rotation Read
          </p>
          <div className="text-sm leading-relaxed" style={{ color: "var(--foreground)" }}>
            <MarkdownRich text={data.ai_analysis as string} />
          </div>
        </div>
      )}

      {/* Footer */}
      {asOf && (
        <p className="mt-3 text-[10px]" style={{ color: "var(--muted)" }}>
          As of {asOf} | Benchmark: {benchmark}
        </p>
      )}
    </div>
  );
}
