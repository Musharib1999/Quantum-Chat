"use client";

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';

interface IField {
    label: string;
    key: string;
    type: 'text' | 'number' | 'select' | 'multi-select' | 'range' | 'textarea' | 'dropdown';
    options?: (string | { label: string; value: string })[];
    description?: string;
    defaultValue?: string;
    required?: boolean;
}

interface IOutputMapping {
    resultKey: string;
    label: string;
    type: 'text' | 'number' | 'percentage' | 'boolean';
    priority?: number;
}

interface IChartConfig {
    type: 'bar' | 'line' | 'pie' | 'scatter';
    xKey: string;
    yKey: string;
    label: string;
}

interface IQuantumForm {
    _id?: string;
    industry: string;
    service: string;
    problem: string;
    hardware: string;
    description: string;
    fields: IField[];
    sections?: { section_name: string; fields: IField[] }[];
    codeTemplates?: { 
        hardware: string; 
        code: string; 
        aiEnabled: boolean; 
        llmModelId?: string;
        batchingEnabled?: boolean;
        maxQubitsPerBatch?: number;
        qubitFormula?: string;
        batchKey?: string;
    }[];
    active: boolean;
    batchingEnabled?: boolean;
    maxQubitsPerBatch?: number;
    qubitFormula?: string;
    batchKey?: string;
    outputMapping?: IOutputMapping[];
    outputTables?: { name: string; mapping: IOutputMapping[] }[];
    interpretationPrompt?: string;
    chartConfig?: IChartConfig[];
    executionEnvironment?: 'python-qiskit' | 'python-dwave';
    isToyProblem?: boolean;
    createdAt?: string;
    updatedAt?: string;
}

