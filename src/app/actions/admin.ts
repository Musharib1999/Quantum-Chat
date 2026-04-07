"use server";

import dbConnect from '@/lib/db';
import QaPair from '@/models/QaPair';
import Guardrail from '@/models/Guardrail';
import ChatLog from '@/models/ChatLog';
import Hardware from '@/models/Hardware';

// --- Types (Re-exported for Client) ---
export type QaPairType = {
    id: string;
    question: string;
    answer: string;
    type: 'text' | 'url' | 'form';
    formConfig?: any;
    tags: string[];
};

export type GuardrailType = {
    id: string;
    rule: string;
    type: 'banned_topic' | 'safety_check' | 'pii_masking';
    active: boolean;
};

export type HardwareType = {
    id: string;
    name: string;
    provider: 'ibm' | 'ionq' | 'rigetti' | 'dwave' | 'other';
    qubits: number;
    status: 'Online' | 'Offline' | 'Maintenance';
    description: string;
    serviceUrl?: string;
    testCode?: string;
    testOutput?: string;
    order: number;
};

export type ChatLogType = {
    id: string;
    userQuery: string;
    aiResponse: string;
    source: string;
    guardrailsStatus?: string;
    activeGuardrails?: string[];
    timestamp: string;
};

// --- Knowledge Base Actions ---
export async function getQaPairs() {
    await dbConnect();
    const pairs = await QaPair.find({}).lean();
    return pairs.map((p: any) => ({
        id: p._id.toString(),
        question: p.question,
        answer: p.answer,
        type: p.type || 'text',
        formConfig: p.formConfig,
        tags: p.tags || []
    }));
}

export async function addQaPair(data: any) {
    await dbConnect();
    const newPair = await QaPair.create(data);
    return { success: true, id: newPair._id.toString() };
}

export async function deleteQaPair(id: string) {
    await dbConnect();
    await QaPair.findByIdAndDelete(id);
    return { success: true };
}

// --- Guardrails Actions ---
export async function getGuardrails() {
    await dbConnect();
    const rules = await Guardrail.find({}).lean();
    return rules.map((r: any) => ({
        id: r._id.toString(),
        rule: r.rule,
        type: r.type || 'banned_topic',
        active: r.active ?? true
    }));
}

export async function addGuardrail(data: any) {
    await dbConnect();
    const newRule = await Guardrail.create(data);
    return { success: true, id: newRule._id.toString() };
}

export async function toggleGuardrail(id: string) {
    await dbConnect();
    const rule = await Guardrail.findById(id);
    if (rule) {
        rule.active = !rule.active;
        await rule.save();
    }
    return { success: true };
}

export async function deleteGuardrail(id: string) {
    await dbConnect();
    await Guardrail.findByIdAndDelete(id);
    return { success: true };
}

export async function updateGuardrail(id: string, rule: string) {
    await dbConnect();
    await Guardrail.findByIdAndUpdate(id, { rule });
    return { success: true };
}

// --- Chat Logs Actions ---
export async function getChatLogs() {
    await dbConnect();
    const logs = await ChatLog.find({}).sort({ timestamp: -1 }).limit(50).lean();
    return logs.map((l: any) => ({
        id: l._id.toString(),
        userQuery: l.userQuery,
        aiResponse: l.aiResponse,
        source: l.source,
        guardrailsStatus: l.guardrailsStatus,
        activeGuardrails: l.activeGuardrails,
        timestamp: l.timestamp.toISOString(),
    }));
}

// --- Hardware Actions ---
export async function getHardwares() {
    await dbConnect();
    const hws = await Hardware.find({}).sort({ order: 1 }).lean();
    return hws.map((r: any) => ({
        id: r._id.toString(),
        name: r.name,
        provider: r.provider,
        qubits: r.qubits,
        status: r.status,
        description: r.description,
        serviceUrl: r.serviceUrl,
        testCode: r.testCode,
        testOutput: r.testOutput,
        order: r.order
    }));
}

export async function addHardware(data: any) {
    await dbConnect();
    const newHw = await Hardware.create(data);
    return { success: true, id: newHw._id.toString() };
}

export async function updateHardware(id: string, data: any) {
    await dbConnect();
    await Hardware.findByIdAndUpdate(id, data);
    return { success: true };
}

export async function toggleHardwareStatus(id: string) {
    await dbConnect();
    const hw = await Hardware.findById(id);
    if (hw) {
        if (hw.status === 'Online') hw.status = 'Offline';
        else if (hw.status === 'Offline') hw.status = 'Maintenance';
        else hw.status = 'Online';
        await hw.save();
    }
    return { success: true };
}

export async function deleteHardware(id: string) {
    await dbConnect();
    await Hardware.findByIdAndDelete(id);
    return { success: true };
}
