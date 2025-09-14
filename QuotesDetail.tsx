import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { downloadQuotePdf } from "./lib/pdf";

const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000";
const fmtMoney = (n: number) => n != null ? n.toLocaleString("en-AU", { style: "currency", currency: "AUD" }) : "—";

// Table component for a breakdown section
function BreakdownTable({ title, items }: { title: string; items: any[] }) {
  if (!items || !items.length) return null;
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontWeight: 600, margin: "12px 0 5px" }}>{title}</div>
      <table className="break-table">
        <thead>
          <tr>
            <th>Item</th>
            <th>Qty</th>
            <th>Unit cost</th>
            <th>Line total</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) =>
            <tr key={i}>
              <td>{item.description || item.name}</td>
              <td>{item.qty}</td>
              <td>{fmtMoney(item.unit_cost)}</td>
              <td>{fmtMoney(item.unit_cost * item.qty)}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default function QuotesDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [quote, setQuote] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true); setErr(null);
    fetch(`${API_BASE}/quotes/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error(`Not found`);
        return r.json();
      })
      .then(setQuote)
      .catch((e) => setErr(e.message || String(e)))
      .finally(() => setLoading(false));
  }, [id]);

  async function getLogoDataUrl(): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new window.Image();
      img.crossOrigin = "Anonymous";
      img.src = "/decon-logo.png";
      img.onload = function () {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        ctx!.drawImage(img, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      };
      img.onerror = reject;
    });
  }

  // Prepare PDF data and download using the grouped structure if present
  const handleDownloadPdf = async () => {
    if (!quote) return;
    const logoDataUrl = await getLogoDataUrl();
    let productsForPdf = quote.breakdown.products;
    if (!productsForPdf) {
      // fallback: fake a single product for legacy data
      productsForPdf = [{
        product_id: 1,
        name: quote.product || "—",
        sor_code: quote.sor || undefined,
        tasks: [{
          ref_id: 1,
          name: "All Tasks",
          materials: quote.breakdown.materials || [],
          equipment: [],
          labour: quote.breakdown.labour || [],
        }]
      }];
    }
    await downloadQuotePdf({
      quoteId: quote.id,
      client: quote.client,
      region: quote.region,
      products: productsForPdf,
      riskPct: quote.risk_percent ?? 0,
      riskMultiplier: quote.risk_multiplier ?? 1,
      support: (quote.breakdown.support ?? []).map((item: any) => ({
        name: item.description,
        qty: item.qty,
        unit_cost: item.unit_cost,
      })),
      totals: {
        baseCost: quote.base_cost,
        supportCost: quote.support_cost,
        subtotal: quote.subtotal,
        total: quote.total,
      },
      timestamp: new Date(quote.created_on).toLocaleString(),
      filename: `quote_${quote.id}.pdf`,
      logo: logoDataUrl,
    });
  };

  if (loading) return <div style={{ padding: 44 }}>Loading…</div>;
  if (err) return <div style={{ padding: 44, color: "#be123c" }}>Error: {err}</div>;
  if (!quote) return <div style={{ padding: 44 }}>Not found.</div>;

  const { breakdown = {}, base_cost = 0, support_cost = 0, subtotal = 0, total = 0, risk_multiplier = 1 } = quote;
  const breakdownProducts = breakdown.products;

  return (
    <div style={{ background: "#f6f7fb", minHeight: "100vh", padding: 32 }}>
      <style>{`
        .detail-card { max-width: 1100px; margin: 0 auto; background: #fff; border-radius: 18px; box-shadow: 0 6px 24px rgba(22,22,44,.07); border: 1px solid #e6e8ee; padding: 36px; position: relative;}
        .summary-row { display: flex; gap: 18px; margin-bottom: 20px;}
        .summary-box { flex: 1; border: 2px solid #e5e7eb; border-radius: 12px; padding: 16px 0; text-align: center; background: #f9fafb; font-size: 16px; font-weight: 500;}
        .summary-box:last-child { border-color: #1e293b; color: #1e293b;}
        .section-title { font-weight: 700; margin: 22px 0 6px; font-size: 18px;}
        .break-table { width: 100%; border-collapse: collapse; margin-bottom: 10px;}
        .break-table th { background: #f6f7fb; text-align: left; font-weight: 700; padding: 8px;}
        .break-table td { padding: 7px 8px;}
        .break-table tr:nth-child(even) { background: #fafcff;}
        .totals-table { width: 100%; font-size: 15px; margin-top: 14px;}
        .totals-table td { padding: 7px 8px;}
        .totals-table tr:last-child td { font-size: 18px; font-weight: 700;}
      `}</style>
      <div className="detail-card">
        <button style={{ marginBottom: 16 }} className="btn" onClick={() => {
          const cur = window.location.pathname;
          navigate(-1);
          setTimeout(() => {
            if (window.location.pathname === cur) navigate("/quotes");
          }, 200);
        }}>← Back</button>
        {quote.status === "draft" && (
          <button
            className="btn"
            onClick={() => navigate(`/quotes/${quote.id}/edit`)}
            style={{ marginLeft: 10 }}
          >
            Edit
          </button>
        )}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <div style={{ fontWeight: 700, fontSize: 22 }}>Quote Details</div>
          <button className="btn" style={{ fontWeight: 600 }} onClick={handleDownloadPdf}>Download PDF</button>
        </div>
        <div className="summary-row">
          <div className="summary-box">Base<br /><b>{fmtMoney(base_cost)}</b></div>
          <div className="summary-box">Support<br /><b>{fmtMoney(support_cost)}</b></div>
          <div className="summary-box">Subtotal<br /><b>{fmtMoney(subtotal)}</b></div>
          <div className="summary-box">Total<br /><b>{fmtMoney(total)}</b></div>
        </div>
        <div style={{ marginBottom: 6, color: "#888", fontSize: 14 }}>
          {new Date(quote.created_on).toLocaleString()}<br />
          Client: {quote.client}<br />
          Region: {quote.region}<br />
          Product: {quote.product ?? "—"}<br />
          SoR: {quote.sor ?? "—"}<br />
          Status: {quote.status ?? "—"}<br />
          Risk: {quote.risk_percent ?? 0}% (x{quote.risk_multiplier ?? 1})
        </div>

        {/* --- Nested breakdown (multiple products & tasks) --- */}
        {breakdownProducts && breakdownProducts.length > 0 ? (
          breakdownProducts.map((prod: any, pi: number) => (
            <div key={prod.product_id || pi} style={{ marginBottom: 28 }}>
              <div style={{ fontWeight: 700, fontSize: 17, margin: "18px 0 6px" }}>
                Product/SOR: {prod.name}{prod.sor_code ? ` [SOR: ${prod.sor_code}]` : ""}
              </div>
              {Array.isArray(prod.tasks) && prod.tasks.map((task: any, ti: number) => (
                <div key={task.ref_id || ti} style={{ marginBottom: 20, marginLeft: 8 }}>
                  <div style={{ fontWeight: 600, margin: "8px 0 2px" }}>Task: {task.name}</div>
                  <BreakdownTable title="Materials" items={task.materials} />
                  <BreakdownTable title="Equipment" items={task.equipment} />
                  <BreakdownTable title="Labour" items={task.labour} />
                </div>
              ))}
            </div>
          ))
        ) : (
          // --- Fallback: old flat breakdown for legacy/old quotes ---
          <>
            {breakdown.materials?.length > 0 && <BreakdownTable title="Materials" items={breakdown.materials} />}
            {breakdown.labour?.length > 0 && <BreakdownTable title="Labour" items={breakdown.labour} />}
          </>
        )}

        {/* Support */}
        <BreakdownTable title="Additional support" items={breakdown.support || []} />

        {/* Totals */}
        <div className="section-title">Totals</div>
        <table className="totals-table">
          <tbody>
            <tr>
              <td>Subtotal (before risk)</td>
              <td align="right">{fmtMoney(subtotal)}</td>
            </tr>
            <tr>
              <td>Risk multiplier</td>
              <td align="right">x{quote.risk_multiplier ?? 1}</td>
            </tr>
            <tr>
              <td>Total</td>
              <td align="right">{fmtMoney(total)}</td>
            </tr>
          </tbody>
        </table>
        <div style={{ marginTop: 14, color: "#888", fontSize: 13 }}>
          Quote ID: {quote.id}
        </div>
      </div>
    </div>
  );
}