import type { PositionData, HoldingData, OrderData } from "@/lib/types";

interface Props {
  type: "positions" | "holdings" | "orders";
  data: Record<string, unknown>;
}

function formatNum(v: number, decimals = 2): string {
  return v.toLocaleString("en-IN", { maximumFractionDigits: decimals });
}

function PositionsTable({ items }: { items: PositionData[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border" style={{ borderColor: "var(--card-border)" }}>
      <table className="w-full text-xs">
        <thead>
          <tr style={{ background: "var(--surface)" }}>
            <th className="px-2 py-2 text-left font-medium" style={{ color: "var(--muted)" }}>Symbol</th>
            <th className="px-2 py-2 text-right font-medium" style={{ color: "var(--muted)" }}>Qty</th>
            <th className="px-2 py-2 text-right font-medium" style={{ color: "var(--muted)" }}>Avg</th>
            <th className="px-2 py-2 text-right font-medium" style={{ color: "var(--muted)" }}>LTP</th>
            <th className="px-2 py-2 text-right font-medium" style={{ color: "var(--muted)" }}>P&L</th>
          </tr>
        </thead>
        <tbody>
          {items.map((p, i) => (
            <tr key={i} style={{ borderTop: "1px solid var(--card-border)" }}>
              <td className="px-2 py-1.5" style={{ color: "var(--foreground)" }}>
                {p.symbol}
                <span className="ml-1 text-[10px]" style={{ color: "var(--muted)" }}>{p.product}</span>
              </td>
              <td className="px-2 py-1.5 text-right" style={{ color: "var(--foreground)" }}>{p.quantity}</td>
              <td className="px-2 py-1.5 text-right" style={{ color: "var(--foreground)" }}>₹{formatNum(p.average_price)}</td>
              <td className="px-2 py-1.5 text-right" style={{ color: "var(--foreground)" }}>₹{formatNum(p.ltp)}</td>
              <td className="px-2 py-1.5 text-right" style={{ color: p.pnl >= 0 ? "var(--positive)" : "var(--negative)" }}>
                {p.pnl >= 0 ? "+" : ""}₹{formatNum(p.pnl)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function HoldingsTable({ items }: { items: HoldingData[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border" style={{ borderColor: "var(--card-border)" }}>
      <table className="w-full text-xs">
        <thead>
          <tr style={{ background: "var(--surface)" }}>
            <th className="px-2 py-2 text-left font-medium" style={{ color: "var(--muted)" }}>Symbol</th>
            <th className="px-2 py-2 text-right font-medium" style={{ color: "var(--muted)" }}>Qty</th>
            <th className="px-2 py-2 text-right font-medium" style={{ color: "var(--muted)" }}>Avg</th>
            <th className="px-2 py-2 text-right font-medium" style={{ color: "var(--muted)" }}>LTP</th>
            <th className="px-2 py-2 text-right font-medium" style={{ color: "var(--muted)" }}>P&L</th>
          </tr>
        </thead>
        <tbody>
          {items.map((h, i) => (
            <tr key={i} style={{ borderTop: "1px solid var(--card-border)" }}>
              <td className="px-2 py-1.5" style={{ color: "var(--foreground)" }}>{h.symbol}</td>
              <td className="px-2 py-1.5 text-right" style={{ color: "var(--foreground)" }}>{h.quantity}</td>
              <td className="px-2 py-1.5 text-right" style={{ color: "var(--foreground)" }}>₹{formatNum(h.average_price)}</td>
              <td className="px-2 py-1.5 text-right" style={{ color: "var(--foreground)" }}>₹{formatNum(h.ltp)}</td>
              <td className="px-2 py-1.5 text-right" style={{ color: h.pnl >= 0 ? "var(--positive)" : "var(--negative)" }}>
                {h.pnl >= 0 ? "+" : ""}₹{formatNum(h.pnl)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function OrdersTable({ items }: { items: OrderData[] }) {
  function statusColor(status: string) {
    const s = status.toUpperCase();
    if (s === "COMPLETE") return "var(--positive)";
    if (s === "REJECTED" || s === "CANCELLED") return "var(--negative)";
    return "var(--accent)";
  }

  return (
    <div className="overflow-x-auto rounded-lg border" style={{ borderColor: "var(--card-border)" }}>
      <table className="w-full text-xs">
        <thead>
          <tr style={{ background: "var(--surface)" }}>
            <th className="px-2 py-2 text-left font-medium" style={{ color: "var(--muted)" }}>Symbol</th>
            <th className="px-2 py-2 text-left font-medium" style={{ color: "var(--muted)" }}>Type</th>
            <th className="px-2 py-2 text-right font-medium" style={{ color: "var(--muted)" }}>Qty</th>
            <th className="px-2 py-2 text-right font-medium" style={{ color: "var(--muted)" }}>Price</th>
            <th className="px-2 py-2 text-right font-medium" style={{ color: "var(--muted)" }}>Status</th>
          </tr>
        </thead>
        <tbody>
          {items.map((o, i) => (
            <tr key={i} style={{ borderTop: "1px solid var(--card-border)" }}>
              <td className="px-2 py-1.5" style={{ color: "var(--foreground)" }}>{o.symbol}</td>
              <td className="px-2 py-1.5" style={{ color: o.txn_type === "BUY" ? "var(--positive)" : "var(--negative)" }}>
                {o.txn_type}
              </td>
              <td className="px-2 py-1.5 text-right" style={{ color: "var(--foreground)" }}>{o.quantity}</td>
              <td className="px-2 py-1.5 text-right" style={{ color: "var(--foreground)" }}>₹{formatNum(o.price)}</td>
              <td className="px-2 py-1.5 text-right">
                <span
                  className="inline-block rounded px-1.5 py-0.5 text-[10px] font-medium"
                  style={{ color: statusColor(o.status), background: "var(--surface)" }}
                >
                  {o.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function DataTable({ type, data }: Props) {
  const items = (data as Record<string, unknown>).items as unknown[] || [];
  const title = type === "positions" ? "Open Positions" : type === "holdings" ? "Holdings" : "Today's Orders";

  if (items.length === 0) {
    return (
      <div>
        <p className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>{title}</p>
        <p className="mt-1 text-xs" style={{ color: "var(--muted)" }}>No {type} found.</p>
      </div>
    );
  }

  return (
    <div>
      <p className="mb-2 text-sm font-semibold" style={{ color: "var(--foreground)" }}>{title}</p>
      {type === "positions" && <PositionsTable items={items as PositionData[]} />}
      {type === "holdings" && <HoldingsTable items={items as HoldingData[]} />}
      {type === "orders" && <OrdersTable items={items as OrderData[]} />}
    </div>
  );
}
