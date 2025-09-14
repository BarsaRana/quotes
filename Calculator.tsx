import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import type { CSSProperties, ReactNode, KeyboardEvent as ReactKeyboardEvent } from "react";
import axios from "axios";
import jsPDF from "jspdf";
import { downloadQuotePdf, PdfItem } from "../lib/pdf";

/* ===================== types ===================== */
type Id = string | number;
interface IdName { id: Id; name?: string; label?: string; code?: string; sor_code?: string }
interface Client { id: Id; name: string }
interface Region extends IdName { name: string }
interface Product extends IdName { name: string; code?: string; sor_code?: string }
interface Item { id?: Id; name: string; qty: number; unit_cost: number }
interface TaskBreakdown {
  id: Id;
  name: string;
  qty: number;
  materials: Item[];
  equipment: Item[];
  labour: Item[];
}
interface Breakdown { tasks: TaskBreakdown[] }

/* ========== New nested breakdown for summary ========== */
interface NestedBreakdownProduct {
  product_id: Id;
  name: string;
  sor_code?: string;
  tasks: {
    ref_id: Id;
    name: string;
    qty: number;
    unit_cost: number;
    materials: Item[];
    equipment: Item[];
    labour: Item[];
  }[];
}
interface NestedBreakdown { products: NestedBreakdownProduct[] }

const API_BASE: string = (import.meta as any).env?.VITE_API_BASE || "http://127.0.0.1:8000";

/* ===================== helpers ===================== */
const fmtMoney = (x: number | string | undefined) => {
  const n = Number(x ?? 0);
  if (Number.isNaN(n)) return "—";
  try { return n.toLocaleString(undefined, { style: "currency", currency: "AUD" }); }
  catch { return `$${n.toFixed(2)}`; }
};
const sumItems = (items: Item[]) => items.reduce((acc, it) => acc + Number(it.qty || 0) * Number(it.unit_cost || 0), 0);

/* ===================== API ===================== */
const api = axios.create({ baseURL: API_BASE, timeout: 15000 });
async function getClients(): Promise<Client[]> { const { data } = await api.get("/clients"); return data || []; }
async function getRegions(): Promise<Region[]> { const { data } = await api.get("/regions"); return data || []; }
async function getProducts(regionId: Id): Promise<Product[]> {
  const { data } = await api.get("/products", { params: { region_id: regionId } });
  return (data || []).map((p: any) => ({
    id: p.id,
    name: p.name ?? p.product_name,
    code: p.code ?? undefined,
    sor_code: p.sor_code ?? undefined,
  }));
}
async function getProductBreakdown(args: { productId: Id; regionId: Id }): Promise<Breakdown> {
  const { data } = await api.get("/product_breakdown", { params: { product_id: args.productId, region_id: args.regionId } });
  return data || { tasks: [] };
}
async function postQuote(payload: any): Promise<{ quote_id?: Id, clear_fields?: boolean, message?: string } | null> {
  const { data } = await api.post("/quotes", payload); return data;
}
async function ensureClient(name: string): Promise<Client> {
  const { data } = await api.post("/clients", { name: name.trim() });
  return data;
}

/* ===================== Toast ===================== */
function Toast({ message, onClose }: { message: string, onClose: () => void }) {
  if (!message) return null;
  return (
    <div style={{
      position: "fixed",
      bottom: "40px",
      right: "40px",
      zIndex: 9999,
      background: "#2563eb", color: "#fff", padding: "14px 24px",
      borderRadius: "12px", boxShadow: "0 4px 20px rgba(30,50,160,0.15)",
      fontWeight: 700, fontSize: 15, minWidth: 210, textAlign: "center",
      display: "flex", alignItems: "center", gap: 8,
    }}>
      <span style={{ flex: 1 }}>{message}</span>
      <button
        onClick={onClose}
        style={{
          background: "none", border: "none", color: "#fff", marginLeft: 12,
          fontWeight: 800, fontSize: 18, cursor: "pointer"
        }}
        aria-label="Close"
      >×</button>
    </div>
  );
}

