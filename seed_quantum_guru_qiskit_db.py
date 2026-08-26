import os
import json
import pandas as pd
from pymongo import MongoClient
from dotenv import load_dotenv

def seed_db():
    print("[*] Loading .env...")
    load_dotenv(".env")
    
    mongo_uri = os.environ.get("MONGODB_URI")
    if not mongo_uri:
        print("[ERROR] MONGODB_URI not found in .env!")
        return
        
    # Load manifest JSON
    manifest_path = "src/data/quantum_algorithms_manifest.json"
    if not os.path.exists(manifest_path):
        print(f"[ERROR] Manifest file not found at {manifest_path}!")
        return
        
    with open(manifest_path, "r") as f:
        manifest_data = json.load(f)
        
    # Load CSV data
    csv_path = "qiskit_aer_quantum_algorithms_corrected.csv"
    if not os.path.exists(csv_path):
        print(f"[ERROR] CSV file not found at {csv_path}!")
        return
        
    df = pd.read_csv(csv_path)
    csv_dict = {row["slug"]: row for _, row in df.iterrows()}
    
    # Establish Mongo connection
    client = MongoClient(mongo_uri)
    db = client["test"]
    col = db["quantum_algorithms"]
    
    print("[*] Clearing existing quantum_algorithms collection...")
    col.delete_many({})
    
    seed_docs = []
    for algo in manifest_data:
        algo_id = algo["id"]
        csv_row = csv_dict.get(algo_id)
        
        # Parse typical number of qubits from the scale string (e.g. "4 - 24 Qubits" -> 4)
        num_qubits = 4
        qubit_str = algo.get("qubits", "")
        import re
        match = re.search(r"\d+", qubit_str)
        if match:
            num_qubits = int(match.group())
            
        doc = {
            "key": algo_id,
            "name": algo["name"],
            "category": algo["category"],
            "description": algo["description"],
            "qubits": qubit_str,
            "num_qubits": num_qubits,
            "complexity": algo.get("complexity", ""),
            "sdks": algo.get("sdks", ["Qiskit"]),
            "prompt": algo.get("prompt", ""),
            "qiskit_code": csv_row["qiskit_aer_code"] if csv_row is not None else "",
            "implementation_status": csv_row["implementation_status"] if csv_row is not None else "CONCEPT",
            "required_packages": csv_row["required_packages"] if csv_row is not None else "qiskit",
            "notes": csv_row["notes"] if csv_row is not None else "",
            "operations": [],
            "depth": 0,
            "gate_count": 0,
            "ascii_circuit": ""
        }
        seed_docs.append(doc)
        
    col.insert_many(seed_docs)
    print(f"[+] Successfully seeded {len(seed_docs)} algorithms in MongoDB collection 'quantum_algorithms'!")
    client.close()

if __name__ == "__main__":
    seed_db()