export default function ProblemConsole() {
    const { user } = useAuth();
    // Current Selection
    const [industry, setIndustry] = useState('');
    const [service, setService] = useState('');
    const [problem, setProblem] = useState('');
    const [hardware, setHardware] = useState('Universal');
    const [description, setDescription] = useState('');
    const [isToyProblem, setIsToyProblem] = useState(false);
    const [activeTab, setActiveTab] = useState<'input' | 'compute' | 'output' | 'ai'>('input');

    // Tab 1: Input State
    const [fields, setFields] = useState<IField[]>([]);
    const [editorMode, setEditorMode] = useState<'visual' | 'json'>('visual');
    const [jsonFields, setJsonFields] = useState('[]');

    // Tab 2: Compute State
    const [codeTemplates, setCodeTemplates] = useState<{ 
        hardware: string; 
        code: string; 
        aiEnabled: boolean; 
        llmModelId?: string;
        batchingEnabled?: boolean;
        maxQubitsPerBatch?: number;
        qubitFormula?: string;
        batchKey?: string;
    }[]>([]);
    const [batchingEnabled, setBatchingEnabled] = useState(false);
    const [maxQubitsPerBatch, setMaxQubitsPerBatch] = useState(64);
    const [qubitFormula, setQubitFormula] = useState('');
    const [batchKey, setBatchKey] = useState('');
    const [executionEnvironment, setExecutionEnvironment] = useState<'python-qiskit' | 'python-dwave'>('python-qiskit');

    // Tab 3: Output State
    const [outputMapping, setOutputMapping] = useState<IOutputMapping[]>([]);
    const [outputTables, setOutputTables] = useState<{ name: string; mapping: IOutputMapping[] }[]>([]);
    const [chartConfig, setChartConfig] = useState<IChartConfig[]>([]);

    // Tab 4: AI State
    const [interpretationPrompt, setInterpretationPrompt] = useState('');

    // UI State
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState('');
    const [view, setView] = useState<'editor' | 'overview'>('overview');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingField, setEditingField] = useState<IField | null>(null);
    const [editingFieldIndex, setEditingFieldIndex] = useState<number | null>(null);
    const [dryRunning, setDryRunning] = useState(false);
    const [dryRunResult, setDryRunResult] = useState<any | null>(null);
    const [suggestions, setSuggestions] = useState<string[]>([]);

    // Data State
    const [existingForms, setExistingForms] = useState<IQuantumForm[]>([]);
    const [metadata, setMetadata] = useState<{ industries: any[], services: any[], problemMapping: any }>({ industries: [], services: [], problemMapping: {} });
    const [hardwareList, setHardwareList] = useState<any[]>([]);
    const [llmModels, setLlmModels] = useState<any[]>([]);

    useEffect(() => {
        if (user) {
            fetchInitialData();
        }
    }, [user?.email, user?.role]);

    const fetchInitialData = async () => {
        try {
            const [formsRes, metaRes, hwRes, llmRes] = await Promise.all([
                axios.get(`/api/quantum-forms?userEmail=${user?.email || ''}&userRole=${user?.role || ''}`),
                axios.get('/api/quantum-forms/metadata'),
                axios.get('/api/hardware'),
                axios.get('/api/admin/llm-settings')
            ]);
            setExistingForms(formsRes.data);
            setMetadata(metaRes.data);
            setHardwareList(hwRes.data);
            setLlmModels(llmRes.data);
        } catch (error: any) {
            console.error("Failed to fetch admin data", error);
            setStatus("Error: " + error.message);
        }
    };

    const handleDryRun = async () => {
        if (codeTemplates.length === 0) {
            alert("Please add at least one code template to perform a dry run.");
            return;
        }
        setDryRunning(true);
        setStatus("Running quantum simulation dry run, generating chart mapping suggestions...");
        try {
            // Find the template for the current hardware, or fallback to Universal
            const template = codeTemplates.find(t => t.hardware === hardware) || codeTemplates[0];
            const inferredEnv = template.hardware.toLowerCase().includes('dwave') ? 'python-dwave' : 'python-qiskit';
            
            const res = await axios.post('/api/admin/quantum-dry-run', {
                code: template.aiEnabled ? "" : template.code,
                hardware: template.hardware,
                aiEnabled: template.aiEnabled,
                llmModelId: template.llmModelId,
                executionEnvironment: inferredEnv
            });
            setDryRunResult(res.data.rawResult);
            setSuggestions(res.data.suggestions || []);
            setStatus("Dry run successful. Check suggestions in Data Mapping.");
            setActiveTab('output'); // Switch to output tab to see suggestions
        } catch (error: any) {
            setStatus("Dry Run Error: " + (error.response?.data?.error || error.message));
        } finally {
            setDryRunning(false);
        }
    };

    const handleSave = async () => {
        setLoading(true);
        setStatus('Saving...');
        try {
            let payload: any = {
                industry,
                service,
                problem,
                hardware,
                description,
                isToyProblem,
                active: true,
                fields,
                codeTemplates,
                interpretationPrompt,
                outputMapping,
                outputTables,
                chartConfig,
                // Ensure legacy global fields are populated for backward compatibility
                batchingEnabled: codeTemplates[0]?.batchingEnabled || batchingEnabled,
                maxQubitsPerBatch: codeTemplates[0]?.maxQubitsPerBatch || maxQubitsPerBatch,
                qubitFormula: codeTemplates[0]?.qubitFormula || qubitFormula,
                batchKey: codeTemplates[0]?.batchKey || batchKey,
                // Automatically infer global environment from the first template for legacy DB support
                executionEnvironment: (codeTemplates[0]?.hardware?.toLowerCase().includes('dwave')) ? 'python-dwave' : 'python-qiskit',
                createdBy: user?.email || 'admin'
            };

            if (editingId) {
                payload._id = editingId;
            }

            if (editorMode === 'json') {
                try {
                    const parsed = JSON.parse(jsonFields);
                    // Clear both to start fresh from JSON source
                    payload.fields = [];
                    payload.sections = [];
                    
                    if (Array.isArray(parsed)) {
                        payload.fields = parsed;
                    } else if (typeof parsed === 'object' && parsed !== null) {
                        if (parsed.sections) payload.sections = parsed.sections;
                        if (parsed.fields) payload.fields = parsed.fields;
                    }
                } catch (e: any) {
                    throw new Error("Invalid JSON: " + e.message);
                }
            } else {
                // In visual mode, we only edit flat fields
                payload.fields = fields;
                payload.sections = []; // Reset sections if switching to flat mode
            }

            await axios.post('/api/quantum-forms', payload);
            setStatus('Blueprint saved');
            fetchInitialData();
            setTimeout(() => setView('overview'), 1000);
        } catch (error: any) {
            setStatus('Error: ' + (error.response?.data?.error || error.message));
        } finally {
            setLoading(false);
        }
    };

    const handleToggleActive = async (form: IQuantumForm) => {
        try {
            const newActive = !form.active;
            await axios.patch(`/api/quantum-forms/${form._id}`, { active: newActive });
            setExistingForms(prev => prev.map(f => f._id === form._id ? { ...f, active: newActive } : f));
            setStatus(`${form.problem} has been ${newActive ? 'activated' : 'deactivated'}`);
        } catch (error: any) {
            setStatus('Error toggling status: ' + (error.response?.data?.error || error.message));
        }
    };

    const handleDelete = async (form: IQuantumForm) => {
        if (!window.confirm(`Are you sure you want to delete the blueprint for "${form.problem}"? This action cannot be undone.`)) return;
        
        try {
            await axios.delete(`/api/quantum-forms/${form._id}`);
            setExistingForms(prev => prev.filter(f => f._id !== form._id));
            setStatus(`${form.problem} deleted successfully`);
        } catch (error: any) {
            setStatus('Error deleting blueprint: ' + (error.response?.data?.error || error.message));
        }
    };

    const editForm = (form: IQuantumForm) => {
        setIndustry(form.industry);
        setService(form.service);
        setProblem(form.problem || '');
        setHardware(form.hardware || 'Universal');
        setDescription(form.description || '');
        setIsToyProblem(form.isToyProblem || false);
        
        // 1. Handle Parameter Loading (Fields vs Sections)
        const hasSections = form.sections && form.sections.length > 0;
        const hasFields = form.fields && form.fields.length > 0;

        if (hasSections) {
            // Priority: Load sections into JSON mode to preserve structure
            setFields([]); 
            setJsonFields(JSON.stringify({ sections: form.sections }, null, 2));
            setEditorMode('json');
        } else {
            // Standard: Load flat fields
            setFields(form.fields || []);
            setJsonFields(JSON.stringify(form.fields || [], null, 2));
            setEditorMode('visual');
        }

        // 2. Handle Logic Templates & Batching Migration
        let templates = form.codeTemplates || [];
        if (templates.length === 0 && (form as any).aiEnabled) {
            templates = [{
                hardware: 'Universal',
                code: '',
                aiEnabled: true,
                llmModelId: (form as any).llmModelId
            }];
        }

        // Migration logic: Seed templates with global batching settings if they are missing
        const migratedTemplates = templates.map(t => ({
            ...t,
            batchingEnabled: t.batchingEnabled ?? form.batchingEnabled ?? false,
            maxQubitsPerBatch: t.maxQubitsPerBatch ?? form.maxQubitsPerBatch ?? 64,
            qubitFormula: t.qubitFormula || form.qubitFormula || '',
            batchKey: t.batchKey || form.batchKey || ''
        }));
        
        setCodeTemplates(migratedTemplates);
        setBatchingEnabled(form.batchingEnabled || false);
        setQubitFormula(form.qubitFormula || '');
        setMaxQubitsPerBatch(form.maxQubitsPerBatch || 64);
        setBatchKey(form.batchKey || '');
        setInterpretationPrompt(form.interpretationPrompt || '');
        
        setEditingId(form._id || null);
        setView('editor');
        setActiveTab('input');
    };

    const resetForm = () => {
        setEditingId(null); // Clear ID for new records
        setIndustry('');
        setService('');
        setProblem(''); setHardware('Universal');
        setDescription(''); setIsToyProblem(false); setFields([]); setJsonFields('[]'); setCodeTemplates([]);
        setBatchingEnabled(false); setMaxQubitsPerBatch(64); setQubitFormula('');
        setInterpretationPrompt(''); setExecutionEnvironment('python-qiskit');
        setView('editor'); setActiveTab('input');
    };

    const renderInputTab = () => (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-[#0F172A]">Industry</label>
                    <input list="industries" value={industry} onChange={e => setIndustry(e.target.value)} placeholder="e.g. Finance" className="w-full p-3 bg-white border border-[rgb(27,176,206)]/30 rounded-xl outline-none focus:ring-1 focus:ring-[rgb(27,176,206)] text-sm text-[#0F172A]" />
                    <datalist id="industries">{metadata.industries.map(i => <option key={i.id} value={i.label} />)}</datalist>
                </div>
                <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-[#0F172A]">Service</label>
                    <input list="services" value={service} onChange={e => setService(e.target.value)} placeholder="e.g. Optimization" className="w-full p-3 bg-white border border-[rgb(27,176,206)]/30 rounded-xl outline-none focus:ring-1 focus:ring-[rgb(27,176,206)] text-sm text-[#0F172A]" />
                    <datalist id="services">{metadata.services.map(s => <option key={s.id} value={s.label} />)}</datalist>
                </div>
                <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-[#0F172A]">Problem</label>
                    <input list="problems" value={problem} onChange={e => setProblem(e.target.value)} placeholder="e.g. Portfolio" className="w-full p-3 bg-white border border-[rgb(27,176,206)]/30 rounded-xl outline-none focus:ring-1 focus:ring-[rgb(27,176,206)] text-sm text-[#0F172A]" />
                    <datalist id="problems">{(metadata.problemMapping[industry]?.[service] || []).map((p: string) => <option key={p} value={p} />)}</datalist>
                </div>
                <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-[#0F172A]">Hardware</label>
                    <select 
                        value={hardware} 
                        onChange={e => setHardware(e.target.value)} 
                        className="w-full p-3 bg-white border border-[rgb(27,176,206)]/30 rounded-xl outline-none focus:ring-1 focus:ring-[rgb(27,176,206)] text-sm font-semibold text-[#0F172A]"
                    >
                        <option value="Universal">Universal (Multi-Solver Blueprint)</option>
                        {hardwareList.map(h => (
                            <option key={h.id} value={h.name}>{h.name}</option>
                        ))}
                    </select>
                    <p className="text-[10px] text-[#0F172A] mt-1">Use 'Universal' to map multiple solvers (D-Wave, Qiskit, etc.) in the Backend Logic tab.</p>
                </div>
            </div>

            <div className="space-y-1.5 flex items-start gap-6">
                <div className="flex-1 space-y-1.5">
                    <label className="text-[10px] font-bold text-[#0F172A]">Description</label>
                    <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="problem description..." className="w-full p-3 bg-white border border-[rgb(27,176,206)]/30 rounded-xl outline-none focus:ring-1 focus:ring-[rgb(27,176,206)] text-sm text-[#0F172A] h-20" />
                </div>
                <div className="flex items-center gap-3 mt-6 p-4 bg-white border border-[rgb(27,176,206)]/20 rounded-xl">
                    <span className="text-[10px] font-bold text-[#0F172A]">Toy Problem</span>
                    <button 
                        onClick={() => setIsToyProblem(!isToyProblem)} 
                        className={`w-9 h-5 rounded-full relative transition-all ${isToyProblem ? 'bg-[rgb(48,102,187)]' : 'bg-slate-300'}`}
                    >
                        <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${isToyProblem ? 'left-5' : 'left-1'}`} />
                    </button>
                </div>
            </div>

            <div className="pt-6 border-t border-[rgb(27,176,206)]/20">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-[#0F172A]">Parameter builder</h3>
                    <div className="flex bg-white rounded-lg p-1">
                        <button onClick={() => setEditorMode('visual')} className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${editorMode === 'visual' ? 'bg-white text-[#0F172A] shadow-sm' : 'text-[#0F172A]'}`}>Visual</button>
                        <button onClick={() => setEditorMode('json')} className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${editorMode === 'json' ? 'bg-white text-[#0F172A] shadow-sm' : 'text-[#0F172A]'}`}>JSON</button>
                    </div>
                </div>

                {editorMode === 'visual' ? (
                    <div className="grid gap-3">
                        {fields.map((f, i) => (
                            <div key={i} className="bg-white border border-[rgb(27,176,206)]/30 p-4 rounded-xl flex items-center justify-between group hover:border-[rgb(27,176,206)]/30 transition-all">
                                <div>
                                    <div className="text-sm font-semibold text-[#0F172A]">{f.label}</div>
                                    <div className="flex gap-2 mt-1">
                                        <span className="text-[10px] font-mono text-[#0F172A]">{f.key}</span>
                                        <span className="text-[10px] font-bold text-[#0F172A]">{f.type}</span>
                                    </div>
                                </div>
                                <div className="flex gap-4">
                                    <button onClick={() => { setEditingField(f); setEditingFieldIndex(i); setIsEditModalOpen(true); }} className="text-[#0F172A] hover:text-[#0F172A] font-bold text-xs">Edit</button>
                                    <button onClick={() => setFields(fields.filter((_, idx) => idx !== i))} className="text-red-400 hover:text-[#0F172A] font-bold text-xs">Delete</button>
                                </div>
                            </div>
                        ))}
                        <button onClick={() => { setEditingField({ label: '', key: '', type: 'text' }); setEditingFieldIndex(null); setIsEditModalOpen(true); }} className="w-full py-4 border-2 border-dashed border-[rgb(27,176,206)]/30 rounded-2xl text-[#0F172A] hover:text-[#0F172A] hover:border-[rgb(27,176,206)]/50 text-xs font-bold transition-all">+ Add parameter</button>
                    </div>
                ) : (
                    <textarea value={jsonFields} onChange={e => setJsonFields(e.target.value)} className="w-full h-80 bg-white border border-[rgb(27,176,206)]/30 rounded-xl p-4 font-mono text-xs outline-none focus:ring-1 focus:ring-[rgb(27,176,206)]" />
                )}
            </div>
        </div>
    );

    const renderComputeTab = () => (
        <div className="space-y-8">
            {/* Stage 2 Sections Removed: Execution Environment and Batching Logic are now inferred or hidden to simplify the flow */}


            <div className="space-y-4 pt-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-[#0F172A]">Algorithm templates</h3>
                    <div className="flex gap-3">
                        <button 
                            onClick={handleDryRun} 
                            disabled={dryRunning || codeTemplates.length === 0}
                            className="bg-white text-[#0F172A] border border-[rgb(27,176,206)]/30 px-4 py-1.5 rounded-lg text-[10px] font-bold hover:bg-[rgb(48,102,187)] hover:text-white transition-all disabled:opacity-50"
                        >
                            {dryRunning ? 'Executing...' : 'Dry run (Test)'}
                        </button>
                        <button onClick={() => setCodeTemplates([...codeTemplates, { hardware: 'Universal', code: '', aiEnabled: false, llmModelId: '' }])} className="text-xs font-bold text-[#0F172A] hover:underline">Add hardware override</button>
                    </div>
                </div>
                <div className="space-y-4">
                    {codeTemplates.map((t, i) => (
                        <div key={i} className="bg-white p-8 rounded-3xl space-y-6 relative group border border-[rgb(27,176,206)]/30 shadow-xl shadow-slate-200/50 transition-all hover:border-[rgb(27,176,206)]/20">
                            <div className="flex items-center justify-between">
                                <div className="flex flex-col gap-1">
                                    <span className="text-[9px] font-bold text-[#0F172A]">Target Hardware</span>
                                    <select 
                                        value={t.hardware} 
                                        onChange={e => { const up = [...codeTemplates]; up[i].hardware = e.target.value; setCodeTemplates(up); }} 
                                        className="bg-transparent text-[#0F172A] font-bold text-xs outline-none cursor-pointer hover:text-[#0F172A] transition-colors"
                                    >
                                        <option value="Universal" className="bg-white text-[#0F172A]">Universal Simulator</option>
                                        {hardwareList.map(h => (
                                            <option key={h.id} value={h.name} className="bg-white text-[#0F172A]">{h.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex items-center gap-6">
                                    <div className="flex items-center gap-3 px-4 py-2 bg-white rounded-xl border border-[rgb(27,176,206)]/20 transition-all group-hover:bg-white group-hover:shadow-sm">
                                        <span className="text-[9px] text-[#0F172A] font-bold">AI Generation</span>
                                        <button 
                                            onClick={() => { const up = [...codeTemplates]; up[i].aiEnabled = !up[i].aiEnabled; setCodeTemplates(up); }} 
                                            className={`w-9 h-5 rounded-full relative transition-all ${t.aiEnabled ? 'bg-[rgb(48,102,187)]' : 'bg-slate-300'}`}
                                        >
                                            <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${t.aiEnabled ? 'left-5' : 'left-1'}`} />
                                        </button>
                                    </div>
                                    <button onClick={() => setCodeTemplates(codeTemplates.filter((_, idx) => idx !== i))} className="text-red-400 hover:text-red-500 text-xs font-bold transition-colors p-2 hover:bg-white rounded-lg">
                                        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    </button>
                                </div>
                            </div>
                            
                            {t.aiEnabled ? (
                                <div className="bg-white p-8 rounded-2xl space-y-6 border border-[rgb(27,176,206)]/10 relative overflow-hidden group/ai">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full -mr-16 -mt-16 blur-2xl group-hover/ai:bg-white transition-all duration-500" />
                                    <div className="flex items-center gap-5 relative z-10">
                                        <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-[#0F172A] shadow-md border border-[rgb(27,176,206)]/5">
                                            <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                        </div>
                                        <div className="flex-1 space-y-1">
                                            <div className="text-sm font-bold text-[#0F172A]">Dynamic Generation Active</div>
                                            <div className="text-[11px] text-[#0F172A] font-medium">Problem logic will be generated at runtime using advanced heuristic mapping for {t.hardware}.</div>
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-2 relative z-10 mt-6">
                                        <label className="text-[10px] font-bold text-[#0F172A] ml-1">Generator Model</label>
                                        <select 
                                            value={t.llmModelId}
                                            onChange={e => { const up = [...codeTemplates]; up[i].llmModelId = e.target.value; setCodeTemplates(up); }}
                                            className="w-full p-4 bg-white border border-[rgb(27,176,206)]/30 rounded-2xl text-xs font-bold text-[#0F172A] outline-none focus:border-[rgb(27,176,206)] shadow-sm transition-all focus:ring-4 focus:ring-[rgb(27,176,206)]/5"
                                        >
                                            <option value="">System Default Model</option>
                                            {llmModels.map(m => (
                                                <option key={m._id} value={m._id} className="bg-white">{m.name} ({m.activeProvider})</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <label className="text-[10px] font-bold text-[#0F172A]">Hand-written template</label>
                                        <span className="text-[9px] text-[#0F172A]/70 font-medium">Supports template literals: {"{{parameters.key}}"}</span>
                                    </div>
                                    <textarea 
                                        value={t.code} 
                                        onChange={e => { const up = [...codeTemplates]; up[i].code = e.target.value; setCodeTemplates(up); }} 
                                        placeholder="# write qiskit code here..." 
                                        className="w-full h-80 p-6 bg-white border border-[rgb(27,176,206)]/30 rounded-xl text-[11px] font-mono text-[#0F172A] placeholder:text-slate-300 focus:border-[rgb(27,176,206)] outline-none shadow-sm" 
                                    />
                                </div>
                            )}

                            {/* Batching Configuration (Per Hardware) - Always Visible */}
                            <div className="mt-8 pt-6 border-t border-[rgb(27,176,206)]/20">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex flex-col gap-0.5">
                                        <h3 className="text-xs font-bold text-[#0F172A]">Batching Logic</h3>
                                        <p className="text-[10px] text-[#0F172A]">Configure how parallel jobs are split for this hardware</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className={`text-[10px] font-bold ${t.batchingEnabled ? 'text-[#0F172A]' : 'text-[#0F172A]'}`}>
                                            {t.batchingEnabled ? 'Enabled' : 'Disabled'}
                                        </span>
                                        <button 
                                            onClick={() => { const up = [...codeTemplates]; up[i].batchingEnabled = !up[i].batchingEnabled; setCodeTemplates(up); }} 
                                            className={`w-9 h-5 rounded-full relative transition-all ${t.batchingEnabled ? 'bg-[rgb(48,102,187)]' : 'bg-slate-300'}`}
                                        >
                                            <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${t.batchingEnabled ? 'left-5' : 'left-1'}`} />
                                        </button>
                                    </div>
                                </div>

                                {t.batchingEnabled && (
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-in slide-in-from-top-2 duration-300">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-[#0F172A]">Qubit formula</label>
                                            <input 
                                                value={t.qubitFormula || ''} 
                                                onChange={e => { const up = [...codeTemplates]; up[i].qubitFormula = e.target.value; setCodeTemplates(up); }} 
                                                placeholder="{{params.n}} * 2" 
                                                className="w-full p-2.5 bg-white border border-[rgb(27,176,206)]/30 rounded-xl text-[11px] font-mono outline-none focus:ring-1 focus:ring-[rgb(27,176,206)]" 
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-[#0F172A]">Max per batch</label>
                                            <input 
                                                type="number" 
                                                value={t.maxQubitsPerBatch || 64} 
                                                onChange={e => { const up = [...codeTemplates]; up[i].maxQubitsPerBatch = parseInt(e.target.value); setCodeTemplates(up); }} 
                                                className="w-full p-2.5 bg-white border border-[rgb(27,176,206)]/30 rounded-xl text-[11px] outline-none focus:ring-1 focus:ring-[rgb(27,176,206)]" 
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-[#0F172A]">Batch key</label>
                                            <input 
                                                value={t.batchKey || ''} 
                                                onChange={e => { const up = [...codeTemplates]; up[i].batchKey = e.target.value; setCodeTemplates(up); }} 
                                                placeholder="e.g. assets" 
                                                className="w-full p-2.5 bg-white border border-[rgb(27,176,206)]/30 rounded-xl text-[11px] outline-none focus:ring-1 focus:ring-[rgb(27,176,206)]" 
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                    {codeTemplates.length === 0 && <div className="text-center py-12 border border-dashed border-[rgb(27,176,206)]/30 rounded-2xl text-[10px] text-red-400 font-bold">Algorithm template or AI mapping required.</div>}
                </div>
            </div>
        </div>
    );

    const renderOutputTab = () => (
        <div className="space-y-10">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-[#0F172A]">Result tables</h3>
                <div className="flex items-center gap-4">
                    {suggestions.length > 0 && (
                        <div className="flex items-start gap-4 bg-white/50 p-4 rounded-2xl border border-[rgb(27,176,206)]/20 animate-in slide-in-from-top-2">
                            <div className="pt-1">
                                <span className="text-[10px] font-bold text-[#0F172A] block mb-1">Dry Run Suggestions:</span>
                                <p className="text-[9px] text-[#0F172A]/70 font-medium">Click to add as table column</p>
                            </div>
                            <div className="flex flex-wrap gap-2 flex-1">
                                {suggestions.map(s => (
                                    <button 
                                        key={s} 
                                        onClick={() => {
                                            const up = [...outputTables];
                                            if (up.length === 0) up.push({ name: 'Standard Results', mapping: [] });
                                            // Add to the last table by default or first if preferred
                                            const targetTable = up[up.length - 1];
                                            if (targetTable.mapping.some(m => m.resultKey === s)) return; // Prevent dupes
                                            
                                            targetTable.mapping.push({ 
                                                resultKey: s, 
                                                label: s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' '), 
                                                type: s.includes('energy') || s.includes('qubit') ? 'number' : 'text', 
                                                priority: targetTable.mapping.length + 1 
                                            });
                                            setOutputTables(up);
                                        }}
                                        className="text-[10px] font-bold bg-white text-[#0F172A] px-3 py-1.5 rounded-lg border border-[rgb(27,176,206)]/40 hover:bg-[rgb(48,102,187)] hover:text-white transition-all shadow-sm flex items-center gap-1.5 group"
                                    >
                                        <span className="text-blue-300 group-hover:text-white/50">+</span>
                                        {s}
                                    </button>
                                ))}
                                <button 
                                    onClick={() => setSuggestions([])}
                                    className="text-[10px] font-bold text-[#0F172A] hover:text-[#0F172A] px-3 py-1.5"
                                >
                                    Clear
                                </button>
                            </div>
                        </div>
                    )}
                    <button onClick={() => setOutputTables([...outputTables, { name: 'Results', mapping: [{ resultKey: '', label: '', type: 'text', priority: 1 }] }])} className="text-xs font-bold text-[#0F172A] hover:underline">+ Add table</button>
                </div>
            </div>

            {outputTables.map((table, tableIdx) => (
                <div key={tableIdx} className="bg-white border border-[rgb(27,176,206)]/30 rounded-2xl overflow-hidden shadow-sm">
                    <div className="p-4 bg-white border-b border-[rgb(27,176,206)]/30 flex items-center justify-between">
                        <input value={table.name} onChange={e => { const up = [...outputTables]; up[tableIdx].name = e.target.value; setOutputTables(up); }} className="bg-transparent text-sm font-bold text-[#0F172A] outline-none" placeholder="Table name" />
                        <button onClick={() => setOutputTables(outputTables.filter((_, idx) => idx !== tableIdx))} className="text-red-400 hover:text-[#0F172A] text-[10px] font-bold">Remove</button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-white text-[#0F172A] border-b border-[rgb(27,176,206)]/20 font-semibold text-[10px]">
                                <tr>
                                    <th className="p-4">Key pointer</th>
                                    <th className="p-4">Label</th>
                                    <th className="p-4">Type</th>
                                    <th className="p-4">Priority</th>
                                    <th className="p-4 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {table.mapping.map((m, fieldIdx) => (
                                    <tr key={fieldIdx}>
                                        <td className="p-2"><input value={m.resultKey} onChange={e => { const up = [...outputTables]; up[tableIdx].mapping[fieldIdx].resultKey = e.target.value; setOutputTables(up); }} placeholder="e.g. ticker" className="w-full p-2 bg-transparent font-mono" /></td>
                                        <td className="p-2"><input value={m.label} onChange={e => { const up = [...outputTables]; up[tableIdx].mapping[fieldIdx].label = e.target.value; setOutputTables(up); }} placeholder="e.g. Asset" className="w-full p-2 bg-transparent" /></td>
                                        <td className="p-2">
                                            <select value={m.type} onChange={e => { const up = [...outputTables]; up[tableIdx].mapping[fieldIdx].type = e.target.value as any; setOutputTables(up); }} className="bg-transparent outline-none w-full">
                                                {['text', 'number', 'percentage', 'boolean'].map(t => <option key={t} value={t}>{t}</option>)}
                                            </select>
                                        </td>
                                        <td className="p-2"><input type="number" value={m.priority} onChange={e => { const up = [...outputTables]; up[tableIdx].mapping[fieldIdx].priority = parseInt(e.target.value); setOutputTables(up); }} className="w-12 bg-transparent" /></td>
                                        <td className="p-2 text-right"><button onClick={() => { const up = [...outputTables]; up[tableIdx].mapping = up[tableIdx].mapping.filter((_, idx) => idx !== fieldIdx); setOutputTables(up); }} className="text-red-400 hover:text-[#0F172A] font-bold px-2">Delete</button></td>
                                    </tr>
                                ))}
                                <tr>
                                    <td colSpan={5} className="p-4 text-center">
                                        <button onClick={() => { const up = [...outputTables]; up[tableIdx].mapping.push({ resultKey: '', label: '', type: 'text', priority: up[tableIdx].mapping.length + 1 }); setOutputTables(up); }} className="text-[10px] font-bold text-[#0F172A] hover:text-[#0F172A]">+ Add column</button>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            ))}

            <div className="pt-8 border-t border-[rgb(27,176,206)]/20 space-y-4">
                <div className="flex items-center gap-4">
                    {suggestions.length > 0 && (
                        <div className="flex items-start gap-4 bg-white/50 p-4 rounded-2xl border border-[rgb(27,176,206)]/30 animate-in slide-in-from-top-2">
                             <div className="pt-1">
                                <span className="text-[10px] font-bold text-[#0F172A] block mb-1">Apply to Chart:</span>
                                <p className="text-[9px] text-emerald-400 font-medium">Click to set as axis key</p>
                            </div>
                            <div className="flex flex-wrap gap-2 flex-1">
                                {suggestions.map(s => (
                                    <div key={s} className="flex gap-1">
                                        <button 
                                            onClick={() => {
                                                const up = [...chartConfig];
                                                if (up.length === 0) up.push({ type: 'bar', xKey: '', yKey: '', label: 'Quantum Distribution' });
                                                up[0].xKey = s;
                                                setChartConfig(up);
                                            }}
                                            className="text-[10px] font-bold bg-white text-[#0F172A] px-2 py-1 rounded-md border border-[rgb(27,176,206)]/30 hover:bg-[rgb(48,102,187)] hover:text-white transition-all shadow-sm"
                                        >
                                            Set X: {s}
                                        </button>
                                        <button 
                                            onClick={() => {
                                                const up = [...chartConfig];
                                                if (up.length === 0) up.push({ type: 'bar', xKey: '', yKey: '', label: 'Quantum Distribution' });
                                                up[0].yKey = s;
                                                setChartConfig(up);
                                            }}
                                            className="text-[10px] font-bold bg-white text-[#0F172A] px-2 py-1 rounded-md border border-[rgb(27,176,206)]/30 hover:bg-[rgb(48,102,187)] hover:text-white transition-all shadow-sm"
                                        >
                                            Set Y: {s}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    <button onClick={() => setChartConfig([...chartConfig, { type: 'bar', xKey: '', yKey: '', label: '' }])} className="text-xs font-bold text-[#0F172A] hover:underline">+ Add chart</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {chartConfig.map((c, i) => (
                        <div key={i} className="p-5 bg-white border border-[rgb(27,176,206)]/30 rounded-2xl space-y-4 shadow-sm relative group">
                            <button onClick={() => setChartConfig(chartConfig.filter((_, idx) => idx !== i))} className="absolute top-4 right-4 text-red-400 text-[10px] font-bold">Remove</button>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] text-[#0F172A] font-bold">Chart type</label>
                                    <select value={c.type} onChange={e => { const up = [...chartConfig]; up[i].type = e.target.value as any; setChartConfig(up); }} className="w-full p-2 bg-white border border-[rgb(27,176,206)]/20 rounded text-xs">
                                        {['bar', 'line', 'pie', 'scatter'].map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] text-[#0F172A] font-bold">Label</label>
                                    <input value={c.label} onChange={e => { const up = [...chartConfig]; up[i].label = e.target.value; setChartConfig(up); }} className="w-full p-2 bg-white border border-[rgb(27,176,206)]/20 rounded text-xs" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] text-[#0F172A] font-bold">X data</label>
                                    <input 
                                        value={c.xKey} 
                                        onChange={e => { const up = [...chartConfig]; up[i].xKey = e.target.value; setChartConfig(up); }} 
                                        className={`w-full p-2 bg-white border rounded text-xs font-mono transition-all ${c.xKey ? 'border-emerald-200 text-[#0F172A]' : 'border-[rgb(27,176,206)]/20'}`} 
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] text-[#0F172A] font-bold">Y data</label>
                                    <input 
                                        value={c.yKey} 
                                        onChange={e => { const up = [...chartConfig]; up[i].yKey = e.target.value; setChartConfig(up); }} 
                                        className={`w-full p-2 bg-white border rounded text-xs font-mono transition-all ${c.yKey ? 'border-emerald-200 text-[#0F172A]' : 'border-[rgb(27,176,206)]/20'}`} 
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );

    const renderAITab = () => (
        <div className="space-y-6">
            <div className="p-4 bg-white border border-[rgb(27,176,206)]/30 rounded-2xl space-y-1">
                <h3 className="text-sm font-bold text-[#0F172A]">Interpretation logic</h3>
                <p className="text-xs text-[#0F172A]">How should the AI explain these results to the user?</p>
            </div>
            <textarea 
                value={interpretationPrompt} 
                onChange={e => setInterpretationPrompt(e.target.value)} 
                placeholder="analyze the following data: {{results}}..."
                className="w-full h-80 bg-slate-900 text-slate-200 p-6 font-mono text-xs border border-slate-800 rounded-2xl outline-none focus:ring-1 focus:ring-[rgb(27,176,206)]" 
            />
        </div>
    );

    return (
        <div className="space-y-8">
            {view === 'overview' ? (
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-4">
                            <h2 className="text-xl font-bold text-[#0F172A]">Problem blueprints</h2>
                            <button 
                                onClick={fetchInitialData}
                                className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-500"
                                title="Refresh"
                            >
                                <svg viewBox="0 0 24 24" className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                            </button>
                            <span className="text-[10px] font-mono bg-slate-100 px-2 py-1 rounded text-slate-500">
                                Debug: {user?.role || 'no-role'} | {user?.email || 'no-email'}
                            </span>
                        </div>
                        <button onClick={resetForm} className="bg-[rgb(48,102,187)] text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#255299] transition-all shadow-sm">
                            New blueprint
                        </button>
                    </div>

                    {status && (
                        <div className={`p-4 rounded-xl text-xs font-bold ${status.startsWith('Error') ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-blue-50 text-blue-600 border border-blue-100'}`}>
                            {status}
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {existingForms.length === 0 ? (
                            <div className="col-span-full py-20 text-center space-y-4 bg-white/50 rounded-3xl border border-dashed border-slate-200">
                                <div className="text-slate-400 font-medium">No problem blueprints found.</div>
                                <button onClick={resetForm} className="text-[#3066bb] font-bold text-sm hover:underline">Create your first blueprint →</button>
                            </div>
                        ) : (
                            existingForms.map((form) => (
                                <div key={form._id} className="bg-white border border-[rgb(27,176,206)]/30 p-6 rounded-2xl hover:border-[rgb(27,176,206)] hover:shadow-md transition-all flex flex-col min-h-[220px]">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex gap-2">
                                            <span className="text-[10px] font-bold text-[#0F172A] bg-white px-2 py-0.5 rounded-md border border-[rgb(27,176,206)]/20">{form.industry}</span>
                                            {form.isToyProblem && <span className="text-[10px] font-bold text-white bg-[rgb(48,102,187)] px-2 py-0.5 rounded-md">Toy Problem</span>}
                                        </div>
                                        {form.active && <span className="text-[10px] text-green-600 font-bold">Active</span>}
                                    </div>
                                    <h3 className="text-lg font-bold text-[#0F172A] mb-2 line-clamp-1">{form.problem}</h3>
                                    <div className="text-[10px] text-[#0F172A] font-bold mb-2">
                                        {form.service} • {form.hardware === 'Universal' && form.codeTemplates?.length 
                                            ? `Universal (${form.codeTemplates.map(t => t.hardware).join(', ')})` 
                                            : form.hardware}
                                    </div>
                                    <div className="flex flex-col gap-1 mb-4">
                                        <div className="flex items-center gap-1.5 group">
                                            <span className="text-[9px] font-mono text-[#0F172A] truncate" title={String(form._id)}>ID: {String(form._id)}</span>
                                            <button
                                                onClick={() => { navigator.clipboard.writeText(String(form._id)); alert('Blueprint ID copied!'); }}
                                                className="opacity-0 group-hover:opacity-100 text-[9px] font-bold text-[#3066bb] underline transition-opacity shrink-0"
                                                title="Copy full Blueprint ID"
                                            >COPY</button>
                                        </div>
                                        <span className="text-[9px] text-[#0F172A]">Created: {form.createdAt ? new Date(form.createdAt).toLocaleString() : 'N/A'}</span>
                                        <span className="text-[9px] text-[#0F172A]">Modified: {form.updatedAt ? new Date(form.updatedAt).toLocaleString() : 'N/A'}</span>
                                    </div>
                                    <p className="text-xs text-[#0F172A] line-clamp-2 mb-6 flex-1">{form.description}</p>
                                    
                                    <div className="grid grid-cols-3 gap-2 mt-auto">
                                        <button 
                                            onClick={() => editForm(form)} 
                                            className="py-2.5 rounded-xl border border-[rgb(27,176,206)]/20 bg-white text-[9px] font-bold text-[#0F172A] hover:bg-[rgb(48,102,187)] hover:text-white hover:border-[rgb(27,176,206)] transition-all tracking-tight"
                                        >
                                            Edit
                                        </button>
                                        <button 
                                            onClick={() => handleToggleActive(form)} 
                                            className={`py-2.5 rounded-xl border transition-all text-[9px] font-bold tracking-tight ${
                                                form.active 
                                                    ? 'bg-white border-[rgb(27,176,206)]/20 text-[#0F172A] hover:bg-[rgb(48,102,187)] hover:text-white hover:border-amber-600' 
                                                    : 'bg-green-50 border-green-100 text-green-600 hover:bg-green-600 hover:text-white hover:border-green-600'
                                            }`}
                                        >
                                            {form.active ? 'Hide' : 'Show'}
                                        </button>
                                        <button 
                                            onClick={() => handleDelete(form)} 
                                            className="py-2.5 rounded-xl border border-[rgb(27,176,206)]/20 bg-white text-[9px] font-bold text-[#0F172A] hover:bg-[rgb(48,102,187)] hover:text-white hover:border-red-600 transition-all tracking-tight"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            ) : (
                <div className="flex flex-col h-full animate-in fade-in duration-300">
                    <div className="flex items-center justify-between px-10 py-8 border-b border-[rgb(27,176,206)]/20 sticky top-0 bg-white/95 backdrop-blur-xl z-30">
                        <div className="flex items-center gap-8">
                            <button 
                                onClick={() => setView('overview')} 
                                className="w-10 h-10 flex items-center justify-center rounded-xl bg-white text-[#0F172A] hover:bg-white hover:text-[#0F172A] transition-all duration-300 border border-[rgb(27,176,206)]/20 group"
                                title="Return to Overview"
                            >
                                <svg viewBox="0 0 24 24" className="w-5 h-5 transition-transform group-hover:-translate-x-0.5" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 19l-7-7 7-7" /></svg>
                            </button>
                            <div className="h-8 w-px bg-white mx-2" />
                            <div className="flex flex-col gap-0.5">
                                <h1 className="text-2xl font-bold text-[#0F172A] tracking-tight leading-none">{problem || 'Untitled Project'}</h1>
                                {(industry || service) && (
                                    <div className="flex items-center gap-2 mt-1.5">
                                        {industry && <span className="text-[10px] font-bold text-[#0F172A] tracking-tight">{industry}</span>}
                                        {industry && service && <span className="w-1 h-1 rounded-full bg-slate-200" />}
                                        {service && <span className="text-[10px] font-semibold text-[#0F172A]">{service}</span>}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="flex gap-4 items-center">
                            <button 
                                onClick={handleSave} 
                                disabled={loading || !industry || !service || !problem} 
                                className="relative overflow-hidden group bg-[rgb(48,102,187)] text-white px-8 py-3.5 rounded-xl font-bold text-sm transition-all hover:shadow-2xl hover:shadow-[rgb(27,176,206)]/40 active:scale-[0.98] disabled:opacity-50 disabled:grayscale"
                            >
                                <div className="absolute inset-0 bg-gradient-to-br from-[rgb(27,176,206)] to-[#1e448a] opacity-100 group-hover:opacity-90 transition-opacity" />
                                <div className="flex items-center gap-3 relative z-10">
                                    {loading ? (
                                        <>
                                            <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                            <span>Syncing Blueprint...</span>
                                        </>
                                    ) : (
                                        <>
                                            <svg viewBox="0 0 24 24" className="w-4 h-4 mr-0.5" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 13l4 4L19 7" /></svg>
                                            <span>Deploy blueprint</span>
                                        </>
                                    )}
                                </div>
                            </button>
                        </div>
                    </div>

                    {status && (
                        <div className={`mt-4 p-3 rounded-xl text-[10px] font-bold border ${status.includes('Error') ? 'bg-white text-red-500 border-red-100' : 'bg-green-50 text-green-600 border-green-100'}`}>
                            {status}
                        </div>
                    )}

                    <div className="flex gap-2 mt-6 mb-8 bg-white p-1 rounded-xl w-fit border border-[rgb(27,176,206)]/20">
                        {[
                            { id: 'input', label: '1. Input structure' },
                            { id: 'compute', label: '2. Backend logic' },
                            { id: 'output', label: '3. Data mapping' },
                            { id: 'ai', label: '4. Analysis layer' },
                        ].map(tab => (
                            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`px-5 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === tab.id ? 'bg-white shadow-sm text-[#0F172A]' : 'text-[#0F172A] hover:text-[#0F172A]'}`}>
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    <div className="flex-1 pb-20">
                        {activeTab === 'input' && renderInputTab()}
                        {activeTab === 'compute' && renderComputeTab()}
                        {activeTab === 'output' && renderOutputTab()}
                        {activeTab === 'ai' && renderAITab()}
                    </div>
                </div>
            )}

            {isEditModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-md rounded-2xl border border-[rgb(27,176,206)]/30 shadow-xl p-8 animate-in zoom-in-95 duration-200">
                        <h3 className="text-lg font-bold text-[#0F172A] mb-6">Parameter configuration</h3>
                        <div className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-[#0F172A]">Input label</label>
                                <input value={editingField?.label} onChange={e => setEditingField(prev => prev ? ({ ...prev, label: e.target.value }) : null)} className="w-full p-2.5 bg-white border border-[rgb(27,176,206)]/30 rounded-lg text-sm" placeholder="e.g. Iterations" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-[#0F172A]">Variable key</label>
                                <input value={editingField?.key} onChange={e => setEditingField(prev => prev ? ({ ...prev, key: e.target.value }) : null)} className="w-full p-2.5 bg-white border border-[rgb(27,176,206)]/30 rounded-lg text-xs font-mono text-[#0F172A]" placeholder="e.g. iter_count" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-[#0F172A]">Type</label>
                                <select value={editingField?.type} onChange={e => setEditingField(prev => prev ? ({ ...prev, type: e.target.value as any }) : null)} className="w-full p-2.5 bg-white border border-[rgb(27,176,206)]/30 rounded-lg text-sm">
                                    {['text', 'number', 'select', 'multi-select', 'range', 'textarea', 'dropdown'].map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="mt-8 flex justify-end gap-3">
                            <button onClick={() => setIsEditModalOpen(false)} className="text-xs font-bold text-[#0F172A] px-4">Cancel</button>
                            <button onClick={() => {
                                if (!editingField?.label) return;
                                const field = { ...editingField, key: editingField.key || editingField.label.toLowerCase().replace(/\s+/g, '_') };
                                const up = [...fields];
                                if (editingFieldIndex !== null) up[editingFieldIndex] = field as any; else up.push(field as any);
                                setFields(up); setIsEditModalOpen(false);
                            }} className="bg-[rgb(48,102,187)] text-white px-6 py-2 rounded-xl text-xs font-bold shadow-sm">Save parameter</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
