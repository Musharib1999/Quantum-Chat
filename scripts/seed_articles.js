const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Load env vars manually to avoid dotenv dependency if not present
function loadEnv() {
    try {
        const envPath = path.join(__dirname, '..', '.env.local');
        const envFile = fs.readFileSync(envPath, 'utf8');
        const envConfig = {};
        envFile.split('\n').forEach(line => {
            const [key, ...value] = line.split('=');
            if (key && value) {
                envConfig[key.trim()] = value.join('=').trim().replace(/"/g, '');
            }
        });
        return envConfig;
    } catch (e) {
        console.error("Could not load .env.local", e);
        return {};
    }
}

const env = loadEnv();
const MONGODB_URI = env.MONGODB_URI || process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error("Please define the MONGODB_URI environment variable inside .env.local");
    process.exit(1);
}

// Define Schema inline to avoid TS compilation issues
const ArticleSchema = new mongoose.Schema({
    title: { type: String, required: true },
    category: { type: String, required: true },
    url: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
});

const Article = mongoose.models.Article || mongoose.model('Article', ArticleSchema);

const articles = [
    { title: "DiVincenzo’s Essential QC Checklist", url: "https://www.quantumcomputers.guru/divincenzos-essential-qc-checklist/", category: "Basics" },
    { title: "Z Calculus: Computational Rosetta Stone", url: "https://www.quantumcomputers.guru/z-calculus-computational-rosetta-stone/", category: "Theory" },
    { title: "Advantage Quantum Annealers", url: "https://www.quantumcomputers.guru/advantage-quantum-annealers/", category: "Hardware" },
    { title: "What is Quantum Tunneling?", url: "https://www.quantumcomputers.guru/what-is-quantum-tunneling/", category: "Basics" },
    { title: "Neutral Atoms QC: The Next Wave", url: "https://www.quantumcomputers.guru/news/neutral-atoms-qc-the-next-wave/", category: "Hardware" },
    { title: "Entanglement Swap: A Quantum Leap", url: "https://www.quantumcomputers.guru/news/entanglement-swap-a-quantum-leap-in-quantum-computing/", category: "News" },
    { title: "Quantum Money", url: "https://www.quantumcomputers.guru/news/quantum-money/", category: "Applications" },
    { title: "Quantum Internet", url: "https://www.quantumcomputers.guru/news/quantum-internet/", category: "News" },
    { title: "Quantum Clocks", url: "https://www.quantumcomputers.guru/news/quantum-clocks/", category: "News" },
    { title: "NISQ Era", url: "https://www.quantumcomputers.guru/news/nisq-era/", category: "Basics" },
    { title: "Overview for Hybrid Algorithm", url: "https://www.quantumcomputers.guru/news/an-overview-for-hybrid-algorithm-and-its-architecture/", category: "Algorithms" },
    { title: "Quantum Algorithms and its Advantages", url: "https://www.quantumcomputers.guru/news/quantum-algorithms-and-its-advantages/", category: "Algorithms" },
    { title: "Event Alert: National Quantum Showcase", url: "https://www.quantumcomputers.guru/news/event-alert-national-quantum-showcase/", category: "News" },
    { title: "Role of Quantum Computer in Metaverse", url: "https://www.quantumcomputers.guru/news/role-of-quantum-computer-in-metaverse/", category: "Applications" },
    { title: "Post Quantum Era open Source Software", url: "https://www.quantumcomputers.guru/news/getting-ready-for-post-quantum-era-with-open-source-software/", category: "News" },
    { title: "What is Quantum Computing?", url: "https://www.quantumcomputers.guru/learn/what-is-quantum-computing/", category: "Basics" },
    { title: "Quantum vs Classical Computer", url: "https://www.quantumcomputers.guru/learn/difference-between-quantum-computer-and-classical-computer/", category: "Basics" },
    { title: "Applications of Quantum Computers", url: "https://www.quantumcomputers.guru/learn/applications-of-quantum-computers/", category: "Applications" },
    { title: "Fundamentals and Evolution of QC", url: "https://www.quantumcomputers.guru/learn/fundamentals-and-evolution-of-quantum-computing/", category: "Basics" },
    { title: "Grover’s Algorithm using Qiskit", url: "https://www.quantumcomputers.guru/learn/implementing-grovers-algorithm-using-qiskit/", category: "Tutorials" },
    { title: "Shor’s Algorithm using Qiskit", url: "https://www.quantumcomputers.guru/learn/implementing-shors-algorithm-using-qiskit/", category: "Tutorials" },
    { title: "Qiskit Textbook", url: "https://www.quantumcomputers.guru/learn/qiskit-textbook/", category: "Resources" },
    { title: "Cirq Textbook", url: "https://www.quantumcomputers.guru/learn/cirq-textbook/", category: "Resources" },
    { title: "Bitcoin Blockchain and Quantum Computer – II", url: "https://www.quantumcomputers.guru/news/bitcoin-blockchain-and-quantum-computer-ii/", category: "Security" },
    { title: "Bitcoin Blockchain and Quantum Computer-I", url: "https://www.quantumcomputers.guru/news/bitcoin-blockchain-and-quantum-computer-i/", category: "Security" },
    { title: "Molecular Biology Quantum Advantage", url: "https://www.quantumcomputers.guru/news/molecular-biology-as-in-seek-of-quantum-advantage/", category: "Applications" },
    { title: "Traffic Management using D-Wave", url: "https://www.quantumcomputers.guru/news/traffic-management-using-dwave-by-volkswagen/", category: "Applications" },
    { title: "Search Engine using Quantum Realm", url: "https://www.quantumcomputers.guru/news/search-engine-using-quantum-realm-sounds-interesting/", category: "Applications" },
    { title: "ARQIT’s QuantumCloud and Encryption", url: "https://www.quantumcomputers.guru/news/arqits-quantumcloud-and-quantum-encryption/", category: "Security" },
    { title: "Quantum Supremacy Google And USTC", url: "https://www.quantumcomputers.guru/news/quantum-supremacy-google-and-ustcchina/", category: "News" },
    { title: "Cryptography with QKD", url: "https://www.quantumcomputers.guru/news/future-of-cryptography-with-quantum-key-distributionqkd/", category: "Security" },
];

async function seed() {
    try {
        console.log("Connecting to MongoDB...");
        await mongoose.connect(MONGODB_URI);
        console.log("Connected.");

        console.log("Clearing existing articles...");
        await Article.deleteMany({});
        console.log("Cleared.");

        console.log("Seeding articles...");
        const result = await Article.insertMany(articles);
        console.log(`Successfully seeded ${result.length} articles.`);

        process.exit(0);
    } catch (error) {
        console.error("Error seeding database:", error);
        process.exit(1);
    }
}

seed();
