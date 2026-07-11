"""
retriever.py
============
Vector Retriever Module. Loads the FAISS index and sentence-transformer model
to execute fast semantic search lookups over the Knowledge and Identity sets.
"""
import json
import os
import sys
import time
import numpy as np
import faiss
from sentence_transformers import SentenceTransformer

class VectorRetriever:
    def __init__(self, index_path=None, metadata_path=None, model_name="all-MiniLM-L6-v2"):
        dir_path = os.path.dirname(os.path.abspath(__file__))
        self.index_path = index_path or os.path.join(dir_path, "knowledge_index.faiss")
        self.metadata_path = metadata_path or os.path.join(dir_path, "knowledge_metadata.json")
        self.model_name = model_name
        self.is_loaded = False
        
        # Load embedding model and index
        if os.path.exists(self.index_path) and os.path.exists(self.metadata_path):
            self.load_resources()
            
    def load_resources(self):
        print(f"Loading embedding model '{self.model_name}'...", file=sys.stderr)
        self.model = SentenceTransformer(self.model_name)
        
        print(f"Loading FAISS index from {self.index_path}...", file=sys.stderr)
        self.index = faiss.read_index(self.index_path)
        
        print(f"Loading metadata from {self.metadata_path}...", file=sys.stderr)
        with open(self.metadata_path, "r") as f:
            self.metadata = json.load(f)
            
        self.is_loaded = True
        print("Retriever resources loaded successfully.", file=sys.stderr)
        
    def retrieve(self, query, k=3, category_filter=None):
        if not self.is_loaded:
            return {"error": "Retriever not initialized. Index or metadata files missing."}
            
        # 1. Embed user query
        query_vector = self.model.encode([query]).astype('float32')
        
        # 2. Normalize for Cosine Similarity
        faiss.normalize_L2(query_vector)
        
        # 3. Search index
        # index.search returns (distances, indices)
        # Since we use IndexFlatIP with normalized vectors, distances represents cosine similarity scores [0.0 - 1.0]
        similarities, idxs = self.index.search(query_vector, k * 2)  # retrieve double for filtering
        
        results = []
        for sim, idx in zip(similarities[0], idxs[0]):
            if idx < 0 or idx >= len(self.metadata):
                continue
                
            match = self.metadata[idx]
            
            # Apply category filter if specified (e.g. only search "identity" or "knowledge")
            if category_filter and match["category"] != category_filter:
                continue
                
            results.append({
                "prompt": match["prompt"],
                "response": match["response"],
                "category": match["category"],
                "score": float(sim)
            })
            
            if len(results) >= k:
                break
                
        return results

# Interactive test run if executed directly
if __name__ == "__main__":
    retriever = VectorRetriever()
    
    # Check if a command line query was provided
    if len(sys.argv) > 1:
        query = " ".join(sys.argv[1:])
    else:
        # Default test query
        query = "Explain quantum superposition and why a qubit is not in both states at once"
        
    if retriever.is_loaded:
        print("\n" + "="*70)
        print(f"  SEMANTIC RETRIEVER SEARCH RESULTS")
        print(f"  Query: \"{query}\"")
        print("="*70)
        
        start = time.perf_counter()
        hits = retriever.retrieve(query, k=2)
        duration = time.perf_counter() - start
        
        print(f"Search completed in {duration * 1000:.2f} ms.\n")
        
        for i, hit in enumerate(hits, 1):
            print(f"Hit [{i}] | Score: {hit['score']:.4f} | Category: {hit['category'].upper()}")
            print(f"Matched Prompt: \"{hit['prompt']}\"")
            print("-" * 50)
            print(hit['response'])
            print("="*70 + "\n")
    else:
        print("Error: knowledge_index.faiss or knowledge_metadata.json not found.")
