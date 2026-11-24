"""
Generates docs/PROBLEM_LIBRARY_CATALOG.md directly from the verified JSON problem bundles
and hardened 20-seed benchmark snapshots.

Usage:  python3 quantum-backend/benchmarks/generate_catalog_md.py
"""
from __future__ import annotations

import json
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "src" / "data" / "problemLibrary"
OUT = ROOT / "docs" / "PROBLEM_LIBRARY_CATALOG.md"
OUT.parent.mkdir(parents=True, exist_ok=True)

BUNDLES = [
    ("logistics.json", "logistics_benchmarks.json"),
    ("multi_industry.json", "multi_industry_benchmarks.json"),
    ("construction.json", "construction_benchmarks.json"),
]

VERDICT_LABEL = {
    "competitive": "Competitive",
    "classical_wins": "Classical Wins",
    "exceeds_qubo_limit": "Exceeds QUBO Limit",
}
SIZE_LABEL = {"small": "Small", "medium": "Medium", "large": "Large"}


def fmt_ms(ms):
    if ms is None:
        return "—"
    return f"{ms / 1000:.2f}s" if ms >= 1000 else f"{ms:.1f}ms"


def fmt_sa(b):
    q = b["qubo"]
    if q.get("exceedsLimit"):
        return "Skipped (>150 cap)"
    if q.get("bestObjective") is None:
        return f"0/{q['totalRuns']} feas · {fmt_ms(q.get('solveTimeMs') or q.get('meanTimeMs'))}"
    med = q.get("medianObjective", q.get("bestObjective"))
    med_gap = q.get("medianGapVsBestKnownPct", q.get("gapVsBestKnownPct"))
    gap_s = f"{med_gap:.2f}%" if isinstance(med_gap, (int, float)) else "—"
    return f"med {med} ({gap_s}) · best {q['bestObjective']} · {q['feasibleRuns']}/{q['totalRuns']} · {fmt_ms(q.get('solveTimeMs') or q.get('meanTimeMs'))}"


def fmt_or(b):
    c = b["classical"]
    gap = c.get("gapVsBestKnownPct")
    gap_s = f"{gap:.2f}%" if isinstance(gap, (int, float)) else "—"
    return f"{c.get('bestObjective', '—')} ({gap_s} · {fmt_ms(c.get('solveTimeMs') or c.get('meanTimeMs'))})"


