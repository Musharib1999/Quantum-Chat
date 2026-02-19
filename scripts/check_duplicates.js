const mongoose = require('mongoose');
const QuantumForm = require('./src/models/QuantumForm').default; // Adjust import based on your setup
require('dotenv').config({ path: '.env.local' });

async function checkDuplicates() {
    await mongoose.connect(process.env.MONGODB_URI);
    const forms = await QuantumForm.find({});
    console.log('--- Forms with Duplicate Industry/Problem ---');
    forms.forEach(f => {
        if (f.industry === f.problem) {
            console.log(`ID: ${f._id} | Industry: ${f.industry} | Problem: ${f.problem}`);
        }
    });
    console.log('--- End ---');
    mongoose.disconnect();
}
checkDuplicates();
