import fs from "fs";
import path from "path";

const ROOT = process.argv[2] || "raw";

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(p));
    else if (entry.isFile() && entry.name.endsWith(".json")) out.push(p);
  }
  return out;
}

function readJson(p) {
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch {
    console.error(`Bad JSON: ${p}`);
    return null;
  }
}

function getCaptainItem(obj) {
  const items = obj?.lineup?.items;
  if (!Array.isArray(items)) return null;
  return items.find(i => i?.rosterSpot === "CAPTAIN") ?? null;
}

function isQbCaptain(obj) {
  const c = getCaptainItem(obj);
  return c && c.position === "QB";
}

function countCaptainPassCatchers(obj) {
  const items = obj?.lineup?.items;
  const c = getCaptainItem(obj);
  if (!Array.isArray(items) || !c) return 0;
  const team = c.team;
  let n = 0;
  for (const it of items) {
    if (it.rosterSpot === "CAPTAIN") continue;
    if (it.team !== team) continue;
    if (it.position === "WR" || it.position === "TE") n += 1;
  }
  return n;
}

function computeSalaryLeft(obj) {
  const used = obj?.lineup?.salaryUsed;
  if (typeof used === "number") return 50000 - used;
  return null;
}

const files = fs.existsSync(ROOT) ? walk(ROOT) : [];
if (files.length === 0) {
  console.error(`No JSON files found under: ${ROOT}`);
  process.exit(1);
}

const rows = [];

for (const file of files) {
  const obj = readJson(file);
  if (!obj) continue;

  // Your files show BLACK_FRIDAY etc, so we only require lineup + captain QB.
  if (!isQbCaptain(obj)) continue;

  const c = getCaptainItem(obj);

  rows.push({
    season: obj.year ?? null,
    week: obj.week ?? null,
    slateTag: obj.slateTag ?? obj.slateType ?? "",
    slateDate: obj.slateDate ?? "",
    captainName: c.name ?? "",
    captainTeam: c.team ?? "",
    captainSalary: typeof c.salary === "number" ? c.salary : null,
    captainPoints: typeof c.points === "number" ? c.points : null,
    captainOwnershipPercent: typeof c.ownershipPercent === "number" ? c.ownershipPercent : null,
    winnerPoints: obj?.winner?.points ?? obj?.lineup?.totalPoints ?? null,
    salaryUsed: obj?.lineup?.salaryUsed ?? null,
    salaryLeft: computeSalaryLeft(obj),
    captainPassCatchersCount: countCaptainPassCatchers(obj),
    sourceFile: path.basename(file)
  });
}

rows.sort((a, b) => {
  const ay = a.season ?? 0, by = b.season ?? 0;
  const aw = a.week ?? 0, bw = b.week ?? 0;
  if (ay !== by) return ay - by;
  if (aw !== bw) return aw - bw;
  return String(a.slateTag).localeCompare(String(b.slateTag));
});

fs.mkdirSync("data", { recursive: true });
fs.writeFileSync("data/qb_captain_rows.json", JSON.stringify(rows, null, 2));
console.log(`Wrote ${rows.length} rows to data/qb_captain_rows.json`);