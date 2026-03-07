import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

// Validated inside dbConnect

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development. This prevents connections growing exponentially
 * during API Route usage.
 */
// @ts-ignore
let cached = global.mongoose;

if (!cached) {
    // @ts-ignore
    cached = global.mongoose = { conn: null, promise: null };
}

async function dbConnect() {
    if (!MONGODB_URI) {
        throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
    }
    if (cached.conn) {
        return cached.conn;
    }

    if (!cached.promise) {
        const opts = {
            bufferCommands: false,
            maxPoolSize: 10, // Limit connections per serverless instance to prevent free-tier exhaustion
            minPoolSize: 1,
            serverSelectionTimeoutMS: 5000, // Fail fast after 5s instead of hanging
            socketTimeoutMS: 45000,
            family: 4 // Use IPv4 specifically to prevent IPv6 DNS resolution timeouts
        };

        cached.promise = mongoose.connect(MONGODB_URI!, opts).then((mongoose) => {
            return mongoose;
        });
    }
    try {
        cached.conn = await cached.promise;
    } catch (e) {
        cached.promise = null;
        throw e;
    }

    return cached.conn;
}

export default dbConnect;
