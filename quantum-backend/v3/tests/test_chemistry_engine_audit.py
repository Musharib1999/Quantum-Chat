"""
Mandatory Chemistry Engine Audit & Regression Test Suite
Tests energy accounting and exact qubit matrix ground-state match across benchmark molecules:
H2, HeH+, LiH, H2O, NH3, C2H4
"""
import sys
import os
import unittest
import numpy as np

# Add quantum-backend/v3 to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from engine.chemistry_engine import solve_quantum_chemistry

class TestChemistryEngineAudit(unittest.TestCase):

    def verify_molecule(self, prompt: str, name: str):
        print(f"\n--- Testing {name} ({prompt}) ---")
        manifest = solve_quantum_chemistry({"user_prompt": prompt})

        print(f"Formula:                    {manifest['formula']}")
        print(f"Total Electrons:            {manifest['total_electrons']}")
        print(f"Frozen Electrons:           {manifest['frozen_electrons']}")
        print(f"Active Electrons:           {manifest['active_electrons']}")
        print(f"Active Spatial Orbitals:    {manifest['active_spatial_orbitals']}")
        print(f"Allocated Qubits:           {manifest['num_qubits']}")
        print(f"Nuclear Repulsion:          {manifest['nuclear_repulsion_energy']:.6f} Ha")
        print(f"Frozen Core Energy:         {manifest['frozen_core_energy']:.6f} Ha")
        print(f"Constant Shift:             {manifest['hamiltonian_constant']:.6f} Ha")
        print(f"HF Total Energy:            {manifest['hartree_fock_energy_hartree']:.6f} Ha")
        print(f"CASCI/FCI Reference Energy: {manifest['fci_reference_hartree']:.6f} Ha")
        print(f"Exact Qubit Min Energy:     {manifest['e_qubit_exact']:.6f} Ha")
        print(f"HF Expectation (<HF|H|HF>): {manifest['e_hf_expectation']:.6f} Ha")
        print(f"VQE Calculated Energy:      {manifest['vqe_energy_hartree']:.6f} Ha")
        print(f"VQE vs Exact Qubit Mismatch:{manifest['vqe_vs_exact_error_mha']:.3f} mHa")

        # 1. Assert Active Electrons <= Active Spin Orbitals
        self.assertLessEqual(manifest['active_electrons'], manifest['active_spin_orbitals'],
                            f"{name}: Active electrons exceed active spin orbitals!")

        # 2. Assert Qubits == Active Spin Orbitals
        self.assertEqual(manifest['num_qubits'], manifest['active_spin_orbitals'],
                         f"{name}: Qubit count mismatch!")

        # 3. Assert Exact Qubit Hamiltonian Minimum Eigenvalue matches CASCI Reference
        exact_vs_ref_mha = abs(manifest['e_qubit_exact'] - manifest['fci_reference_hartree']) * 1000.0
        self.assertLess(exact_vs_ref_mha, 50.0,
                        f"{name}: Exact Qubit Eigenvalue diverged from CASCI reference by {exact_vs_ref_mha:.3f} mHa!")

        print(f"[PASS] {name} passed active-space energy accounting audit.")

    def test_h2(self):
        self.verify_molecule("H2", "Hydrogen Molecule")

    def test_heh_plus(self):
        self.verify_molecule("HeH+", "Helium Hydride Cation")

    def test_lih(self):
        self.verify_molecule("LiH", "Lithium Hydride")

    def test_h2o(self):
        self.verify_molecule("H2O", "Water")

    def test_nh3(self):
        self.verify_molecule("NH3", "Ammonia")

    def test_c2h4(self):
        self.verify_molecule("C2H4", "Ethylene")

if __name__ == '__main__':
    unittest.main()
