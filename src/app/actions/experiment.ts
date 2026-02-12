"use server";

import dbConnect from '@/lib/db';
import Experiment from '@/models/Experiment';

export async function getExperiments() {
    await dbConnect();
    try {
        // Fetch last 50 experiments, newest first
        const experiments = await Experiment.find({})
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