/* ===================== tiny searchable dropdown (inline) ===================== */
type MiniOption = { id: Id; label: string };
function MiniComboBox({
  options,
  value,
  placeholder = "Select…",
  disabled,
  allowCreate = false,
  onCreate,
  onChange,
  style,
}: {
  options: MiniOption[];
  value?: Id | "";
  placeholder?: string;
  disabled?: boolean;
  allowCreate?: boolean;
  onCreate?: (label: string) => Promise<MiniOption> | MiniOption;
  onChange: (id: Id, option?: MiniOption) => void;
  style?: CSSProperties;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [hi, setHi] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const selected = useMemo(() => options.find(o => String(o.id) === String(value)), [options, value]);
  useEffect(() => { if (selected && !open) setQ(selected.label); }, [selected?.label, open]);
  useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onDoc); return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const normalized = q.trim().toLowerCase();
  const filtered = useMemo(
    () => (normalized ? options.filter(o => o.label.toLowerCase().includes(normalized)) : options),
    [options, normalized]
  );
  const showCreate = allowCreate && normalized && !filtered.some(o => o.label.toLowerCase() === normalized);

  const pick = (opt: MiniOption) => { onChange(opt.id, opt); setQ(opt.label); setOpen(false); };
  const createNow = async () => { if (!onCreate) return; const lbl = q.trim(); if (!lbl) return; const created = await onCreate(lbl); pick(created); };

  const onKey = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (!open && (e.key === "ArrowDown" || e.key === "Enter")) { setOpen(true); return; }
    if (!open) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setHi(v => Math.min(v + 1, filtered.length + (showCreate ? 0 : -1))); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setHi(v => Math.max(v - 1, 0)); }
    else if (e.key === "Enter") {
      e.preventDefault();
      if (showCreate && hi === filtered.length) createNow();
      else if (filtered[hi]) pick(filtered[hi]);
    } else if (e.key === "Escape") setOpen(false);
  };

  return (
    <div ref={ref} className="combo" style={{ width: "100%", ...style }}>
      <div className={`combo-input-wrap ${disabled ? "is-disabled" : ""}`} onClick={() => !disabled && setOpen(v => !v)}>
        <input
          className="combo-input"
          placeholder={placeholder}
          value={q}
          disabled={disabled}
          onChange={(e) => { setQ(e.target.value); setOpen(true); setHi(0); }}
          onKeyDown={onKey}
        />
        <button className="combo-arrow" type="button" tabIndex={-1}>▾</button>
      </div>
      {open && (
        <div className="combo-list" role="listbox">
          {filtered.map((o, i) => (
            <div
              key={String(o.id)}
              className={`combo-option ${i === hi ? "is-active" : ""} ${String(o.id) === String(value) ? "is-selected" : ""}`}
              onMouseEnter={() => setHi(i)}
              onMouseDown={(e) => { e.preventDefault(); pick(o); }}
            >
              {o.label}
            </div>
          ))}
          {showCreate && (
            <div
              className={`combo-option create ${hi === filtered.length ? "is-active" : ""}`}
              onMouseEnter={() => setHi(filtered.length)}
              onMouseDown={(e) => { e.preventDefault(); createNow(); }}
            >
              + Create “{q.trim()}”
            </div>
          )}
          {filtered.length === 0 && !showCreate && <div className="combo-empty">No matches</div>}
        </div>
      )}
    </div>
  );
}

/* ========== Helper to group breakdown for summary & POST ========== */
function buildNestedBreakdown(
  selectedProducts: string[],
  products: Product[],
  allTasks: TaskBreakdown[]
): NestedBreakdown {
  let idx = 0;
  const perProduct = selectedProducts.length > 0 ? Math.floor(allTasks.length / selectedProducts.length) : 0;
  return {
    products: selectedProducts.map((pid, i) => {
      const productObj = products.find(p => String(p.id) === String(pid));
      const tasks = allTasks.slice(idx, idx + perProduct);
      idx += perProduct;
      return {
        product_id: Number(pid),
        name: productObj?.name ?? "",
        sor_code: productObj?.sor_code ?? undefined,
        tasks: tasks.map(task => ({
          ref_id: task.id,
          name: task.name,
          qty: task.qty,
          unit_cost: 0,
          materials: (task.materials || []).map(mat => ({
            id: mat.id,
            name: mat.name,
            qty: mat.qty,
            unit_cost: mat.unit_cost,
          })),
          equipment: (task.equipment || []).map(eq => ({
            id: eq.id,
            name: eq.name,
            qty: eq.qty,
            unit_cost: eq.unit_cost,
          })),
          labour: (task.labour || []).map(lab => ({
            id: lab.id,
            name: lab.name,
            qty: lab.qty,
            unit_cost: lab.unit_cost,
          })),
        })),
      };
    }),
  };
}

