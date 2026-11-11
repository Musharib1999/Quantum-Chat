use pyo3::prelude::*;

/// Ultra-Fast Native Rust QUBO Matrix Compiler
/// Computes exact quadratic Hamiltonian coefficients analytically in a single pass.
#[pyfunction]
#[pyo3(signature = (
    n_vars,
    obj_indices,
    obj_coefs,
    quad_obj_i,
    quad_obj_j,
    quad_obj_w,
    dep_pos,
    dep_neg,
    mut_a,
    mut_b,
    clique_groups,
    eq_indices,
    eq_coefs,
    eq_rhs,
    penalty_weight
))]
pub fn compile_qubo_dense(
    n_vars: usize,
    obj_indices: Vec<usize>,
    obj_coefs: Vec<f64>,
    quad_obj_i: Vec<usize>,
    quad_obj_j: Vec<usize>,
    quad_obj_w: Vec<f64>,
    dep_pos: Vec<usize>,
    dep_neg: Vec<usize>,
    mut_a: Vec<usize>,
    mut_b: Vec<usize>,
    clique_groups: Vec<Vec<usize>>,
    eq_indices: Vec<Vec<usize>>,
    eq_coefs: Vec<Vec<f64>>,
    eq_rhs: Vec<f64>,
    penalty_weight: f64,
) -> PyResult<(Vec<f64>, f64)> {
    let total_elements = n_vars * n_vars;
    let mut q = vec![0.0f64; total_elements];
    let mut offset = 0.0f64;

    // 1. Linear Objective Terms (Q[i, i] += c)
    for (i, c) in obj_indices.iter().zip(obj_coefs.iter()) {
        if *i < n_vars {
            q[i * n_vars + i] += *c;
        }
    }

    // 2. Quadratic Objective Cross-Couplings (w * x_i * x_j)
    for k in 0..quad_obj_i.len() {
        let i = quad_obj_i[k];
        let j = quad_obj_j[k];
        let w = quad_obj_w[k];
        if i < n_vars && j < n_vars {
            let (min_idx, max_idx) = if i <= j { (i, j) } else { (j, i) };
            q[min_idx * n_vars + max_idx] += w;
        }
    }

    // 3. Exact Dependency Constraints (x_pos <= x_neg -> Penalty = gamma * (x_pos - x_pos * x_neg))
    for (pos, neg) in dep_pos.iter().zip(dep_neg.iter()) {
        if *pos < n_vars && *neg < n_vars {
            q[pos * n_vars + pos] += penalty_weight;
            let (a, b) = if pos <= neg { (*pos, *neg) } else { (*neg, *pos) };
            q[a * n_vars + b] -= penalty_weight;
        }
    }

    // 4. Exact 2-Variable Mutual Exclusion (x_a + x_b <= 1 -> Penalty = gamma * x_a * x_b)
    for (a, b) in mut_a.iter().zip(mut_b.iter()) {
        if *a < n_vars && *b < n_vars {
            let (min_idx, max_idx) = if a <= b { (*a, *b) } else { (*b, *a) };
            q[min_idx * n_vars + max_idx] += penalty_weight;
        }
    }

    // 5. Clique At-Most-One Mutex (sum_{i in S} x_i <= 1 -> Penalty = gamma * sum_{a < b} x_a * x_b)
    for group in clique_groups.iter() {
        let len = group.len();
        for a in 0..len {
            let idx_a = group[a];
            if idx_a >= n_vars {
                continue;
            }
            for b in (a + 1)..len {
                let idx_b = group[b];
                if idx_b >= n_vars {
                    continue;
                }
                let (min_idx, max_idx) = if idx_a <= idx_b { (idx_a, idx_b) } else { (idx_b, idx_a) };
                q[min_idx * n_vars + max_idx] += penalty_weight;
            }
        }
    }

    // 6. Algebraic Equality & Slack Inequality Constraints ( (sum c_i x_i - rhs)^2 )
    // Expansion: sum_i (c_i^2 - 2*rhs*c_i) x_i + 2 * sum_{i < j} c_i*c_j x_i*x_j + rhs^2
    let n_eq = eq_indices.len();
    for k in 0..n_eq {
        let idxs = &eq_indices[k];
        let coefs = &eq_coefs[k];
        let rhs = eq_rhs[k];
        let k_len = idxs.len();

        offset += penalty_weight * rhs * rhs;

        // Diagonal linear terms
        for m in 0..k_len {
            let i = idxs[m];
            if i >= n_vars {
                continue;
            }
            let c = coefs[m];
            q[i * n_vars + i] += penalty_weight * (c * c - 2.0 * rhs * c);

            // Off-diagonal quadratic couplings
            for p in (m + 1)..k_len {
                let j = idxs[p];
                if j >= n_vars {
                    continue;
                }
                let c_j = coefs[p];
                let (min_idx, max_idx) = if i <= j { (i, j) } else { (j, i) };
                q[min_idx * n_vars + max_idx] += penalty_weight * (2.0 * c * c_j);
            }
        }
    }

    Ok((q, offset))
}

#[pyfunction]
pub fn is_fast_available() -> bool {
    true
}

#[pymodule]
fn autoqubo_fast(m: &Bound<'_, PyModule>) -> PyResult<()> {
    m.add_function(wrap_pyfunction!(compile_qubo_dense, m)?)?;
    m.add_function(wrap_pyfunction!(is_fast_available, m)?)?;
    Ok(())
}
