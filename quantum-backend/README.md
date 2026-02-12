# Quantum Calculation Backend

This is a FastAPI microservice designed to run Qiskit and D-Wave simulations.

## Deployment on Render

1. Create a new **Web Service** on Render.
2. Connect your repository: `https://github.com/Musharib1999/Quantum-calculation-backend.git`
3. Use the following settings:
   - **Environment**: Python 3
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`

## Endpoints

- `POST /api/simulate/qiskit`: Run QC circuits.
- `POST /api/simulate/dwave`: Run Annealing problems.
