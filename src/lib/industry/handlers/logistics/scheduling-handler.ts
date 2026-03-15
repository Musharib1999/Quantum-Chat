import { BaseIndustryHandler } from '../base-handler';
import { IIndustryResult } from '../../types';

export class SchedulingHandler extends BaseIndustryHandler {
    async interpretResults(rawOutput: string, formData: any): Promise<IIndustryResult> {
        const drivers = parseInt(formData.number_of_drivers || formData.drivers || '4');
        const shifts = parseInt(formData.number_of_shifts || formData.shifts || '4');
        const totalQubits = drivers * shifts;

        // 1. Build the QUBO matrix (for visualization/debugging if needed, but our core needs interpretation)
        // This math is based on the logic: (Sum_i x_ij - 1)^2 + (Sum_j x_ij - 1)^2
        
        // 2. Parse rawOutput (expecting a binary string like '10000100...')
        const results = rawOutput.split('').map(bit => parseInt(bit));
        const roster: any[] = [];
        let activeQubits = 0;

        for (let i = 0; i < drivers; i++) {
            for (let j = 0; j < shifts; j++) {
                const idx = i * shifts + j;
                if (results[idx] === 1) {
                    roster.push({
                        driver: `Driver ${String.fromCharCode(65 + i)}`,
                        shift: `Shift ${j + 1}`
                    });
                    activeQubits++;
                }
            }
        }

        return {
            text: `Roster generated for **${drivers} drivers** across **${shifts} shifts**.`,
            assignmentsTable: roster.map(r => ({
                'Assignment': r.driver,
                'Time Slot': r.shift,
                'Status': 'Assigned'
            })),
            qubitCount: totalQubits
        };
    }

    /**
     * Replicates the Python build() logic for the backend simulation
     */
    buildQUBO(formData: any): Record<string, number> {
        const drivers = parseInt(formData.number_of_drivers || formData.drivers || '4');
        const shifts = parseInt(formData.number_of_shifts || formData.shifts || '4');
        const shiftPenalty = parseInt(formData.shift_penalty || formData.penalty || '10');
        const driverPenalty = parseInt(formData.driver_penalty || '10');
        const prefWeight = parseInt(formData.preference_weight || '2');

        const Q: Record<string, number> = {};
        const getV = (i: number, j: number) => i * shifts + j;

        const addQ = (u: number, v: number, val: number) => {
            const key = u <= v ? `${u},${v}` : `${v},${u}`;
            Q[key] = (Q[key] || 0) + val;
        };

        // Constraint: One driver per shift
        for (let j = 0; j < shifts; j++) {
            const vars = Array.from({ length: drivers }, (_, i) => getV(i, j));
            vars.forEach(v => addQ(v, v, -shiftPenalty));
            for (let idxA = 0; idxA < vars.length; idxA++) {
                for (let idxB = idxA + 1; idxB < vars.length; idxB++) {
                    addQ(vars[idxA], vars[idxB], 2 * shiftPenalty);
                }
            }
        }

        // Constraint: One shift per driver
        for (let i = 0; i < drivers; i++) {
            const vars = Array.from({ length: shifts }, (_, j) => getV(i, j));
            vars.forEach(v => addQ(v, v, -driverPenalty));
            for (let idxA = 0; idxA < vars.length; idxA++) {
                for (let idxB = idxA + 1; idxB < vars.length; idxB++) {
                    addQ(vars[idxA], vars[idxB], 2 * driverPenalty);
                }
            }
        }

        // Preferences (Placeholder logic: preference for diagonal/random if not provided)
        // If formData.preferences exists as a matrix, we use it here.
        if (formData.preferences) {
            // ... implementation if we add the preference UI ...
            // For now, assume a few hardcoded preferences or skip
        }

        return Q;
    }
}
