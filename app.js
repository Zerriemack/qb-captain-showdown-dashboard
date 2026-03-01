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
  tableBody: document.querySelector("#rowsTable tbody"),

  // Takeaways panel
  tWins: document.getElementById("tWins"),
  tPct2Plus: document.getElementById("tPct2Plus"),
  tModeDepth: document.getElementById("tModeDepth"),
  tMedianOwn: document.getElementById("tMedianOwn"),
  tMedianLeft: document.getElementById("tMedianLeft"),
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

function pct(n, digits = 1) {
  if (!Number.isFinite(n)) return "0.0%";
  return `${n.toFixed(digits)}%`;
}

function median(nums) {
  const xs = nums.filter(Number.isFinite).slice().sort((a, b) => a - b);
  const n = xs.length;
  if (n === 0) return 0;
  const mid = Math.floor(n / 2);
  return n % 2 === 0 ? (xs[mid - 1] + xs[mid]) / 2 : xs[mid];
}

function modeLabelForDepth(n) {
  if (n <= 0) return "0 pass catchers";
  if (n === 1) return "1 pass catcher";
  if (n === 2) return "2 pass catchers";
  return "3+ pass catchers";
}

function modeDepthLabel(rowsIn) {
  const counts = new Map();
  for (const r of rowsIn) {
    const label = modeLabelForDepth(r.captainPassCatchersCount);
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  let bestLabel = "-";
  let bestCount = -1;
  for (const [label, c] of counts.entries()) {
    if (c > bestCount) {
      bestCount = c;
      bestLabel = label;
    }
  }
  return bestLabel;
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

  filtered = rows.filter((r) => {
    if (season !== null && r.season !== season) return false;
    if (team !== null && r.captainTeam !== team) return false;
    if (r.captainOwnershipPercent < minOwn) return false;
    if (r.salaryLeft < minLeft) return false;
    return true;
  });

  renderKPIs();
  renderTakeaways();
  renderCharts();
  renderTable();
}

function renderKPIs() {
  els.kpiCount.textContent = String(filtered.length);

  const pts = avg(filtered.map((r) => r.winnerPoints));
  const own = avg(filtered.map((r) => r.captainOwnershipPercent));
  const left = avg(filtered.map((r) => r.salaryLeft));

  els.kpiPts.textContent = fmt(pts, 2);
  els.kpiOwn.textContent = fmt(own, 2);
  els.kpiLeft.textContent = fmt(left, 0);
}

function renderTakeaways() {
  if (!els.tWins) return;

  const n = filtered.length;
  els.tWins.textContent = String(n);

  if (n === 0) {
    els.tPct2Plus.textContent = "0%";
    els.tModeDepth.textContent = "-";
    els.tMedianOwn.textContent = "0%";
    els.tMedianLeft.textContent = "0";
    return;
  }

  const pct2Plus =
    (filtered.filter((r) => r.captainPassCatchersCount >= 2).length / n) * 100;

  els.tPct2Plus.textContent = pct(pct2Plus, 1);
  els.tModeDepth.textContent = modeDepthLabel(filtered);

  const medOwn = median(filtered.map((r) => r.captainOwnershipPercent));
  const medLeft = median(filtered.map((r) => r.salaryLeft));

  els.tMedianOwn.textContent = pct(medOwn, 1);
  els.tMedianLeft.textContent = fmt(medLeft, 0);
}

function renderCharts() {
  renderOwnershipHist();
  renderSalaryLeftHist();
  renderArchetypes();
}

function renderOwnershipHist() {
  const xs = filtered.map((r) => r.captainOwnershipPercent);
  Plotly.newPlot(
    "chartOwnership",
    [{ type: "histogram", x: xs, nbinsx: 12 }],
    {
      margin: { t: 10, l: 40, r: 10, b: 40 },
      paper_bgcolor: "rgba(0,0,0,0)",
      plot_bgcolor: "rgba(0,0,0,0)",
      font: { color: "#e5e7eb" },
      xaxis: { title: "Captain ownership %" },
      yaxis: { title: "Count" },
    },
    { displayModeBar: false, responsive: true }
  );
}

function renderSalaryLeftHist() {
  const xs = filtered.map((r) => r.salaryLeft);
  Plotly.newPlot(
    "chartSalaryLeft",
    [{ type: "histogram", x: xs, nbinsx: 12 }],
    {
      margin: { t: 10, l: 40, r: 10, b: 40 },
      paper_bgcolor: "rgba(0,0,0,0)",
      plot_bgcolor: "rgba(0,0,0,0)",
      font: { color: "#e5e7eb" },
      xaxis: { title: "Salary left" },
      yaxis: { title: "Count" },
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

  const buckets = uniq(filtered.map((r) => bucketLabel(r.captainPassCatchersCount)));
  const counts = buckets.map(
    (b) => filtered.filter((r) => bucketLabel(r.captainPassCatchersCount) === b).length
  );

  Plotly.newPlot(
    "chartArchetypes",
    [{ type: "bar", x: buckets, y: counts }],
    {
      margin: { t: 10, l: 40, r: 10, b: 70 },
      paper_bgcolor: "rgba(0,0,0,0)",
      plot_bgcolor: "rgba(0,0,0,0)",
      font: { color: "#e5e7eb" },
      xaxis: { title: "Stack depth bucket" },
      yaxis: { title: "Count" },
    },
    { displayModeBar: false, responsive: true }
  );
}

function renderTable() {
  els.tableBody.innerHTML = "";
  const sorted = [...filtered].sort((a, b) => b.winnerPoints - a.winnerPoints);

  for (const r of sorted) {
    const tr = document.createElement("tr");

    const file = r.sourceFile ?? "";
    const fileCell = file
      ? `<a class="file-link" href="./raw/${file}" target="_blank" rel="noopener">${file}</a>`
      : "";

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
      <td>${fileCell}</td>
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

  buildSelect(els.seasonSelect, uniq(rows.map((r) => r.season)), "All seasons");
  buildSelect(els.teamSelect, uniq(rows.map((r) => r.captainTeam)), "All teams");

  wireEvents();
  applyFilters();
}

init();