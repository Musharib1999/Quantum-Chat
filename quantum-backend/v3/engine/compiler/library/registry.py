"""
registry.py — Main AlgorithmRegistry class definition for the Quantum Algorithm Library.
Manages MongoDB collection lookups, seeding, and verification routing.
"""

import os
from typing import Dict, Any, List, Optional, Callable
from pymongo import MongoClient

# Import static templates
from .educational import TEMPLATES as edu_templates
from .entanglement import TEMPLATES as ent_templates
from .communication import TEMPLATES as comm_templates
from .fourier_estimation import TEMPLATES as fourier_templates
from .algorithms import TEMPLATES as algo_templates
from .arithmetic import TEMPLATES as arith_templates

class AlgorithmRegistry:
    # Local fallback dictionary
    STATIC_REGISTRY = {}
    STATIC_REGISTRY.update(edu_templates)
    STATIC_REGISTRY.update(ent_templates)
    STATIC_REGISTRY.update(comm_templates)
    STATIC_REGISTRY.update(fourier_templates)
    STATIC_REGISTRY.update(algo_templates)
    STATIC_REGISTRY.update(arith_templates)
    
    # Map key -> verifier function
    VERIFIERS = {}
    for k, val in STATIC_REGISTRY.items():
        if "verify_fn" in val:
            VERIFIERS[k] = val["verify_fn"]

    @staticmethod
    def seed_database() -> None:
        """
        Seeds MongoDB 'quantum_algorithms' collection with static template definitions
        if the collection is empty.
        """
        mongo_uri = os.environ.get("MONGODB_URI")
        if not mongo_uri:
            print("[AlgorithmRegistry] MONGODB_URI not found. Skipping DB seed.")
            return
            
        try:
            client = MongoClient(mongo_uri, tlsAllowInvalidCertificates=True)
            db = client["test"]
            col = db["quantum_algorithms"]
            
            # Check count
            if col.count_documents({}) == 0:
                print("[AlgorithmRegistry] Seeding quantum_algorithms collection in MongoDB...")
                seed_docs = []
                for k, v in AlgorithmRegistry.STATIC_REGISTRY.items():
                    # Strip python verify_fn to serialize to DB
                    doc = {
                        "key": v["key"],
                        "name": v["name"],
                        "phase": v["phase"],
                        "num_qubits": v["num_qubits"],
                        "num_cbits": v["num_cbits"],
                        "operations": v["operations"],
                        "description": v["description"]
                    }
                    seed_docs.append(doc)
                col.insert_many(seed_docs)
                print(f"[AlgorithmRegistry] Seeded {len(seed_docs)} algorithms successfully.")
            client.close()
        except Exception as e:
            print(f"[AlgorithmRegistry Error] Failed to seed MongoDB: {e}")

    @staticmethod
    def get_template(key: str) -> Optional[Dict[str, Any]]:
        """
        Attempts to retrieve a quantum algorithm template from MongoDB.
        Falls back to local STATIC_REGISTRY if MongoDB fails or is unavailable.
        Supports alias substring matching (e.g. 'hadamard_superposition' matches 'hadamard').
        """
        clean_key = str(key).lower().strip().replace(" ", "_").replace("-", "_")
        
        # Substring mapping to support aliases (only for short keys)
        matched_key = clean_key
        if len(clean_key) < 40:
            for static_key in AlgorithmRegistry.STATIC_REGISTRY.keys():
                if static_key in clean_key:
                    matched_key = static_key
                    break
        
        # Check database
        mongo_uri = os.environ.get("MONGODB_URI")
        if mongo_uri:
            try:
                client = MongoClient(mongo_uri, tlsAllowInvalidCertificates=True)
                db = client["test"]
                col = db["quantum_algorithms"]
                doc = col.find_one({"key": matched_key})
                client.close()
                if doc:
                    return {
                        "qiskit_code": doc.get("qiskit_code", ""),
                        "pennylane_code": doc.get("pennylane_code", ""),
                        "num_qubits": doc.get("num_qubits", 2),
                        "depth": doc.get("depth", 0),
                        "gate_count": doc.get("gate_count", len(doc.get("operations", []))),
                        "ascii_circuit": doc.get("ascii_circuit", ""),
                        "operations": doc.get("operations", []),
                        "name": doc["name"],
                        "description": doc.get("description", doc.get("notes", ""))
                    }
            except Exception as e:
                print(f"[AlgorithmRegistry Warning] DB fetch failed: {e}. Falling back to static registry.")

        # Fallback to local static registry
        val = AlgorithmRegistry.STATIC_REGISTRY.get(matched_key)
        if val:
            return {
                "qiskit_code": "",
                "pennylane_code": "",
                "num_qubits": val["num_qubits"],
                "depth": 0,
                "gate_count": len(val["operations"]),
                "ascii_circuit": "",
                "operations": val["operations"],
                "name": val["name"],
                "description": val["description"]
            }
        return None

    @staticmethod
    def get_verifier(key: str) -> Optional[Callable[[Dict[str, int], int], Dict[str, Any]]]:
        """
        Returns the verification function for the given algorithm key.
        Supports alias substring matching.
        """
        clean_key = str(key).lower().strip().replace(" ", "_").replace("-", "_")
        
        matched_key = clean_key
        if len(clean_key) < 40:
            for static_key in AlgorithmRegistry.STATIC_REGISTRY.keys():
                if static_key in clean_key:
                    matched_key = static_key
                    break
                
        return AlgorithmRegistry.VERIFIERS.get(matched_key)
