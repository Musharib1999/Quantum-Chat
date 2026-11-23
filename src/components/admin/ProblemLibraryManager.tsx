"use client";

import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";

interface AdminLibraryRow {
  slug: string;
  title: string;
  industry: string;
  problemType: string;
  description: string;
  sizeTier: "small" | "medium" | "large";
  estimatedBinaryVars: number;
  objectiveSense: "Minimize" | "Maximize";
  source: { name: string; url: string | null; license: string };
  version: number;
  contentHash: string;
  status: string;
  prompt: string;
  data: any;
  bestKnown: { value: number; kind: "proven_optimal" | "published_optimal"; method: string };
  benchmark: {
    verdict: "competitive" | "classical_wins" | "exceeds_qubo_limit";
    quboVars: number;
    quboGapPct: number | null;
    quboFeasRuns: number;
    quboTotalRuns: number;
    classicalBest: number | null;
    classicalTimeMs: number | null;
    runAt: string;
  } | null;
}

const SAMPLE_IMPORT_JSON = JSON.stringify(
  [
    {
      slug: "logistics-custom-dock-4x4",
      title: "Loading Dock Assignment (4x4)",
      industry: "Logistics",
      problemType: "Assignment",
      description: "Assign 4 inbound trucks to 4 loading docks at minimum handling time.",
      objectiveSense: "Minimize",
      estimatedBinaryVars: 16,
      prompt:
        "Assign 4 trucks to 4 loading docks one-to-one. Handling cost matrix: truck 0: [9, 2, 7, 8]; truck 1: [6, 4, 3, 7]; truck 2: [5, 8, 1, 8]; truck 3: [7, 6, 9, 4]. Minimize total cost.",
      bestKnown: {
        value: 13,
        kind: "proven_optimal",
        method: "Exact optimality verified by OR-Tools CP-SAT",
      },
      source: {
        name: "Internal benchmark",
        url: null,
        license: "CC0",
      },
    },
  ],
  null,
  2
);

function parseCsvToProblems(csvText: string): any[] {
  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];

  const splitRow = (line: string): string[] => {
    const out: string[] = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === "," && !inQuotes) {
        out.push(cur.trim());
        cur = "";
      } else {
        cur += ch;
      }
    }
    out.push(cur.trim());
    return out;
  };

  const headers = splitRow(lines[0]).map((h) => h.toLowerCase());
  const rows: any[] = [];
  for (let i = 1; i < lines.length; i++) {
    const vals = splitRow(lines[i]);
    const rec: Record<string, string> = {};
    headers.forEach((h, idx) => {
      rec[h] = vals[idx] ?? "";
    });
    rows.push({
      slug: rec.slug || undefined,
      title: rec.title || "",
      industry: rec.industry || "",
      problemType: rec.problemtype || rec.problem_type || "Combinatorial",
      description: rec.description || "",
      objectiveSense: rec.objectivesense || rec.objective_sense || "Minimize",
      estimatedBinaryVars: Number(rec.estimatedbinaryvars || rec.vars || 16),
      prompt: rec.prompt || "",
      bestKnown: {
        value: Number(rec.bestknownvalue || rec.best_known || rec.bestknown),
        kind: rec.bestknownkind === "published_optimal" ? "published_optimal" : "proven_optimal",
        method: rec.bestknownmethod || "Imported reference value",
      },
      source: {
        name: rec.sourcename || rec.source || "CSV Import",
        url: rec.sourceurl || null,
        license: rec.license || "Specified by admin",
      },
    });
  }
  return rows;
}

