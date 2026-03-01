const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function main() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const db = mongoose.connection.db;
        const prompts = await db.collection('systemprompts').find({ category: 'general_conversation' }).toArray();
        console.log(JSON.stringify(prompts, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
}
main();