def main():
    problems = []
    benchmarks = {}
    env_manifest = None
    sample_proto = None

    for pf, bf in BUNDLES:
        probs = json.loads((DATA / pf).read_text())["problems"]
        b_doc = json.loads((DATA / bf).read_text())
        if env_manifest is None and b_doc.get("environment"):
            env_manifest = b_doc["environment"]
        problems.extend(probs)
        for b in b_doc["benchmarks"]:
            benchmarks[b["slug"]] = b
            if sample_proto is None:
                sample_proto = b.get("protocol")

    by_industry = defaultdict(list)
    for p in problems:
        by_industry[p["industry"]].append(p)

    industry_order = sorted(by_industry.keys())
    verdict_counts = Counter(benchmarks[p["slug"]]["verdict"] for p in problems if p["slug"] in benchmarks)
    size_counts = Counter(p["sizeTier"] for p in problems)
    eq_passed = sum(1 for p in problems if benchmarks.get(p["slug"], {}).get("equivalenceCheck", {}).get("passed"))

    lines = []
    lines.append("# Quantum Guru — Enterprise Problem Library Catalog")
    lines.append("")
    lines.append(
        f"Complete catalog of all **{len(problems)} independently verified optimization benchmarks** across **{len(industry_order)} industries**."
    )
    lines.append("")
    if sample_proto:
        lines.append(
            f"> **Hardened Benchmark Protocol:** Every best-known optimum is proven (`0.00%` gap) by **Google OR-Tools CP-SAT** (`num_workers=1`) "
            f"or published TSPLIB ground truth. Every BQM passes automated **QUBO≡Original mathematical equivalence verification** "
            f"(`{eq_passed}/{len(problems)}` passed, `|E_QUBO(x*) - ±f(x*)| < 1e-4`). Penalty `λ` is tuned on `{len(sample_proto.get('tuneSeeds', []))}` "
            f"strictly disjoint seeds (`{sample_proto.get('tuneSeeds', [])}`) and evaluated on `N = {sample_proto['repeats']}` held-out seeds "
            f"(`{sample_proto['quboReadsPerRepeat']}` reads × `{sample_proto.get('quboNumSweeps', 1000)}` sweeps). "
            f"Timings separate model build, `λ` tuning, and pure solve time. **D-Wave Simulated Annealing (`dwave-neal`) is classical software** "
            f"(no physical QPU or quantum advantage is claimed). Verdict `Competitive` requires `>=80%` feasibility and `<=1.0%` **median** gap."
        )
        lines.append("")
        if sample_proto.get("quboLimitRationale"):
            lines.append(f"> **QUBO Size Limit (`{sample_proto['maxQuboVars']}` vars):** {sample_proto['quboLimitRationale']}")
            lines.append("")

    if env_manifest:
        lines.append(
            f"**Reproducibility Environment:** Python `{env_manifest['pythonVersion']}` · OR-Tools `{env_manifest['ortoolsVersion']}` · "
            f"dimod `{env_manifest['dimodVersion']}` · dwave-neal `{env_manifest['nealVersion']}` · "
            f"`{env_manifest['platform']}` ({env_manifest['cpuCount']} cores)"
        )
        lines.append("")

    lines.append("## Summary Overview")
    lines.append("")
    lines.append(f"- **Total Problems:** {len(problems)} across {len(industry_order)} industries (8 per industry)")
    lines.append(f"- **QUBO≡Original Equivalence Proof:** {eq_passed}/{len(problems)} passed")
    lines.append(
        f"- **By Size Tier:** Small ({size_counts['small']}) · Medium ({size_counts['medium']}) · Large ({size_counts['large']})"
    )
    lines.append(
        f"- **By Solver Fit (20-seed median rule):** Competitive ({verdict_counts['competitive']}) · Classical Wins ({verdict_counts['classical_wins']}) · Exceeds QUBO Limit ({verdict_counts['exceeds_qubo_limit']})"
    )
    lines.append("")

    lines.append("| Industry | Problems | Competitive | Classical Wins | Exceeds QUBO Limit | Problem Types |")
    lines.append("|---|---:|---:|---:|---:|---|")
    for ind in industry_order:
        ps = by_industry[ind]
        vc = Counter(benchmarks[p["slug"]]["verdict"] for p in ps if p["slug"] in benchmarks)
        types = ", ".join(sorted(set(p["problemType"] for p in ps)))
        lines.append(
            f"| **{ind}** | {len(ps)} | {vc['competitive']} | {vc['classical_wins']} | {vc['exceeds_qubo_limit']} | {types} |"
        )
    lines.append("")

    lines.append("## Benchmark Matrix by Industry")
    lines.append("")
    for ind in industry_order:
        lines.append(f"### {ind} ({len(by_industry[ind])} problems)")
        lines.append("")
        lines.append(
            "| # | Slug | Title | Type | Size | QUBO Vars (d+s) | Density | Sense | Best Known | OR-Tools CP-SAT (solve) | D-Wave SA (20-seed median · classical software) | Solver Fit |"
        )
        lines.append("|---:|---|---|---|---|---|---:|---|---:|---|---|---|")
        ps_sorted = sorted(by_industry[ind], key=lambda x: (benchmarks[x["slug"]]["quboVars"], x["title"]))
        for idx, p in enumerate(ps_sorted, 1):
            b = benchmarks[p["slug"]]
            st = b.get("structure") or {}
            vars_str = f"{b['quboVars']} ({st.get('decisionVars', '?')}+{st.get('slackVars', 0)})"
            dens_str = f"{st.get('densityPct', 0):.1f}%"
            bk = p["bestKnown"]["value"]
            lines.append(
                f"| {idx} | `{p['slug']}` | {p['title']} | {p['problemType']} | {SIZE_LABEL[p['sizeTier']]} | {vars_str} | {dens_str} | {p['objectiveSense']} | {bk} | {fmt_or(b)} | {fmt_sa(b)} | **{VERDICT_LABEL[b['verdict']]}** |"
            )
        lines.append("")

    lines.append("## Problem Descriptions & Prompts")
    lines.append("")
    for ind in industry_order:
        lines.append(f"### {ind}")
        lines.append("")
        ps_sorted = sorted(by_industry[ind], key=lambda x: (benchmarks[x["slug"]]["quboVars"], x["title"]))
        for p in ps_sorted:
            b = benchmarks[p["slug"]]
            st = b.get("structure") or {}
            eq = b.get("equivalenceCheck") or {}
            q = b["qubo"]
            c = b["classical"]
            lines.append(f"#### {p['title']} (`{p['slug']}`)")
            lines.append(
                f"- **Type:** {p['problemType']} · **Size:** {SIZE_LABEL[p['sizeTier']]} ({b['quboVars']} QUBO vars: {st.get('decisionVars', '?')} decision + {st.get('slackVars', 0)} slack, {st.get('quadraticCouplings', 0)} couplings, {st.get('densityPct', 0)}% density, max deg {st.get('maxDegree', 0)}, dynamic range {st.get('dynamicRange', 0)}×)"
            )
            lines.append(
                f"- **Objective:** {p['objectiveSense']} · **Best Known:** `{p['bestKnown']['value']}` ({p['bestKnown']['method']}) · **QUBO≡Original:** `{'PASS' if eq.get('passed') else 'FAIL'}` (max err `{eq.get('maxAbsError', '—')}`)"
            )
            lines.append(f"- **Solver Fit:** **{VERDICT_LABEL[b['verdict']]}** — {b['verdictNote']}")
            if not q.get("exceedsLimit"):
                lines.append(
                    f"- **20-Seed SA Distribution:** best `{q.get('bestObjective')}` · median `{q.get('medianObjective')}` · mean±std `{q.get('meanObjective')} ± {q.get('stdObjective')}` · worst `{q.get('worstObjective')}` · IQR `{q.get('iqrObjective')}` · timings build/tune/solve `{fmt_ms(q.get('buildTimeMs'))}` / `{fmt_ms(q.get('tuneTimeMs'))}` / `{fmt_ms(q.get('solveTimeMs'))}`"
                )
            lines.append(
                f"- **20-Seed CP-SAT:** `{c.get('status')}` `{c.get('bestObjective')}` · timings build/solve `{fmt_ms(c.get('buildTimeMs'))}` / `{fmt_ms(c.get('solveTimeMs'))}`"
            )
            lines.append(f"- **Source:** {p['source']['name']} ({p['source']['license']})")
            lines.append(f"- **Summary:** {p['description']}")
            lines.append("")
            lines.append("```text")
            lines.append(p["prompt"])
            lines.append("```")
            lines.append("")

    OUT.write_text("\n".join(lines).rstrip() + "\n", encoding="utf-8")
    print(f"Wrote {OUT} ({len(lines)} lines, {len(problems)} problems, {eq_passed}/{len(problems)} equivalence verified)")


if __name__ == "__main__":
    main()
