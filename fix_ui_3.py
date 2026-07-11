with open("src/app/quantum-assistant/page.tsx", "r") as f:
    content = f.read()

# 1. Update dropdown options
content = content.replace(
    "{ label: 'General Quantum Computing Questions', icon: '⚛️' },",
    "{ label: 'General Quantum Computing Question', icon: '⚛️' },"
)
content = content.replace(
    "{ label: 'Generate Quantum Code', icon: '💻' },",
    "{ label: 'Generate Quantum Algorithm', icon: '💻' },"
)

# 2. Update onClick handler
old_onclick = """                                setSelectedPipeline(
                                  label === 'Business Problem to Optimization' ? 'optimization' :
                                  label === 'Generate Quantum Code' ? 'coder' : 'general'
                                );"""
new_onclick = """                                setSelectedPipeline(
                                  label === 'Business Problem to Optimization' ? 'optimization' :
                                  label === 'Generate Quantum Algorithm' ? 'coder' : 'general'
                                );"""
content = content.replace(old_onclick, new_onclick)

# 3. Update Pipeline Connection Status
old_status = """            {/* Pipeline Connection Status */}
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

new_status = """            {/* Pipeline Connection Status */}
            <div className="flex items-center justify-center gap-1.5 mt-1 opacity-80">
                <span className="text-[10px] font-medium text-slate-500">
                    Connected to: <span className="font-bold text-slate-600">{
                        selectedPipeline === 'general' ? 'General Quantum Computing Question' :
                        selectedPipeline === 'coder' ? 'Generate Quantum Algorithm' :
                        'Business Problem to Optimization'
                    }</span>
                </span>
            </div>"""

content = content.replace(old_status, new_status)

with open("src/app/quantum-assistant/page.tsx", "w") as f:
    f.write(content)

print("Updated text and removed bubble.")
