const { execSync } = require('child_process');
const fs = require('fs');

console.log("=== Node.js Python Path Diagnostic ===");
console.log("Current Directory:", process.cwd());
console.log("PATH Environment Variable:", process.env.PATH);

try {
    const whichPython3 = execSync('which python3').toString().trim();
    console.log("SUCCESS: 'which python3' returned:", whichPython3);
} catch (e) {
    console.error("FAILURE: 'which python3' failed:", e.message);
}

const hardcodedPath = '/Library/Frameworks/Python.framework/Versions/3.13/bin/python3';
try {
    if (fs.existsSync(hardcodedPath)) {
        console.log("SUCCESS: Hardcoded path exists:", hardcodedPath);
        // Try executing it with --version
        const version = execSync(`"${hardcodedPath}" --version`).toString().trim();
        console.log("SUCCESS: Hardcoded path execution:", version);
    } else {
        console.error("FAILURE: Hardcoded path does NOT exist:", hardcodedPath);
    }
} catch (e) {
    console.error("FAILURE: Hardcoded path execution failed:", e.message);
}

try {
    const whichPython = execSync('which python').toString().trim();
    console.log("SUCCESS: 'which python' returned:", whichPython);
} catch (e) {
    console.error("FAILURE: 'which python' failed:", e.message);
}
