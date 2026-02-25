const { chatWithGroq } = require('./.next/server/app/actions/chat.js') || {};

async function run() {
    process.env.GROQ_API_KEY = "broken";
    console.log("Mocking invalid key...");
    // Since Next.js server actions are compiled heavily, 
    // it's easier to just trigger the fallback via the frontend in a real browser.
}
run();
