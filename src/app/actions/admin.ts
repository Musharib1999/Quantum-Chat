"use server";

import dbConnect from '@/lib/db';
import mongoose from 'mongoose';
import QaPair from '@/models/QaPair';
import Guardrail from '@/models/Guardrail';
import ChatLog from '@/models/ChatLog';
import Hardware from '@/models/Hardware';
import Course from '@/models/Course';
import Exercise from '@/models/Exercise';

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

import { serializeData } from '@/lib/utils';

// --- Hardware Actions ---
export async function getHardwares() {
    await dbConnect();
    
    // Seed default Qiskit (IBM) and D-Wave hardware items if they don't exist
    const qiskitExist = await Hardware.findOne({ provider: 'ibm' });
    if (!qiskitExist) {
        await Hardware.create({
            name: "Qiskit Aer Simulator Backend",
            provider: "ibm",
            qubits: 32,
            status: "Online",
            description: "Local high-performance state-vector simulator executing gate-based circuits.",
            order: 1
        });
    }

    const dwaveExist = await Hardware.findOne({ provider: 'dwave' });
    if (!dwaveExist) {
        await Hardware.create({
            name: "D-Wave Leap Hybrid Solver",
            provider: "dwave",
            qubits: 5000,
            status: "Online",
            description: "Cloud-based quantum hybrid solver executing Constrained Quadratic Models (CQM).",
            order: 2
        });
    }

    const hws = await Hardware.find({}).sort({ order: 1 }).lean();
    return serializeData(hws.map((r: any) => ({
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
    })));
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


// --- Academy Course Actions ---
export type CourseModuleType = {
    name: string;
    topics: string[];
};

export type CourseType = {
    id: string;
    level: number;
    title: string;
    subtitle: string;
    modules: CourseModuleType[];
    handsOn: string[];
    outcome: string;
    prompt: string;
    posts: string[];
    order: number;
};

export async function getCourses() {
    await dbConnect();
    
    // Seed default courses if none exist
    const count = await Course.countDocuments({});
    if (count === 0) {
        const defaultCourses = [
          {
            level: 1,
            title: "Quantum 101",
            subtitle: "Foundations of Quantum Science",
            modules: [
              { name: "Why Quantum?", topics: ["Classical physics vs quantum physics", "Why classical physics fails at atomic scales", "History and origin of quantum theory", "Wave-particle duality"] },
              { name: "Core Quantum Concepts", topics: ["Quantization", "Superposition", "Probability amplitudes", "Measurement", "Uncertainty principle", "Quantum states"] },
              { name: "Mathematical Foundations", topics: ["Complex numbers", "Vectors", "Matrices", "Probability", "Basic linear algebra intuition"] },
              { name: "Quantum Phenomena", topics: ["Interference", "Entanglement", "Quantum tunneling", "Decoherence"] },
              { name: "Quantum Information Basics", topics: ["Classical bit", "Quantum bit", "State representation", "Bloch sphere introduction"] }
            ],
            handsOn: [],
            outcome: "Understand what makes quantum systems fundamentally different from classical systems.",
            prompt: "I want to learn about 'Quantum 101: Foundations of Quantum Science'. Please give me an overview of classical vs quantum physics and core quantum phenomena like superposition and entanglement.",
            posts: ["What Is Quantum Mechanics?", "What Is Quantum Entanglement?"],
            order: 1
          },
          {
            level: 2,
            title: "Quantum Computing 101",
            subtitle: "Introduction to Qubits and Circuits",
            modules: [
              { name: "Classical Computing Refresher", topics: ["Bits and binary", "Logic gates", "Boolean operations", "Classical circuits"] },
              { name: "Introduction to Qubits", topics: ["Bit vs qubit", "Qubit states", "Dirac notation", "Computational basis", "Superposition"] },
              { name: "Quantum Gates", topics: ["Pauli-X", "Pauli-Y", "Pauli-Z", "Hadamard", "Phase gates"] },
              { name: "Multi-Qubit Systems", topics: ["Tensor products", "Two-qubit states", "CNOT gate", "Controlled gates"] },
              { name: "Entanglement", topics: ["Bell states", "Creating entanglement", "Measurement correlations"] },
              { name: "Quantum Circuits", topics: ["Circuit model", "Applying gates", "Measurement", "Circuit execution"] }
            ],
            handsOn: ["Build your first quantum circuit", "Create a Bell state", "Visualize qubits on the Bloch sphere", "Run circuits on a simulator"],
            outcome: "Build and understand basic quantum circuits.",
            prompt: "Help me get started with 'Quantum Computing 101: Introduction to Qubits and Circuits'. Teach me how a CNOT gate works and how to create a Bell state.",
            posts: ["What Is Quantum Computing?", "How Does a Quantum Computer Work?"],
            order: 2
          },
          {
            level: 3,
            title: "Quantum Computing 102",
            subtitle: "Quantum Programming and Algorithms",
            modules: [
              { name: "Quantum Programming Fundamentals", topics: ["Quantum SDKs and frameworks", "Quantum registers", "Circuit construction", "Simulation", "Measurement and results"] },
              { name: "Qiskit Fundamentals", topics: ["Creating circuits", "Adding gates", "Measurement", "Visualization", "Simulators"] },
              { name: "Important Quantum Algorithms", topics: ["Deutsch-Jozsa algorithm", "Bernstein-Vazirani algorithm", "Simon's algorithm", "Grover's algorithm"] },
              { name: "Quantum Fourier Transform", topics: ["Fourier transform intuition", "Quantum Fourier Transform", "Phase estimation basics"] },
              { name: "Introduction to Quantum Applications", topics: ["Search", "Optimization", "Cryptography", "Simulation"] }
            ],
            handsOn: ["Implement Deutsch-Jozsa", "Implement Grover's algorithm", "Build a Quantum Fourier Transform circuit", "Run experiments on simulators"],
            outcome: "Write quantum programs and implement foundational quantum algorithms.",
            prompt: "Explain 'Quantum Computing 102: Quantum Programming and Algorithms'. Walk me through Qiskit basics and Grover's search algorithm.",
            posts: ["What Is a Qubit and How Does It Work?", "Introduction to Quantum Gates and Quantum Circuits"],
            order: 3
          },
          {
            level: 4,
            title: "Quantum Computing 103",
            subtitle: "NISQ Computing and Hybrid Algorithms",
            modules: [
              { name: "NISQ Era", topics: ["What is NISQ?", "Current limitations of quantum computers", "Noise and errors", "Gate fidelity", "Connectivity"] },
              { name: "Quantum Noise", topics: ["Bit-flip errors", "Phase-flip errors", "Depolarizing noise", "Readout errors"] },
              { name: "Quantum Error Correction Introduction", topics: ["Why error correction is needed", "Classical vs quantum error correction", "Repetition codes", "Surface code introduction", "Logical vs physical qubits"] },
              { name: "Variational Quantum Algorithms", topics: ["Hybrid quantum-classical computing", "Parameterized quantum circuits", "Classical optimizers", "Cost functions"] },
              { name: "Variational Quantum Eigensolver", topics: ["Hamiltonians", "Ground-state estimation", "VQE workflow", "Ansatz", "Optimization loop"] },
              { name: "QAOA", topics: ["Combinatorial optimization", "Cost Hamiltonian", "Mixer Hamiltonian", "QAOA workflow"] }
            ],
            handsOn: ["Run noisy quantum circuits", "Implement VQE", "Implement QAOA", "Compare ideal vs noisy results"],
            outcome: "Understand how practical quantum computers are programmed and used today in the NISQ era.",
            prompt: "Let's explore 'Quantum Computing 103: NISQ Computing and Hybrid Algorithms'. Explain the difference between VQE and QAOA.",
            posts: ["Your First Quantum Program with Qiskit", "How Does Grover's Algorithm Work?"],
            order: 4
          },
          {
            level: 5,
            title: "Quantum Computing 104",
            subtitle: "Quantum Optimization, Applications and Hardware",
            modules: [
              { name: "Optimization Fundamentals", topics: ["What is optimization?", "Objective functions", "Constraints", "Decision variables", "Linear and quadratic optimization"] },
              { name: "QUBO", topics: ["Quadratic Unconstrained Binary Optimization", "Binary variables", "QUBO matrix", "Penalty functions", "Converting constraints into QUBO"] },
              { name: "Ising Model", topics: ["Spins", "Ising Hamiltonian", "Mapping QUBO <-> Ising"] },
              { name: "Quantum Annealing", topics: ["Gate-based vs annealing quantum computing", "Annealing process", "Energy landscapes", "D-Wave ecosystem"] },
              { name: "Real-World Applications", topics: ["Scheduling", "Resource allocation", "Portfolio optimization", "Logistics", "Vehicle routing", "Supply chain", "Drug discovery", "Quantum chemistry"] },
              { name: "Quantum Hardware Landscape", topics: ["Superconducting qubits", "Trapped ions", "Neutral atoms", "Photonic quantum computing", "Quantum annealers"] }
            ],
            handsOn: ["Convert a business problem into QUBO", "Solve QUBO classically", "Solve using quantum-inspired methods", "Execute an optimization workflow"],
            outcome: "Translate real-world optimization problems into quantum-compatible mathematical models (QUBO).",
            prompt: "Teach me 'Quantum Computing 104: Quantum Optimization, Applications and Hardware'. Explain how to formulate constraints into a QUBO penalty function.",
            posts: ["What Is the NISQ Era?", "Understanding Quantum Noise and Errors"],
            order: 5
          },
          {
            level: 6,
            title: "Quantum Computing 105",
            subtitle: "Advanced Quantum Computing",
            modules: [
              { name: "Advanced Quantum Algorithms", topics: ["Quantum Phase Estimation", "Shor's algorithm", "Amplitude amplification", "Quantum walks", "Advanced Hamiltonian simulation"] },
              { name: "Quantum Machine Learning", topics: ["Quantum feature maps", "Quantum kernels", "Variational Quantum Classifiers", "Quantum neural networks", "Hybrid quantum-classical ML"] },
              { name: "Quantum Error Correction", topics: ["Stabilizer formalism", "Quantum codes", "Surface codes", "Fault-tolerant quantum computing", "Logical qubits"] },
              { name: "Quantum Complexity", topics: ["BQP", "Quantum advantage", "Quantum supremacy", "Classical vs quantum complexity"] },
              { name: "Advanced Quantum Applications", topics: ["Quantum chemistry", "Materials science", "Financial modeling", "Machine learning", "Cryptography", "Optimization"] },
              { name: "Quantum Industry & Future", topics: ["Current quantum hardware", "Cloud quantum computing", "Quantum software ecosystems", "Benchmarking", "Quantum advantage claims", "Future challenges"] }
            ],
            handsOn: ["Build a complete VQE workflow", "Solve a real-world QUBO problem", "Compare classical vs quantum approaches", "Execute on multiple quantum backends", "Build an end-to-end hybrid quantum application"],
            outcome: "Understand advanced algorithms, quantum error correction, fault tolerance, and hybrid quantum applications at a research-ready level.",
            prompt: "I am ready for 'Quantum Computing 105: Advanced Quantum Computing'. Explain Shor's algorithm, fault tolerance, and BQP complexity class.",
            posts: ["Introduction to Quantum Optimization and QUBO", "Real-World Applications of Quantum Computing"],
            order: 6
          }
        ];
        
        await Course.insertMany(defaultCourses);
    }
    
    const courses = await Course.find({}).sort({ order: 1 }).lean();
    return serializeData(courses.map((c: any) => ({
        id: c._id.toString(),
        level: c.level,
        title: c.title,
        subtitle: c.subtitle,
        modules: (c.modules || []).map((m: any) => ({
            name: m.name,
            topics: m.topics || []
        })),
        handsOn: c.handsOn || [],
        outcome: c.outcome,
        prompt: c.prompt,
        posts: c.posts || [],
        order: c.order
    })));
}

export async function addCourse(data: any) {
    await dbConnect();
    const newCourse = await Course.create(data);
    return { success: true, id: newCourse._id.toString() };
}

export async function updateCourse(id: string, data: any) {
    await dbConnect();
    await Course.findByIdAndUpdate(id, data);
    return { success: true };
}

export async function deleteCourse(id: string) {
    await dbConnect();
    await Course.findByIdAndDelete(id);
    return { success: true };
}


export type ExerciseType = {
    id: string;
    courseId: string;
    title: string;
    type: 'code' | 'circuit' | 'optimization';
    qubits: number;
    bits: number;
    instructions: string;
    hints: string[];
    expectedGates: string[];
    targetState: string;
    referenceCode: string;
};

export async function getExercises(courseId?: string) {
    await dbConnect();
    const query = courseId ? { courseId } : {};
    const exercises = await Exercise.find(query).lean();
    return serializeData(exercises.map((e: any) => ({
        id: e._id.toString(),
        courseId: e.courseId,
        title: e.title,
        type: e.type,
        qubits: e.qubits,
        bits: e.bits,
        instructions: e.instructions,
        hints: e.hints || [],
        expectedGates: e.expectedGates || [],
        targetState: e.targetState || "",
        referenceCode: e.referenceCode || ""
    })));
}
export async function addExercise(data: any) {
    await dbConnect();
    const newExercise = await Exercise.create(data);
    return serializeData({
        id: newExercise._id.toString(),
        ...data
    });
}

export async function updateExercise(id: string, data: any) {
    await dbConnect();
    const updated = await Exercise.findByIdAndUpdate(id, data, { new: true });
    if (!updated) throw new Error("Exercise not found");
    return serializeData({
        id: updated._id.toString(),
        ...data
    });
}

export async function deleteExercise(id: string) {
    await dbConnect();
    const deleted = await Exercise.findByIdAndDelete(id);
    if (!deleted) throw new Error("Exercise not found");
    return true;
}
