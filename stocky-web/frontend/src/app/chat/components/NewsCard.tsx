import type { NewsArticle } from "@/lib/types";

export default function NewsCard({ data }: { data: Record<string, unknown> }) {
  const articles = (data.articles as unknown[] || []) as NewsArticle[];
  const headline = (data.headline as string) || "Market News";

  if (articles.length === 0) {
    return (
      <div>
        <p className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>{headline}</p>
        <p className="mt-1 text-xs" style={{ color: "var(--muted)" }}>No news articles found.</p>
      </div>
    );
  }

  return (
    <div>
      <p className="mb-2 text-sm font-semibold" style={{ color: "var(--foreground)" }}>{headline}</p>
      <div className="space-y-1.5">
        {articles.slice(0, 10).map((a, i) => {
          const sentimentIcon = a.sentiment > 0 ? "▲" : a.sentiment < 0 ? "▼" : "●";
          const sentimentColor = a.sentiment > 0 ? "var(--positive)" : a.sentiment < 0 ? "var(--negative)" : "var(--muted)";

          return (
            <div
              key={i}
              className="flex items-start gap-2 rounded-lg border p-2.5"
              style={{ borderColor: "var(--card-border)", background: "var(--surface)" }}
            >
              <span className="mt-0.5 text-xs" style={{ color: sentimentColor }}>
                {sentimentIcon}
              </span>
              <div className="min-w-0 flex-1">
                {a.link ? (
                  <a
                    href={a.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs leading-snug hover:underline"
                    style={{ color: "var(--foreground)" }}
                  >
                    {a.title}
                  </a>
                ) : (
                  <p className="text-xs leading-snug" style={{ color: "var(--foreground)" }}>
                    {a.title}
                  </p>
                )}
                {a.summary && (
                  <p
                    className="mt-0.5 text-[11px] leading-snug line-clamp-1"
                    style={{ color: "var(--muted)" }}
                  >
                    {a.summary}
                  </p>
                )}
                <div className="mt-0.5 flex items-center gap-2">
                  <span className="text-[10px]" style={{ color: "var(--muted)", opacity: 0.7 }}>{a.source}</span>
                  {a.date && (
                    <span className="text-[10px]" style={{ color: "var(--muted)", opacity: 0.7 }}>{a.date}</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* AI-generated summary */}
      {(data.ai_summary as string) && (
        <div
          className="mt-3 rounded-lg border px-3 py-2.5"
          style={{ borderColor: "rgba(201,169,110,0.2)", background: "rgba(201,169,110,0.04)" }}
        >
          <p className="text-[11px] italic leading-snug" style={{ color: "var(--accent)" }}>
            {data.ai_summary as string}
          </p>
        </div>
      )}
    </div>
  );
}
