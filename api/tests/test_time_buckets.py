import pytest
from app.services.time_buckets import bucket_minutes_to_label, bucket_total_day

def test_bucket_minutes_to_label():
    assert bucket_minutes_to_label(None) is None
    assert bucket_minutes_to_label(0) == "~15 mins"
    assert bucket_minutes_to_label(10) == "~15 mins"
    assert bucket_minutes_to_label(15) == "~15 mins"
    assert bucket_minutes_to_label(20) == "~30 mins"
    assert bucket_minutes_to_label(30) == "~30 mins"
    assert bucket_minutes_to_label(45) == "~1 hour"
    assert bucket_minutes_to_label(60) == "~1 hour"
    assert bucket_minutes_to_label(90) == "~2 hours"
    assert bucket_minutes_to_label(120) == "~2 hours"
    assert bucket_minutes_to_label(150) == "~½ day"
    assert bucket_minutes_to_label(180) == "~½ day"
    assert bucket_minutes_to_label(240) == "~1 day"
    assert bucket_minutes_to_label(360) == "~1 day"
    assert bucket_minutes_to_label(400) == "> 1 day"

def test_bucket_total_day():
    assert bucket_total_day(0) == "~15 mins"
    assert bucket_total_day(100) == "~2 hours"
