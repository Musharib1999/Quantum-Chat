import subprocess
import tempfile
import os
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional
import sys
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="D-Wave Code Executor API (Local)")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class CodeExecutionRequest(BaseModel):
    code: str

class ExecutionResponse(BaseModel):
    output: str
    error: Optional[str] = None
    success: bool = True

@app.get("/")
def read_root():
    return {"message": "D-Wave Executor Service (Local) Running"}

@app.post("/validate")
def validate_code(request: CodeExecutionRequest):
    try:
        compile(request.code, '<string>', 'exec')
        return {"valid": True, "error": None}
    except SyntaxError as e:
        return {"valid": False, "error": f"Syntax Error: {str(e)}"}
    except Exception as e:
        return {"valid": False, "error": str(e)}

@app.post("/execute", response_model=ExecutionResponse)
async def execute_code(request: CodeExecutionRequest):
    # Create a temporary file
    with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as tmp:
        script_content = "import sys\n"
        script_content += "from dimod import BinaryQuadraticModel, SimulatedAnnealingSampler\n"
        script_content += "import numpy as np\n"
        script_content += request.code
        
        tmp.write(script_content)
        tmp_path = tmp.name

    try:
        # Run the script in a subprocess for isolation
        result = subprocess.run(
            [sys.executable, tmp_path],
            capture_output=True,
            text=True,
            timeout=60 # 1 minute timeout for annealing
        )
        
        output = result.stdout
        error_msg = None
        success = True

        if result.returncode != 0:
            error_msg = f"Runtime Error (Exit {result.returncode}):\n{result.stderr}"
            success = False
        elif result.stderr:
            output += "\n--- Warnings/Info ---\n" + result.stderr

    except subprocess.TimeoutExpired:
        error_msg = "Execution timed out (60s limit)."
        output = ""
        success = False
    except Exception as e:
        error_msg = f"Unexpected Service Error: {str(e)}"
        output = ""
        success = False
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)
    
    return ExecutionResponse(
        output=output if output else "",
        error=error_msg,
        success=success
    )

if __name__ == "__main__":
    import uvicorn
    import os
    port = int(os.environ.get("PORT", 8002))
    uvicorn.run(app, host="0.0.0.0", port=port)
