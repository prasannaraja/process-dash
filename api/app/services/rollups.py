import json
from typing import List, Dict, Optional, Any
from datetime import datetime
from sqlmodel import Session, select
from app.models import EventLog

def _parse_payload(event: EventLog) -> dict:
    return json.loads(event.payload)

from app.services.reporting import bucket_minutes, bucket_total_day

def get_day_rollup(session: Session, date_str: str) -> Dict[str, Any]:
    # ... (existing event fetching logic same as before) ...
    # Re-implementing concise version for brevity in diff, 
    # ensuring we use existing logic but add labels.
    
    # 1. Get Daily Intents (Same)
    intent_events = session.exec(
        select(EventLog)
        .where(EventLog.type == "daily_intents_set")
        .where(EventLog.payload.contains(f'"date": "{date_str}"'))
        .order_by(EventLog.ts.desc())
    ).all()
    
    daily_intents = []
    for evt in intent_events:
        p = _parse_payload(evt)
        if p.get("date") == date_str:
            daily_intents = p.get("intents", [])
            break
            
    # 2. Reconstruct Blocks (Same logic)
    block_types = ["intent_block_started", "intent_block_interrupted", "intent_block_ended"]
    events = session.exec(
        select(EventLog)
        .where(EventLog.type.in_(block_types))
        .order_by(EventLog.ts)
    ).all()
    
    blocks_map = {}
    for evt in events:
        p = _parse_payload(evt)
        block_id = p.get("blockId")
        if not block_id:
            continue
            
        if evt.type == "intent_block_started":
            if p.get("date") == date_str:
                blocks_map[block_id] = {
                    "blockId": block_id,
                    "intent": p.get("intent"),
                    "notes": p.get("notes"),
                    "date": p.get("date"),
                    "interrupted": False,
                    "reasonCode": None,
                    "actualOutcome": None,
                    "durationMinutes": None,
                    "durationLabel": "" # New field
                }
        elif block_id in blocks_map:
            if evt.type == "intent_block_interrupted":
                blocks_map[block_id]["interrupted"] = True
                blocks_map[block_id]["reasonCode"] = p.get("reasonCode")
            elif evt.type == "intent_block_ended":
                blocks_map[block_id]["actualOutcome"] = p.get("actualOutcome")
                dur = p.get("durationMinutes")
                blocks_map[block_id]["durationMinutes"] = dur
                blocks_map[block_id]["durationLabel"] = bucket_minutes(dur)

    blocks_list = list(blocks_map.values())
    
    # 3. Compute Metrics
    total_blocks = len(blocks_list)
    interrupted_blocks = sum(1 for b in blocks_list if b["interrupted"])
    focus_blocks = sum(1 for b in blocks_list if not b["interrupted"] and (b["durationMinutes"] or 0) >= 30)
    
    # Calculate Total Active Minutes (sum of all completed blocks)
    total_active_minutes = sum((b["durationMinutes"] or 0) for b in blocks_list)
    
    fragmentation_rate = 0.0
    if total_blocks > 0:
        fragmentation_rate = interrupted_blocks / total_blocks
        
    return {
        "date": date_str,
        "intents": daily_intents,
        "blocks": blocks_list,
        "metrics": {
            "totalBlocks": total_blocks,
            "interruptedBlocks": interrupted_blocks,
            "fragmentationRate": round(fragmentation_rate, 2),
            "focusBlocks": focus_blocks,
            "totalActiveMinutes": total_active_minutes, # Internal use
            "totalActiveLabel": bucket_total_day(total_active_minutes) # Public label
        }
    }

def get_week_rollup(session: Session, year_week: str) -> Dict[str, Any]:
    # Placeholder for weekly rollup - requires similar logic logic across a date range
    # For MVP, returning structure.
    return {
        "yearWeek": year_week,
        "metrics": {},
        "reflection": {}
    }
