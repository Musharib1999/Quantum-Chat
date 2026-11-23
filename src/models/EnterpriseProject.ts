import mongoose from 'mongoose';

const EnterpriseProjectSchema = new mongoose.Schema(
  {
    projectId: { type: String, required: true, index: true },
    userEmail: { type: String, required: true, index: true },
    title: { type: String, required: true, default: 'New optimization model' },
    domain: { type: String, default: 'Custom domain' },
    createdAtMs: { type: Number, default: () => Date.now() },
    updatedAtMs: { type: Number, default: () => Date.now(), index: true },
    lastProblemText: { type: String, default: '' },
    messages: { type: [mongoose.Schema.Types.Mixed], default: [] },
    runs: { type: [mongoose.Schema.Types.Mixed], default: [] },
    activeRunId: { type: String, default: null },
    workspace: { type: mongoose.Schema.Types.Mixed, default: {} },
    libraryRef: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: true }
);

EnterpriseProjectSchema.index({ projectId: 1, userEmail: 1 }, { unique: true });

if (mongoose.models && mongoose.models.EnterpriseProject) {
  delete mongoose.models.EnterpriseProject;
}

export default mongoose.models.EnterpriseProject ||
  mongoose.model('EnterpriseProject', EnterpriseProjectSchema);