export default function ProblemLibraryManager() {
  const [rows, setRows] = useState<AdminLibraryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [industryFilter, setIndustryFilter] = useState("All");

  // Modals
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState("");
  const [importResult, setImportResult] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    slug: "",
    title: "",
    industry: "Logistics",
    problemType: "Assignment",
    description: "",
    objectiveSense: "Minimize" as "Minimize" | "Maximize",
    estimatedBinaryVars: 16,
    prompt: "",
    bestKnownValue: "",
    bestKnownKind: "proven_optimal" as "proven_optimal" | "published_optimal",
    bestKnownMethod: "Verified via OR-Tools CP-SAT",
    sourceName: "Admin curated",
    sourceLicense: "Original / CC0",
  });

  const fetchLibrary = async () => {
    setLoading(true);
    try {
      const res = await axios.get("/api/admin/library");
      if (res.data?.success && Array.isArray(res.data.problems)) {
        setRows(res.data.problems);
      }
    } catch (err) {
      console.error("Failed to fetch admin problem library", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLibrary();
  }, []);

  const industries = useMemo(
    () => ["All", ...Array.from(new Set(rows.map((r) => r.industry))).sort()],
    [rows]
  );

  const filtered = useMemo(
    () =>
      rows.filter((r) => {
        const matchInd = industryFilter === "All" || r.industry === industryFilter;
        const q = searchTerm.trim().toLowerCase();
        const matchQ =
          !q ||
          r.title.toLowerCase().includes(q) ||
          r.slug.toLowerCase().includes(q) ||
          r.problemType.toLowerCase().includes(q) ||
          r.industry.toLowerCase().includes(q);
        return matchInd && matchQ;
      }),
    [rows, industryFilter, searchTerm]
  );

  const stats = useMemo(() => {
    let benchmarked = 0;
    let competitive = 0;
    let classicalWins = 0;
    let exceeds = 0;
    for (const r of rows) {
      if (!r.benchmark) continue;
      benchmarked++;
      if (r.benchmark.verdict === "competitive") competitive++;
      else if (r.benchmark.verdict === "exceeds_qubo_limit") exceeds++;
      else classicalWins++;
    }
    return {
      total: rows.length,
      industries: Math.max(0, industries.length - 1),
      benchmarked,
      competitive,
      classicalWins,
      exceeds,
    };
  }, [rows, industries]);

  const openCreateModal = () => {
    setEditForm({
      slug: "",
      title: "",
      industry: "Logistics",
      problemType: "Assignment",
      description: "",
      objectiveSense: "Minimize",
      estimatedBinaryVars: 16,
      prompt: "",
      bestKnownValue: "",
      bestKnownKind: "proven_optimal",
      bestKnownMethod: "Exact optimality verified by OR-Tools CP-SAT",
      sourceName: "Admin curated",
      sourceLicense: "Original / CC0",
    });
    setShowEditModal(true);
  };

  const openEditModal = (r: AdminLibraryRow) => {
    setEditForm({
      slug: r.slug,
      title: r.title,
      industry: r.industry,
      problemType: r.problemType,
      description: r.description,
      objectiveSense: r.objectiveSense,
      estimatedBinaryVars: r.estimatedBinaryVars,
      prompt: r.prompt,
      bestKnownValue: String(r.bestKnown.value),
      bestKnownKind: r.bestKnown.kind,
      bestKnownMethod: r.bestKnown.method,
      sourceName: r.source.name,
      sourceLicense: r.source.license,
    });
    setShowEditModal(true);
  };

  const handleSaveSingle = async () => {
    setBusy(true);
    try {
      const payload = {
        slug: editForm.slug || undefined,
        title: editForm.title,
        industry: editForm.industry,
        problemType: editForm.problemType,
        description: editForm.description,
        objectiveSense: editForm.objectiveSense,
        estimatedBinaryVars: Number(editForm.estimatedBinaryVars) || 16,
        prompt: editForm.prompt,
        bestKnown: {
          value: Number(editForm.bestKnownValue),
          kind: editForm.bestKnownKind,
          method: editForm.bestKnownMethod,
        },
        source: {
          name: editForm.sourceName,
          url: null,
          license: editForm.sourceLicense,
        },
      };
      const res = await axios.post("/api/admin/library", { problem: payload });
      if (res.data?.errors?.length > 0) {
        alert(res.data.errors[0].error);
      } else {
        setShowEditModal(false);
        await fetchLibrary();
      }
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to save problem");
    } finally {
      setBusy(false);
    }
  };

  const handleBulkImport = async () => {
    setImportError(null);
    setImportResult(null);
    const trimmed = importText.trim();
    if (!trimmed) {
      setImportError("Paste a JSON array or CSV rows first.");
      return;
    }

    let parsed: any[] = [];
    try {
      if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
        const obj = JSON.parse(trimmed);
        parsed = Array.isArray(obj) ? obj : Array.isArray(obj.problems) ? obj.problems : [obj];
      } else {
        parsed = parseCsvToProblems(trimmed);
      }
    } catch (e: any) {
      setImportError(`Parse error: ${e.message}`);
      return;
    }

    if (parsed.length === 0) {
      setImportError("No valid rows detected.");
      return;
    }

    setBusy(true);
    try {
      const res = await axios.post("/api/admin/library", { problems: parsed });
      const s = res.data.summary;
      setImportResult(
        `Imported ${s.total} item(s): ${s.created} created, ${s.updated} version-bumped, ${s.unchanged} unchanged, ${s.failed} failed.`
      );
      if (res.data.errors?.length > 0) {
        setImportError(res.data.errors.map((e: any) => `Row ${e.index + 1}: ${e.error}`).join(" | "));
      }
      await fetchLibrary();
    } catch (err: any) {
      setImportError(err.response?.data?.error || "Import failed");
    } finally {
      setBusy(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setImportText(String(reader.result || ""));
      setImportError(null);
      setImportResult(null);
    };
    reader.readAsText(file);
  };

  const handleDelete = async (slug: string) => {
    if (!confirm(`Delete library problem "${slug}" and all its versions/benchmarks?`)) return;
    try {
      await axios.delete(`/api/admin/library?slug=${encodeURIComponent(slug)}`);
      setRows((prev) => prev.filter((r) => r.slug !== slug));
    } catch (err) {
      alert("Failed to delete problem");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-semibold text-[#0F172A]">Industry Problem Library</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage immutable versioned benchmarks across industries. Editing content automatically creates a new version.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              setImportText("");
              setImportError(null);
              setImportResult(null);
              setShowImportModal(true);
            }}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold border border-[rgb(27,176,206)]/40 text-[#0F172A] hover:bg-slate-50 transition-all cursor-pointer"
          >
            Import JSON / CSV
          </button>
          <button
            onClick={openCreateModal}
            className="bg-[rgb(48,102,187)] hover:bg-[#255299] text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm cursor-pointer"
          >
            Add problem
          </button>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-white rounded-xl border border-[rgb(27,176,206)]/30 p-4">
          <div className="text-[10px] font-bold uppercase text-slate-500">Total Problems</div>
          <div className="text-2xl font-bold text-[#0F172A] mt-1">{stats.total}</div>
        </div>
        <div className="bg-white rounded-xl border border-[rgb(27,176,206)]/30 p-4">
          <div className="text-[10px] font-bold uppercase text-slate-500">Industries</div>
          <div className="text-2xl font-bold text-[#0F172A] mt-1">{stats.industries}</div>
        </div>
        <div className="bg-white rounded-xl border border-[rgb(27,176,206)]/30 p-4">
          <div className="text-[10px] font-bold uppercase text-slate-500">Benchmarked</div>
          <div className="text-2xl font-bold text-[#0F172A] mt-1">{stats.benchmarked}</div>
        </div>
        <div className="bg-white rounded-xl border border-[rgb(27,176,206)]/30 p-4">
          <div className="text-[10px] font-bold uppercase text-emerald-600">Competitive</div>
          <div className="text-2xl font-bold text-emerald-700 mt-1">{stats.competitive}</div>
        </div>
        <div className="bg-white rounded-xl border border-[rgb(27,176,206)]/30 p-4">
          <div className="text-[10px] font-bold uppercase text-amber-600">Classical / Limit</div>
          <div className="text-2xl font-bold text-[#0F172A] mt-1">
            {stats.classicalWins} / {stats.exceeds}
          </div>
        </div>
      </div>

      {/* Search & Industry Filter */}
      <div className="flex flex-col md:flex-row gap-3">
        <input
          type="text"
          placeholder="Search by title, slug, type, or industry..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 px-4 py-2.5 bg-white border border-[rgb(27,176,206)]/30 rounded-xl focus:ring-1 focus:ring-[rgb(27,176,206)] outline-none text-sm text-[#0F172A]"
        />
        <select
          value={industryFilter}
          onChange={(e) => setIndustryFilter(e.target.value)}
          className="px-4 py-2.5 bg-white border border-[rgb(27,176,206)]/30 rounded-xl outline-none text-sm font-medium text-[#0F172A]"
        >
          {industries.map((ind) => (
            <option key={ind} value={ind}>
              {ind === "All" ? "All Industries" : ind}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-[rgb(27,176,206)]/30 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-[#0F172A]">
            <thead className="bg-white border-b border-[rgb(27,176,206)]/30 font-semibold text-xs">
              <tr>
                <th className="px-4 py-3.5">Problem</th>
                <th className="px-4 py-3.5">Industry / Type</th>
                <th className="px-4 py-3.5">Version</th>
                <th className="px-4 py-3.5">Best Known</th>
                <th className="px-4 py-3.5">Solver Fit</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                    Loading problem library...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                    No matching problems.
                  </td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <tr key={r.slug} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-[#0F172A]">{r.title}</div>
                      <div className="text-[11px] font-mono text-slate-500">{r.slug}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{r.industry}</div>
                      <div className="text-[11px] text-slate-500">
                        {r.problemType} · {r.sizeTier} (~{r.benchmark?.quboVars ?? r.estimatedBinaryVars} vars)
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px]">
                      v{r.version} · {r.contentHash.slice(0, 8)}
                    </td>
                    <td className="px-4 py-3 font-mono font-semibold">
                      {r.bestKnown.value}{" "}
                      <span className="font-normal text-slate-500">({r.objectiveSense === "Minimize" ? "Min" : "Max"})</span>
                    </td>
                    <td className="px-4 py-3 font-mono">
                      {!r.benchmark ? (
                        <span className="text-slate-400">Not benchmarked</span>
                      ) : r.benchmark.verdict === "competitive" ? (
                        <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                          Competitive ({r.benchmark.quboGapPct?.toFixed(2)}%)
                        </span>
                      ) : r.benchmark.verdict === "exceeds_qubo_limit" ? (
                        <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold">
                          Exceeds QUBO Limit
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-bold">
                          Classical Wins
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right space-x-3">
                      <button
                        onClick={() => openEditModal(r)}
                        className="font-semibold text-[#0F172A] hover:underline cursor-pointer"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(r.slug)}
                        className="font-semibold text-red-500 hover:underline cursor-pointer"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* BULK IMPORT MODAL */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-2xl rounded-2xl border border-[rgb(27,176,206)]/30 shadow-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-[#0F172A]">Import Problems (JSON or CSV)</h3>
              <button
                type="button"
                onClick={() => setImportText(SAMPLE_IMPORT_JSON)}
                className="text-xs font-semibold text-[rgb(48,102,187)] hover:underline cursor-pointer"
              >
                Load sample JSON template
              </button>
            </div>

            <div className="text-xs text-slate-600">
              Upload a <code className="font-mono">.json</code> or <code className="font-mono">.csv</code> file, or paste
              a JSON array below. Required fields: <code className="font-mono">title</code>,{" "}
              <code className="font-mono">industry</code>, <code className="font-mono">prompt</code>,{" "}
              <code className="font-mono">bestKnown.value</code>.
            </div>

            <input type="file" accept=".json,.csv,.txt" onChange={handleFileUpload} className="text-xs text-slate-600" />

            <textarea
              rows={11}
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder="Paste JSON array or CSV rows here..."
              className="w-full p-3 rounded-xl border border-slate-200 font-mono text-xs text-slate-900 outline-none focus:border-[rgb(48,102,187)]"
            />

            {importResult && (
              <div className="text-xs bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg px-3 py-2">
                {importResult}
              </div>
            )}
            {importError && (
              <div className="text-xs bg-red-50 text-red-700 border border-red-200 rounded-lg px-3 py-2">
                {importError}
              </div>
            )}

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                onClick={() => setShowImportModal(false)}
                className="px-4 py-2 text-sm font-semibold text-slate-600 cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={handleBulkImport}
                disabled={busy}
                className="px-5 py-2 bg-[rgb(48,102,187)] hover:bg-[#255299] text-white rounded-xl text-sm font-semibold disabled:opacity-50 cursor-pointer"
              >
                {busy ? "Importing..." : "Import"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD / EDIT SINGLE PROBLEM MODAL */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white w-full max-w-xl rounded-2xl border border-[rgb(27,176,206)]/30 shadow-xl p-6 space-y-4 my-8">
            <h3 className="text-lg font-bold text-[#0F172A]">
              {editForm.slug ? `Edit Problem (${editForm.slug})` : "Add Problem to Library"}
            </h3>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-bold uppercase text-[10px] mb-1">Title</label>
                <input
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 rounded-lg outline-none"
                />
              </div>
              <div>
                <label className="block font-bold uppercase text-[10px] mb-1">Industry</label>
                <input
                  value={editForm.industry}
                  onChange={(e) => setEditForm({ ...editForm, industry: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 rounded-lg outline-none"
                />
              </div>
              <div>
                <label className="block font-bold uppercase text-[10px] mb-1">Problem Type</label>
                <input
                  value={editForm.problemType}
                  onChange={(e) => setEditForm({ ...editForm, problemType: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 rounded-lg outline-none"
                />
              </div>
              <div>
                <label className="block font-bold uppercase text-[10px] mb-1">Objective Sense</label>
                <select
                  value={editForm.objectiveSense}
                  onChange={(e) => setEditForm({ ...editForm, objectiveSense: e.target.value as any })}
                  className="w-full p-2.5 border border-slate-200 rounded-lg outline-none bg-white"
                >
                  <option value="Minimize">Minimize</option>
                  <option value="Maximize">Maximize</option>
                </select>
              </div>
              <div>
                <label className="block font-bold uppercase text-[10px] mb-1">Best Known Optimum</label>
                <input
                  type="number"
                  step="any"
                  value={editForm.bestKnownValue}
                  onChange={(e) => setEditForm({ ...editForm, bestKnownValue: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 rounded-lg outline-none font-mono"
                />
              </div>
              <div>
                <label className="block font-bold uppercase text-[10px] mb-1">Estimated Binary Vars</label>
                <input
                  type="number"
                  value={editForm.estimatedBinaryVars}
                  onChange={(e) => setEditForm({ ...editForm, estimatedBinaryVars: Number(e.target.value) })}
                  className="w-full p-2.5 border border-slate-200 rounded-lg outline-none font-mono"
                />
              </div>
            </div>

            <div className="text-xs">
              <label className="block font-bold uppercase text-[10px] mb-1">Short Description</label>
              <input
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                className="w-full p-2.5 border border-slate-200 rounded-lg outline-none"
              />
            </div>

            <div className="text-xs">
              <label className="block font-bold uppercase text-[10px] mb-1">Natural-Language Prompt</label>
              <textarea
                rows={4}
                value={editForm.prompt}
                onChange={(e) => setEditForm({ ...editForm, prompt: e.target.value })}
                className="w-full p-2.5 border border-slate-200 rounded-lg outline-none"
              />
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 text-sm font-semibold text-slate-600 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveSingle}
                disabled={busy}
                className="px-5 py-2 bg-[rgb(48,102,187)] hover:bg-[#255299] text-white rounded-xl text-sm font-semibold disabled:opacity-50 cursor-pointer"
              >
                {busy ? "Saving..." : "Save (Creates New Version if Changed)"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
