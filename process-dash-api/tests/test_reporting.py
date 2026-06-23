from app.services.reporting import bucket_minutes

def test_bucket_minutes():
    assert bucket_minutes(10) == "~15 mins"
    assert bucket_minutes(15) == "~15 mins"
    assert bucket_minutes(16) == "~30 mins"
    assert bucket_minutes(30) == "~30 mins"
    assert bucket_minutes(45) == "~1 hour"
    assert bucket_minutes(60) == "~1 hour"
    assert bucket_minutes(90) == "~2 hours"
    assert bucket_minutes(120) == "~2 hours"
    assert bucket_minutes(150) == "~½ day"
    assert bucket_minutes(180) == "~½ day"
    assert bucket_minutes(300) == "~1 day"
    assert bucket_minutes(360) == "~1 day"
    assert bucket_minutes(361) == "> 1 day"
    assert bucket_minutes(None) == ""
