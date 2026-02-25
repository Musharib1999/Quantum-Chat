import { automateNewsSummarization } from './src/app/actions/news-automation.js';

async function run() {
    console.log("Running automation...");
    const res = await automateNewsSummarization();
    console.log(res);
}
run();
