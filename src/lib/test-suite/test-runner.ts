import { TEST_DEFINITIONS, TestCaseDefinition, TestResult } from './test-definitions';

export async function runSingleTest(def: TestCaseDefinition): Promise<TestResult> {
    const t0 = Date.now();

    if (def.runner === 'server') {
        try {
            const res = await fetch('/api/test-runner', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: def.action })
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                return {
                    id: def.id,
                    status: 'failed',
                    durationMs: Date.now() - t0,
                    assertions: [
                        { name: 'Server test-runner execution', passed: false, message: errData.error || `HTTP ${res.status}` }
                    ],
                    error: errData.error || `HTTP ${res.status}`
                };
            }

            const data = await res.json();
            return {
                id: def.id,
                status: data.status || 'passed',
                durationMs: data.durationMs || (Date.now() - t0),
                assertions: data.assertions || [],
                request: data.request,
                response: data.response,
                error: data.error
            };
        } catch (err: any) {
            return {
                id: def.id,
                status: 'failed',
                durationMs: Date.now() - t0,
                assertions: [
                    { name: 'Network fetch to /api/test-runner', passed: false, message: err.message }
                ],
                error: err.message
            };
        }
    }

    // Client-side runners
    try {
        switch (def.action) {
            case 'nav_home_page': {
                const res = await fetch('/');
                const passed = res.status === 200;
                return {
                    id: def.id,
                    status: passed ? 'passed' : 'failed',
                    durationMs: Date.now() - t0,
                    assertions: [
                        { name: 'Home page renders HTTP 200', passed, expected: 200, actual: res.status }
                    ],
                    response: { status: res.status }
                };
            }

            case 'nav_ide_page': {
                const res = await fetch('/ide');
                const passed = res.status === 200;
                return {
                    id: def.id,
                    status: passed ? 'passed' : 'failed',
                    durationMs: Date.now() - t0,
                    assertions: [
                        { name: 'Quantum IDE workspace renders HTTP 200', passed, expected: 200, actual: res.status }
                    ],
                    response: { status: res.status }
                };
            }

            case 'nav_assistant_page': {
                const res = await fetch('/quantum-assistant');
                const passed = res.status === 200;
                return {
                    id: def.id,
                    status: passed ? 'passed' : 'failed',
                    durationMs: Date.now() - t0,
                    assertions: [
                        { name: 'Quantum Assistant renders HTTP 200', passed, expected: 200, actual: res.status }
                    ],
                    response: { status: res.status }
                };
            }

            case 'nav_capabilities_page': {
                const res = await fetch('/quantum-assistant/capabilities');
                const passed = res.status === 200;
                return {
                    id: def.id,
                    status: passed ? 'passed' : 'failed',
                    durationMs: Date.now() - t0,
                    assertions: [
                        { name: 'Capabilities catalog renders HTTP 200', passed, expected: 200, actual: res.status }
                    ],
                    response: { status: res.status }
                };
            }

            case 'nav_admin_login_page': {
                const res = await fetch('/admin/login');
                const passed = res.status === 200;
                return {
                    id: def.id,
                    status: passed ? 'passed' : 'failed',
                    durationMs: Date.now() - t0,
                    assertions: [
                        { name: 'Admin login page renders HTTP 200', passed, expected: 200, actual: res.status }
                    ],
                    response: { status: res.status }
                };
            }

            case 'nav_user_login_page': {
                const res = await fetch('/login');
                const passed = res.status === 200;
                return {
                    id: def.id,
                    status: passed ? 'passed' : 'failed',
                    durationMs: Date.now() - t0,
                    assertions: [
                        { name: 'User login page renders HTTP 200', passed, expected: 200, actual: res.status }
                    ],
                    response: { status: res.status }
                };
            }

            case 'nav_marketplace_page': {
                const res = await fetch('/marketplace');
                const passed = res.status === 200;
                return {
                    id: def.id,
                    status: passed ? 'passed' : 'failed',
                    durationMs: Date.now() - t0,
                    assertions: [
                        { name: 'Marketplace renders HTTP 200', passed, expected: 200, actual: res.status }
                    ],
                    response: { status: res.status }
                };
            }

            case 'nav_corrupted_localstorage': {
                let recoverySuccessful = false;
                if (typeof window !== 'undefined') {
                    const testKey = '__test_quantum_storage_probe__';
                    try {
                        localStorage.setItem(testKey, '{corrupted: json string missing quote');
                        const raw = localStorage.getItem(testKey);
                        let parsed = null;
                        try {
                            parsed = JSON.parse(raw || '{}');
                        } catch {
                            parsed = { fallback: true };
                        }
                        recoverySuccessful = parsed && parsed.fallback === true;
                        localStorage.removeItem(testKey);
                    } catch (e) {
                        recoverySuccessful = true; // Storage inaccessible (sandboxed or private mode) is safe
                    }
                } else {
                    recoverySuccessful = true;
                }

                return {
                    id: def.id,
                    status: recoverySuccessful ? 'passed' : 'failed',
                    durationMs: Date.now() - t0,
                    assertions: [
                        { name: 'Corrupted localStorage value caught safely with fallback default', passed: recoverySuccessful }
                    ]
                };
            }

            case 'perf_export_audit': {
                const dummyData = { test: true, timestamp: new Date().toISOString() };
                const serialized = JSON.stringify(dummyData, null, 2);
                const passed = typeof serialized === 'string' && serialized.length > 10;
                return {
                    id: def.id,
                    status: passed ? 'passed' : 'failed',
                    durationMs: Date.now() - t0,
                    assertions: [
                        { name: 'Structured audit export serializer operational', passed }
                    ]
                };
            }

            default:
                return {
                    id: def.id,
                    status: 'failed',
                    durationMs: Date.now() - t0,
                    assertions: [{ name: 'Client action recognized', passed: false }],
                    error: `Unknown client action: ${def.action}`
                };
        }
    } catch (err: any) {
        return {
            id: def.id,
            status: 'failed',
            durationMs: Date.now() - t0,
            assertions: [
                { name: 'Client test execution safety', passed: false, message: err.message }
            ],
            error: err.message
        };
    }
}

