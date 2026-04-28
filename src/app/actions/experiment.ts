"use server";

import dbConnect from '@/lib/db';
import Shot from '@/models/Shot';

/**
 * Fetches a lightweight list of experiments for the sidebar/history panel.
 * Only includes fields needed for display — excludes heavy fields like
 * qiskitCode, results (raw output), analysis (LLM text), and chartData.
 */
export async function getExperiments(userEmail?: string, isAdmin: boolean = false, source?: string) {
    await dbConnect();
    try {
        if (!isAdmin && !userEmail) {
            return [];
        }

        const query: any = {};
        if (!isAdmin && userEmail) {
            query.userId = userEmail;
        }
        
        if (source) {
            query.source = source;
        }

        // Only select lightweight fields needed for the list view
        const experiments = await Shot.find(query, {
            _id: 1,
            userId: 1,
            industry: 1,
            service: 1,
            problem: 1,
            hardware: 1,
            parameters: 1,
            timestamp: 1,
            cacheKey: 1,
            qubitCount: 1,
            source: 1,
            // Deliberately excluded: qiskitCode, results, analysis, chartData, assignmentsTable
        })
            .sort({ timestamp: -1 })
            .limit(source ? 10 : 50) // Take fewer if specifically polling for streams
            .lean();

        return experiments.map((exp: any) => ({
            ...exp,
            _id: exp._id.toString(),
            timestamp: exp.timestamp.toISOString()
        }));
    } catch (error) {
        console.error("Failed to fetch experiments:", error);
        return [];
    }
}

/**
 * Fetches the full experiment record (including heavy fields) for the detail modal.
 * Only called on demand when a user clicks to view an experiment.
 */
export async function getExperimentById(id: string) {
    await dbConnect();
    try {
        const Mongoose = (await import('mongoose')).default;
        const exp = await Shot.findById(new Mongoose.Types.ObjectId(id)).lean() as any;
        if (!exp) return null;
        return {
            ...exp,
            _id: exp._id.toString(),
            timestamp: exp.timestamp.toISOString()
        };
    } catch (error) {
        console.error("Failed to fetch experiment by id:", error);
        return null;
    }
}
