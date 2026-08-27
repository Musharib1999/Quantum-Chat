"""
Automated Regression Test Suite for Quantum Machine Learning (QML) Engine
Asserts:
- Data Profiling & Preprocessing consistency
- Automated PCA Feature Reduction to 4-8 Qubits
- Classical Baseline Execution (Logistic Regression, RBF SVM, Random Forest)
- Quantum Kernel Classifier (QSVM) fidelity computation & classification
- Variational Quantum Classifier (VQC) statevector parameter optimization
- Delta Benchmarking calculation
"""
import unittest
import numpy as np
from engine.qml_engine import (
    load_qml_dataset,
    preprocess_and_reduce,
    evaluate_classical_baselines,
    run_quantum_kernel_classifier,
    run_vqc_classifier,
    solve_qml_experiment
)

class TestQMLEngine(unittest.TestCase):

    def test_iris_classification(self):
        spec = {"dataset_name": "Iris Flower Classification", "max_qubits": 4}
        manifest = solve_qml_experiment(spec)
        
        self.assertEqual(manifest["task_type"], "classification")
        self.assertEqual(manifest["data_profile"]["active_qubits"], 4)
        self.assertGreaterEqual(manifest["classical_baseline"]["best_classical_accuracy"], 90.0)
        self.assertGreaterEqual(manifest["quantum_kernel_svm"]["accuracy"], 90.0)
        self.assertTrue(manifest["quantum_kernel_svm"]["kernel_evaluations"] > 0)
        self.assertIn("circuit_diagram", manifest)
        self.assertIn("ansatz_qiskit_code", manifest)
        print("\n[PASS] Iris Flower QML experiment completed with QSVM parity.")

    def test_breast_cancer_feature_reduction(self):
        spec = {"dataset_name": "Breast Cancer Diagnostic", "max_qubits": 4}
        manifest = solve_qml_experiment(spec)
        
        self.assertEqual(manifest["data_profile"]["original_features"], 30)
        self.assertEqual(manifest["data_profile"]["active_qubits"], 4)
        self.assertTrue(manifest["data_profile"]["pca_variance_preserved"] > 70.0)
        self.assertGreaterEqual(manifest["quantum_kernel_svm"]["accuracy"], 80.0)
        print(f"\n[PASS] Breast Cancer 30D -> 4D PCA reduction preserved {manifest['data_profile']['pca_variance_preserved']}% variance.")

    def test_customer_churn_qml(self):
        spec = {"dataset_name": "Customer Churn Prediction", "max_qubits": 4}
        manifest = solve_qml_experiment(spec)
        
        self.assertEqual(manifest["data_profile"]["active_qubits"], 4)
        self.assertIn("best_classical_model", manifest["classical_baseline"])
        self.assertIn("convergence_history", manifest["vqc_model"])
        print(f"\n[PASS] Customer Churn experiment completed. Advantage Status: {manifest['advantage_status']}")

    def test_vqc_convergence_format(self):
        spec = {"dataset_name": "Wine", "max_qubits": 4}
        manifest = solve_qml_experiment(spec)
        
        vqc = manifest["vqc_model"]
        self.assertEqual(vqc["optimizer"], "COBYLA")
        self.assertTrue(len(vqc["convergence_history"]) > 0)
        self.assertIn("RealAmplitudes", vqc["ansatz"])
        print("\n[PASS] VQC convergence history and circuit structure verified.")

if __name__ == '__main__':
    unittest.main()
