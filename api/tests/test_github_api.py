from unittest.mock import AsyncMock, patch
import pytest

def test_github_config_flow(client):
    # 1. Retrieve default active project
    proj_resp = client.get("/api/projects")
    assert proj_resp.status_code == 200
    proj_id = proj_resp.json()["items"][0]["id"]

    # 2. Get initial config and verify empty github fields
    config_resp = client.get(f"/api/projects/{proj_id}/config")
    assert config_resp.status_code == 200
    config = config_resp.json()
    assert config.get("githubRepo") is None
    assert config.get("githubUsername") is None
    assert config.get("githubToken") is None

    # 3. Update configuration with GitHub details
    patch_resp = client.patch(
        f"/api/projects/{proj_id}/config",
        json={
            "githubRepo": "octocat/Hello-World",
            "githubUsername": "octocat",
            "githubToken": "ghp_securetoken"
        }
    )
    assert patch_resp.status_code == 200
    updated = patch_resp.json()
    assert updated["githubRepo"] == "octocat/Hello-World"
    assert updated["githubUsername"] == "octocat"
    assert updated["githubToken"] == "ghp_securetoken"

    # 4. Verify configuration persists on subsequent fetch
    get_resp = client.get(f"/api/projects/{proj_id}/config")
    assert get_resp.status_code == 200
    body = get_resp.json()
    assert body["githubRepo"] == "octocat/Hello-World"
    assert body["githubUsername"] == "octocat"
    assert body["githubToken"] == "ghp_securetoken"


@patch("app.routers.projects.fetch_github_activity", new_callable=AsyncMock)
def test_github_activity_endpoint(mock_fetch, client):
    # Setup mock return payload
    mock_fetch.return_value = {
        "configured": True,
        "activity": {
            "2026-05-26": {
                "commits": [{"sha": "abc1234", "message": "First commit", "url": "url", "date": "2026-05-26"}],
                "prs": [],
                "reviews": []
            }
        }
    }

    # Fetch default project
    proj_resp = client.get("/api/projects")
    proj_id = proj_resp.json()["items"][0]["id"]

    # 1. Query activity when NOT configured yet and check error response
    activity_resp = client.get(f"/api/projects/{proj_id}/github/activity?start_date=2026-05-20&end_date=2026-05-26")
    assert activity_resp.status_code == 200
    assert activity_resp.json()["configured"] is False

    # 2. Configure GitHub parameters
    client.patch(
        f"/api/projects/{proj_id}/config",
        json={
            "githubRepo": "octocat/Hello-World",
            "githubUsername": "octocat"
        }
    )

    # 3. Query activity when configured and verify mocked return values
    activity_resp = client.get(f"/api/projects/{proj_id}/github/activity?start_date=2026-05-20&end_date=2026-05-26")
    assert activity_resp.status_code == 200
    data = activity_resp.json()
    assert data["configured"] is True
    assert "2026-05-26" in data["activity"]
    assert data["activity"]["2026-05-26"]["commits"][0]["sha"] == "abc1234"
    
    # 4. Verify fetch_github_activity was triggered once with valid parameters
    mock_fetch.assert_called_once()
