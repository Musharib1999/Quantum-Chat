const mongoose = require('mongoose');

require('dotenv').config();

async function checkLog() {
    await mongoose.connect(process.env.MONGODB_URI);

    const ChatLogSchema = new mongoose.Schema({
        userQuery: String,
        aiResponse: String,
        source: String,
        timestamp: { type: Date, default: Date.now },
        context: String
    });
    const ChatLog = mongoose.models.ChatLog || mongoose.model('ChatLog', ChatLogSchema);

    // Get the log exactly from when Alphabet was queried
    const log = await ChatLog.findOne({ userQuery: { $regex: /Alphabet/i } }).sort({ timestamp: -1 }).lean();

    if (log) {
        console.log("==================================================");
        console.log(`TIME: ${log.timestamp}`);
        console.log(`USER ASKED: ${log.userQuery}`);
        console.log(`--- CONTEXT SENT TO GROQ (First 1500 chars) ---`);
        console.log(log.context?.substring(0, 1500) || "No context found");
        console.log("==================================================");
    }

    process.exit(0);
}
checkLog();
