import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000";
const fmtMoney = new Intl.NumberFormat(undefined, { style: "currency", currency: "AUD" });

export type QuoteRow = {
  id: number;
  client: string;
  region: string;
  sor: string | null;
  product: string | null;
  risk?: string | null;
  created_on: string;
  status: string;
  total_amount?: number | null;
};

function normalizeRow(b: any): QuoteRow {
  return {
    id: b.id ?? b.quote_id,
    client: b.client,
    region: b.region ?? "—",
    sor: b.sor ?? null,
    product: b.product ?? null,
    risk: b.risk ?? null,
    created_on: b.created_on ?? b.createdDateTime,
    status: String(b.status ?? "draft").toLowerCase(),
    total_amount: b.total_amount ?? null,
  };
}

function downloadCSV(filename: string, rows: QuoteRow[]) {
  const headers = ["ID","Client Name","Region","SOR","Product","Risk","Created On","Status","Total Cost"];
  const csv = [headers.join(",")]
    .concat(
      rows.map(r => [
        r.id,
        r.client,
        r.region,
        r.sor ?? "",
        r.product ?? "",
        r.risk ?? "",
        new Date(r.created_on).toISOString(),
        r.status === "draft" ? "Draft" : "Sent",
        r.total_amount != null ? String(Number(r.total_amount)) : "",
      ]
      .map(x => typeof x === "string" && /[",\n]/.test(x) ? `"${x.replace(/"/g, '""')}"` : String(x))
      .join(","))
    ).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function StatusBadge({ status }: { status: string }) {
  const display = status === "draft" ? "Draft" : "Sent";
  const bg = status === "draft" ? "#f1f5f9" : "#dcfce7";
  const color = status === "draft" ? "#334155" : "#166534";
  return (
    <span style={{
      background: bg,
      color,
      borderRadius: 10,
      padding: "4px 14px",
      fontSize: 13,
      fontWeight: 600,
      border: "1px solid #e2e8ee",
      display: "inline-block"
    }}>
      {display}
    </span>
  );
}

// Utility: show each value (CSV string or array) as multiple lines
function MultiLineCell({ value }: { value: string | null }) {
  if (!value) return <>—</>;
  return (
    <>
      {value.split(/[,\n]+/).map((s, i) => (
        <div key={i}>{s.trim()}</div>
      ))}
    </>
  );
}

export default function QuotesPage() {
  const navigate = useNavigate();

  // filters
  const [showFilters, setShowFilters] = useState(false);
  const [clientF, setClientF] = useState("");
  const [regionF, setRegionF] = useState("");
  const [productF, setProductF] = useState("");
  const [statusF, setStatusF] = useState<string>("");
  const [fromF, setFromF] = useState<string>("");
  const [toF, setToF] = useState<string>("");
  const [costMin, setCostMin] = useState<string>("");
  const [costMax, setCostMax] = useState<string>("");
  const [q, setQ] = useState("");

  // list state
  const [rows, setRows] = useState<QuoteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // sorting & pagination
  const [sortKey, setSortKey] = useState<keyof QuoteRow>("created_on");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  function buildParams() {
    const u = new URLSearchParams();
    if (clientF.trim()) u.set("client", clientF.trim());
    if (regionF.trim()) u.set("region", regionF.trim());
    if (productF.trim()) u.set("product", productF.trim());
    if (statusF) u.set("status", statusF);
    if (fromF) u.set("created_from", fromF);
    if (toF) u.set("created_to", toF);
    if (q.trim()) u.set("q", q.trim());
    u.set("limit", "500");
    u.set("offset", "0");
    return u.toString();
  }

  useEffect(() => {
    const ac = new AbortController();
    const t = setTimeout(async () => {
      try {
        setLoading(true); setErr(null);
        const params = buildParams();
        const r = await fetch(`${API_BASE}/quotes?${params}`, { signal: ac.signal, headers: { "Content-Type": "application/json" }});
        if (!r.ok) throw new Error(`${r.status} ${r.statusText}: ${await r.text()}`);
        const json = await r.json();
        setRows((json as any[]).map(normalizeRow));
        setPage(1);
      } catch (e: any) {
        if (e?.name !== "AbortError") setErr(e?.message || String(e));
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => { ac.abort(); clearTimeout(t); };
  }, [clientF, regionF, productF, statusF, fromF, toF, q]);

  // Apply cost filters client-side
  const filteredRows = useMemo(() => {
    return rows.filter(row => {
      let pass = true;
      if (costMin && row.total_amount != null) pass = pass && Number(row.total_amount) >= Number(costMin);
      if (costMax && row.total_amount != null) pass = pass && Number(row.total_amount) <= Number(costMax);
      return pass;
    });
  }, [rows, costMin, costMax]);

  const sorted = useMemo(() => {
    const copy = [...filteredRows];
    copy.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      let res = 0;
      if (sortKey === "created_on") {
        res = new Date(av as string).getTime() - new Date(bv as string).getTime();
      } else if (sortKey === "total_amount") {
        res = Number(av ?? 0) - Number(bv ?? 0);
      } else {
        res = String(av ?? "").localeCompare(String(bv ?? ""), undefined, { numeric: true });
      }
      return sortDir === "asc" ? res : -res;
    });
    return copy;
  }, [filteredRows, sortKey, sortDir]);

  const total = sorted.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const paged = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, page, pageSize]);

  function toggleSort(key: keyof QuoteRow) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  }

  return (
    <div style={{
      background: "#f6f7fb",
      minHeight: "100vh",
      padding: "32px 0",
    }}>
      <style>{`
        .quotes-container { max-width: 1200px; margin: 0 auto; }
        .card { background: #fff; border-radius: 20px; box-shadow: 0 8px 32px rgba(14,30,59,.07); border: 1px solid #e6e8ee; }
        .card.padded { padding: 32px; }
        .table-wrap { overflow-x: auto; border-radius: 16px; margin-top: 18px; }
        table { width: 100%; border-collapse: collapse; font-size: 15px; background: #fff; }
        th, td { padding: 15px 14px; }
        th { background: #f3f6ff; font-weight: 700; position: sticky; top: 0; z-index: 2;}
        tbody tr.zebra { background: #fafcff; }
        .status-pill { border-radius: 10px; padding: 4px 12px; font-size: 12px; font-weight: 600; }
        .avatar { width: 34px; height: 34px; border-radius: 50%; background: #e2e8f0; color: #334155; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 18px; }
        .actions { display: flex; gap: 12px; }
        .btn, button { border-radius: 12px; padding: 10px 16px; font-weight: 700; cursor: pointer; border: 1px solid #dbeafe; background: #fff; transition: box-shadow .13s, background .13s; }
        .btn.primary { background: #2563eb; color: #fff; border: none; }
        .btn.secondary { background: #fff; color: #1e293b; }
        .btn:active { box-shadow: 0 2px 8px rgba(0,0,0,.08); }
        .pagination { display: flex; align-items: center; gap: 10px; }
        .filters-panel { margin: 22px 0 0 0; padding: 20px; background: #f9fafc; border-radius: 14px; border: 1px solid #e6e8ee; display: grid; grid-template-columns: repeat(auto-fit,minmax(180px,1fr)); gap: 18px;}
        .filters-panel input, .filters-panel select { padding: 8px 11px; border-radius: 9px; border: 1px solid #dbeafe; font-size: 15px;}
        @media(max-width:900px){.quotes-container{max-width:100vw;padding:0 10px}.card.padded{padding:16px}.filters-panel{grid-template-columns:1fr}}
        th:nth-child(5), th:nth-child(7), th:nth-child(8),
        td:nth-child(5), td:nth-child(7), td:nth-child(8) {
          text-align: center;
        }
      `}</style>
      <div className="quotes-container">
        <div className="card padded" style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 18 }}>
            <input
              style={{ flex: 1, minWidth: 220, borderRadius: 12, border: "1px solid #dbeafe", padding: "11px 16px", fontSize: 16 }}
              placeholder="Search quotes… (client, region, product, risk, etc.)"
              value={q}
              onChange={e => setQ(e.target.value)}
            />
            <div className="actions">
              <button className="btn secondary" onClick={() => setShowFilters(f => !f)}>
                {showFilters ? "Hide Filters" : "Filters"}
              </button>
              <button className="btn primary" onClick={() => (window.location.href = "/calculator")}>+ Create Quote</button>
            </div>
          </div>
          {showFilters && (
            <div className="filters-panel">
              <input placeholder="Client Name" value={clientF} onChange={e => setClientF(e.target.value)} />
              <input placeholder="Region" value={regionF} onChange={e => setRegionF(e.target.value)} />
              <input placeholder="Product" value={productF} onChange={e => setProductF(e.target.value)} />
              <select value={statusF} onChange={e => setStatusF(e.target.value)}>
                <option value="">Status</option>
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
              </select>
              <input type="date" value={fromF} onChange={e => setFromF(e.target.value)} />
              <input type="date" value={toF} onChange={e => setToF(e.target.value)} />
              <input type="number" min={0} placeholder="Min Total Cost" value={costMin} onChange={e => setCostMin(e.target.value)} />
              <input type="number" min={0} placeholder="Max Total Cost" value={costMax} onChange={e => setCostMax(e.target.value)} />
            </div>
          )}
          <div style={{ marginTop: 18, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ color: "#64748b", fontSize: 14 }}>{loading ? "Loading…" : `${total} result${total === 1 ? "" : "s"}`}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button className="btn secondary" onClick={() => downloadCSV("quotes.csv", sorted)}>Export CSV</button>
              <span style={{ fontSize: 13, color: "#64748b" }}>Rows/page</span>
              <select style={{ borderRadius: 7, padding: "4px 9px" }} value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}>
                {[10, 20, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          </div>
        </div>
        <div className="card" style={{ marginBottom: 22 }}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th onClick={() => toggleSort("client")}>Client Name {sortKey === "client" && (sortDir === "asc" ? "▲" : "▼")}</th>
                  <th onClick={() => toggleSort("region")}>Region {sortKey === "region" && (sortDir === "asc" ? "▲" : "▼")}</th>
                  <th>SOR</th>
                  <th onClick={() => toggleSort("product")}>Product {sortKey === "product" && (sortDir === "asc" ? "▲" : "▼")}</th>
                  <th onClick={() => toggleSort("total_amount")}>Total Cost {sortKey === "total_amount" && (sortDir === "asc" ? "▲" : "▼")}</th>
                  <th onClick={() => toggleSort("created_on")}>Date {sortKey === "created_on" && (sortDir === "asc" ? "▲" : "▼")}</th>
                  <th onClick={() => toggleSort("status")}>Status {sortKey === "status" && (sortDir === "asc" ? "▲" : "▼")}</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  [...Array(8)].map((_, i) => (
                    <tr key={i}>
                      <td colSpan={8}><div style={{ height: 20, background: "#f1f5f9", borderRadius: 5 }} /></td>
                    </tr>
                  ))
                )}
                {!loading && !err && paged.length === 0 && (
                  <tr>
                    <td colSpan={8} style={{ textAlign: "center", padding: "32px 0", color: "#64748b", fontSize: 15 }}>No quotes match your filters.</td>
                  </tr>
                )}
                {!loading && !err && paged.map((r, idx) => (
                  <tr key={r.id} className={idx % 2 === 0 ? "zebra" : ""} style={{ transition: "background .13s" }}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div className="avatar">{r.client?.slice(0, 1).toUpperCase() || "?"}</div>
                        <div style={{ fontWeight: 500 }}>{r.client || "—"}</div>
                      </div>
                    </td>
                    <td>{r.region || "—"}</td>
                    <td><MultiLineCell value={r.sor} /></td>
                    <td><MultiLineCell value={r.product} /></td>
                    <td>{r.total_amount != null ? fmtMoney.format(Number(r.total_amount)) : "—"}</td>
                    <td>
                      <div>{new Date(r.created_on).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" })}</div>
                      <div style={{ fontSize: 13, color: "#64748b" }}>{new Date(r.created_on).toLocaleTimeString()}</div>
                    </td>
                    <td>
                      <StatusBadge status={r.status} />
                    </td>
                    <td>
                      <button
                        className="btn secondary"
                        onClick={() => navigate(`/quotes/${r.id}`)}
                      >View</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Pagination footer */}
          <div className="pagination" style={{ padding: "16px", justifyContent: "space-between", alignItems: "center", background: "#f3f6ff", borderTop: "1px solid #e6e8ee" }}>
            <div>Page {page} of {totalPages}</div>
            <div>
              <button className="btn secondary" style={{ marginRight: 4 }} disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>Prev</button>
              <button className="btn secondary" disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>Next</button>
            </div>
          </div>
        </div>
        {err && (
          <div className="card padded" style={{ background: "#fee2e2", color: "#be123c", marginBottom: 14 }}>
            {err}
          </div>
        )}
      </div>
    </div>
  );
}