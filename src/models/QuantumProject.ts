import mongoose from 'mongoose';

const QuantumProjectSchema = new mongoose.Schema({
  projectId: { type: String, required: true, unique: true, index: true },
  userEmail: { type: String, default: 'ms@qc.guru', index: true },
  title: { type: String, required: true },
  desc: { type: String, default: '' },
  templateKey: { type: String, default: 'optimization' },
  activeFile: { type: String, default: 'main.py' },
  files: { 
    type: mongoose.Schema.Types.Mixed, 
    default: {} 
  },
  runtimeMetrics: {
    activeQubits: { type: Number, default: 4 },
    depth: { type: Number, default: 6 },
    cnots: { type: Number, default: 3 },
    circuitText: { type: String, default: '' },
    expectationVal: { type: String, default: '-0.4125 Ha' },
    fidelity: { type: String, default: '99.82%' },
    latencySec: { type: String, default: '0.138s' },
    terminalLog: { type: [String], default: [] }
  },
  chatMessages: { type: [mongoose.Schema.Types.Mixed], default: [] }
}, { timestamps: true });

if (mongoose.models && mongoose.models.QuantumProject) {
  delete mongoose.models.QuantumProject;
}

export default mongoose.models.QuantumProject || mongoose.model('QuantumProject', QuantumProjectSchema);
