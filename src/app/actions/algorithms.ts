"use server";

import dbConnect from '@/lib/db';
import mongoose from 'mongoose';

/**
 * Retrieve the Qiskit code template for a given algorithm from MongoDB.
 */
export async function getAlgorithmCode(key: string): Promise<string> {
    try {
        await dbConnect();
        if (!mongoose.connection.db) {
            throw new Error("Database connection not established");
        }
        const col = mongoose.connection.db.collection('quantum_algorithms');
        const doc = await col.findOne({ key });
        return doc ? doc.qiskit_code : '';
    } catch (error) {
        console.error(`Failed to fetch algorithm code for key: ${key}`, error);
        return '';
    }
}
