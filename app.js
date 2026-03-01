const DATA_PATH = "./data/qb_captain_rows.json";

let rows = [];
let filtered = [];

const els = {
  seasonSelect: document.getElementById("seasonSelect"),
  teamSelect: document.getElementById("teamSelect"),
  minOwn: document.getElementById("minOwn"),
  minLeft: document.getElementById("minLeft"),
  resetBtn: document.getElementById("resetBtn"),
  kpiCount: document.getElementById("kpiCount"),
  kpiPts: document.getElementById("kpiPts"),
  kpiOwn: document.getElementById("kpiOwn"),
  kpiLeft: document.getElementById("kpiLeft"),
  tableBody: document.querySelector("#rowsTable tbody")
};

function uniq(arr) {
  return Array.from(new Set(arr)).sort((a, b) => (a > b ? 1 : -1));
}

function avg(nums) {
  if (nums.length === 0) return 0;
  return nums.reduce((s, n) => s + n, 0) / nums.length;
}

function fmt(n, digits = 2) {
  return Number.isFinite(n) ? n.toFixed(digits) : "0.00";
}

function buildSelect(selectEl, values, allLabel) {
  selectEl.innerHTML = "";
  const all = document.createElement("option");
  all.value = "";
  all.textContent = allLabel;
  selectEl.appendChild(all);

  for (const v of values) {
    const opt = document.createElement("option");
    opt.value = String(v);
    opt.textContent = String(v);
    selectEl.appendChild(opt);
  }
}

function applyFilters() {
  const season = els.seasonSelect.value ? Number(els.seasonSelect.value) : null;
  const team = els.teamSelect.value ? els.teamSelect.value : null;
  const minOwn = Number(els.minOwn.value || 0);
  const minLeft = Number(els.minLeft.value || 0);

  filtered = rows.filter(r => {
    if (season !== null && r.season !== season) return false;
    if (team !== null && r.captainTeam !== team) return false;
    if (r.captainOwnershipPercent < minOwn) return false;
    if (r.salaryLeft < minLeft) return false;
    return true;
  });

  renderKPIs();
  renderCharts();
  renderTable();
}

function renderKPIs() {
  els.kpiCount.textContent = String(filtered.length);

  const pts = avg(filtered.map(r => r.winnerPoints));
  const own = avg(filtered.map(r => r.captainOwnershipPercent));
  const left = avg(filtered.map(r => r.salaryLeft));

  els.kpiPts.textContent = fmt(pts, 2);
  els.kpiOwn.textContent = fmt(own, 2);
  els.kpiLeft.textContent = fmt(left, 0);
}

function renderCharts() {
  renderBySeason();
  renderOwnershipHist();
  renderSalaryLeftHist();
  renderArchetypes();
}

function renderBySeason() {
  const seasons = uniq(filtered.map(r => r.season));
  const counts = seasons.map(s => filtered.filter(r => r.season === s).length);

  Plotly.newPlot(
    "chartBySeason",
    [{ type: "bar", x: seasons, y: counts }],
    {
      margin: { t: 10, l: 40, r: 10, b: 40 },
      paper_bgcolor: "rgba(0,0,0,0)",
      plot_bgcolor: "rgba(0,0,0,0)",
      font: { color: "#e5e7eb" },
      xaxis: { title: "Season" },
      yaxis: { title: "Wins" }
    },
    { displayModeBar: false, responsive: true }
  );
}

function renderOwnershipHist() {
  const xs = filtered.map(r => r.captainOwnershipPercent);
  Plotly.newPlot(
    "chartOwnership",
    [{ type: "histogram", x: xs, nbinsx: 12 }],
    {
      margin: { t: 10, l: 40, r: 10, b: 40 },
      paper_bgcolor: "rgba(0,0,0,0)",
      plot_bgcolor: "rgba(0,0,0,0)",
      font: { color: "#e5e7eb" },
      xaxis: { title: "Captain ownership %" },
      yaxis: { title: "Count" }
    },
    { displayModeBar: false, responsive: true }
  );
}

function renderSalaryLeftHist() {
  const xs = filtered.map(r => r.salaryLeft);
  Plotly.newPlot(
    "chartSalaryLeft",
    [{ type: "histogram", x: xs, nbinsx: 12 }],
    {
      margin: { t: 10, l: 40, r: 10, b: 40 },
      paper_bgcolor: "rgba(0,0,0,0)",
      plot_bgcolor: "rgba(0,0,0,0)",
      font: { color: "#e5e7eb" },
      xaxis: { title: "Salary left" },
      yaxis: { title: "Count" }
    },
    { displayModeBar: false, responsive: true }
  );
}

function renderArchetypes() {
  const bucketLabel = (n) => {
    if (n <= 0) return "0 pass catchers";
    if (n === 1) return "1 pass catcher";
    if (n === 2) return "2 pass catchers";
    return "3+ pass catchers";
  };

  const buckets = uniq(filtered.map(r => bucketLabel(r.captainPassCatchersCount)));
  const counts = buckets.map(b => filtered.filter(r => bucketLabel(r.captainPassCatchersCount) === b).length);

  Plotly.newPlot(
    "chartArchetypes",
    [{ type: "bar", x: buckets, y: counts }],
    {
      margin: { t: 10, l: 40, r: 10, b: 70 },
      paper_bgcolor: "rgba(0,0,0,0)",
      plot_bgcolor: "rgba(0,0,0,0)",
      font: { color: "#e5e7eb" },
      xaxis: { title: "Archetype" },
      yaxis: { title: "Count" }
    },
    { displayModeBar: false, responsive: true }
  );
}

function renderTable() {
  els.tableBody.innerHTML = "";
  const sorted = [...filtered].sort((a, b) => (b.winnerPoints - a.winnerPoints));

  for (const r of sorted) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${r.season}</td>
      <td>${r.week}</td>
      <td>${r.slateTag}</td>
      <td>${r.captainName}</td>
      <td>${r.captainTeam}</td>
      <td>${fmt(r.captainOwnershipPercent, 1)}</td>
      <td>${fmt(r.winnerPoints, 2)}</td>
      <td>${fmt(r.salaryLeft, 0)}</td>
      <td>${r.captainPassCatchersCount}</td>
    `;
    els.tableBody.appendChild(tr);
  }
}

function wireEvents() {
  const onChange = () => applyFilters();
  els.seasonSelect.addEventListener("change", onChange);
  els.teamSelect.addEventListener("change", onChange);
  els.minOwn.addEventListener("input", onChange);
  els.minLeft.addEventListener("input", onChange);

  els.resetBtn.addEventListener("click", () => {
    els.seasonSelect.value = "";
    els.teamSelect.value = "";
    els.minOwn.value = 0;
    els.minLeft.value = 0;
    applyFilters();
  });
}

async function init() {
  const res = await fetch(DATA_PATH);
  rows = await res.json();

  buildSelect(els.seasonSelect, uniq(rows.map(r => r.season)), "All seasons");
  buildSelect(els.teamSelect, uniq(rows.map(r => r.captainTeam)), "All teams");

  wireEvents();
  applyFilters();
}

init();