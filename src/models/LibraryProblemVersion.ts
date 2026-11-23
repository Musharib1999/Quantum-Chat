import mongoose from 'mongoose';

/**
 * Immutable, content-hashed version of a library problem.
 * Any change to prompt/data/best-known creates a NEW version (never edits an old one).
 * `status` defaults to 'pipeline_generated'; review/badge levels are intentionally not implemented yet.
 */
const LibraryProblemVersionSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, index: true },
    version: { type: Number, required: true },
    contentHash: { type: String, required: true },
    prompt: { type: String, required: true },
    data: { type: mongoose.Schema.Types.Mixed, default: {} },
    bestKnown: {
      value: { type: Number, required: true },
      kind: { type: String, enum: ['proven_optimal', 'published_optimal'], required: true },
      method: { type: String, default: '' },
    },
    status: { type: String, default: 'pipeline_generated' },
  },
  { timestamps: true }
);

LibraryProblemVersionSchema.index({ slug: 1, version: 1 }, { unique: true });
LibraryProblemVersionSchema.index({ slug: 1, contentHash: 1 }, { unique: true });

if (mongoose.models && mongoose.models.LibraryProblemVersion) {
  delete mongoose.models.LibraryProblemVersion;
}

export default mongoose.models.LibraryProblemVersion ||
  mongoose.model('LibraryProblemVersion', LibraryProblemVersionSchema);
