import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel, create_engine, StaticPool
from app.main import app
from app.db import get_session
import time

# Use in-memory SQLite for tests
@pytest.fixture(name="session")
def session_fixture():
    engine = create_engine(
        "sqlite://", 
        connect_args={"check_same_thread": False}, 
        poolclass=StaticPool
    )
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        yield session

@pytest.fixture(name="client")
def client_fixture(session: Session):
    def get_session_override():
        return session
    app.dependency_overrides[get_session] = get_session_override
    client = TestClient(app)
    yield client
    app.dependency_overrides.clear()

def test_day_rollup_lifecycle(client):
    date = "2023-10-27"
    
    # 1. Set Intents
    resp = client.post("/api/intents/daily", json={"date": date, "intents": ["Code feature", "Review PR"]})
    assert resp.status_code == 200
    
    # 2. Get Day View (should have intents, no blocks)
    resp = client.get(f"/api/days/{date}")
    data = resp.json()
    assert data["intents"] == ["Code feature", "Review PR"]
    assert data["blocks"] == []
    
    # 3. Start Block
    resp = client.post("/api/blocks/start", json={"date": date, "intent": "Code feature", "notes": "Deep work"})
    assert resp.status_code == 200
    block_id = resp.json()["blockId"]
    
    # Check rollup again (block started)
    resp = client.get(f"/api/days/{date}")
    blocks = resp.json()["blocks"]
    assert len(blocks) == 1
    assert blocks[0]["blockId"] == block_id
    assert blocks[0]["interrupted"] is False
    assert blocks[0]["durationMinutes"] is None
    
    # 4. Interrupt Block
    client.post("/api/blocks/interrupt", json={"blockId": block_id, "reasonCode": "MEETING"})
    
    # Check rollup (interrupted set)
    resp = client.get(f"/api/days/{date}")
    blocks = resp.json()["blocks"]
    assert blocks[0]["interrupted"] is True
    assert blocks[0]["reasonCode"] == "MEETING"
    
    # 5. End Block
    client.post("/api/blocks/end", json={"blockId": block_id, "actualOutcome": "Meetings happened", "durationMinutes": 45})
    
    # Final Check
    resp = client.get(f"/api/days/{date}")
    data = resp.json()
    metrics = data["metrics"]
    
    assert metrics["totalBlocks"] == 1
    assert metrics["interruptedBlocks"] == 1
    assert metrics["fragmentationRate"] == 1.0  # 1/1
    assert metrics["focusBlocks"] == 0 # Interrupted
