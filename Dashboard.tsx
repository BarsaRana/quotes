import React, { useEffect, useState } from "react";
import axios from "axios";
import { Line, Bar, Pie, Doughnut } from "react-chartjs-2";
import {
  Chart,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

// Register Chart.js components
Chart.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

const API_BASE = "http://localhost:8000";

// Types
type TimePoint = { bucket: string; quote_count: number; total_amount: number };
type LocationRow = { region_id: number; location: string; quote_count: number; total_amount: number; avg_amount: number };
type TopItem = { item_type: string; description: string; total_qty: number; revenue: number; avg_unit_cost: number };
type ClientRow = { client_id: number; client_name: string; quote_count: number; total_amount: number; avg_amount: number };

// Demo pie data structure for risk & SOR
type RiskRow = { risk_level: string; quote_count: number; total_amount: number };
type SorRow = { sor: string; quote_count: number; total_amount: number };
type CostBreakdown = { material: number; labour: number; risk: number };

// DECON Portal Color Palette
const deconTeal = "#22bfa3";
const deconOrange = "#f8a541";
const deconBlue = "#399ee6";
const deconRed = "#e65e6e";
const deconMint = "#6ecb6e";
const deconDark = "#181818";
const deconCard = "#22272b";
const deconText = "#f4f8fb";

// Chart color arrays
const pieColors = [deconTeal, deconOrange, deconBlue, deconRed, deconMint, "#888"];
const barColors = [deconTeal, deconOrange, deconBlue, deconRed, deconMint];
const lineColors = [deconTeal, deconOrange];

export default function FullDashboard() {
  // State
  const [granularity, setGranularity] = useState<"day" | "month">("month");
  const [days, setDays] = useState(180);
  const [timeData, setTimeData] = useState<TimePoint[]>([]);
  const [locData, setLocData] = useState<LocationRow[]>([]);
  const [topClients, setTopClients] = useState<ClientRow[]>([]);
  const [topItems, setTopItems] = useState<TopItem[]>([]);
  const [prodData, setProdData] = useState<LocationRow[]>([]);
  const [riskData, setRiskData] = useState<RiskRow[]>([]);
  const [sorData, setSorData] = useState<SorRow[]>([]);
  const [costBreakdown, setCostBreakdown] = useState<CostBreakdown>({ material: 0, labour: 0, risk: 0 });
  const [loading, setLoading] = useState(false);

  // Fetch functions
  useEffect(() => {
    setLoading(true);
    axios.get(`${API_BASE}/quotes/report/time?bucket=${granularity}&days=${days}`)
      .then(res => setTimeData(Array.isArray(res.data) ? res.data : []))
      .finally(() => setLoading(false));
    axios.get(`${API_BASE}/quotes/report/location`)
      .then(res => setLocData(Array.isArray(res.data) ? res.data : []));
    axios.get(`${API_BASE}/quotes/report/items?limit=10`)
      .then(res => setTopItems(Array.isArray(res.data) ? res.data : []));
    axios.get(`${API_BASE}/quotes/report/product`)
      .then(res => setProdData(Array.isArray(res.data) ? res.data : []));
    axios.get(`${API_BASE}/quotes/report/client`)
      .then(res => setTopClients(Array.isArray(res.data) ? res.data.slice(0, 5) : [])); // Top 5 clients
    // Simulate/fake data for unavailable endpoints (keep as needed)
    setRiskData([
      { risk_level: "Low", quote_count: 60, total_amount: 79000 },
      { risk_level: "Medium", quote_count: 20, total_amount: 35000 },
      { risk_level: "High", quote_count: 8, total_amount: 14000 },
    ]);
    setSorData([
      { sor: "SAP", quote_count: 42, total_amount: 67000 },
      { sor: "Oracle", quote_count: 30, total_amount: 52000 },
      { sor: "Manual", quote_count: 16, total_amount: 19000 },
    ]);
    setCostBreakdown({ material: 55, labour: 35, risk: 10 });
  }, [granularity, days]);

  // KPI Cards, totals
  const totalQuotes = timeData.reduce((sum, d) => sum + d.quote_count, 0);
  const totalRevenue = timeData.reduce((sum, d) => sum + d.total_amount, 0);

  // Quotes Over Time
  const timeChartData = {
    labels: timeData.map(d => d.bucket),
    datasets: [
      {
        label: "Quote Count",
        data: timeData.map(d => d.quote_count),
        borderColor: lineColors[0],
        backgroundColor: "rgba(34,191,163,0.2)",
        yAxisID: "y",
        fill: false,
        tension: 0.4,
      },
      {
        label: "Total Amount",
        data: timeData.map(d => d.total_amount),
        borderColor: lineColors[1],
        backgroundColor: "rgba(248,165,65,0.2)",
        yAxisID: "y1",
        fill: false,
        tension: 0.4,
      },
    ],
  };

  // Quotes by State (Location)
  const locChartData = {
    labels: locData.map(d => d.location),
    datasets: [{
      label: "Quotes",
      data: locData.map(d => d.quote_count),
      backgroundColor: barColors,
      borderRadius: 5,
    }],
  };

  // Top Clients - uses real client names from API
  const topClientsChart = {
    labels: topClients.map(d => d.client_name),
    datasets: [{
      label: "Total Cost",
      data: topClients.map(d => d.total_amount),
      backgroundColor: barColors,
      borderRadius: 5,
    }],
  };

  // Quotes by Product
  const prodChartData = {
    labels: prodData.map(d => d.location),
    datasets: [{
      label: "Quotes",
      data: prodData.map(d => d.quote_count),
      backgroundColor: barColors,
      borderRadius: 5,
    }],
  };

  // SOR Pie
  const sorPieData = {
    labels: sorData.map(d => d.sor),
    datasets: [{
      data: sorData.map(d => d.quote_count),
      backgroundColor: pieColors,
    }]
  };

  // Risk Pie
  const riskPieData = {
    labels: riskData.map(d => d.risk_level),
    datasets: [{
      data: riskData.map(d => d.quote_count),
      backgroundColor: pieColors,
    }]
  };

  // Cost Breakdown Donut
  const costBreakdownData = {
    labels: ["Material", "Labour", "Risk"],
    datasets: [{
      data: [costBreakdown.material, costBreakdown.labour, costBreakdown.risk],
      backgroundColor: [deconTeal, deconOrange, deconRed],
    }]
  };

  // Top Items by Revenue
  const topItemsChartData = {
    labels: topItems.map(d => d.description),
    datasets: [{
      label: "Revenue",
      data: topItems.map(d => d.revenue),
      backgroundColor: barColors,
      borderRadius: 5,
    }],
  };

  // Card style helper
  const cardStyle = { background: deconCard, borderRadius: 12, padding: 24, color: deconText, boxShadow: "0 2px 8px #0002" };

  return (
    <div style={{ background: deconDark, minHeight: "100vh", padding: 32, color: deconText }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1 style={{ color: deconText }}>Quotes Analytics Dashboard</h1>
        <div>
          <label>
            Granularity:{" "}
            <select value={granularity} onChange={e => setGranularity(e.target.value as "day" | "month")}>
              <option value="day">Daily</option>
              <option value="month">Monthly</option>
            </select>
          </label>
          <label style={{ marginLeft: 16 }}>
            Days:{" "}
            <input
              type="number"
              min={7}
              max={730}
              value={days}
              style={{ width: 80 }}
              onChange={e => setDays(Number(e.target.value))}
            />
          </label>
        </div>
      </div>

      {/* KPI Strip */}
      <div style={{ display: "flex", gap: 24, marginBottom: 32 }}>
        <div style={{ ...cardStyle, flex: 1 }}>
          <div style={{ fontSize: 24, color: deconTeal, fontWeight: "bold" }}>{totalQuotes}</div>
          <div>Total Quotes</div>
        </div>
        <div style={{ ...cardStyle, flex: 1 }}>
          <div style={{ fontSize: 24, color: deconOrange, fontWeight: "bold" }}>${totalRevenue.toLocaleString()}</div>
          <div>Total Revenue</div>
        </div>
        <div style={{ ...cardStyle, flex: 1 }}>
          <div style={{ fontSize: 24, color: deconBlue, fontWeight: "bold" }}>{locData[0]?.location || "-"}</div>
          <div>Top Region</div>
        </div>
      </div>

      {/* Row 1: State Map + Top Clients */}
      <div style={{ display: "flex", gap: 24, marginBottom: 32 }}>
        <div style={{ ...cardStyle, flex: 2 }}>
          <h3>Quotes by State</h3>
          <Bar data={locChartData} options={{ responsive: true, plugins: { legend: { display: false } }, 
            scales: {
              x: { ticks: { color: deconText } },
              y: { ticks: { color: deconText } }
            }
          }} />
        </div>
        <div style={{ ...cardStyle, flex: 1 }}>
          <h3>Top Clients</h3>
          <Bar data={topClientsChart} options={{
            responsive: true, plugins: { legend: { display: false } }, indexAxis: "y",
            scales: {
              x: { ticks: { color: deconText } },
              y: { ticks: { color: deconText } }
            }
          }} />
        </div>
      </div>

      {/* Row 2: Cost Breakdown + Risk Pie + SOR Pie */}
      <div style={{ display: "flex", gap: 24, marginBottom: 32 }}>
        <div style={{ ...cardStyle, flex: 1 }}>
          <h3>Cost Breakdown</h3>
          <Doughnut data={costBreakdownData} options={{
            plugins: { legend: { labels: { color: deconText } } }
          }} />
        </div>
        <div style={{ ...cardStyle, flex: 1 }}>
          <h3>Quotes by Risk Level</h3>
          <Pie data={riskPieData} options={{
            plugins: { legend: { labels: { color: deconText } } }
          }} />
        </div>
        <div style={{ ...cardStyle, flex: 1 }}>
          <h3>SOR Utilization</h3>
          <Pie data={sorPieData} options={{
            plugins: { legend: { labels: { color: deconText } } }
          }} />
        </div>
      </div>

      {/* Row 3: Quotes Over Time + Quotes by Product */}
      <div style={{ display: "flex", gap: 24, marginBottom: 32 }}>
        <div style={{ ...cardStyle, flex: 2 }}>
          <h3>Quotes Over Time</h3>
          <Line data={timeChartData} options={{
            responsive: true,
            plugins: { legend: { position: "top", labels: { color: deconText } }, title: { display: false } },
            scales: {
              x: { ticks: { color: deconText } },
              y: { type: "linear", display: true, position: "left", title: { display: true, text: "Quote Count", color: deconText }, ticks: { color: deconText } },
              y1: { type: "linear", display: true, position: "right", grid: { drawOnChartArea: false }, title: { display: true, text: "Total Amount ($)", color: deconText }, ticks: { color: deconText } }
            }
          }} />
        </div>
        <div style={{ ...cardStyle, flex: 1 }}>
          <h3>Quotes by Product</h3>
          <Bar data={prodChartData} options={{
            responsive: true, plugins: { legend: { display: false } }, indexAxis: "y",
            scales: {
              x: { ticks: { color: deconText } },
              y: { ticks: { color: deconText } }
            }
          }} />
        </div>
      </div>

      {/* Row 4: Top Items by Revenue */}
      <div style={{ ...cardStyle, marginBottom: 32 }}>
        <h3>Top Items by Revenue</h3>
        <Bar data={topItemsChartData} options={{
          responsive: true, plugins: { legend: { display: false } }, indexAxis: "y",
          scales: {
            x: { ticks: { color: deconText } },
            y: { ticks: { color: deconText } }
          }
        }} />
      </div>

      {/* Footer / Strip: Key metrics, conversion funnel, etc. */}
      <div style={{ display: "flex", gap: 24 }}>
        <div style={{ background: deconDark, borderRadius: 12, padding: 24, color: deconText, flex: 1 }}>
          <h4>Conversion Funnel</h4>
          {/* Placeholder: replace with actual funnel chart */}
          <div style={{ fontSize: 18, color: "#888" }}>Quotes → Approved → Converted → Invoiced</div>
        </div>
        <div style={{ background: deconDark, borderRadius: 12, padding: 24, color: deconText, flex: 2 }}>
          <h4>Key Metrics</h4>
          <div style={{ display: "flex", gap: 32 }}>
            <div>
              <div style={{ fontWeight: "bold" }}>{(totalRevenue / (totalQuotes || 1)).toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
              <div>Avg Quote Value</div>
            </div>
            <div>
              <div style={{ fontWeight: "bold" }}>{riskData.find(r => r.risk_level === "High")?.quote_count ?? 0}</div>
              <div>High Risk Quotes</div>
            </div>
            <div>
              <div style={{ fontWeight: "bold" }}>{sorData[0]?.sor || "-"}</div>
              <div>Top SOR</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}