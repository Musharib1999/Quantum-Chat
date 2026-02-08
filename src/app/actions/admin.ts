"use server";

import fs from 'fs';
import path from 'path';

const KB_FILE = path.join(process.cwd(), 'data/knowledge_base.json');
const GUARD_FILE = path.join(process.cwd(), 'data/guardrails.json');

// --- Types ---
export type QaPair = {
    id: string;
    question: string;
    answer: string;
    type: 'text' | 'url';
    tags: string[];
};

export type Guardrail = {
    id: string;
    rule: string;
    type: 'banned_topic' | 'safety_check' | 'pii_masking';
    active: boolean;
};

// --- Helpers ---
const readJson = (file: string) => {
    if (!fs.existsSync(file)) return [];
    try {
        return JSON.parse(fs.readFileSync(file, 'utf-8'));
    } catch (e) {
        return [];
    }
};

const writeJson = (file: string, data: any) => {
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
};

// --- Knowledge Base Actions ---
export async function getQaPairs(): Promise<QaPair[]> {
    return readJson(KB_FILE);
}

export async function addQaPair(qa: QaPair) {
    const current = readJson(KB_FILE);
    current.push(qa);
    writeJson(KB_FILE, current);
    return { success: true };
}

export async function deleteQaPair(id: string) {
    const current = readJson(KB_FILE);
    const updated = current.filter((q: QaPair) => q.id !== id);
    writeJson(KB_FILE, updated);
    return { success: true };
}

// --- Guardrails Actions ---
export async function getGuardrails(): Promise<Guardrail[]> {
    return readJson(GUARD_FILE);
}

export async function addGuardrail(rule: Guardrail) {
    const current = readJson(GUARD_FILE);
    current.push(rule);
    writeJson(GUARD_FILE, current);
    return { success: true };
}

export async function toggleGuardrail(id: string) {
    const current = readJson(GUARD_FILE);
    const updated = current.map((g: Guardrail) => g.id === id ? { ...g, active: !g.active } : g);
    writeJson(GUARD_FILE, updated);
    return { success: true };
}
