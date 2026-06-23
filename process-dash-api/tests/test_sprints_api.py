def test_create_and_list_sprints(client):
    create_resp = client.post(
        "/api/sprints",
        json={
            "name": "Sprint 1",
            "startDate": "2026-03-09",
            "durationDays": 14,
        },
    )
    assert create_resp.status_code == 200
    created = create_resp.json()
    assert created["name"] == "Sprint 1"
    assert created["endDate"] == "2026-03-22"

    list_resp = client.get("/api/sprints")
    assert list_resp.status_code == 200
    items = list_resp.json()["items"]
    assert len(items) == 1
    assert items[0]["id"] == created["id"]


def test_sprint_overlap_is_blocked(client):
    client.post(
        "/api/sprints",
        json={
            "name": "Sprint A",
            "startDate": "2026-03-01",
            "durationDays": 7,
        },
    )

    overlap_resp = client.post(
        "/api/sprints",
        json={
            "name": "Sprint B",
            "startDate": "2026-03-05",
            "durationDays": 7,
        },
    )
    assert overlap_resp.status_code == 409


def test_update_sprint_requires_confirmation_when_summary_exists(client):
    created = client.post(
        "/api/sprints",
        json={
            "name": "Sprint 9",
            "startDate": "2026-04-01",
            "durationDays": 7,
        },
    ).json()

    sprint_id = created["id"]

    save_resp = client.post(
        f"/api/sprints/{sprint_id}/summary",
        json={
            "topFragmenters": ["MEETING"],
            "notPerformanceIssues": ["Build instability"],
            "oneChangeNextWeek": "Reduce context switching",
        },
    )
    assert save_resp.status_code == 200

    warn_resp = client.patch(
        f"/api/sprints/{sprint_id}",
        json={
            "startDate": "2026-04-02",
            "durationDays": 14,
        },
    )
    assert warn_resp.status_code == 200
    warn_body = warn_resp.json()
    assert warn_body["ok"] is False
    assert warn_body["requiresConfirmation"] is True

    force_resp = client.patch(
        f"/api/sprints/{sprint_id}",
        json={
            "startDate": "2026-04-02",
            "durationDays": 14,
            "forceRecalculate": True,
        },
    )
    assert force_resp.status_code == 200
    assert force_resp.json()["ok"] is True


def test_sprint_summaries_list(client):
    sprint_1 = client.post(
        "/api/sprints",
        json={"name": "Sprint X", "startDate": "2026-02-01", "durationDays": 7},
    ).json()
    sprint_2 = client.post(
        "/api/sprints",
        json={"name": "Sprint Y", "startDate": "2026-02-08", "durationDays": 7},
    ).json()

    client.post(
        f"/api/sprints/{sprint_1['id']}/summary",
        json={
            "topFragmenters": ["DEPENDENCY"],
            "notPerformanceIssues": [],
            "oneChangeNextWeek": "Prepare handoff earlier",
        },
    )
    client.post(
        f"/api/sprints/{sprint_2['id']}/summary",
        json={
            "topFragmenters": ["UNPLANNED_REQUEST"],
            "notPerformanceIssues": ["Access lag"],
            "oneChangeNextWeek": "Clarify owner at intake",
        },
    )

    resp = client.get("/api/sprints/summaries")
    assert resp.status_code == 200
    items = resp.json()["items"]
    assert len(items) == 2
    assert all("sprintId" in i for i in items)
