import React, { useState, useMemo, useEffect } from 'react';
import algorithmsData from '../data/quantum_algorithms_manifest.json';

interface AlgorithmCatalogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAlgorithm: (prompt: string) => void;
}

export default function AlgorithmCatalogModal({
  isOpen,
  onClose,
  onSelectAlgorithm
}: AlgorithmCatalogModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  // Handle ESC key press to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const categories = useMemo(() => {
    const cats = ['All'];
    algorithmsData.forEach(item => {
      if (!cats.includes(item.category)) {
        cats.push(item.category);
      }
    });
    return cats;
  }, []);

  const filteredAlgorithms = useMemo(() => {
    return algorithmsData.filter(item => {
      const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
      const matchesSearch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [searchQuery, selectedCategory]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 sm:p-6 animate-in fade-in duration-200">
      <div style={{ height: "85vh", maxHeight: "800px", display: "flex", flexDirection: "column", overflow: "hidden" }} className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-5xl my-auto">
        
        {/* Header - Fixed Top */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-white shrink-0">
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              Quantum Algorithm Catalog
            </h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Explore 100+ quantum algorithms across Chemistry, Optimization, Cryptography, and Machine Learning
            </p>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            Close [Esc]
          </button>
        </div>

        {/* Controls: Search & Category Filter - Fixed Under Header */}
        <div className="px-6 py-3.5 border-b border-slate-200 space-y-3 bg-slate-50/50 shrink-0">
          <input
            type="text"
            placeholder="Search algorithms by name, domain, or computational complexity (e.g. VQE, HHL, QAOA)..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all shadow-2xs"
          />

          <div className="flex flex-wrap gap-1.5 overflow-x-auto pb-0.5">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-blue-600 text-white font-semibold shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Algorithm Cards Grid - Scrollable Body */}
        <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }} className="p-6 bg-slate-50/30">
          {filteredAlgorithms.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAlgorithms.map(item => (
                <div
                  key={item.id}
                  className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between hover:border-blue-400 hover:shadow-md transition-all group"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[10px] font-bold tracking-wider uppercase text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                        {item.category}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        {item.complexity}
                      </span>
                    </div>

                    <h3 className="font-bold text-slate-900 text-xs leading-snug group-hover:text-blue-600 transition-colors">
                      {item.name}
                    </h3>

                    <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-3">
                      {item.description}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-slate-400 font-medium">Scale: {item.qubits}</span>
                      <div className="flex gap-1">
                        {item.sdks.map(sdk => (
                          <span key={sdk} className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono text-[9px]">
                            {sdk}
                          </span>
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        onSelectAlgorithm(item.prompt);
                        onClose();
                      }}
                      className="w-full py-2 bg-blue-600 hover:bg-blue-700 active:scale-98 text-white text-[11px] font-semibold rounded-lg transition-all cursor-pointer text-center shadow-xs"
                    >
                      Load Algorithm Blueprint
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 text-slate-400 text-xs italic">
              No matching algorithms found for "{searchQuery}". Try searching another domain or keyword.
            </div>
          )}
        </div>

        {/* Footer - Fixed Bottom */}
        <div className="px-6 py-3 border-t border-slate-200 bg-white flex items-center justify-between text-[11px] text-slate-500 shrink-0">
          <span>Showing {filteredAlgorithms.length} of {algorithmsData.length} algorithms</span>
          <span className="font-mono text-[10px]">Quantum Guru Algorithm Library v3.0</span>
        </div>

      </div>
    </div>
  );
}
