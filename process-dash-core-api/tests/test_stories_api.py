"""
Tests for the User Stories API — Phase 2.
Covers: CRUD, status transitions, filtering, story-block linking, sprint rollup.
"""


def _create_sprint(client, name="Sprint 1", start="2026-06-09", days=14):
    resp = client.post(
        "/api/sprints",
        json={"name": name, "startDate": start, "durationDays": days},
    )
    assert resp.status_code == 200, resp.text
    return resp.json()


# ── Create ─────────────────────────────────────────────────────────────────────

def test_create_story_basic(client):
    sprint = _create_sprint(client)
    resp = client.post(
        "/api/stories",
        json={
            "sprintId": sprint["id"],
            "title": "As a user I want to log a block",
            "storyPoints": 3,
        },
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["title"] == "As a user I want to log a block"
    assert body["storyPoints"] == 3
    assert body["status"] == "TODO"
    assert body["sprintId"] == sprint["id"]


def test_create_story_inherits_project_from_sprint(client):
    # Create a project first
    proj = client.post(
        "/api/projects", json={"name": "Alpha"}
    ).json()
    sprint = client.post(
        "/api/sprints",
        json={"name": "Sprint P", "startDate": "2026-07-01", "durationDays": 14, "projectId": proj["id"]},
    ).json()

    resp = client.post(
        "/api/stories",
        json={"sprintId": sprint["id"], "title": "Inherit project"},
    )
    assert resp.status_code == 200
    assert resp.json()["projectId"] == proj["id"]


def test_create_story_invalid_sprint(client):
    resp = client.post(
        "/api/stories",
        json={"sprintId": "nonexistent-id", "title": "Orphan story"},
    )
    assert resp.status_code == 404


def test_create_story_invalid_points(client):
    sprint = _create_sprint(client, name="Sprint Pts", start="2026-08-01")
    resp = client.post(
        "/api/stories",
        json={"sprintId": sprint["id"], "title": "Bad points", "storyPoints": 4},
    )
    assert resp.status_code == 422


# ── Read ───────────────────────────────────────────────────────────────────────

def test_get_story_by_id(client):
    sprint = _create_sprint(client, name="Sprint R", start="2026-09-01")
    created = client.post(
        "/api/stories",
        json={"sprintId": sprint["id"], "title": "Readable story"},
    ).json()

    resp = client.get(f"/api/stories/{created['id']}")
    assert resp.status_code == 200
    assert resp.json()["id"] == created["id"]


def test_get_story_not_found(client):
    resp = client.get("/api/stories/does-not-exist")
    assert resp.status_code == 404


def test_list_stories_by_sprint(client):
    s1 = _create_sprint(client, name="Sprint L1", start="2026-09-15")
    s2 = _create_sprint(client, name="Sprint L2", start="2026-09-29")
    client.post("/api/stories", json={"sprintId": s1["id"], "title": "Story A"})
    client.post("/api/stories", json={"sprintId": s1["id"], "title": "Story B"})
    client.post("/api/stories", json={"sprintId": s2["id"], "title": "Story C"})

    resp = client.get(f"/api/stories?sprintId={s1['id']}")
    assert resp.status_code == 200
    items = resp.json()["items"]
    assert len(items) == 2
    titles = {i["title"] for i in items}
    assert "Story A" in titles
    assert "Story C" not in titles


def test_list_stories_filter_by_status(client):
    sprint = _create_sprint(client, name="Sprint Flt", start="2026-10-01")
    story = client.post(
        "/api/stories", json={"sprintId": sprint["id"], "title": "Active story"}
    ).json()
    client.patch(f"/api/stories/{story['id']}/status", json={"status": "IN_PROGRESS"})

    resp = client.get(f"/api/stories?sprintId={sprint['id']}&status=IN_PROGRESS")
    assert resp.status_code == 200
    assert len(resp.json()["items"]) == 1

    resp_todo = client.get(f"/api/stories?sprintId={sprint['id']}&status=TODO")
    assert len(resp_todo.json()["items"]) == 0


# ── Update ─────────────────────────────────────────────────────────────────────

def test_update_story_fields(client):
    sprint = _create_sprint(client, name="Sprint U", start="2026-10-15")
    story = client.post(
        "/api/stories",
        json={"sprintId": sprint["id"], "title": "Original title", "storyPoints": 2},
    ).json()

    resp = client.patch(
        f"/api/stories/{story['id']}",
        json={"title": "Updated title", "storyPoints": 5, "description": "Now described"},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["title"] == "Updated title"
    assert body["storyPoints"] == 5
    assert body["description"] == "Now described"


def test_status_transition_via_patch_status(client):
    sprint = _create_sprint(client, name="Sprint St", start="2026-10-29")
    story = client.post(
        "/api/stories", json={"sprintId": sprint["id"], "title": "Status story"}
    ).json()

    for new_status in ("IN_PROGRESS", "DONE"):
        resp = client.patch(
            f"/api/stories/{story['id']}/status", json={"status": new_status}
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == new_status


def test_invalid_status_rejected(client):
    sprint = _create_sprint(client, name="Sprint Bad", start="2026-11-01")
    story = client.post(
        "/api/stories", json={"sprintId": sprint["id"], "title": "Bad status"}
    ).json()

    resp = client.patch(
        f"/api/stories/{story['id']}/status", json={"status": "WONT_DO"}
    )
    assert resp.status_code == 422


# ── Delete ─────────────────────────────────────────────────────────────────────

def test_delete_story(client):
    sprint = _create_sprint(client, name="Sprint Del", start="2026-11-15")
    story = client.post(
        "/api/stories", json={"sprintId": sprint["id"], "title": "Delete me"}
    ).json()

    del_resp = client.delete(f"/api/stories/{story['id']}")
    assert del_resp.status_code == 200
    assert del_resp.json()["ok"] is True

    # Should no longer appear in list
    list_resp = client.get(f"/api/stories?sprintId={sprint['id']}")
    assert all(i["id"] != story["id"] for i in list_resp.json()["items"])

    # Should 404 on direct GET
    get_resp = client.get(f"/api/stories/{story['id']}")
    assert get_resp.status_code == 404


# ── Block linking ──────────────────────────────────────────────────────────────

def test_block_carries_story_id(client):
    sprint = _create_sprint(client, name="Sprint BL", start="2026-12-01")
    story = client.post(
        "/api/stories", json={"sprintId": sprint["id"], "title": "Story for block"}
    ).json()

    block_resp = client.post(
        "/api/blocks/start",
        json={
            "date": "2026-12-02",
            "intent": "Implement auth flow",
            "storyId": story["id"],
        },
    )
    assert block_resp.status_code == 200
    block_id = block_resp.json()["blockId"]

    # The block ID comes back; verify the day rollup reflects storyId
    day_resp = client.get("/api/days/2026-12-02")
    assert day_resp.status_code == 200
    blocks = day_resp.json()["blocks"]
    matched = next((b for b in blocks if b["blockId"] == block_id), None)
    assert matched is not None
    assert matched["storyId"] == story["id"]


# ── Sprint rollup story metrics ────────────────────────────────────────────────

def test_sprint_rollup_includes_story_metrics(client):
    sprint = _create_sprint(client, name="Sprint RM", start="2026-12-15")
    sid = sprint["id"]

    # Commit 3 stories
    s1 = client.post("/api/stories", json={"sprintId": sid, "title": "Story 1", "storyPoints": 3}).json()
    s2 = client.post("/api/stories", json={"sprintId": sid, "title": "Story 2", "storyPoints": 5}).json()
    client.post("/api/stories", json={"sprintId": sid, "title": "Story 3", "storyPoints": 2})

    # Complete 2, carry 1
    client.patch(f"/api/stories/{s1['id']}/status", json={"status": "DONE"})
    client.patch(f"/api/stories/{s2['id']}/status", json={"status": "DONE"})

    rollup = client.get(f"/api/sprints/{sid}/rollup").json()
    stories = rollup["stories"]

    assert stories["storiesCommitted"] == 3
    assert stories["storiesDone"] == 2
    assert stories["storiesTodo"] == 1
    assert stories["pointsCommitted"] == 10
    assert stories["pointsDelivered"] == 8
    assert stories["velocity"] == 8
    assert stories["deliveryRate"] == pytest.approx(0.67, abs=0.01)


import pytest  # noqa: E402 — pytest.approx needed above, imported once here