/* ========== Helper to group breakdown for PDF export ========== */
function buildPdfProducts(
  selectedProducts: string[],
  products: Product[],
  allTasks: TaskBreakdown[]
): NestedBreakdownProduct[] {
  let idx = 0;
  const perProduct = selectedProducts.length > 0 ? Math.floor(allTasks.length / selectedProducts.length) : 0;
  return selectedProducts.map((pid, i) => {
    const productObj = products.find(p => String(p.id) === String(pid));
    const tasks = allTasks.slice(idx, idx + perProduct);
    idx += perProduct;
    return {
      product_id: Number(pid),
      name: productObj?.name ?? "",
      sor_code: productObj?.sor_code ?? undefined,
      tasks: tasks.map(task => ({
        ref_id: task.id,
        name: task.name,
        qty: task.qty,
        unit_cost: 0,
        materials: (task.materials || []).map(mat => ({
          id: mat.id,
          name: mat.name,
          qty: mat.qty,
          unit_cost: mat.unit_cost,
        })),
        equipment: (task.equipment || []).map(eq => ({
          id: eq.id,
          name: eq.name,
          qty: eq.qty,
          unit_cost: eq.unit_cost,
        })),
        labour: (task.labour || []).map(lab => ({
          id: lab.id,
          name: lab.name,
          qty: lab.qty,
          unit_cost: lab.unit_cost,
        })),
      })),
    };
  });
}

/* ========== Grouped Summary Component ========== */
function GroupedQuoteSummary({
  breakdown,
  supportItems,
  totals,
  riskMultiplier,
}: {
  breakdown: NestedBreakdown;
  supportItems: Item[];
  totals: {
    base_cost: number;
    support_cost: number;
    total_before_risk: number;
    total_after_risk: number;
  };
  riskMultiplier: number;
}) {
  return (
    <div>
      {breakdown.products.map(prod => (
        <div key={prod.product_id} style={{ marginBottom: 32 }}>
          <div style={{ fontWeight: 700, fontSize: 17, margin: "16px 0 2px" }}>
            Product & SOR: {prod.name}
            {prod.sor_code && <> [SOR: {prod.sor_code}]</>}
          </div>
          {prod.tasks.map(task => (
            <div key={task.ref_id} style={{ marginBottom: 18, marginLeft: 8 }}>
              <div style={{ fontWeight: 600, margin: "8px 0" }}>
                Task: {task.name}
              </div>
              <ItemTable title="Materials" items={task.materials as Item[]} />
              <ItemTable title="Equipments" items={task.equipment as Item[]} />
              <ItemTable title="Labour" items={task.labour as Item[]} />
            </div>
          ))}
        </div>
      ))}
      <div style={{ fontWeight: 600, margin: "16px 0 0 0" }}>Base cost</div>
      <SummaryRow label="" value={fmtMoney(totals.base_cost)} />
      <ItemTable title="Additional support" items={supportItems} />
      <div style={{ fontWeight: 600 }}>Additional support cost</div>
      <SummaryRow label="" value={fmtMoney(totals.support_cost)} />
      <div style={{ fontWeight: 600 }}>Subtotal (before risk)</div>
      <SummaryRow label="" value={fmtMoney(totals.total_before_risk)} strong />
      <div style={{ fontWeight: 600 }}>Risk multiplier</div>
      <SummaryRow label="" value={`x${riskMultiplier.toFixed(2)}`} />
      <div style={{ fontWeight: 600, fontSize: 18 }}>Total</div>
      <SummaryRow label="" value={fmtMoney(totals.total_after_risk)} strong big />
    </div>
  );
}