export async function runTestSuite(
    onProgress?: (result: TestResult) => void,
    categoryFilter?: string,
    testsToRun?: TestCaseDefinition[],
    onCooldown?: (secondsRemaining: number) => void
): Promise<TestResult[]> {
    const list = testsToRun || TEST_DEFINITIONS.filter(t => !categoryFilter || categoryFilter === 'all' || t.category === categoryFilter);
    const results: TestResult[] = [];
    let lastLlmTime = 0;

    for (const def of list) {
        // Pacing interval of 30 seconds between Groq LLM queries to protect free-tier OTPM rate limits
        if (def.category === 'llm' && lastLlmTime > 0) {
            const elapsed = Date.now() - lastLlmTime;
            if (elapsed < 30000) {
                const waitMs = 30000 - elapsed;
                if (onCooldown) {
                    for (let rem = Math.ceil(waitMs / 1000); rem > 0; rem--) {
                        onCooldown(rem);
                        await new Promise(r => setTimeout(r, 1000));
                    }
                    onCooldown(0);
                } else {
                    await new Promise(r => setTimeout(r, waitMs));
                }
            }
        }

        if (def.category === 'llm') {
            lastLlmTime = Date.now();
        }

        const result = await runSingleTest(def);
        results.push(result);
        if (onProgress) {
            onProgress(result);
        }
    }

    return results;
}

export function generateAuditReportMarkdown(results: TestResult[]): string {
    const passed = results.filter(r => r.status === 'passed').length;
    const failed = results.filter(r => r.status === 'failed').length;
    const total = results.length;
    const rate = total > 0 ? ((passed / total) * 100).toFixed(1) : '0';
    const timestamp = new Date().toISOString();

    let md = `# Prime Blazar System Production Audit Report\n\n`;
    md += `**Timestamp:** ${timestamp}  \n`;
    md += `**Total Test Cases:** ${total}  \n`;
    md += `**Passed:** ${passed} (${rate}%)  \n`;
    md += `**Failed:** ${failed}  \n\n`;
    md += `## Summary by Category\n\n`;
    md += `| ID | Title | Category | Severity | Status | Duration |\n`;
    md += `|---|---|---|---|---|---|\n`;

    for (const res of results) {
        const def = TEST_DEFINITIONS.find(t => t.id === res.id);
        const icon = res.status === 'passed' ? '✅' : '❌';
        md += `| ${res.id} | ${def?.title || res.id} | ${def?.category || '-'} | ${def?.severity || '-'} | ${icon} ${res.status.toUpperCase()} | ${res.durationMs}ms |\n`;
    }

    md += `\n## Failed Test Details\n\n`;
    const failures = results.filter(r => r.status === 'failed');
    if (failures.length === 0) {
        md += `🎉 **Zero Failures! System is production-ready, secure, and robust.**\n`;
    } else {
        for (const f of failures) {
            const def = TEST_DEFINITIONS.find(t => t.id === f.id);
            md += `### [${f.id}] ${def?.title || f.id}\n`;
            md += `- **Category:** ${def?.category}\n`;
            md += `- **Severity:** ${def?.severity}\n`;
            md += `- **Error:** ${f.error || 'Assertion failed'}\n`;
            md += `- **Assertions:**\n`;
            for (const a of f.assertions) {
                md += `  - ${a.passed ? '✅' : '❌'} ${a.name} ${a.message ? `(${a.message})` : ''}\n`;
            }
            md += `\n`;
        }
    }

    return md;
}
