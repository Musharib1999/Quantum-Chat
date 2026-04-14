import dbConnect from './src/lib/db';
import Hardware from './src/models/Hardware';

async function checkStatus() {
    await dbConnect();
    const dwave = await Hardware.findOne({ provider: 'dwave' });
    console.log('D-Wave Node Data:', JSON.stringify(dwave, null, 2));
    process.exit(0);
}

checkStatus();
