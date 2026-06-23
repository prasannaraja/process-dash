from pathlib import Path
from app.services.rollups import get_day_rollup
from sqlmodel import Session
import os

def export_day_to_md(session: Session, date_str: str, output_path: str = None) -> str:
    data = get_day_rollup(session, date_str)
    
    # Defaults
    if output_path:
        base_dir = Path(output_path)
    elif os.environ.get("WORKOBS_EXPORT_DIR"):
        base_dir = Path(os.environ["WORKOBS_EXPORT_DIR"])
    else:
        base_dir = Path("logs-md")
    
    base_dir.mkdir(parents=True, exist_ok=True)
    file_path = base_dir / f"daily-{date_str}.md"
    
    # Template
    md = f"# Date: {data['date']}\n\n"
    
    md += "## Today's Intents\n"
    for intent in data['intents']:
        md += f"- [ ] {intent}\n"
    md += "\n"
    
    md += "## Intent Blocks\n\n"
    md += "| Intent | Actual Outcome | Duration | Interrupted | Reason |\n"
    md += "|--------|----------------|----------|-------------|--------|\n"
    
    for b in data['blocks']:
        outcome = b['actualOutcome'] or ""
        duration = b.get('durationLabel') or "" # Use bucket label
        interrupted = "Yes" if b['interrupted'] else "No"
        reason = b['reasonCode'] or "—"
        md += f"| {b['intent']} | {outcome} | {duration} | {interrupted} | {reason} |\n"
        
    md += "\n## Metrics\n"
    md += f"- Total Active Time: {data['metrics']['totalActiveLabel']}\n"
    md += f"- Total Blocks: {data['metrics']['totalBlocks']}\n"
    md += f"- Fragmentation Rate: {int(data['metrics']['fragmentationRate'] * 100)}%\n"
    md += f"- Focus Blocks: {data['metrics']['focusBlocks']}\n"
    
    file_path.write_text(md)
    return str(file_path.absolute())