/* ===================== page ===================== */
export default function Calculator() {
  const [loading, setLoading] = useState(false);

  // lookups
  const [clients, setClients] = useState<Client[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  // selections
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [regionId, setRegionId] = useState<string>("");
  // Product selector dynamic list
  const [productSelections, setProductSelections] = useState<string[]>([""]);
  // risk (%)
  const [riskPct, setRiskPct] = useState<string>("");
  // calculator state
  const [breakdown, setBreakdown] = useState<Breakdown>({ tasks: [] });
  const [supportItems, setSupportItems] = useState<Item[]>([]);
  const [quoteId, setQuoteId] = useState<Id | null>(null);
  const [error, setError] = useState("");
  const [quoteStatus, setQuoteStatus] = useState<"Final" | "draft" | null>(null);

  // Flattened arrays for summary
  const [flatMaterials, setFlatMaterials] = useState<Item[]>([]);
  const [flatTasks, setFlatTasks] = useState<Item[]>([]);
  const [flatLabour, setFlatLabour] = useState<Item[]>([]);

  // TOAST state for confirmation
  const [toastMsg, setToastMsg] = useState<string>("");
  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3500);
  }, []);

  // Persist toast after reload
  useEffect(() => {
    const toast = localStorage.getItem("quoteToast");
    if (toast) {
      showToast(toast);
      localStorage.removeItem("quoteToast");
    }
  }, [showToast]);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const [c, r] = await Promise.all([getClients().catch(() => []), getRegions().catch(() => [])]);
        setClients(c); setRegions(r);
      } catch (e) {
        console.error(e);
        setError("Failed to load lookups. Check API and CORS.");
      } finally { setLoading(false); }
    })();
  }, []);

  useEffect(() => {
    if (!regionId) { setProducts([]); setProductSelections([""]); return; }
    (async () => {
      try { setLoading(true); setProducts(await getProducts(regionId)); }
      catch (e) { console.error(e); setError("Failed to load products for region."); }
      finally { setLoading(false); }
    })();
  }, [regionId]);

  // Fetch and flatten product breakdown
  useEffect(() => {
    const selected = productSelections.filter(Boolean);
    if (!selected.length || !regionId) {
      setBreakdown({ tasks: [] });
      setFlatMaterials([]);
      setFlatTasks([]);
      setFlatLabour([]);
      return;
    }
    (async () => {
      try {
        setLoading(true);
        let allTasks: TaskBreakdown[] = [];
        for (const pid of selected) {
          const bd = await getProductBreakdown({ productId: pid, regionId });
          allTasks = allTasks.concat(bd.tasks || []);
        }
        setBreakdown({ tasks: allTasks });

        // Flatten
        const mats: Item[] = [];
        const tasksArr: Item[] = [];
        const lab: Item[] = [];
        for (const task of allTasks) {
          (task.materials || []).forEach(mat => mats.push(mat));
          (task.labour || []).forEach(l => lab.push(l));
          tasksArr.push({ id: task.id, name: task.name, qty: task.qty, unit_cost: 0 });
        }
        setFlatMaterials(mats);
        setFlatTasks(tasksArr);
        setFlatLabour(lab);
      } catch (e) {
        console.error(e);
        setError("Failed to load product breakdown.");
      } finally {
        setLoading(false);
      }
    })();
  }, [productSelections, regionId]);

  const riskMultiplier = useMemo(() => {
    const p = Number(riskPct);
    if (!isFinite(p) || isNaN(p)) return 1;
    const clamped = Math.max(0, Math.min(1000, p));
    return 1 + clamped / 100;
  }, [riskPct]);

  const baseCost = useMemo(() => {
    const m = sumItems(flatMaterials);
    const t = sumItems(flatTasks);
    const l = sumItems(flatLabour);
    return m + t + l;
  }, [flatMaterials, flatTasks, flatLabour]);

  const supportCost = useMemo(() => sumItems(supportItems), [supportItems]);
  const totalBeforeRisk = useMemo(() => baseCost + supportCost, [baseCost, supportCost]);
  const totalAfterRisk = useMemo(() => totalBeforeRisk * riskMultiplier, [totalBeforeRisk, riskMultiplier]);

  const addSupport = () => setSupportItems((prev) => ([...prev, { id: crypto.randomUUID(), name: "", qty: 1, unit_cost: 0 }]));
  const updateSupport = (id: Id, field: keyof Item, value: string) =>
    setSupportItems((prev) => prev.map((it) => (it.id === id ? { ...it, [field]: field === "name" ? value : Number(value) } : it)));
  const removeSupport = (id: Id) => setSupportItems((prev) => prev.filter((it) => it.id !== id));

  const chosenClientName = useMemo(
    () => clients.find(c => String(c.id) === selectedClientId)?.name ?? "—",
    [clients, selectedClientId]
  );

  // Handlers for dynamic product selection
  const handleProductChange = (idx: number, newId: string) => {
    setProductSelections(prev => {
      const next = [...prev];
      next[idx] = newId;
      return next;
    });
  };
  const handleRemoveProduct = (idx: number) => {
    setProductSelections(prev => prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev);
  };
  const handleAddProduct = () => setProductSelections(prev => [...prev, ""]);

  // Clear all fields, breakdown, and summary
  const clearAllFields = () => {
    setSelectedClientId("");
    setRegionId("");
    setProductSelections([""]);
    setRiskPct("");
    setBreakdown({ tasks: [] });
    setSupportItems([]);
    setQuoteId(null);
    setQuoteStatus(null);
    setError("");
    setFlatMaterials([]);
    setFlatTasks([]);
    setFlatLabour([]);
  };

  // Save handler: "Final" or "draft"
  const handleSave = async (status: "Final" | "draft") => {
    setError("");
    setQuoteStatus(status);
    const selectedProducts = productSelections.filter(Boolean);
    if (!selectedClientId) { setError("Please pick or create a client."); return; }
    if (!regionId || !selectedProducts.length) { setError("Please select Region and at least one Product/SOR first."); return; }
    try {
      setLoading(true);

      // Build nested breakdown for backend
      const nestedBreakdown = buildNestedBreakdown(
        selectedProducts,
        products,
        breakdown.tasks
      );

      const payload = {
        client_id: Number(selectedClientId),
        region_id: Number(regionId),
        product_ids: selectedProducts.map(Number),
        risk_percent: Number(riskPct),
        risk_multiplier: riskMultiplier,
        breakdown: nestedBreakdown,
        additional_support: supportItems,
        totals: {
          base_cost: baseCost,
          support_cost: supportCost,
          total_before_risk: totalBeforeRisk,
          total_after_risk: totalAfterRisk,
        },
        created_on: new Date().toISOString(),
        status,
      };
      try {
        const saved = await postQuote(payload);
        setQuoteId(saved?.quote_id ?? null);
        if (saved?.clear_fields || saved?.quote_id) {
          showToast(
            status === "draft"
              ? "Draft saved and fields cleared!"
              : (saved?.message || "Quote saved and fields cleared!")
          );
          clearAllFields();
        }
      } catch { setQuoteId(null); }
    } catch (e) {
      console.error(e);
      setError("Save failed. Check console & API.");
    } finally {
      setLoading(false);
    }
  };

  // Helper to get logo as a dataURL for the PDF
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

  const handleDownloadPdf = async () => {
    const logoDataUrl = await getLogoDataUrl();
    const productsForPdf = buildPdfProducts(
      productSelections.filter(Boolean),
      products,
      breakdown.tasks
    );
    await downloadQuotePdf({
      quoteId: quoteId ?? undefined,
      client: chosenClientName,
      region: displayName(regions, regionId),
      products: productsForPdf,
      riskPct: Number(riskPct) || 0,
      riskMultiplier,
      support: supportItems as PdfItem[],
      totals: {
        baseCost, supportCost, subtotal: totalBeforeRisk, total: totalAfterRisk,
      },
      timestamp: new Date().toLocaleString(),
      filename: undefined,
      logo: logoDataUrl,
    });
  };

  return (
    <div style={styles.page}>
      <style>{css}</style>
      <Toast message={toastMsg} onClose={() => setToastMsg("")} />
      <div className="layout" style={styles.content}>
        {/* LEFT */}
        <section>
          <Card title="Form · Rate Card Calculator">
            <Field label="Client">
              <MiniComboBox
                options={clients.map(c => ({ id: c.id, label: c.name }))}
                value={selectedClientId}
                placeholder="Search or create a client…"
                allowCreate
                onCreate={async (label) => {
                  const existing = clients.find(c => c.name.toLowerCase() === label.toLowerCase());
                  const row = existing ?? await ensureClient(label);
                  if (!existing) setClients(prev => [...prev, row].sort((a,b)=>a.name.localeCompare(b.name)));
                  return { id: row.id, label: row.name };
                }}
                onChange={(id) => setSelectedClientId(String(id))}
              />
            </Field>
            <Field label="Region">
              <MiniComboBox
                options={regions.map(r => ({ id: r.id, label: r.name }))}
                value={regionId}
                placeholder="Search or pick a region…"
                onChange={(id) => setRegionId(String(id))}
              />
            </Field>
            <Field label="Products / SoRs">
              <div>
                {productSelections.map((pId, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", marginBottom: 6 }}>
                    <MiniComboBox
                      options={products.map(p => ({
                        id: p.id,
                        label: p.name +
                          (p.code ? ` (${p.code})` : "") +
                          (p.sor_code ? ` [SOR: ${p.sor_code}]` : ""),
                      }))}
                      value={pId}
                      placeholder={regionId ? "Pick a product/SOR…" : "Select a region first…"}
                      disabled={!regionId}
                      onChange={id => handleProductChange(i, String(id))}
                      style={{ flex: 1 }}
                    />
                    {productSelections.length > 1 && (
                      <button
                        onClick={() => handleRemoveProduct(i)}
                        className="btn icon"
                        title="Remove"
                        style={{ marginLeft: 6, padding: 8 }}
                        type="button"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
                <button
                  onClick={handleAddProduct}
                  className="btn secondary"
                  style={{ marginTop: 6 }}
                  type="button"
                >
                  + Add product/SOR
                </button>
                <div className="hint" style={{ marginTop: 4 }}>
                  Select one or more products/SORs
                </div>
              </div>
            </Field>
            <Field label="Risk uplift (%)">
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  type="number"
                  className="input"
                  placeholder="e.g. 10"
                  min={0}
                  step="0.1"
                  value={riskPct}
                  onChange={(e) => setRiskPct(e.target.value)}
                  style={{ width: 160 }}
                />
                <span style={{ opacity: .7 }}>%</span>
                <span style={{ marginLeft: 8, fontSize: 12, opacity: .7 }}>
                  Multiplier: <strong>x{riskMultiplier.toFixed(2)}</strong>
                </span>
              </div>
            </Field>
            <Field label="Additional support">
              <div className="row">
                <button onClick={addSupport} className="btn secondary">+ Add item</button>
                <div className="hint">Each line: name, qty, unit cost.</div>
              </div>
              {supportItems.map((it, i) => (
                <div key={String(it.id)} className="support-row-flex">
                  <input
                    placeholder={`Item #${i + 1} (material/labour)`}
                    value={it.name}
                    onChange={(e) => updateSupport(it.id!, "name", e.target.value)}
                    className="input"
                    style={{ width: "38%" }}
                  />
                  <input
                    type="number"
                    min={0}
                    step="0.5"
                    placeholder="Qty"
                    value={it.qty}
                    onChange={(e) => updateSupport(it.id!, "qty", e.target.value)}
                    className="input"
                    style={{ width: "14%" }}
                  />
                  <div className="input-dollar-wrap" style={{ width: "20%", position: "relative" }}>
                    <span className="input-dollar">$</span>
                    <input
                      type="number"
                      min={0}
                      step="0.5"
                      placeholder="Unit cost"
                      value={it.unit_cost}
                      onChange={(e) => updateSupport(it.id!, "unit_cost", e.target.value)}
                      className="input input-with-dollar"
                      style={{ paddingLeft: 22, width: "100%" }}
                    />
                  </div>
                  <input
                    className="input line-total-input"
                    style={{ width: "18%", color: "#0f172a", fontWeight: 700 }}
                    value={fmtMoney((it.qty || 0) * (it.unit_cost || 0))}
                    readOnly
                    tabIndex={-1}
                  />
                  <button onClick={() => removeSupport(it.id!)} className="btn icon" title="Remove" style={{ marginLeft: 4 }}>✕</button>
                </div>
              ))}
            </Field>
            {error && <div className="alert">{error}</div>}
            <div className="actions actions-center custom-actions">
              <button
                onClick={() => handleSave("Final")}
                disabled={loading}
                className="btn primary"
              >
                {loading && quoteStatus === "Final" ? "Saving…" : "Save"}
              </button>
              <button
                onClick={() => handleSave("draft")}
                disabled={loading}
                className="btn secondary"
              >
                {loading && quoteStatus === "draft" ? "Saving…" : "Draft"}
              </button>
            </div>
          </Card>
        </section>
        <section>
          <Card
            title={
              <span style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between"
              }}>
                <span style={{ marginRight: "auto" }}>
                  <span className="dot" /> Quote Summary
                </span>
                <button
                  onClick={handleDownloadPdf}
                  className="btn ghost"
                  style={{ fontSize: 14 }}
                >
                  Download PDF
                </button>
              </span>
            }
            sticky
          >
            {loading && <SpinnerOverlay />}
            <div className="stats">
              <Stat label="Base" value={fmtMoney(baseCost)} />
              <Stat label="Support" value={fmtMoney(supportCost)} />
              <Stat label="Subtotal" value={fmtMoney(totalBeforeRisk)} />
              <Stat label="Total" value={fmtMoney(totalAfterRisk)} highlight />
            </div>
            <div className="kv">
              <SummaryRow label="Timestamp" value={new Date().toLocaleString()} />
              <SummaryRow label="Client" value={chosenClientName} />
              <SummaryRow label="Region" value={displayName(regions, regionId)} />
              <SummaryRow label="Products / SoRs" value={productSelections.filter(Boolean).map(pid => displayName(products, pid)).join(", ")} />
              <SummaryRow label="Risk (input)" value={`${Number(riskPct) ? Number(riskPct) : 0}% (x${riskMultiplier.toFixed(2)})`} />
            </div>
            <hr className="hr" />
            {/* Grouped summary for products */}
            {buildPdfProducts(productSelections.filter(Boolean), products, breakdown.tasks).map(prod => (
              <div key={prod.product_id}>
                <div style={{ fontWeight: 700, fontSize: 16, margin: "14px 0 2px" }}>
                  Product/SOR: {prod.name}{prod.sor_code ? ` [SOR: ${prod.sor_code}]` : ""}
                </div>
                {prod.tasks.map(task => (
                  <div key={task.ref_id} style={{ marginLeft: 8, marginBottom: 14 }}>
                    <div style={{ fontWeight: 600, margin: "6px 0" }}>
                      Task: {task.name}
                    </div>
                    <ItemTable title="Materials" items={task.materials} />
                    <ItemTable title="Equipment" items={task.equipment} />
                    <ItemTable title="Labour" items={task.labour} />
                  </div>
                ))}
              </div>
            ))}
            <SummaryRow label="Base cost" value={fmtMoney(baseCost)} />
            <hr className="hr" />
            <ItemTable title="Additional support" items={supportItems} />
            <SummaryRow label="Additional support cost" value={fmtMoney(supportCost)} />
            <hr className="hr" />
            <SummaryRow label="Subtotal (before risk)" value={fmtMoney(totalBeforeRisk)} strong />
            <SummaryRow label="Risk multiplier" value={`x${riskMultiplier.toFixed(2)}`} />
            <SummaryRow label="Total" value={fmtMoney(totalAfterRisk)} strong big />
            <details style={{ marginTop: 16 }}>
              <summary>Show formula</summary>
              <code>Total = (Materials + Tasks + Labour + AdditionalSupport) × (1 + Risk%/100)</code>
            </details>
            {quoteId && (<div className="saved-id">Saved as Quote ID: {String(quoteId)}</div>)}
          </Card>
        </section>
      </div>
    </div>
  );
}
/* ===================== small components ===================== */
function Card({ title, children, sticky }: { title: ReactNode; children: ReactNode; sticky?: boolean }) {
  return (
    <div className={`card ${sticky ? "sticky" : ""}`}>
      <div className="card-title">{title}</div>
      <div>{children}</div>
    </div>
  );
}
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="field">
      <label className="field-label">{label}</label>
      {children}
    </div>
  );
}
function ItemTable({ title, items }: { title: string; items: Item[] }) {
  if (!items || items.length === 0) return (
    <div style={{ marginBottom: 10 }}>
      <div className="subtle">{title}</div>
      <div className="empty">No items</div>
    </div>
  );
  return (
    <div style={{ marginBottom: 12 }}>
      <div className="subtle">{title}</div>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th style={{ textAlign: "left" }}>Item</th>
              <th>Qty</th>
              <th>Unit cost</th>
              <th style={{ textAlign: "right" }}>Line total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, idx) => (
              <tr key={it.id ? `item-${it.id}-${idx}` : `row-${idx}`} className={idx % 2 === 0 ? "zebra" : ""}>
                <td>{it.name}</td>
                <td className="td-center">{it.qty}</td>
                <td className="td-center">{fmtMoney(it.unit_cost)}</td>
                <td className="td-right">{fmtMoney(Number(it.qty) * Number(it.unit_cost))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
function SummaryRow({ label, value, strong, big }: { label: string; value: ReactNode; strong?: boolean; big?: boolean }) {
  return (
    <div className="summary-row">
      <div className="summary-key">{label}</div>
      <div className="summary-val" style={{ fontWeight: strong ? 800 : 500, fontSize: big ? 22 : 14 }}>{value}</div>
    </div>
  );
}
function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`stat ${highlight ? "highlight" : ""}`}>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
    </div>
  );
}
function SpinnerOverlay() {
  return (
    <div className="spinner-overlay">
      <div className="spinner" />
    </div>
  );
}

