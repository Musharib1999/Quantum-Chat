import mongoose from 'mongoose';

/**
 * Reproducible seeded benchmark snapshot bound to a specific immutable LibraryProblemVersion (contentHash).
 * Every run stores full backend labels, fixed seeds, λ sweep results, and honest solver-fit verdicts.
 */
const LibraryBenchmarkRunSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, index: true },
    contentHash: { type: String, required: true, index: true },
    runAt: { type: String, required: true },
    protocol: {
      repeats: { type: Number, required: true },
      seeds: { type: [Number], default: [] },
      tuneSeeds: { type: [Number], default: [] },
      quboSweepReads: { type: Number },
      quboReadsPerRepeat: { type: Number, required: true },
      quboNumSweeps: { type: Number },
      maxQuboVars: { type: Number, required: true },
      quboLimitRationale: { type: String },
    },
    environment: { type: mongoose.Schema.Types.Mixed },
    structure: { type: mongoose.Schema.Types.Mixed },
    equivalenceCheck: { type: mongoose.Schema.Types.Mixed },
    runtimeRatioSaVsCp: { type: Number },
    quboVars: { type: Number, required: true },
    verdict: {
      type: String,
      enum: ['competitive', 'classical_wins', 'exceeds_qubo_limit'],
      required: true,
    },
    verdictNote: { type: String, default: '' },
    qubo: { type: mongoose.Schema.Types.Mixed, required: true },
    classical: { type: mongoose.Schema.Types.Mixed, required: true },
  },
  { timestamps: true }
);

LibraryBenchmarkRunSchema.index({ slug: 1, contentHash: 1 }, { unique: true });

if (mongoose.models && mongoose.models.LibraryBenchmarkRun) {
  delete mongoose.models.LibraryBenchmarkRun;
}

export default mongoose.models.LibraryBenchmarkRun ||
  mongoose.model('LibraryBenchmarkRun', LibraryBenchmarkRunSchema);
