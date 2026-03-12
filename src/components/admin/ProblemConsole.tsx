"use client";

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Trash2 } from 'lucide-react';

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
    outputTables?: { name: string; mapping: IOutputMapping[] }[];
    interpretationPrompt?: string;
    chartConfig?: IChartConfig[];
    executionEnvironment?: 'python-qiskit' | 'python-dwave';
    status?: 'pending_approval' | 'live' | 'rejected';
    createdBy?: string;
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
    const [outputTables, setOutputTables] = useState<{ name: string; mapping: IOutputMapping[] }[]>([]);
    const [chartConfig, setChartConfig] = useState<IChartConfig[]>([]);

    // Tab 4: AI State
    const [interpretationPrompt, setInterpretationPrompt] = useState('');

    // Inbox / Overview Filter
    const [listFilter, setListFilter] = useState<'live' | 'pending' | 'rejected'>('live');

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
            const [formsRes, metaRes, hwRes] = await Promise.all([
                axios.get('/api/quantum-forms'),
                axios.get('/api/quantum-forms/metadata'),
                axios.get('/api/hardware')
            ]);
            setExistingForms(formsRes.data);
            setMetadata(metaRes.data);
            setHardwareList(hwRes.data);
        } catch (error: any) {
            console.error("Failed to fetch admin data", error);
            setStatus("Error: " + error.message);
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
                active: true,
                fields,
                codeTemplates,
                batchingEnabled,
                maxQubitsPerBatch,
                qubitFormula,
                batchKey,
                outputMapping,
                outputTables,
                chartConfig,
                interpretationPrompt,
                executionEnvironment,
                status: 'live' // Admin created/edited are live by default
            };
            // ... same as before

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
            setStatus('Blueprint saved');
            fetchInitialData();
            setTimeout(() => setView('overview'), 1000);
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
        
        if (form.outputTables && form.outputTables.length > 0) {
            setOutputTables(form.outputTables);
        } else if (form.outputMapping && form.outputMapping.length > 0) {
            setOutputTables([{ name: 'Standard Results', mapping: form.outputMapping }]);
        } else {
            setOutputTables([]);
        }

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
        setBatchKey(''); setOutputMapping([]); setOutputTables([]); setChartConfig([]);
        setInterpretationPrompt(''); setExecutionEnvironment('python-qiskit');
        setView('editor'); setActiveTab('input');
    };

    const handleAction = async (id: string, action: 'live' | 'rejected') => {
        try {
            await axios.patch(`/api/quantum-forms/${id}`, { status: action, active: action === 'live' });
            setStatus(`Problem ${action}`);
            fetchInitialData();
        } catch (error: any) {
            setStatus("Error: " + error.message);
        }
    };

    const renderInputTab = () => (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Industry</label>
                    <input list="industries" value={industry} onChange={e => setIndustry(e.target.value)} placeholder="e.g. Finance" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-1 focus:ring-[#3066bb] text-sm text-slate-900" />
                    <datalist id="industries">{metadata.industries.map(i => <option key={i.id} value={i.label} />)}</datalist>
                </div>
                <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Service</label>
                    <input list="services" value={service} onChange={e => setService(e.target.value)} placeholder="e.g. Optimization" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-1 focus:ring-[#3066bb] text-sm text-slate-900" />
                    <datalist id="services">{metadata.services.map(s => <option key={s.id} value={s.label} />)}</datalist>
                </div>
                <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Problem</label>
                    <input list="problems" value={problem} onChange={e => setProblem(e.target.value)} placeholder="e.g. Portfolio" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-1 focus:ring-[#3066bb] text-sm text-slate-900" />
                    <datalist id="problems">{(metadata.problemMapping[industry]?.[service] || []).map((p: string) => <option key={p} value={p} />)}</datalist>
                </div>
                <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Hardware</label>
                    <input list="hardwares" value={hardware} onChange={e => setHardware(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-1 focus:ring-[#3066bb] text-sm text-slate-900 font-semibold text-[#3066bb]" />
                    <datalist id="hardwares"><option value="Universal" />{hardwareList.map(h => <option key={h.id} value={h.name} />)}</datalist>
                </div>
            </div>

            <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Description</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="problem description..." className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-1 focus:ring-[#3066bb] text-sm text-slate-900 h-20" />
            </div>

            <div className="pt-6 border-t border-slate-100">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-slate-900">Parameter builder</h3>
                    <div className="flex bg-slate-100 rounded-lg p-1">
                        <button onClick={() => setEditorMode('visual')} className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${editorMode === 'visual' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>Visual</button>
                        <button onClick={() => setEditorMode('json')} className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${editorMode === 'json' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>JSON</button>
                    </div>
                </div>

                {editorMode === 'visual' ? (
                    <div className="grid gap-3">
                        {fields.map((f, i) => (
                            <div key={i} className="bg-white border border-slate-200 p-4 rounded-xl flex items-center justify-between group hover:border-[#3066bb]/30 transition-all">
                                <div>
                                    <div className="text-sm font-semibold text-slate-900">{f.label}</div>
                                    <div className="flex gap-2 mt-1">
                                        <span className="text-[10px] font-mono text-slate-400">{f.key}</span>
                                        <span className="text-[10px] font-bold text-[#3066bb] uppercase">{f.type}</span>
                                    </div>
                                </div>
                                <div className="flex gap-4">
                                    <button onClick={() => { setEditingField(f); setEditingFieldIndex(i); setIsEditModalOpen(true); }} className="text-slate-400 hover:text-slate-900 font-bold text-xs">Edit</button>
                                    <button onClick={() => setFields(fields.filter((_, idx) => idx !== i))} className="text-red-400 hover:text-red-600 font-bold text-xs">Delete</button>
                                </div>
                            </div>
                        ))}
                        <button onClick={() => { setEditingField({ label: '', key: '', type: 'text' }); setEditingFieldIndex(null); setIsEditModalOpen(true); }} className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 hover:text-[#3066bb] hover:border-[#3066bb]/50 text-xs font-bold transition-all">+ Add parameter</button>
                    </div>
                ) : (
                    <textarea value={jsonFields} onChange={e => setJsonFields(e.target.value)} className="w-full h-80 bg-slate-50 border border-slate-200 rounded-xl p-4 font-mono text-xs outline-none focus:ring-1 focus:ring-[#3066bb]" />
                )}
            </div>
        </div>
    );

    const renderComputeTab = () => (
        <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6 border-b border-slate-100">
                <div className="space-y-3">
                    <h3 className="text-xs font-bold uppercase text-slate-500">Execution environment</h3>
                    <div className="flex gap-2">
                        {['python-qiskit', 'python-dwave'].map(env => (
                            <button key={env} onClick={() => setExecutionEnvironment(env as any)} className={`flex-1 py-3 rounded-xl border text-xs font-bold transition-all ${executionEnvironment === env ? 'bg-[#3066bb] text-white border-[#3066bb]' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                                {env.replace('python-', '').toUpperCase()}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="space-y-3">
                    <h3 className="text-xs font-bold uppercase text-slate-500">Batching logic</h3>
                    <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl">
                        <span className="text-xs font-bold text-slate-900">Enable batching</span>
                        <button onClick={() => setBatchingEnabled(!batchingEnabled)} className={`w-10 h-5 rounded-full relative transition-all ${batchingEnabled ? 'bg-[#3066bb]' : 'bg-slate-300'}`}>
                            <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${batchingEnabled ? 'left-6' : 'left-1'}`} />
                        </button>
                    </div>
                </div>
            </div>

            {batchingEnabled && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in slide-in-from-top-2">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Qubit formula</label>
                        <input value={qubitFormula} onChange={e => setQubitFormula(e.target.value)} placeholder="{{params.n}} * 2" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs" />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Max per batch</label>
                        <input type="number" value={maxQubitsPerBatch} onChange={e => setMaxQubitsPerBatch(parseInt(e.target.value))} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs" />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Batch key</label>
                        <input value={batchKey} onChange={e => setBatchKey(e.target.value)} placeholder="e.g. assets" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs" />
                    </div>
                </div>
            )}

            <div className="space-y-4 pt-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-900">Algorithm templates</h3>
                    <button onClick={() => setCodeTemplates([...codeTemplates, { hardware: 'Universal', code: '' }])} className="text-xs font-bold text-[#3066bb] hover:underline">Add hardware override</button>
                </div>
                <div className="space-y-4">
                    {codeTemplates.map((t, i) => (
                        <div key={i} className="bg-slate-900 p-6 rounded-2xl space-y-4 relative group border border-slate-800">
                            <div className="flex items-center justify-between">
                                <input value={t.hardware} onChange={e => { const up = [...codeTemplates]; up[i].hardware = e.target.value; setCodeTemplates(up); }} className="bg-transparent text-slate-400 font-bold text-[10px] uppercase outline-none" />
                                <button onClick={() => setCodeTemplates(codeTemplates.filter((_, idx) => idx !== i))} className="text-red-400 hover:text-red-500 text-xs font-bold">Remove</button>
                            </div>
                            <textarea value={t.code} onChange={e => { const up = [...codeTemplates]; up[i].code = e.target.value; setCodeTemplates(up); }} className="w-full h-48 bg-transparent text-green-400 font-mono text-xs outline-none border-t border-slate-800 pt-4" placeholder="# write qiskit code here..." />
                        </div>
                    ))}
                    {codeTemplates.length === 0 && <div className="text-center py-12 border border-dashed border-slate-200 rounded-2xl text-[10px] text-slate-400 font-bold">using default llm generation</div>}
                </div>
            </div>
        </div>
    );

    const renderOutputTab = () => (
        <div className="space-y-10">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">Result tables</h3>
                <button onClick={() => setOutputTables([...outputTables, { name: 'Results', mapping: [{ resultKey: '', label: '', type: 'text', priority: 1 }] }])} className="text-xs font-bold text-[#3066bb] hover:underline">+ Add table</button>
            </div>

            {outputTables.map((table, tableIdx) => (
                <div key={tableIdx} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                    <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                        <input value={table.name} onChange={e => { const up = [...outputTables]; up[tableIdx].name = e.target.value; setOutputTables(up); }} className="bg-transparent text-sm font-bold text-slate-900 outline-none" placeholder="Table name" />
                        <button onClick={() => setOutputTables(outputTables.filter((_, idx) => idx !== tableIdx))} className="text-red-400 hover:text-red-600 text-[10px] font-bold uppercase">Remove</button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50 text-slate-500 border-b border-slate-100 font-semibold uppercase tracking-widest text-[10px]">
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
                                        <td className="p-2 text-right"><button onClick={() => { const up = [...outputTables]; up[tableIdx].mapping = up[tableIdx].mapping.filter((_, idx) => idx !== fieldIdx); setOutputTables(up); }} className="text-red-400 hover:text-red-600 font-bold px-2">Delete</button></td>
                                    </tr>
                                ))}
                                <tr>
                                    <td colSpan={5} className="p-4 text-center">
                                        <button onClick={() => { const up = [...outputTables]; up[tableIdx].mapping.push({ resultKey: '', label: '', type: 'text', priority: up[tableIdx].mapping.length + 1 }); setOutputTables(up); }} className="text-[10px] font-bold text-slate-400 hover:text-slate-900">+ Add column</button>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            ))}

            <div className="pt-8 border-t border-slate-100 space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-900">Charts</h3>
                    <button onClick={() => setChartConfig([...chartConfig, { type: 'bar', xKey: '', yKey: '', label: '' }])} className="text-xs font-bold text-[#3066bb] hover:underline">+ Add chart</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {chartConfig.map((c, i) => (
                        <div key={i} className="p-5 bg-white border border-slate-200 rounded-2xl space-y-4 shadow-sm relative group">
                            <button onClick={() => setChartConfig(chartConfig.filter((_, idx) => idx !== i))} className="absolute top-4 right-4 text-red-400 text-[10px] font-bold">Remove</button>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] text-slate-400 font-bold uppercase">Chart type</label>
                                    <select value={c.type} onChange={e => { const up = [...chartConfig]; up[i].type = e.target.value as any; setChartConfig(up); }} className="w-full p-2 bg-slate-50 border border-slate-100 rounded text-xs">
                                        {['bar', 'line', 'pie', 'scatter'].map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] text-slate-400 font-bold uppercase">Label</label>
                                    <input value={c.label} onChange={e => { const up = [...chartConfig]; up[i].label = e.target.value; setChartConfig(up); }} className="w-full p-2 bg-slate-50 border border-slate-100 rounded text-xs" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] text-slate-400 font-bold uppercase">X data</label>
                                    <input value={c.xKey} onChange={e => { const up = [...chartConfig]; up[i].xKey = e.target.value; setChartConfig(up); }} className="w-full p-2 bg-slate-50 border border-slate-100 rounded text-xs font-mono" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] text-slate-400 font-bold uppercase">Y data</label>
                                    <input value={c.yKey} onChange={e => { const up = [...chartConfig]; up[i].yKey = e.target.value; setChartConfig(up); }} className="w-full p-2 bg-slate-50 border border-slate-100 rounded text-xs font-mono" />
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
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
                <h3 className="text-sm font-bold text-slate-900">Interpretation logic</h3>
                <p className="text-xs text-slate-500">How should the AI explain these results to the user?</p>
            </div>
            <textarea 
                value={interpretationPrompt} 
                onChange={e => setInterpretationPrompt(e.target.value)} 
                placeholder="analyze the following data: {{results}}..."
                className="w-full h-80 bg-slate-900 text-slate-200 p-6 font-mono text-xs border border-slate-800 rounded-2xl outline-none focus:ring-1 focus:ring-[#3066bb]" 
            />
        </div>
    );

    return (
        <div className="space-y-8">
            {view === 'overview' ? (
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-bold text-slate-900">Problem blueprints</h2>
                        <button onClick={resetForm} className="bg-[#3066bb] text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#255299] transition-all shadow-sm">
                            New blueprint
                        </button>
                    </div>

                    <div className="flex gap-4 border-b border-slate-100 mb-6">
                        <button onClick={() => setListFilter('live')} className={`pb-4 px-4 text-xs font-bold transition-all border-b-2 ${listFilter === 'live' ? 'border-[#3066bb] text-[#3066bb]' : 'border-transparent text-slate-400'}`}>Library ({existingForms.filter(f => f.status !== 'pending_approval' && f.status !== 'rejected').length})</button>
                        <button onClick={() => setListFilter('pending')} className={`pb-4 px-4 text-xs font-bold transition-all border-b-2 ${listFilter === 'pending' ? 'border-[#3066bb] text-[#3066bb]' : 'border-transparent text-slate-400'}`}>Inbox ({existingForms.filter(f => f.status === 'pending_approval' || (f as any).status === undefined && (f as any).createdBy).length})</button>
                        <button onClick={() => setListFilter('rejected')} className={`pb-4 px-4 text-xs font-bold transition-all border-b-2 ${listFilter === 'rejected' ? 'border-[#3066bb] text-[#3066bb]' : 'border-transparent text-slate-400'}`}>Rejected</button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {existingForms
                            .filter(f => {
                                if (listFilter === 'live') return f.status === 'live' || !f.status;
                                if (listFilter === 'pending') return f.status === 'pending_approval';
                                if (listFilter === 'rejected') return f.status === 'rejected';
                                return true;
                            })
                            .map((form) => (
                            <div key={form._id} className="bg-white border border-slate-200 p-6 rounded-2xl hover:border-[#3066bb] hover:shadow-md transition-all flex flex-col min-h-[220px]">
                                <div className="flex items-center justify-between mb-4">
                                    <span className="text-[10px] font-bold text-[#3066bb] uppercase bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">{form.industry}</span>
                                    {form.createdBy && <span className="text-[10px] text-slate-400 font-medium">By: {form.createdBy.split('@')[0]}</span>}
                                </div>
                                <h3 className="text-lg font-bold text-slate-900 mb-2 line-clamp-1">{form.problem}</h3>
                                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-4">{form.service} • {form.hardware}</div>
                                <p className="text-xs text-slate-500 line-clamp-2 mb-6 flex-1">{form.description}</p>
                                
                                {listFilter === 'pending' ? (
                                    <div className="flex gap-2">
                                        <button onClick={() => editForm(form)} className="flex-1 py-2.5 rounded-xl border border-slate-100 bg-slate-50 text-[10px] font-bold text-slate-600 hover:bg-slate-100 transition-all uppercase">Review</button>
                                        <button onClick={() => handleAction(form._id!, 'live')} className="flex-1 py-2.5 rounded-xl bg-[#3066bb] text-white text-[10px] font-bold hover:bg-[#255299] transition-all uppercase">Approve</button>
                                        <button onClick={() => handleAction(form._id!, 'rejected')} className="px-4 py-2.5 rounded-xl border border-red-100 text-red-500 hover:bg-red-50 transition-all"><Trash2 size={14}/></button>
                                    </div>
                                ) : (
                                    <button onClick={() => editForm(form)} className="w-full py-2.5 rounded-xl border border-slate-100 bg-slate-50 text-[10px] font-bold text-slate-600 hover:bg-[#3066bb] hover:text-white hover:border-[#3066bb] transition-all uppercase tracking-widest mt-auto">
                                        Configure
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                    {existingForms.length === 0 && <div className="py-20 text-center text-slate-400 text-sm italic">no blueprints found</div>}
                    {existingForms.length === 0 && <div className="py-20 text-center text-slate-400 text-sm italic">no blueprints found</div>}
                </div>
            ) : (
                <div className="flex flex-col h-full animate-in fade-in duration-300">
                    <div className="flex items-center justify-between pb-6 border-b border-slate-100 sticky top-0 bg-white z-20">
                        <div className="flex items-center gap-6">
                            <button onClick={() => setView('overview')} className="p-2 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-slate-900 transition-all font-bold text-sm">Cancel</button>
                            <div>
                                <h1 className="text-lg font-bold text-slate-900">{problem || 'Untitled project'}</h1>
                                <div className="text-[10px] font-bold text-[#3066bb] uppercase tracking-widest">{industry} • {service}</div>
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <button onClick={handleSave} disabled={loading || !industry || !service || !problem} className="bg-[#3066bb] text-white px-8 py-2.5 rounded-xl font-bold text-xs hover:bg-[#255299] transition-all disabled:opacity-50">
                                {loading ? 'Saving...' : 'Deploy blueprint'}
                            </button>
                        </div>
                    </div>

                    {status && (
                        <div className={`mt-4 p-3 rounded-xl text-[10px] font-bold uppercase tracking-widest border ${status.includes('Error') ? 'bg-red-50 text-red-500 border-red-100' : 'bg-green-50 text-green-600 border-green-100'}`}>
                            {status}
                        </div>
                    )}

                    <div className="flex gap-2 mt-6 mb-8 bg-slate-50 p-1 rounded-xl w-fit border border-slate-100">
                        {[
                            { id: 'input', label: '1. Input structure' },
                            { id: 'compute', label: '2. Backend logic' },
                            { id: 'output', label: '3. Data mapping' },
                            { id: 'ai', label: '4. Analysis layer' },
                        ].map(tab => (
                            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`px-5 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === tab.id ? 'bg-white shadow-sm text-[#3066bb]' : 'text-slate-400 hover:text-slate-700'}`}>
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
                    <div className="bg-white w-full max-w-md rounded-2xl border border-slate-200 shadow-xl p-8 animate-in zoom-in-95 duration-200">
                        <h3 className="text-lg font-bold text-slate-900 mb-6">Parameter configuration</h3>
                        <div className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-500 uppercase">Input label</label>
                                <input value={editingField?.label} onChange={e => setEditingField(prev => prev ? ({ ...prev, label: e.target.value }) : null)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm" placeholder="e.g. Iterations" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-500 uppercase">Variable key</label>
                                <input value={editingField?.key} onChange={e => setEditingField(prev => prev ? ({ ...prev, key: e.target.value }) : null)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-[#3066bb]" placeholder="e.g. iter_count" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-500 uppercase">Type</label>
                                <select value={editingField?.type} onChange={e => setEditingField(prev => prev ? ({ ...prev, type: e.target.value as any }) : null)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm">
                                    {['text', 'number', 'select', 'multi-select', 'range', 'textarea', 'dropdown'].map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="mt-8 flex justify-end gap-3">
                            <button onClick={() => setIsEditModalOpen(false)} className="text-xs font-bold text-slate-400 px-4">Cancel</button>
                            <button onClick={() => {
                                if (!editingField?.label) return;
                                const field = { ...editingField, key: editingField.key || editingField.label.toLowerCase().replace(/\s+/g, '_') };
                                const up = [...fields];
                                if (editingFieldIndex !== null) up[editingFieldIndex] = field as any; else up.push(field as any);
                                setFields(up); setIsEditModalOpen(false);
                            }} className="bg-[#3066bb] text-white px-6 py-2 rounded-xl text-xs font-bold shadow-sm">Save parameter</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
