with open("src/app/quantum-assistant/page.tsx", "r") as f:
    content = f.read()

# 1. Remove the old top indicator
old_indicator = """
            <div className="flex items-center justify-center gap-2 text-[10px] font-bold tracking-widest uppercase mb-1">
              {selectedPipeline === 'general' ? <span className="text-teal-600 bg-teal-50 px-2 py-0.5 rounded">General QA Mode</span> : 
               selectedPipeline === 'coder' ? <span className="text-purple-600 bg-purple-50 px-2 py-0.5 rounded">Code Generation Mode</span> :
               <span className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded">Optimization Mode</span>}
            </div>
"""
if old_indicator in content:
    content = content.replace(old_indicator, "")

# 2. Add the new bottom label
bottom_row = """              </div>
            </div>"""

new_bottom_row = """              </div>
            </div>
            
            {/* Pipeline Connection Status */}
            <div className="flex items-center justify-center gap-1.5 mt-1 opacity-80">
                <div className={`w-1.5 h-1.5 rounded-full ${selectedPipeline === 'optimization' ? 'bg-blue-500' : selectedPipeline === 'coder' ? 'bg-purple-500' : 'bg-teal-500'} animate-pulse`}></div>
                <span className="text-[10px] font-medium text-slate-500">
                    Connected to: <span className="font-bold text-slate-600">{
                        selectedPipeline === 'general' ? 'General QA Engine (Qwen 32B)' :
                        selectedPipeline === 'coder' ? 'Quantum Code Generator (Qwen 32B)' :
                        'Council of Experts Optimization Pipeline (OR-Tools / D-Wave)'
                    }</span>
                </span>
            </div>"""

if "Pipeline Connection Status" not in content:
    content = content.replace(bottom_row, new_bottom_row, 1)

with open("src/app/quantum-assistant/page.tsx", "w") as f:
    f.write(content)

print("Added pipeline connection status label.")
