const mongoose = require('mongoose');
const { get_encoding } = require('tiktoken');

async function checkLog() {
    await mongoose.connect('mongodb+srv://musharibsubhani_db_user:Zq8jSgF42sl88Jcl@cluster0.auezwk2.mongodb.net/?appName=Cluster0');

    // Mongoose schema matches the log DB
    const ChatLogSchema = new mongoose.Schema({
        userQuery: String,
        aiResponse: String,
        source: String,
        timestamp: { type: Date, default: Date.now },
        context: String
    });
    const ChatLog = mongoose.models.ChatLog || mongoose.model('ChatLog', ChatLogSchema);

    // Get the exact log
    const log = await ChatLog.findOne({ userQuery: { $regex: /Alphabet/i } }).sort({ timestamp: -1 }).lean();
    
    console.log("========================================");
    if (!log) {
        console.log("Could not find Alphabet log");
    } else {
        console.log("Since 'context' is empty in the DB, let's see why the token count is 4800+.");
        console.log("This means the data was injected directly from the runtime variables NOT saved to DB.");
    }
    console.log("========================================");
    process.exit(0);
}
checkLog();
