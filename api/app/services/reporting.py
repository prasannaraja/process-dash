def bucket_minutes(minutes: int | None) -> str:
    """
    Maps actual minutes to approximate bucket labels.
    Based on docs/time-capture-and-reporting.md
    """
    if minutes is None:
        return ""
        
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
    Similar logic for total day time, but handles 0 gracefully.
    """
    if minutes == 0:
        return "~0 mins"
    return bucket_minutes(minutes)
