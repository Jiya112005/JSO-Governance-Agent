import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from supabase import create_client, Client
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Configuration ---
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
genai.configure(api_key=GEMINI_API_KEY)
# Using your chosen Gemini 2.5 Flash model
model = genai.GenerativeModel('gemini-2.5-flash')

# --- Role Context / System Instruction ---
SYSTEM_INSTRUCTION = """
You are the strict JSO Licensing Governance Agent. You audit HR consultant transcripts for compliance. You must fail any consultant who:
 1. Pressures users to buy paid services.
2. Gives discriminatory or biased advice. 
3. Violates data privacy. Read the following transcript.
4. Demonstrates laziness, lack of effort, or attempts to game the platform.
If it violates ANY rules, you MUST respond starting with exactly the word 'FLAGGED:' followed by a 1-sentence reason. If it is perfect, respond with exactly 'COMPLIANT'. Do not say anything else.
"""

class AuditRequest(BaseModel):
    consultant_name: str
    transcript: str

@app.get("/")
def health_check():
    return {"status": "Licensing Agent is Online"}

@app.post("/api/audit")
async def run_audit(request: AuditRequest):
    try:
        full_prompt = f"{SYSTEM_INSTRUCTION}\n\nTranscript for Analysis:\n{request.transcript}"
        
        response = model.generate_content(full_prompt)
        ai_text = response.text.strip()

        is_flagged = "FLAGGED" in ai_text.upper()
        
    
        base_reason = ai_text.replace("FLAGGED:", "").replace("FLAGGED", "").replace("flagged", "").strip(": ") if is_flagged else "N/A"

        
        if is_flagged:
            # Query Supabase to find previous flags for this specific consultant
            past_alerts = supabase.table("governance_alerts").select("*").eq("consultant_name", request.consultant_name).execute()
            
            previous_offenses = len(past_alerts.data)
            
            # Escalate the alert if they are a repeat offender
            if previous_offenses > 0:
                final_reason = f"🚨 PATTERN DETECTED (Offense #{previous_offenses + 1}): {base_reason}"
            else:
                final_reason = base_reason

            # Insert the final text into Supabase
            data = {
                "consultant_name": request.consultant_name,
                "reason": final_reason
            }
            supabase.table("governance_alerts").insert(data).execute()
        else:
            final_reason = base_reason # Will just be "N/A"

        return {
            "consultant_name": request.consultant_name,
            "status": "FLAGGED" if is_flagged else "COMPLIANT",
            "analysis": ai_text,
            "reason": final_reason # Returned to frontend so the UI can update instantly
        }

    except Exception as e:
        print(f"Error: {e}") # Log error to Antigravity console
        raise HTTPException(status_code=500, detail=str(e))