const mongoose = require('mongoose');

// Connect to the admin database to list others
const MONGODB_URI = 'mongodb://127.0.0.1:27017/admin';

async function listDatabases() {
    try {
        console.log(`Connecting to MongoDB at ${MONGODB_URI}...`);
        const conn = await mongoose.connect(MONGODB_URI);
        console.log('Connected.');

        // List Databases
        const admin = new mongoose.mongo.Admin(mongoose.connection.db);
        const result = await admin.listDatabases();

        console.log('Databases:');
        for (const db of result.databases) {
            console.log(` - ${db.name} (${db.sizeOnDisk} bytes)`);
            if (db.sizeOnDisk > 0) {
                // Switch to this DB and list collections
                const newConn = mongoose.createConnection(`mongodb://127.0.0.1:27017/${db.name}`);
                await new Promise(r => newConn.once('open', r));
                const collections = await newConn.db.listCollections().toArray();
                console.log(`     Collections: ${collections.map(c => c.name).join(', ')}`);
                await newConn.close();
            }
        }

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

listDatabases();