/* ===================== utils ===================== */
function displayName(list: IdName[], id: Id | undefined) {
  const x = list.find((v) => String(v.id) === String(id));
  if (!x) return "—";
  if (x.sor_code) return `${x.name ?? x.label} [SOR: ${x.sor_code}]`;
  return x.name ?? (x as any).label ?? "—";
}

/* ===================== styles ===================== */
const styles: Record<string, CSSProperties> = {
  page: { minHeight: "100vh", background: "#f6f7fb", color: "#0f172a" },
  content: {
    display: "grid",
    gridTemplateColumns: "minmax(360px, 520px) minmax(680px, 1fr)",
    gap: 24, padding: 24,
    width: "min(1720px, 100vw - 48px)",
    marginLeft: "auto", marginRight: "auto",
    alignItems: "start",
  },
};

const css = `
:root{ --card:#fff; --line:#e6e8ee; }
.input { padding: 12px 12px; border-radius: 12px; border: 1px solid #cbd5e1; background: #fff; outline: none; transition: box-shadow .15s, border-color .15s; font-size: 14px; }
.input:focus { border-color: #9ac8ff; box-shadow: 0 0 0 3px rgba(42,123,255,0.15); }
.input-with-dollar { padding-left: 22px !important; }
.input-dollar-wrap { position: relative; }
.input-dollar { position: absolute; left: 8px; top: 50%; transform: translateY(-50%); color: #888; font-size: 15px; pointer-events: none; z-index: 2; }
.line-total-input {
  background: #f6f7fb;
  border: 1px solid #cbd5e1;
  pointer-events: none;
}
.support-row-flex {
  display: flex;
  gap: 10px;
  margin-bottom: 10px;
  align-items: center;
}
.select { appearance: auto; }
.btn { border-radius: 12px; font-weight: 700; cursor: pointer; transition: transform .04s, box-shadow .15s, background .15s; }
.btn:active { transform: translateY(1px); }
.btn.primary, .btn.secondary { padding: 11px 16px; }
.btn.primary { border: 1px solid #2e90fa; background: linear-gradient(180deg,#5cb3ff,#2e90fa); color: #fff; box-shadow: 0 6px 16px rgba(46,144,250,.25); }
.btn.secondary { border: 1px solid #cbd5e1; background: #fff; }
.btn.ghost { border: 1px solid #e2e8f0; background: #fff; }
.btn.icon { border: 1px solid #e2e8f0; background: #fff; padding: 8px 10px; }
.layout { width: min(1720px, 100vw - 48px); margin-left: auto; margin-right: auto; }
.card { background: var(--card); border: 1px solid var(--line); border-radius: 18px; padding: 16px; box-shadow: 0 10px 30px rgba(10,20,60,0.06); width: 100%; }
.card.sticky { position: sticky; top: 120px; }
.card-title { font-weight: 800; margin-bottom: 12px; font-size: 16px; letter-spacing: .2px; display:flex; align-items:center; gap:8px; }
.card-title .dot { width:10px; height:10px; background: linear-gradient(180deg,#5cb3ff,#2e90fa); border-radius:50%; display:inline-block; }
.field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px; }
.field-label { font-size: 12px; text-transform: uppercase; letter-spacing: .4px; color: #475569; }
.row { display:flex; gap:10px; align-items:center; }
.hint { font-size:12px; color:#6b7280 }
.actions { display: flex; gap: 12px; justify-content: flex-start; }
.actions-center { justify-content: center; }
.custom-actions { gap: 50px; }
.summary-row { display: grid; grid-template-columns: 200px 1fr; gap: 8px; align-items: center; margin: 6px 0; }
.summary-key { font-size: 12px; opacity: .7; }
.summary-val { text-align: right; }
.kv { margin-top:8px; }
.hr { border: 0; border-top: 1px solid #e2e8f0; margin: 12px 0; }
.subtle { font-size: 12px; opacity: .7; margin-bottom: 6px; }
.empty { font-size: 12px; opacity:.6; }
.table-wrap { overflow: auto; border: 1px solid #e2e8f0; border-radius: 14px; }
.table { width: 100%; border-collapse: collapse; font-size: 14px; }
.table th, .table td { padding: 10px 12px; }
.table thead th { background: #f3f6ff; font-weight: 700; }
.table tbody tr.zebra { background: #fafcff; }
.td-right { text-align:right } .td-center { text-align:center }
.alert { background: #fff1f2; color: #be123c; border: 1px solid #fecdd3; border-radius: 10px; padding: 10px; margin-bottom: 10px; }
.saved-id { margin-top: 14px; font-size: 12px; opacity: .7 }
.stats { display:grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap:10px; margin-bottom: 8px; }
.stat { background:#fff; border:1px solid #e6eefc; border-radius:12px; padding:10px 12px; box-shadow: 0 4px 12px rgba(46,144,250,.08); }
.stat.highlight { background: linear-gradient(180deg, #f0f9ff, #ffffff); border-color:#cfe6ff }
.stat-label { font-size:12px; color:#6b7280 }
.stat-value { font-weight:800; font-size:16px }
/* ===== MiniComboBox ===== */
.combo { position: relative; }
.combo-input-wrap { display:flex; align-items:center; gap:6px; border:1px solid #cbd5e1; border-radius:12px; padding:0 8px; background:#fff; }
.combo-input-wrap.is-disabled { opacity:.6; cursor:not-allowed; }
.combo-input { flex:1; min-width:0; border:0; outline:none; padding:10px 6px; font-size:14px; background:transparent; }
.combo-arrow { border:0; background:transparent; cursor:pointer; font-size:14px; padding:6px; opacity:.7; }
.combo-list { position:absolute; z-index:20; top: calc(100% + 6px); left:0; right:0; background:#fff; border:1px solid #e2e8f0; border-radius:12px; box-shadow:0 12px 28px rgba(16,24,40,.10); max-height:260px; overflow:auto; }
.combo-option { padding:10px 12px; cursor:pointer; }
.combo-option.is-active { background:#f5faff; }
.combo-option.is-selected { font-weight:700; }
.combo-option.create { color:#0ea5e9; font-weight:600; }
.combo-empty { padding:10px 12px; color:#64748b; }
/* ------- RESPONSIVE ------- */
@media (min-width: 1800px) {
  .layout { width: 1720px; }
  .table th, .table td { padding: 12px 14px; }
}
@media (max-width: 1280px) { .layout { gap: 20px; } }
@media (max-width: 980px) {
  .layout { grid-template-columns: 1fr !important; width: calc(100vw - 32px); padding: 16px; gap: 16px; }
  .card.sticky { position: static; }
  .summary-row { grid-template-columns: 140px 1fr; }
  .stats { grid-template-columns: 1fr 1fr; }
  .actions { flex-direction: column; }
  .actions .btn { width: 100%; }
  .custom-actions { gap: 20px; }
}
@media (max-width: 640px) {
  .support-row-flex { flex-direction: column; gap: 8px; }
}
`;