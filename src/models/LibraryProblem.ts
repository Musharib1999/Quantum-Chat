import mongoose from 'mongoose';

/**
 * Template-level record of a Verified Industry Problem Library entry.
 * Immutable content (prompt, data, best-known value) lives in LibraryProblemVersion.
 */
const LibraryProblemSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true },
    industry: { type: String, required: true, index: true },
    problemType: { type: String, required: true, index: true },
    description: { type: String, default: '' },
    sizeTier: { type: String, enum: ['small', 'medium', 'large'], required: true },
    estimatedBinaryVars: { type: Number, default: 0 },
    objectiveSense: { type: String, enum: ['Minimize', 'Maximize'], required: true },
    source: {
      name: { type: String, default: '' },
      url: { type: String, default: null },
      license: { type: String, default: '' },
    },
    currentVersion: { type: Number, default: 1 },
  },
  { timestamps: true }
);

if (mongoose.models && mongoose.models.LibraryProblem) {
  delete mongoose.models.LibraryProblem;
}

export default mongoose.models.LibraryProblem ||
  mongoose.model('LibraryProblem', LibraryProblemSchema);
