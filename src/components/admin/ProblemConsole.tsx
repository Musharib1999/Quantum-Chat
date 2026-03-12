"use client";

import React, { useState, useEffect } from 'react';
import { 
    Plus, Trash2, Save, Layers, Settings2, Search, Edit3, CheckCircle2, 
    Code2, GripVertical, X, ArrowLeftRight, Activity, Terminal, Brain,
    LayoutDashboard, BarChart2
} from 'lucide-react';
import axios from 'axios';

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
    codeTemplates?: { hardware: string; code: string }[];
    active: boolean;
    batchingEnabled?: boolean;
    maxQubitsPerBatch?: number;
    qubitFormula?: string;
    batchKey?: string;
    outputMapping?: IOutputMapping[];
    interpretationPrompt?: string;
    chartConfig?: IChartConfig[];
    executionEnvironment?: 'python-qiskit' | 'python-dwave';
    createdAt?: string;
}

export default function ProblemConsole() {
    // Current Selection
    const [industry, setIndustry] = useState('');
    const [service, setService] = useState('');
    const [problem, setProblem] = useState('');
    const [hardware, setHardware] = useState('Universal');
    const [description, setDescription] = useState('');
    const [activeTab, setActiveTab] = useState<'input' | 'compute' | 'output' | 'ai'>('input');

    // Tab 1: Input State
    const [fields, setFields] = useState<IField[]>([]);
    const [editorMode, setEditorMode] = useState<'visual' | 'json'>('visual');
    const [jsonFields, setJsonFields] = useState('[]');

    // Tab 2: Compute State
    const [codeTemplates, setCodeTemplates] = useState<{ hardware: string; code: string }[]>([]);
    const [batchingEnabled, setBatchingEnabled] = useState(false);
    const [maxQubitsPerBatch, setMaxQubitsPerBatch] = useState(64);
    const [qubitFormula, setQubitFormula] = useState('');
    const [batchKey, setBatchKey] = useState('');
    const [executionEnvironment, setExecutionEnvironment] = useState<'python-qiskit' | 'python-dwave'>('python-qiskit');

    // Tab 3: Output State
    const [outputMapping, setOutputMapping] = useState<IOutputMapping[]>([]);
    const [chartConfig, setChartConfig] = useState<IChartConfig[]>([]);

    // Tab 4: AI State
    const [interpretationPrompt, setInterpretationPrompt] = useState('');

    // UI State
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState('');
    const [view, setView] = useState<'editor' | 'overview'>('overview');
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingField, setEditingField] = useState<IField | null>(null);
    const [editingFieldIndex, setEditingFieldIndex] = useState<number | null>(null);

    // Data State
    const [existingForms, setExistingForms] = useState<IQuantumForm[]>([]);
    const [metadata, setMetadata] = useState<{ industries: any[], services: any[], problemMapping: any }>({ industries: [], services: [], problemMapping: {} });
    const [hardwareList, setHardwareList] = useState<any[]>([]);

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        try {
            console.log("Fetching Initial Admin Data...");
            const [formsRes, metaRes, hwRes] = await Promise.all([
                axios.get('/api/quantum-forms'),
                axios.get('/api/quantum-forms/metadata'),
                axios.get('/api/hardware')
            ]);
            console.log("Forms Received:", formsRes.data.length);
            console.log("Metadata Received:", !!metaRes.data);
            console.log("Hardware Received:", hwRes.data.length);
            
            setExistingForms(formsRes.data);
            setMetadata(metaRes.data);
            setHardwareList(hwRes.data);
        } catch (error: any) {
            console.error("Failed to fetch admin data", error);
            setStatus("Critical Error: " + error.message);
        }
    };

    const handleSave = async () => {
        setLoading(true);
        setStatus('Saving Blueprint...');
        try {
            let payload: any = {
                industry,
                service,
                problem,
                hardware,
                description,
                active: true,
                fields,
                codeTemplates,
                batchingEnabled,
                maxQubitsPerBatch,
                qubitFormula,
                batchKey,
                outputMapping,
                chartConfig,
                interpretationPrompt,
                executionEnvironment
            };

            if (editorMode === 'json') {
                try {
                    const parsed = JSON.parse(jsonFields);
                    if (Array.isArray(parsed)) {
                        payload.fields = parsed;
                    } else if (typeof parsed === 'object' && parsed !== null) {
                        if (parsed.sections) payload.sections = parsed.sections;
                        if (parsed.fields) payload.fields = parsed.fields;
                    }
                } catch (e: any) {
                    throw new Error("Invalid JSON: " + e.message);
                }
            }

            await axios.post('/api/quantum-forms', payload);
            setStatus('Blueprint Saved Successfully!');
            fetchInitialData();
            setTimeout(() => setView('overview'), 1500);
        } catch (error: any) {
            setStatus('Error: ' + (error.response?.data?.error || error.message));
        } finally {
            setLoading(false);
        }
    };

    const editForm = (form: IQuantumForm) => {
        setIndustry(form.industry);
        setService(form.service);
        setProblem(form.problem || '');
        setHardware(form.hardware || 'Universal');
        setDescription(form.description || '');
        setFields(form.fields || []);
        setCodeTemplates(form.codeTemplates || []);
        setBatchingEnabled(form.batchingEnabled || false);
        setMaxQubitsPerBatch(form.maxQubitsPerBatch || 64);
        setQubitFormula(form.qubitFormula || '');
        setBatchKey(form.batchKey || '');
        setOutputMapping(form.outputMapping || []);
        setChartConfig(form.chartConfig || []);
        setInterpretationPrompt(form.interpretationPrompt || '');
        setExecutionEnvironment(form.executionEnvironment || 'python-qiskit');

        setJsonFields(JSON.stringify(form.fields || [], null, 2));
        setEditorMode('visual');
        setView('editor');
        setActiveTab('input');
    };

    const resetForm = () => {
        setIndustry(''); setService(''); setProblem(''); setHardware('Universal');
        setDescription(''); setFields([]); setJsonFields('[]'); setCodeTemplates([]);
        setBatchingEnabled(false); setMaxQubitsPerBatch(64); setQubitFormula('');
        setBatchKey(''); setOutputMapping([]); setChartConfig([]);
        setInterpretationPrompt(''); setExecutionEnvironment('python-qiskit');
        setView('editor'); setActiveTab('input');
    };

    // --- Tab Renderers ---

    const renderInputTab = () => (
        <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="space-y-2">
                    <label className="text-[10px] font-semibold text-muted-foreground tracking-widest uppercase">Industry</label>
                    <input list="industries" value={industry} onChange={e => setIndustry(e.target.value)} placeholder="e.g. Finance" className="w-full bg-secondary/30 border border-border rounded-xl px-4 py-3 text-sm focus:ring-1 focus:ring-primary" />
                    <datalist id="industries">{metadata.industries.map(i => <option key={i.id} value={i.label} />)}</datalist>
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-semibold text-muted-foreground tracking-widest uppercase">Service</label>
                    <input list="services" value={service} onChange={e => setService(e.target.value)} placeholder="e.g. Optimization" className="w-full bg-secondary/30 border border-border rounded-xl px-4 py-3 text-sm focus:ring-1 focus:ring-primary" />
                    <datalist id="services">{metadata.services.map(s => <option key={s.id} value={s.label} />)}</datalist>
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-semibold text-muted-foreground tracking-widest uppercase">Problem Context</label>
                    <input list="problems" value={problem} onChange={e => setProblem(e.target.value)} placeholder="e.g. Portfolio Opt" className="w-full bg-secondary/30 border border-border rounded-xl px-4 py-3 text-sm focus:ring-1 focus:ring-primary" />
                    <datalist id="problems">{(metadata.problemMapping[industry]?.[service] || []).map((p: string) => <option key={p} value={p} />)}</datalist>
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-semibold text-muted-foreground tracking-widest uppercase">Hardware Target</label>
                    <input list="hardwares" value={hardware} onChange={e => setHardware(e.target.value)} className="w-full bg-blue-500/5 border border-blue-500/20 rounded-xl px-4 py-3 text-sm font-bold text-blue-500 focus:ring-1 focus:ring-blue-500" />
                    <datalist id="hardwares"><option value="Universal" />{hardwareList.map(h => <option key={h.id} value={h.name} />)}</datalist>
                </div>
            </div>

            <div className="space-y-2">
                <label className="text-[10px] font-semibold text-muted-foreground tracking-widest uppercase">Problem Description</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Briefly describe what this blueprint solve..." className="w-full bg-secondary/30 border border-border rounded-xl px-4 py-3 text-sm h-24 focus:ring-1 focus:ring-primary" />
            </div>

            <div className="pt-6 border-t border-border">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-sm font-bold flex items-center gap-2 tracking-tight">
                        <Settings2 size={16} className="text-[#3066bb]" /> Parameter Builder
                    </h3>
                    <div className="flex bg-secondary/50 rounded-lg p-1 border border-border">
                        <button onClick={() => setEditorMode('visual')} className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${editorMode === 'visual' ? 'bg-white shadow text-black' : 'text-muted-foreground'}`}>Visual</button>
                        <button onClick={() => setEditorMode('json')} className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${editorMode === 'json' ? 'bg-white shadow text-black' : 'text-muted-foreground'}`}>JSON</button>
                    </div>
                </div>

                {editorMode === 'visual' ? (
                    <div className="grid gap-3">
                        {fields.map((f, i) => (
                            <div key={i} className="bg-white border border-border p-4 rounded-xl flex items-center justify-between group hover:border-[#3066bb]/30">
                                <div className="flex items-center gap-4">
                                    <div className="p-2 bg-secondary rounded-lg text-muted-foreground"><GripVertical size={14} /></div>
                                    <div>
                                        <div className="text-sm font-bold">{f.label}</div>
                                        <div className="flex gap-2 mt-1">
                                            <span className="text-[10px] font-mono bg-secondary px-1.5 py-0.5 rounded">{f.key}</span>
                                            <span className="text-[10px] font-bold text-[#3066bb] bg-[#3066bb]/5 px-1.5 py-0.5 rounded">{f.type}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => { setEditingField(f); setEditingFieldIndex(i); setIsEditModalOpen(true); }} className="p-2 hover:bg-secondary rounded-lg text-muted-foreground"><Edit3 size={14} /></button>
                                    <button onClick={() => setFields(fields.filter((_, idx) => idx !== i))} className="p-2 hover:bg-red-500/10 rounded-lg text-red-400"><Trash2 size={14} /></button>
                                </div>
                            </div>
                        ))}
                        <button onClick={() => { setEditingField({ label: '', key: '', type: 'text' }); setEditingFieldIndex(null); setIsEditModalOpen(true); }} className="w-full py-3 border-2 border-dashed border-border rounded-xl text-muted-foreground hover:text-[#3066bb] hover:bg-secondary/50 text-xs font-bold transition-all">+ Add Input Field</button>
                    </div>
                ) : (
                    <textarea value={jsonFields} onChange={e => setJsonFields(e.target.value)} className="w-full h-80 bg-secondary/30 border border-border rounded-xl p-4 font-mono text-xs outline-none focus:ring-1 focus:ring-[#3066bb]" />
                )}
            </div>
        </div>
    );

    const renderComputeTab = () => (
        <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6 border-b border-border">
                <div className="space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-[#3066bb]">Environment</h3>
                    <div className="flex gap-2">
                        {['python-qiskit', 'python-dwave'].map(env => (
                            <button key={env} onClick={() => setExecutionEnvironment(env as any)} className={`flex-1 py-3 rounded-xl border text-xs font-bold transition-all ${executionEnvironment === env ? 'bg-[#3066bb] text-white border-[#3066bb]' : 'bg-white text-muted-foreground border-border hover:bg-secondary'}`}>
                                {env.replace('python-', '').toUpperCase()}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-[#3066bb]">Batching Logic</h3>
                    <div className="flex items-center justify-between p-4 bg-[#3066bb]/5 border border-[#3066bb]/10 rounded-xl">
                        <span className="text-xs font-bold">Enable Sequenced Batching</span>
                        <button onClick={() => setBatchingEnabled(!batchingEnabled)} className={`w-10 h-5 rounded-full relative transition-all ${batchingEnabled ? 'bg-[#3066bb]' : 'bg-zinc-300'}`}>
                            <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${batchingEnabled ? 'left-6' : 'left-1'}`} />
                        </button>
                    </div>
                </div>
            </div>

            {batchingEnabled && (
                <div className="grid grid-cols-3 gap-6 animate-in slide-in-from-top-2">
                    <div className="space-y-2">
                        <label className="text-[10px] font-semibold text-muted-foreground uppercase">Formula (n-qubits)</label>
                        <input value={qubitFormula} onChange={e => setQubitFormula(e.target.value)} placeholder="{{params.n}} * {{params.m}}" className="w-full bg-secondary/30 border border-border rounded-xl px-4 py-3 text-xs" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-semibold text-muted-foreground uppercase">Max Per Batch</label>
                        <input type="number" value={maxQubitsPerBatch} onChange={e => setMaxQubitsPerBatch(parseInt(e.target.value))} className="w-full bg-secondary/30 border border-border rounded-xl px-4 py-3 text-xs" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-semibold text-muted-foreground uppercase">Batch Key (Field ID)</label>
                        <input value={batchKey} onChange={e => setBatchKey(e.target.value)} placeholder="e.g. days" className="w-full bg-secondary/30 border border-border rounded-xl px-4 py-3 text-xs" />
                    </div>
                </div>
            )}

            <div className="space-y-6 pt-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold flex items-center gap-2 tracking-tight">
                        <Code2 size={16} className="text-[#3066bb]" /> Algorithm Templates
                    </h3>
                    <button onClick={() => setCodeTemplates([...codeTemplates, { hardware: 'Universal', code: '' }])} className="text-[10px] font-bold text-[#3066bb] hover:underline">+ New Hardware Override</button>
                </div>
                <div className="space-y-4">
                    {codeTemplates.map((t, i) => (
                        <div key={i} className="bg-zinc-950 border border-white/5 p-4 rounded-xl space-y-4 relative group">
                            <button onClick={() => setCodeTemplates(codeTemplates.filter((_, idx) => idx !== i))} className="absolute top-4 right-4 text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100"><Trash2 size={16} /></button>
                            <input value={t.hardware} onChange={e => { const up = [...codeTemplates]; up[i].hardware = e.target.value; setCodeTemplates(up); }} className="bg-transparent text-white font-bold text-[10px] uppercase border-none focus:ring-0 w-fit p-0" />
                            <textarea value={t.code} onChange={e => { const up = [...codeTemplates]; up[i].code = e.target.value; setCodeTemplates(up); }} className="w-full h-48 bg-transparent text-green-400 font-mono text-[11px] outline-none resize-none border-t border-white/5 pt-4" placeholder="# Injected as display.qiskitCode..." />
                        </div>
                    ))}
                    {codeTemplates.length === 0 && <div className="text-center py-10 border-2 border-dashed border-border rounded-2xl text-[10px] text-muted-foreground font-bold">FALLBACK TO LLM-GENERATED CODE</div>}
                </div>
            </div>
        </div>
    );

    const renderOutputTab = () => (
        <div className="space-y-8 animate-in fade-in">
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold flex items-center gap-2 tracking-tight">
                        <Activity size={16} className="text-[#3066bb]" /> Result Mapping (Table)
                    </h3>
                    <button onClick={() => setOutputMapping([...outputMapping, { resultKey: '', label: '', type: 'text', priority: 1 }])} className="text-[10px] font-bold bg-[#3066bb] text-white px-3 py-1.5 rounded-lg">+ Add Column</button>
                </div>
                <div className="bg-white border border-border rounded-2xl overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-secondary/30 border-b border-border">
                            <tr className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                <th className="p-4">Pointer (JSON Key)</th>
                                <th className="p-4">UI Label</th>
                                <th className="p-4">Data Type</th>
                                <th className="p-4">Sort</th>
                                <th className="p-4 text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {outputMapping.map((m, i) => (
                                <tr key={i} className="group">
                                    <td className="p-2"><input value={m.resultKey} onChange={e => { const up = [...outputMapping]; up[i].resultKey = e.target.value; setOutputMapping(up); }} placeholder="e.g. ticker" className="w-full p-2 bg-transparent text-xs font-mono outline-none" /></td>
                                    <td className="p-2"><input value={m.label} onChange={e => { const up = [...outputMapping]; up[i].label = e.target.value; setOutputMapping(up); }} placeholder="e.g. Asset Name" className="w-full p-2 bg-transparent text-xs outline-none" /></td>
                                    <td className="p-2">
                                        <select value={m.type} onChange={e => { const up = [...outputMapping]; up[i].type = e.target.value as any; setOutputMapping(up); }} className="text-xs bg-transparent outline-none cursor-pointer">
                                            {['text', 'number', 'percentage', 'boolean'].map(t => <option key={t} value={t}>{t}</option>)}
                                        </select>
                                    </td>
                                    <td className="p-2"><input type="number" value={m.priority} onChange={e => { const up = [...outputMapping]; up[i].priority = parseInt(e.target.value); setOutputMapping(up); }} className="w-12 p-2 bg-transparent text-xs appearance-none outline-none" /></td>
                                    <td className="p-2 text-center"><button onClick={() => setOutputMapping(outputMapping.filter((_, idx) => idx !== i))} className="p-2 hover:bg-red-500/10 text-red-400 rounded-lg"><Trash2 size={14} /></button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="pt-8 border-t border-border space-y-6">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold flex items-center gap-2 tracking-tight">
                        <BarChart2 size={16} className="text-[#3066bb]" /> Visualization (Charts)
                    </h3>
                    <button onClick={() => setChartConfig([...chartConfig, { type: 'bar', xKey: '', yKey: '', label: '' }])} className="text-[10px] font-bold bg-[#3066bb] text-white px-3 py-1.5 rounded-lg">+ Add Chart</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {chartConfig.map((c, i) => (
                        <div key={i} className="p-4 bg-white border border-border rounded-2xl flex flex-col gap-4 relative group">
                            <button onClick={() => setChartConfig(chartConfig.filter((_, idx) => idx !== i))} className="absolute top-4 right-4 text-muted-foreground hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"><X size={14} /></button>
                            <div className="flex items-center gap-4">
                                <div className="space-y-1 flex-1">
                                    <label className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Chart Type</label>
                                    <select value={c.type} onChange={e => { const up = [...chartConfig]; up[i].type = e.target.value as any; setChartConfig(up); }} className="w-full bg-secondary border border-border rounded-lg p-2 text-xs">
                                        {['bar', 'line', 'pie', 'scatter'].map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1 flex-[2]">
                                    <label className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Display Label</label>
                                    <input value={c.label} onChange={e => { const up = [...chartConfig]; up[i].label = e.target.value; setChartConfig(up); }} className="w-full bg-secondary border border-border rounded-lg p-2 text-xs" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">X-Axis Pointer</label>
                                    <input value={c.xKey} onChange={e => { const up = [...chartConfig]; up[i].xKey = e.target.value; setChartConfig(up); }} placeholder="e.g. ticker" className="w-full bg-secondary border border-border rounded-lg p-2 text-xs font-mono" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Y-Axis Pointer</label>
                                    <input value={c.yKey} onChange={e => { const up = [...chartConfig]; up[i].yKey = e.target.value; setChartConfig(up); }} placeholder="e.g. return" className="w-full bg-secondary border border-border rounded-lg p-2 text-xs font-mono" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );

    const renderAITab = () => (
        <div className="space-y-6 animate-in slide-in-from-bottom-2">
            <div className="flex items-center gap-4 p-4 bg-orange-500/5 border border-orange-500/10 rounded-2xl">
                <Brain className="text-orange-500 shrink-0" size={24} />
                <div>
                    <h3 className="text-sm font-bold tracking-tight">Neural Interpretation Layer</h3>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">Customize how the AI analyzes quantum results. You can use <code className="bg-secondary px-1 py-0.5 rounded">{"{{results}}"}</code> to inject raw backend data.</p>
                </div>
            </div>

            <div className="space-y-2">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">System Analysis Prompt override</label>
                <textarea 
                    value={interpretationPrompt} 
                    onChange={e => setInterpretationPrompt(e.target.value)} 
                    placeholder="Analyze the following portfolio optimization results: {{results}}. Focus on risk-to-reward ratio and sector diversification."
                    className="w-full h-80 bg-zinc-950 text-orange-200/80 font-mono text-[11px] border border-white/5 rounded-2xl p-6 outline-none focus:ring-1 focus:ring-orange-500/50 shadow-inner leading-relaxed" 
                />
            </div>

            <div className="p-4 bg-secondary/30 rounded-xl border border-border">
                <span className="text-[10px] font-bold text-muted-foreground block mb-2 uppercase tracking-tight">Available Injection Handles</span>
                <div className="flex flex-wrap gap-2">
                    {['results', 'industry', 'problem', 'parameters'].map(h => (
                        <code key={h} className="text-[10px] bg-white border border-border px-2 py-1 rounded text-[#3066bb] font-bold">{`{{${h}}}`}</code>
                    ))}
                </div>
            </div>
        </div>
    );

    return (
        <div className="max-w-7xl mx-auto h-full flex flex-col pt-2 selection:bg-[#3066bb]/10">
            {view === 'overview' ? (
                <div className="space-y-10 animate-in fade-in duration-500">
                    <div className="flex items-center justify-between pb-4 border-b border-border/50">
                        <div className="space-y-1">
                            <h2 className="text-2xl font-bold text-[#111827] flex items-center gap-3 tracking-tight">
                                <LayoutDashboard className="text-muted-foreground" size={24} /> Problem Blueprint Console
                            </h2>
                            <p className="text-sm text-muted-foreground font-medium">Engineer and deploy end-to-end quantum workflows.</p>
                        </div>
                        <button onClick={resetForm} className="bg-[#3066bb] text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-[#255299] hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-[#3066bb]/20">
                            <Plus size={18} /> New Blueprint
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {existingForms.map((form) => (
                            <div key={form._id} className="bg-white border border-border/60 p-8 rounded-[32px] group hover:border-[#3066bb]/50 hover:shadow-2xl hover:shadow-[#3066bb]/10 transition-all flex flex-col justify-between min-h-[300px] relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity"><Brain size={120} /></div>
                                <div className="space-y-6 relative z-10">
                                    <div className="flex items-center justify-between">
                                        <div className="text-[9px] font-bold tracking-[0.2em] text-[#3066bb] uppercase bg-[#3066bb]/5 px-2.5 py-1 rounded-full border border-[#3066bb]/20">{form.industry}</div>
                                        {form.active && <div className="flex items-center gap-1.5 text-green-500 text-[9px] font-bold uppercase tracking-wider"><div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> Active</div>}
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-[#111827] leading-tight mb-2">{form.problem}</h3>
                                        <div className="flex items-center gap-3">
                                            <p className="text-[10px] text-muted-foreground font-bold tracking-[0.1em] uppercase">{form.service}</p>
                                            <span className="text-[9px] text-[#3066bb] font-bold bg-[#3066bb]/10 px-2 py-0.5 rounded-lg border border-[#3066bb]/10">{form.hardware}</span>
                                        </div>
                                    </div>
                                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{form.description || 'No description provided.'}</p>
                                </div>
                                <button onClick={() => editForm(form)} className="mt-8 w-full py-3.5 rounded-2xl border border-border text-[10px] font-bold tracking-[0.15em] uppercase text-muted-foreground group-hover:bg-[#3066bb] group-hover:text-white group-hover:border-[#3066bb] transition-all flex items-center justify-center gap-2 group-hover:shadow-lg group-hover:shadow-[#3066bb]/30 active:scale-[0.98]">
                                    <Edit3 size={14} /> Design Console
                                </button>
                            </div>
                        ))}
                        {existingForms.length === 0 && <div className="col-span-full py-32 text-center text-muted-foreground font-medium italic opacity-50">NO BLUEPRINTS DEPLOYED YET</div>}
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
                    {/* Toolbar */}
                    <div className="flex items-center justify-between pb-6 border-b border-border/50 sticky top-0 bg-background z-20">
                        <div className="flex items-center gap-5">
                            <button onClick={() => setView('overview')} className="p-3 hover:bg-secondary rounded-2xl text-muted-foreground transition-all active:scale-95"><X size={24} /></button>
                            <div>
                                <h1 className="text-xl font-bold text-[#111827] tracking-tight">{problem || 'Unititled Blueprint'}</h1>
                                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[#3066bb]">
                                    {industry && <span>{industry}</span>}
                                    {service && <><X size={10} className="rotate-45" /> <span>{service}</span></>}
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <button onClick={handleSave} disabled={loading || !industry || !service || !problem} className="bg-[#3066bb] text-white px-8 py-3.5 rounded-2xl font-bold text-sm flex items-center gap-2 hover:bg-[#255299] transition-all shadow-xl shadow-[#3066bb]/20 active:scale-[0.98] disabled:opacity-50">
                                <Save size={18} /> {loading ? 'SAVING...' : 'SAVE BLUEPRINT'}
                            </button>
                        </div>
                    </div>

                    {status && (
                        <div className={`mt-6 p-4 rounded-xl text-xs font-bold tracking-wide animate-in slide-in-from-top-4 duration-500 flex items-center gap-3 ${status.includes('Error') ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-green-500/10 text-green-500 border border-green-500/20'}`}>
                            {status.includes('Error') ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
                            {status.toUpperCase()}
                        </div>
                    )}

                    {/* Tabs Navigation */}
                    <div className="flex gap-2 mt-8 mb-8 bg-secondary/30 p-1.5 rounded-2xl w-fit border border-border">
                        {[
                            { id: 'input', label: '1. Input', icon: <Layers size={14} /> },
                            { id: 'compute', label: '2. Compute', icon: <Terminal size={14} /> },
                            { id: 'output', label: '3. Output', icon: <Activity size={14} /> },
                            { id: 'ai', label: '4. AI Layer', icon: <Brain size={14} /> },
                        ].map(tab => (
                            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`px-6 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${activeTab === tab.id ? 'bg-white shadow-xl text-[#3066bb] border-border' : 'text-muted-foreground hover:bg-white/50 border-transparent'} border`}>
                                {tab.icon} {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Tab Viewport */}
                    <div className="flex-1 overflow-y-auto pr-4 custom-scrollbar pb-32">
                        {activeTab === 'input' && renderInputTab()}
                        {activeTab === 'compute' && renderComputeTab()}
                        {activeTab === 'output' && renderOutputTab()}
                        {activeTab === 'ai' && renderAITab()}
                    </div>
                </div>
            )}

            {/* Field Edit Modal (Reused from architect) */}
            {isEditModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-lg rounded-[32px] border border-border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-8 border-b border-border flex items-center justify-between">
                            <h3 className="text-lg font-bold tracking-tight text-[#111827]">{editingFieldIndex !== null ? 'Configure Parameter' : 'New Parameter Definition'}</h3>
                            <button onClick={() => setIsEditModalOpen(false)} className="p-2 hover:bg-secondary rounded-xl transition-all"><X size={20} className="text-muted-foreground" /></button>
                        </div>
                        <div className="p-8 space-y-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Label</label>
                                    <input value={editingField?.label} onChange={e => setEditingField(prev => prev ? ({ ...prev, label: e.target.value }) : null)} className="w-full bg-secondary/30 border border-border rounded-xl px-4 py-3 text-sm font-medium" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Key Identifier</label>
                                    <input value={editingField?.key} onChange={e => setEditingField(prev => prev ? ({ ...prev, key: e.target.value }) : null)} className="w-full bg-secondary/50 border border-border rounded-xl px-4 py-3 text-xs font-mono text-[#3066bb]" />
                                </div>
                            </div>
                            <div className="space-y-3">
                                <label className="text-[10px] font-bold text-muted-foreground uppercase">Data Input Type</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {['text', 'number', 'select', 'multi-select', 'range', 'textarea', 'dropdown'].map(t => (
                                        <button key={t} onClick={() => setEditingField(prev => prev ? ({ ...prev, type: t as any }) : null)} className={`px-3 py-2.5 rounded-xl text-[10px] font-bold border transition-all ${editingField?.type === t ? 'bg-[#3066bb] text-white border-[#3066bb]' : 'bg-secondary/50 border-transparent text-muted-foreground hover:bg-secondary'}`}>{t.toUpperCase()}</button>
                                    ))}
                                </div>
                            </div>
                            {['select', 'multi-select', 'dropdown'].includes(editingField?.type || '') && (
                                <div className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-2xl space-y-2">
                                    <label className="text-[10px] font-bold text-[#3066bb] uppercase">Options (CSV)</label>
                                    <textarea value={editingField?.options?.map(o => typeof o === 'string' ? o : o.label).join(', ')} onChange={(e) => setEditingField(prev => prev ? ({ ...prev, options: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }) : null)} className="w-full h-20 bg-white border border-border rounded-xl p-3 text-xs outline-none" />
                                </div>
                            )}
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-muted-foreground uppercase">Context Helper (Description)</label>
                                <input value={editingField?.description} onChange={e => setEditingField(prev => prev ? ({ ...prev, description: e.target.value }) : null)} className="w-full bg-secondary/30 border border-border rounded-xl px-4 py-3 text-sm" />
                            </div>
                        </div>
                        <div className="p-8 border-t border-border bg-secondary/10 flex justify-end gap-3">
                            <button onClick={() => setIsEditModalOpen(false)} className="px-6 py-3 text-xs font-bold text-muted-foreground">CANCEL</button>
                            <button onClick={() => {
                                if (!editingField?.label) return;
                                const field = { ...editingField, key: editingField.key || editingField.label.toLowerCase().replace(/\s+/g, '_') };
                                const up = [...fields];
                                if (editingFieldIndex !== null) up[editingFieldIndex] = field as any; else up.push(field as any);
                                setFields(up); setIsEditModalOpen(false);
                            }} className="px-8 py-3 bg-[#3066bb] text-white rounded-2xl text-xs font-bold hover:bg-[#255299] transition-all">SAVE PARAMETER</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function AlertCircle(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" x2="12" y1="8" y2="12" />
            <line x1="12" x2="12.01" y1="16" y2="16" />
        </svg>
    );
}
