import json
from typing import List, Dict, Optional, Any
from datetime import datetime
from sqlmodel import Session, select
from app.models import EventLog

def _parse_payload(event: EventLog) -> dict:
    return json.loads(event.payload)

# Use the new time_buckets service
from app.services.time_buckets import bucket_minutes_to_label, bucket_total_day

def get_day_rollup(session: Session, date_str: str) -> Dict[str, Any]:
    # ... (fetching logic)
    
    # 1. Get Daily Intents
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
            
    # 2. Reconstruct Blocks
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
                    "durationLabel": "" # Guaranteed string
                }
        elif block_id in blocks_map:
            if evt.type == "intent_block_interrupted":
                blocks_map[block_id]["interrupted"] = True
                blocks_map[block_id]["reasonCode"] = p.get("reasonCode")
            elif evt.type == "intent_block_ended":
                blocks_map[block_id]["actualOutcome"] = p.get("actualOutcome")
                dur = p.get("durationMinutes")
                blocks_map[block_id]["durationMinutes"] = dur
                # Ensure label
                blocks_map[block_id]["durationLabel"] = bucket_minutes_to_label(dur) or ""

    blocks_list = list(blocks_map.values())
    
    # 3. Compute Metrics
    total_blocks = len(blocks_list)
    interrupted_blocks = sum(1 for b in blocks_list if b["interrupted"])
    focus_blocks = sum(1 for b in blocks_list if not b["interrupted"] and (b["durationMinutes"] or 0) >= 30)
    
    total_active_minutes = sum((b["durationMinutes"] or 0) for b in blocks_list)
    total_active_label = bucket_total_day(total_active_minutes)
    
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
            "totalActiveMinutes": total_active_minutes,
            "totalActiveLabel": total_active_label
        }
    }

from datetime import datetime, timedelta

def get_week_rollup(session: Session, year_week: str) -> Dict[str, Any]:
    try:
        y, w = year_week.split('-W')
        year = int(y)
        week = int(w)
    except:
    except:
        return {
            "yearWeek": year_week,
            "metrics": {
                "totalBlocks": 0,
                "interruptedBlocks": 0,
                "fragmentationRate": 0.0,
                "focusBlocks": 0,
                "topFragmenters": [],
                "totalActiveMinutes": 0,
                "totalActiveLabel": "~0 mins"
            },
            "reflection": {
                "topFragmenters": [],
                "notPerformanceIssues": [],
                "oneChangeNextWeek": ""
            }
        }
        
    start_date = datetime.strptime(f'{year}-W{week}-1', "%Y-W%W-%w")
    end_date = start_date + timedelta(days=7)

    block_types = ["intent_block_started", "intent_block_interrupted", "intent_block_ended"]
    events = session.exec(
        select(EventLog)
        .where(EventLog.type.in_(block_types))
        .where(EventLog.ts >= start_date)
        .where(EventLog.ts < end_date)
    ).all()

    blocks_map = {}
    fragmenter_counts = {}
    
    for evt in events:
        p = _parse_payload(evt)
        block_id = p.get("blockId")
        if not block_id: continue
        
        if evt.type == "intent_block_started":
            blocks_map[block_id] = {
                "interrupted": False,
                "durationMinutes": 0,
                "reasonCode": None
            }
        elif block_id in blocks_map:
            if evt.type == "intent_block_interrupted":
                blocks_map[block_id]["interrupted"] = True
                code = p.get("reasonCode")
                blocks_map[block_id]["reasonCode"] = code
                if code:
                    fragmenter_counts[code] = fragmenter_counts.get(code, 0) + 1
            elif evt.type == "intent_block_ended":
                dur = p.get("durationMinutes") or 0
                blocks_map[block_id]["durationMinutes"] = dur

    blocks_list = list(blocks_map.values())
    
    total_blocks = len(blocks_list)
    interrupted_blocks = sum(1 for b in blocks_list if b["interrupted"])
    focus_blocks = sum(1 for b in blocks_list if not b["interrupted"] and b["durationMinutes"] >= 30)
    total_active_minutes = sum(b["durationMinutes"] for b in blocks_list)
    total_active_label = bucket_total_day(total_active_minutes)
    
    frag_rate = 0.0
    if total_blocks > 0:
        frag_rate = interrupted_blocks / total_blocks

    top_fragmenters = [{"code": k, "count": v} for k, v in fragmenter_counts.items()]
    top_fragmenters.sort(key=lambda x: x["count"], reverse=True)

    summary_evt = session.exec(
        select(EventLog)
        .where(EventLog.type == "weekly_summary_saved")
        .where(EventLog.payload.contains(f'"yearWeek": "{year_week}"'))
        .order_by(EventLog.ts.desc())
    ).first()
    
    reflection = {
        "topFragmenters": [],
        "notPerformanceIssues": [],
        "oneChangeNextWeek": ""
    }
    
    if summary_evt:
        p = _parse_payload(summary_evt)
        reflection["topFragmenters"] = p.get("topFragmenters", [])
        reflection["notPerformanceIssues"] = p.get("notPerformanceIssues", [])
        reflection["oneChangeNextWeek"] = p.get("oneChangeNextWeek", "")
            
    return {
        "yearWeek": year_week,
        "metrics": {
            "totalBlocks": total_blocks,
            "interruptedBlocks": interrupted_blocks,
            "fragmentationRate": round(frag_rate, 2),
            "focusBlocks": focus_blocks,
            "topFragmenters": top_fragmenters,
            "totalActiveMinutes": total_active_minutes,
            "totalActiveLabel": total_active_label
        },
        "reflection": reflection
    }

