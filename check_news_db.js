import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function checkNewsDB() {
    try {
        if (!process.env.MONGODB_URI) {
            console.error("MONGODB_URI missing");
            return;
        }
        await mongoose.connect(process.env.MONGODB_URI);
        const db = mongoose.connection.db;

        // Check News collection
        const newsCount = await db.collection('news').countDocuments();
        console.log(`Total News in Database: ${newsCount}`);

        if (newsCount > 0) {
            const sample = await db.collection('news').findOne({});
            console.log("Sample News Item:", sample);
        }

        process.exit(0);
    } catch (e) {
        console.error("Error:", e);
        process.exit(1);
    }
}

checkNewsDB();
