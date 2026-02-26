const mongoose = require('mongoose');

require('dotenv').config();

async function checkLog() {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB!");

    // We only need the simplest dynamic schema to read the raw logs
    const ChatLogSchema = new mongoose.Schema({
        userQuery: String,
        aiResponse: String,
        source: String,
        timestamp: { type: Date, default: Date.now },
        context: String
    });
    const ChatLog = mongoose.models.ChatLog || mongoose.model('ChatLog', ChatLogSchema);

    // Let's grab the last 5 logs from around that time
    const logs = await ChatLog.find().sort({ timestamp: -1 }).limit(5).lean();

    logs.forEach(log => {
        console.log("-----------------------------------------");
        console.log(`TIME: ${log.timestamp}`);
        console.log(`SOURCE: ${log.source}`);
        console.log(`USER ASKED: ${log.userQuery}`);
        // Only print first 200 chars to avoid flooding the terminal
        console.log(`AI REPLIED: ${log.aiResponse?.substring(0, 200)}...`);
    });

    process.exit(0);
}
checkLog();
