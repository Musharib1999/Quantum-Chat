import re

with open("src/app/quantum-assistant/page.tsx", "r") as f:
    content = f.read()

# 1. Add useState
if "const [selectedPipeline" not in content:
    content = content.replace("const [selectedStrategy, setSelectedStrategy] = useState<'Auto' | 'CQM' | 'QUBO' | 'OR-Tools'>('Auto');", 
                              "const [selectedStrategy, setSelectedStrategy] = useState<'Auto' | 'CQM' | 'QUBO' | 'OR-Tools'>('Auto');\n  const [selectedPipeline, setSelectedPipeline] = useState<'general' | 'optimization' | 'coder'>('general');")

# 2. Update useQuantumChat
if "selectedPipeline })" not in content:
    content = content.replace("useQuantumChat('assistant', { mode: selectedStrategy.toLowerCase() });", 
                              "useQuantumChat('assistant', { mode: selectedStrategy.toLowerCase(), selectedPipeline });")

# 3. Update handleSendMessage
if "selectedPipeline\n    });" not in content and "selectedPipeline," not in content.split("handleSendMessage")[1][:1000]:
    content = content.replace("mode: selectedStrategy.toLowerCase()\n    });", 
                              "mode: selectedStrategy.toLowerCase(),\n      selectedPipeline\n    });")

# 4. Update Dropdown
old_click = "onClick={() => { setShowAttachMenu(false); }}"
new_click = """onClick={() => { 
                                setSelectedPipeline(
                                  label === 'Business Problem to Optimization' ? 'optimization' :
                                  label === 'Generate Quantum Code' ? 'coder' : 'general'
                                );
                                setShowAttachMenu(false); 
                              }}"""
content = content.replace(old_click, new_click)

# 5. Update Placeholder
old_placeholder = 'placeholder="Describe your optimization problem... Example: optimize delivery routes, Nurse shift allocation..."'
new_placeholder = """placeholder={
                  selectedPipeline === 'optimization'
                    ? "Describe your optimization problem... Example: optimize delivery routes, Nurse shift allocation..."
                    : selectedPipeline === 'coder'
                    ? "Describe the quantum code you want to generate..."
                    : "Ask a general quantum computing question..."
                }"""
content = content.replace(old_placeholder, new_placeholder)

# 6. Add Visual indicator above input
indicator = """
            <div className="flex items-center justify-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
"""
new_indicator = """
            <div className="flex items-center justify-center gap-2 text-[10px] font-bold tracking-widest uppercase mb-1">
              {selectedPipeline === 'general' ? <span className="text-teal-600 bg-teal-50 px-2 py-0.5 rounded">General QA Mode</span> : 
               selectedPipeline === 'coder' ? <span className="text-purple-600 bg-purple-50 px-2 py-0.5 rounded">Code Generation Mode</span> :
               <span className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded">Optimization Mode</span>}
            </div>
            <div className="flex items-center justify-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
"""
if "General QA Mode" not in content:
    content = content.replace(indicator, new_indicator)

with open("src/app/quantum-assistant/page.tsx", "w") as f:
    f.write(content)

print("UI Fixed.")
