import sys
sys.path.append("/Users/musharibsubhani/.gemini/antigravity/playground/prime-blazar/quantum-backend")
from v3.compiler.expander import parse_spec_to_cmm, expand_cmm_to_om
spec = {
    "entities_count": 6,
    "slots_count": 3,
    "capacity_val": 3.0,
    "variable_registry": [
        {"name": "x", "type": "BINARY", "dimensions": ["Jobs", "Machines"]}
    ],
    "constraint_registry": [
        {"name": "unique_assignment", "family": "assignment", "description": "Each job must be assigned to exactly one machine."},
        {"name": "machine_capacity", "family": "capacity", "limit_value": 3.0, "description": "Each machine can process at most 3 jobs."}
    ],
    "objectives": [
        {"name": "makespan", "type": "minimize", "description": "Minimize the maximum number of jobs assigned to any machine."}
    ]
}
try:
    cmm = parse_spec_to_cmm(spec)
    print("CMM SUCCESS")
    om = expand_cmm_to_om(cmm, "minimize maximum workload")
    print("OM SUCCESS:", len(om.variables), len(om.constraints))
except Exception as e:
    import traceback
    traceback.print_exc()
