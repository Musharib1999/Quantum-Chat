const mongoose = require('mongoose');

const pythonTemplate = `import dimod
import json
import numpy as np
import itertools
from dimod.reference.samplers import SimulatedAnnealingSampler

# -----------------------------
# FETCH DATA FROM INJECTED PARAMETERS
# -----------------------------
injected_data = parameters.get('portfolio_data', [])
risk_threshold = float(parameters.get('risk_threshold', 100.0)) / 100.0

# -----------------------------
# PRE-PROCESS: Filter by Risk Threshold
# -----------------------------
filtered_data = [row for row in injected_data if (row.get('risk', 100) / 100.0) <= risk_threshold]

# -----------------------------
# BATCH PARTITIONING: Slice the Universe
# -----------------------------
# Use indices injected by the industry pipeline to partition the stock universe
batch_start = int(parameters.get('batch_start_index', 0))
batch_end = int(parameters.get('batch_end_index', len(filtered_data)))
data = filtered_data[batch_start : batch_end + 1]

if not data:
    if not filtered_data:
        msg = f"Universe Scan Alert: No companies found with risk <= {risk_threshold*100}%."
        print(f"[QUANTUM_JSON]{json.dumps({'error': msg, 'summary': 'Please adjust risk filters or sectors.'})}[/QUANTUM_JSON]")
    else:
        # Unexpected slice request for non-empty universe. Backend-sync protection.
        pass
    exit(0)

print(f"Batch Processing: Assets {batch_start} to {batch_end} (Size: {len(data)})")

n = len(data)
tickers = [row["ticker"] for row in data]
returns = np.array([row["nextYearReturn"] / 100 for row in data])
risk = np.array([row["risk"] / 100 for row in data])

# -----------------------------
# PARAMETERS FROM UI
# -----------------------------
risk_penalty = float(parameters.get('risk_penalty', 5.0))
budget = int(parameters.get('max_companies', 3))

# Ensure budget doesn't exceed available assets
budget = min(budget, n)

# -----------------------------
# BUILD COVARIANCE MATRIX
# -----------------------------
cov_matrix = np.outer(risk, risk)

# -----------------------------
# BUILD QUBO
# -----------------------------
Q = {}

# Objective: Maximize returns (Minimize -Returns)
for i in range(n):
    var = f"x_{i}"
    Q[(var, var)] = -returns[i]

# Objective: Minimize Risk
for i, j in itertools.combinations(range(n), 2):
    var1 = f"x_{i}"
    var2 = f"x_{j}"
    penalty = risk_penalty * cov_matrix[i][j]
    Q[(var1, var2)] = Q.get((var1, var2), 0) + penalty

# -----------------------------
# BUDGET CONSTRAINT (Penalty Method)
# -----------------------------
A = 10.0 # Strength of the selection quota
for i in range(n):
    var = f"x_{i}"
    Q[(var, var)] = Q.get((var, var), 0) + A * (1 - 2 * budget)

for i, j in itertools.combinations(range(n), 2):
    var1 = f"x_{i}"
    var2 = f"x_{j}"
    Q[(var1, var2)] = Q.get((var1, var2), 0) + 2 * A

# -----------------------------
# SOLVE QUBO
# -----------------------------
bqm = dimod.BinaryQuadraticModel.from_qubo(Q)
sampler = SimulatedAnnealingSampler()
sampleset = sampler.sample(bqm, num_reads=500)

best = sampleset.first.sample
energy = sampleset.first.energy

# -----------------------------
# FORMAT RESULT
# -----------------------------
portfolio = []
total_return = 0
avg_risk = 0

for i in range(n):
    if best.get(f"x_{i}") == 1:
        portfolio.append({
            "ticker": tickers[i],
            "company": data[i]["company"],
            "expected_return": f"{returns[i]*100:.2f}%",
            "risk": f"{risk[i]*100:.2f}%"
        })
        total_return += returns[i] * 100
        avg_risk += risk[i] * 100

if len(portfolio) > 0:
    avg_risk = avg_risk / len(portfolio)

# --- FIX: JSON Serialization for NumPy types (int8, etc) ---
def sanitize_for_json(obj):
    if isinstance(obj, dict):
        return {k: sanitize_for_json(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [sanitize_for_json(x) for x in obj]
    if isinstance(obj, (np.int_, np.intc, np.intp, np.int8, np.int16, np.int32, np.int64,
                        np.uint8, np.uint16, np.uint32, np.uint64)):
        return int(obj)
    if isinstance(obj, (np.float_, np.float16, np.float32, np.float64)):
        return float(obj)
    if isinstance(obj, (np.ndarray,)):
        return obj.tolist()
    return obj

result = {
    "assignmentsTable": [
        {"day": "Selected", "pilot": p["ticker"], "route": f"{p['company']} | Ret: {p['expected_return']} | Risk: {p['risk']}"}
        for p in portfolio
    ],
    "best_solution": sanitize_for_json(best),
    "energy": float(energy),
    "summary": f"Targeting {budget} assets. Quantum solver selected {len(portfolio)} stocks with an expected aggregate return of {total_return:.2f}% and an average portfolio risk of {avg_risk:.2f}%.",
}

# GENERATE PLOTLY CHART
try:
    import plotly.graph_objects as go
    # Return vs Risk Bubble Chart
    fig = go.Figure(data=[go.Scatter(
        x=[r * 100 for r in risk],
        y=[r * 100 for r in returns],
        mode='markers+text',
        text=tickers,
        textposition="top center",
        marker=dict(
            size=[20 if best.get(f"x_{i}") == 1 else 10 for i in range(n)],
            color=['#3066bb' if best.get(f"x_{i}") == 1 else '#3f3f46' for i in range(n)],
            opacity=0.8,
            line=dict(width=2, color='white')
        )
    )])
    
    fig.update_layout(
        title=f"Portfolio Optimization: Return vs Risk Profile",
        xaxis_title="Risk (Volatility %)",
        yaxis_title="Expected Return (%)",
        template="plotly_dark",
        margin=dict(l=40, r=20, t=60, b=40)
    )
    result["plotly_chart"] = fig.to_plotly_json()
except:
    pass

print(f"[QUANTUM_JSON]{json.dumps(result)}[/QUANTUM_JSON]")
`;

