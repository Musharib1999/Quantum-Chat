const mongoose = require('mongoose');

const pythonTemplate = `import dimod
import json
import numpy as np
import itertools
from dimod.reference.samplers import SimulatedAnnealingSampler

# -----------------------------
# FETCH DATA FROM INJECTED PARAMETERS
# -----------------------------
# The Node.js layer fetches real data from MongoDB and injects it here
data = parameters['portfolio_data'] or []

if not data:
    print(f"[QUANTUM_JSON]{json.dumps({'error': 'No company data found for the selected sector.', 'assignmentsTable': [], 'summary': 'Please select a different sector.'})}[/QUANTUM_JSON]")
    exit(0)

n = len(data)
tickers = [row["ticker"] for row in data]
# The Node.js layer provides nextYearReturn and risk as percentages
returns = np.array([row["nextYearReturn"] / 100 for row in data])
risk = np.array([row["risk"] / 100 for row in data])

# -----------------------------
# PARAMETERS FROM UI
# -----------------------------
risk_penalty = float(parameters.risk_penalty or 5.0)
budget = int(parameters.max_companies or 3)

# -----------------------------
# BUILD COVARIANCE MATRIX
# -----------------------------
# Simplified diagonal risk model
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

result = {
    "assignmentsTable": [
        {"day": "Selected", "pilot": p["ticker"], "route": f"{p['company']} | Ret: {p['expected_return']} | Risk: {p['risk']}"}
        for p in portfolio
    ],
    "energy": float(energy),
    "summary": f"Targeting {budget} assets in the {parameters.sector} sector. Quantum solver selected {len(portfolio)} stocks with an expected aggregate return of {total_return:.2f}% and an average portfolio risk of {avg_risk:.2f}%.",
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
        title=f"Portfolio Optimization: {parameters.sector} Sector",
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
        const QuantumForm = mongoose.models.QuantumForm || mongoose.model('QuantumForm', new Schema({}, { strict: false }));

        const result = await QuantumForm.updateOne(
            { industry: 'Finance', problem: 'Portfolio Optimization' },
            {
                $set: {
                    fields: [
                        {
                            id: "sector",
                            label: "Target Sector",
                            type: "select",
                            options: [
                                "Technology", "Healthcare", "Finance", "Energy",
                                "Consumer Discretionary", "Consumer Staples",
                                "Industrials", "Telecommunications", "Utilities", "Materials"
                            ],
                            description: "Filter the stock universe by a specific industry sector."
                        },
                        {
                            id: "risk_penalty",
                            label: "Risk Aversion (0-10)",
                            type: "number",
                            placeholder: "Higher = More Conservative",
                            description: "Controls the penalty weight for portfolio volatility."
                        },
                        {
                            id: "max_companies",
                            label: "Portfolio Size (Target Assets)",
                            type: "number",
                            placeholder: "e.g. 3",
                            description: "The exact number of stocks the quantum solver should select."
                        }
                    ],
                    codeTemplates: [
                        {
                            hardware: "DWAVE",
                            code: pythonTemplate
                        }
                    ],
                    qubitFormula: "10", // Usually ~10 per sector
                    maxQubitsPerBatch: 64,
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
