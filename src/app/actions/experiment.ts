"use server";

import dbConnect from '@/lib/db';
import Experiment from '@/models/Experiment';

export async function getExperiments(userEmail?: string, isAdmin: boolean = false) {
    await dbConnect();
    try {
        // If not admin and no userEmail provided, return nothing (Guest state)
        if (!isAdmin && !userEmail) {
            return [];
        }

        // Build query document
        const query: any = {};
        if (!isAdmin && userEmail) {
            query.userId = userEmail; // Regular users only see their own
        }

        // Fetch last 50 experiments, newest first
        const experiments = await Experiment.find(query)
            .sort({ timestamp: -1 })
            .limit(50)
            .lean();

        // Convert _id and dates to reliable strings for UI serialization
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