async function updateFinance() {
    const uri = "mongodb+srv://musharibsubhani_db_user:Zq8jSgF42sl88Jcl@cluster0.auezwk2.mongodb.net/?appName=Cluster0";
    try {
        await mongoose.connect(uri);
        const Schema = mongoose.Schema;
        const PortfolioCompany = mongoose.models.PortfolioCompany || mongoose.model('PortfolioCompany', new Schema({}, { strict: false }));
        const QuantumForm = mongoose.models.QuantumForm || mongoose.model('QuantumForm', new Schema({}, { strict: false }));

        // --- FETCH UNIQUE SECTORS ---
        console.log("Fetching unique sectors from PortfolioCompany...");
        const uniqueSectors = await PortfolioCompany.distinct('sector');
        console.log(`Found ${uniqueSectors.length} sectors:`, uniqueSectors);

        const result = await QuantumForm.updateOne(
            { industry: 'Finance', problem: 'Portfolio Optimization' },
            {
                $set: {
                    fields: [
                        {
                            key: "sector",
                            label: "Target Sectors",
                            type: "multi-select",
                            options: uniqueSectors.sort(),
                            description: "Select one or more industries to include in the stock universe."
                        },
                        {
                            key: "risk_threshold",
                            label: "Max Risk Per Asset (%)",
                            type: "number",
                            defaultValue: "25",
                            placeholder: "e.g. 25",
                            description: "Exclude stocks with risk higher than this value before optimization."
                        },
                        {
                            key: "risk_penalty",
                            label: "Risk Aversion (0-10)",
                            type: "number",
                            defaultValue: "5",
                            placeholder: "Higher = More Conservative",
                            description: "Controls the penalty weight for portfolio volatility."
                        },
                        {
                            key: "max_companies",
                            label: "Portfolio Size (Target Assets)",
                            type: "number",
                            defaultValue: "5",
                            placeholder: "e.g. 5",
                            description: "The number of stocks the quantum solver should select."
                        }
                    ],
                    codeTemplates: [
                        {
                            hardware: "DWAVE",
                            code: pythonTemplate
                        }
                    ],
                    qubitFormula: "{{max_companies}} * 10",
                    batchingEnabled: true,
                    maxQubitsPerBatch: 10,
                    active: true
                }
            }
        );
        console.log('Update result:', result);
    } catch (err) {
        console.error('Error:', err);
    }
    process.exit(0);
}

updateFinance();
