from typing import Optional

ACTIVE_WORKDAY_MINUTES = 360
QUARTER_DAY_MINUTES = 90
HALF_DAY_MINUTES = 180

def bucket_minutes_to_label(minutes: int | None) -> str | None:
    """
    Maps actual minutes to approximate bucket labels.
    Rules:
    - None -> None
    - <= 0 -> "~15 mins" (treat as minimal, if not None)
    - 0-15 -> "~15 mins"
    - 16–30 -> "~30 mins"
    - 31–60 -> "~1 hour"
    - 61–120 -> "~2 hours"
    - 121–180 -> "~½ day"
    - 181–360 -> "~1 day"
    - > 360 -> "> 1 day"
    """
    if minutes is None:
        return None
    
    if minutes <= 15:
        return "~15 mins"
    elif minutes <= 30:
        return "~30 mins"
    elif minutes <= 60:
        return "~1 hour"
    elif minutes <= 120:
        return "~2 hours"
    elif minutes <= 180:
        return "~½ day"
    elif minutes <= 360:
        return "~1 day"
    else:
        return "> 1 day"

def bucket_total_day(minutes: int) -> str:
    """
    Wrapper for total day label. 
    Usually total active minutes is not None (it's 0 if empty).
    """
    return bucket_minutes_to_label(minutes) or "~15 mins"
