import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config();

async function testConnectivity() {
    const url = process.env.MARKET_SERVICE_URL || 'http://localhost:3001';
    const key = process.env.MARKET_SERVICE_KEY;
    const testSymbol = 'AAPL';

    console.log(`--- Connectivity Test ---`);
    console.log(`URL: ${url}`);
    console.log(`Key set: ${key ? 'Yes' : 'No'}`);
    console.log(`Testing Symbol: ${testSymbol}`);

    try {
        const fullUrl = `${url}/api/stocks?symbol=${testSymbol}`;
        const response = await fetch(fullUrl, {
            headers: { 'Authorization': `Bearer ${key}` }
        });

        console.log(`Result Status: ${response.status}`);
        const data = await response.json();
        console.log(`Result Data:`, JSON.stringify(data, null, 2));

        if (response.ok) {
            console.log(`\n✅ Service is reachable and responding correctly!`);
        } else {
            console.log(`\n❌ Service returned an error. Check logs in the Market Service repo.`);
        }
    } catch (e) {
        console.error(`\n❌ Failed to connect to Market Service:`, e.message);
        console.log(`Check if the service is running at ${url}`);
    }
}

testConnectivity();
