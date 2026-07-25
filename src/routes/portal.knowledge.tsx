import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { BookOpen, Search } from "lucide-react";
import { KEYS, readList, type PortalKbArticle } from "@/lib/portal-data";

export const Route = createFileRoute("/portal/knowledge")({
  head: () => ({
    meta: [
      { title: "Knowledge Base — Devionic Portal" },
      { name: "description", content: "Guides, FAQs and how-to articles." },
      { property: "og:title", content: "Knowledge Base — Devionic Portal" },
      { property: "og:description", content: "Guides, FAQs and how-to articles." },
    ],
  }),
  component: PortalKb,
});

function PortalKb() {
  const [articles, setArticles] = useState<PortalKbArticle[]>([]);
  const [q, setQ] = useState("");
  const [active, setActive] = useState<PortalKbArticle | null>(null);

  useEffect(() => {
    setArticles(readList<PortalKbArticle>(KEYS.kb).filter((a) => a.published));
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return articles;
    return articles.filter((a) => (a.title + " " + a.category + " " + a.body).toLowerCase().includes(s));
  }, [articles, q]);

  const categories = useMemo(() => Array.from(new Set(filtered.map((a) => a.category || "General"))), [filtered]);

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Knowledge Base</h2>
          <p className="text-sm text-muted-foreground">Search guides, how-tos and FAQs.</p>
        </div>
        <div className="flex items-center gap-2 w-72 h-9 px-3 rounded-lg border bg-background/70">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search articles…" className="flex-1 bg-transparent text-sm outline-none" />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">
          <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-40" />
          No articles published yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-4">
          <div className="space-y-4">
            {categories.map((cat) => (
              <div key={cat} className="rounded-xl border bg-card overflow-hidden">
                <div className="px-4 py-2.5 bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">{cat}</div>
                <div className="divide-y">
                  {filtered.filter((a) => (a.category || "General") === cat).map((a) => (
                    <button
                      key={a.id}
                      onClick={() => setActive(a)}
                      className={`w-full text-left px-4 py-2.5 text-sm hover:bg-muted/30 ${active?.id === a.id ? "bg-muted/40" : ""}`}
                    >
                      {a.title}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="rounded-xl border bg-card p-6">
            {!active ? (
              <div className="text-sm text-muted-foreground text-center py-16">Select an article to read.</div>
            ) : (
              <article className="prose prose-sm max-w-none">
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{active.category}</div>
                <h3 className="text-xl font-bold mt-1 mb-3">{active.title}</h3>
                <div className="whitespace-pre-wrap text-sm text-foreground/90 leading-relaxed">{active.body}</div>
              </article>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
