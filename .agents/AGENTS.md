
## Deployment Handoff Document Rule
**Trigger:** Whenever an agent performs a `git push` to the project repository.
**Action:** The agent MUST automatically append a new section to a continuously maintained Markdown artifact named `deployment_handoff.md`.
**Format Requirements:**
Each entry in the document must include:
1. **Timestamp:** The current Date and Time in IST (Indian Standard Time).
2. **What changes were made and why:** A concise summary of the bug fixes or feature additions.
3. **How to update the environments:** Explicit, copy-pasteable terminal commands and instructions for updating the remote environments.
   - For **Railway** (Frontend): Mention that Railway auto-deploys on GitHub push, so no manual action is usually required unless environment variables were added.
   - For **RunPod** (Backend): Provide the exact bash commands to pull the latest code and restart the backend server (e.g., `cd /workspace/Quantum_Guru && git pull origin main`, `pkill -f uvicorn`, `nohup uvicorn v2.main_v2:app --host 0.0.0.0 --port 8002 > /root/backend.log 2>&1 &`).
