"use server";

import dbConnect from '@/lib/db';
import QaPair from '@/models/QaPair';
import Guardrail from '@/models/Guardrail';

// --- Types (Re-exported for Client) ---
export type QaPairType = {
    id: string;
    question: string;
    answer: string;
    type: 'text' | 'url';
    tags: string[];
};

export type GuardrailType = {
    id: string;
    rule: string;
    type: 'banned_topic' | 'safety_check' | 'pii_masking';
    active: boolean;
};

// --- Knowledge Base Actions ---
export async function getQaPairs() {
    await dbConnect();
    const pairs = await QaPair.find({}).lean();
    return pairs.map((p: any) => ({
        id: p._id.toString(),
        question: p.question,
        answer: p.answer,
        type: p.type,
        tags: p.tags
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
        type: r.type,
        active: r.active
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
