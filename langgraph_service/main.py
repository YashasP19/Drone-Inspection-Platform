import os
import json
import asyncio
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional

from agent_graph import build_inspection_graph
from yolo_detector import detect_cracks

app = FastAPI(title="LangGraph Infrastructure Inspection Service")

# CORS middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class InspectionRequest(BaseModel):
    asset_id: str
    asset_name: str
    gdrive_link: str
    images: Optional[List[str]] = []

class CrackDetectRequest(BaseModel):
    image_url: str

# Instantiate the compiled graph
graph = build_inspection_graph()

@app.post("/inspect")
async def run_inspection(req: InspectionRequest):
    """
    Run a full synchronous inspection.
    """
    try:
        initial_state = {
            "asset_id": req.asset_id,
            "asset_name": req.asset_name,
            "gdrive_link": req.gdrive_link,
            "images": req.images or [],
            "next_agent": "supervisor",
            "logs": ["Initialized stateless LangGraph session"],
            "image_analysis": {},
            "defect_detection": {},
            "severity_assessment": {},
            "recommendation": {},
            "report": {},
            "agent_states": {
                "image_analysis": {"status": "Waiting", "reasoning": "Waiting for initialization.", "confidence": 0, "output": {}},
                "defect_detection": {"status": "Waiting", "reasoning": "Waiting for defect analysis.", "confidence": 0, "output": {}},
                "severity_assessment": {"status": "Waiting", "reasoning": "Waiting for severity grading.", "confidence": 0, "output": {}},
                "recommendation": {"status": "Waiting", "reasoning": "Waiting for recommendations.", "confidence": 0, "output": {}},
                "report": {"status": "Waiting", "reasoning": "Waiting for compilation.", "confidence": 0, "output": {}}
            }
        }
        
        final_state = graph.invoke(initial_state)
        return final_state
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/inspect/stream")
async def stream_inspection(req: InspectionRequest):
    """
    Run the inspection and stream live updates node-by-node.
    """
    initial_state = {
        "asset_id": req.asset_id,
        "asset_name": req.asset_name,
        "gdrive_link": req.gdrive_link,
        "images": req.images or [],
        "next_agent": "supervisor",
        "logs": ["Initialized streaming LangGraph session"],
        "image_analysis": {},
        "defect_detection": {},
        "severity_assessment": {},
        "recommendation": {},
        "report": {},
        "agent_states": {
            "image_analysis": {"status": "Waiting", "reasoning": "Waiting for initialization.", "confidence": 0, "output": {}},
            "defect_detection": {"status": "Waiting", "reasoning": "Waiting for defect analysis.", "confidence": 0, "output": {}},
            "severity_assessment": {"status": "Waiting", "reasoning": "Waiting for severity grading.", "confidence": 0, "output": {}},
            "recommendation": {"status": "Waiting", "reasoning": "Waiting for recommendations.", "confidence": 0, "output": {}},
            "report": {"status": "Waiting", "reasoning": "Waiting for compilation.", "confidence": 0, "output": {}}
        }
    }

    async def event_generator():
        # Current combined state accumulator
        current_state = dict(initial_state)
        
        # We run the graph stream synchronously or asynchronously using asyncio.to_thread
        # to prevent blocking the event loop.
        def run_stream():
            return list(graph.stream(current_state))
            
        try:
            # Yield initial state
            yield json.dumps({"event": "init", "state": current_state}) + "\n"
            await asyncio.sleep(0.1)

            # LangGraph stream emits state updates per node
            for output in graph.stream(current_state):
                # Update current state with keys from node outputs
                node_name = list(output.keys())[0]
                node_output = output[node_name]
                
                # Merge updates into current_state
                for key, val in node_output.items():
                    if val is not None:
                        current_state[key] = val
                
                yield json.dumps({"event": "node_complete", "node": node_name, "state": current_state}) + "\n"
                await asyncio.sleep(0.5) # Give the UI a brief moment to animate transition

            yield json.dumps({"event": "complete", "state": current_state}) + "\n"
        except Exception as e:
            yield json.dumps({"event": "error", "message": str(e)}) + "\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")

@app.post("/detect/crack")
async def detect_crack(req: CrackDetectRequest):
    """
    Runs the pretrained YOLOv8 crack model on a single image, independently of the
    agent pipeline. Called asynchronously by the Node backend after an inspection
    completes, so it never blocks /inspect/stream.
    """
    try:
        detections = await asyncio.to_thread(detect_cracks, req.image_url)
        return {"detections": detections}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
