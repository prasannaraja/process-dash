import asyncio
import logging
from datetime import date, timedelta
from typing import Any, Dict, List, Optional
import httpx

logger = logging.getLogger("uvicorn.error")

async def fetch_github_activity(
    repo: str,
    username: str,
    token: Optional[str],
    start_date: date,
    end_date: date
) -> Dict[str, Any]:
    """
    Fetches GitHub activity (commits, PRs, and PR reviews) for a given developer in a repo,
    grouped by day. Runs async requests in parallel.
    """
    repo = repo.strip()
    username = username.strip()
    
    if "/" not in repo:
        return {"error": "Invalid repository format. Must be 'owner/repo'."}
    if not username:
        return {"error": "GitHub username is not configured."}

    since_iso = f"{start_date}T00:00:00Z"
    until_iso = f"{end_date}T23:59:59Z"

    headers = {
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "work-observability-client"
    }
    if token and token.strip():
        headers["Authorization"] = f"Bearer {token.strip()}"

    # Initialize daily bucket structure
    delta = end_date - start_date
    days_dict = {}
    for i in range(delta.days + 1):
        d_str = (start_date + timedelta(days=i)).isoformat()
        days_dict[d_str] = {
            "commits": [],
            "prs": [],
            "reviews": []
        }

    async with httpx.AsyncClient(timeout=12.0) as client:
        # Define the three parallel queries
        
        # 1. Commits API
        commits_url = f"https://api.github.com/repos/{repo}/commits"
        commits_params = {
            "author": username,
            "since": since_iso,
            "until": until_iso,
            "per_page": 100
        }
        
        # 2. PRs Search API
        prs_q = f"repo:{repo} author:{username} type:pr updated:{start_date}..{end_date}"
        prs_url = "https://api.github.com/search/issues"
        prs_params = {"q": prs_q, "per_page": 100}
        
        # 3. Reviews Search API
        reviews_q = f"repo:{repo} reviewed-by:{username} type:pr updated:{start_date}..{end_date}"
        reviews_url = "https://api.github.com/search/issues"
        reviews_params = {"q": reviews_q, "per_page": 100}

        try:
            # Gather calls concurrently to optimize loading speeds
            res_commits, res_prs, res_reviews = await asyncio.gather(
                client.get(commits_url, headers=headers, params=commits_params),
                client.get(prs_url, headers=headers, params=prs_params),
                client.get(reviews_url, headers=headers, params=reviews_params)
            )

            # Check status codes and raise for errors
            for res in (res_commits, res_prs, res_reviews):
                res.raise_for_status()

            # Parse Commits
            commits_data = res_commits.json()
            if isinstance(commits_data, list):
                for item in commits_data:
                    sha = item.get("sha", "")[:7]
                    commit_info = item.get("commit", {})
                    message = commit_info.get("message", "").split("\n")[0]
                    url = item.get("html_url", "")
                    
                    # Convert commit author date to local day bucket
                    author_info = commit_info.get("author", {}) or {}
                    commit_date = author_info.get("date", "")
                    if commit_date:
                        day_str = commit_date.split("T")[0]
                        if day_str in days_dict:
                            days_dict[day_str]["commits"].append({
                                "sha": sha,
                                "message": message,
                                "url": url,
                                "date": day_str
                            })

            # Parse Pull Requests
            prs_data = res_prs.json().get("items", [])
            for item in prs_data:
                number = item.get("number")
                title = item.get("title", "")
                state = item.get("state", "")
                url = item.get("html_url", "")
                
                # Check pull_request nested key to ensure it is a PR
                is_pr = "pull_request" in item
                if not is_pr:
                    continue

                # Group by update date
                updated_at = item.get("updated_at", "")
                if updated_at:
                    day_str = updated_at.split("T")[0]
                    if day_str in days_dict:
                        days_dict[day_str]["prs"].append({
                            "number": number,
                            "title": title,
                            "state": state,
                            "url": url,
                            "date": day_str
                        })

            # Parse Reviews
            reviews_data = res_reviews.json().get("items", [])
            for item in reviews_data:
                number = item.get("number")
                title = item.get("title", "")
                state = item.get("state", "")
                url = item.get("html_url", "")
                
                # Verify it is a PR and user is not the author
                if "pull_request" not in item:
                    continue
                author = item.get("user", {}).get("login", "")
                if author == username:
                    # Already captured in user's own PRs list
                    continue

                updated_at = item.get("updated_at", "")
                if updated_at:
                    day_str = updated_at.split("T")[0]
                    if day_str in days_dict:
                        days_dict[day_str]["reviews"].append({
                            "number": number,
                            "title": title,
                            "state": state,
                            "url": url,
                            "date": day_str
                        })

            return {"configured": True, "activity": days_dict}

        except httpx.HTTPStatusError as exc:
            status = exc.response.status_code
            logger.error("GitHub HTTP Error: status=%s, body=%s", status, exc.response.text)
            
            if status == 401:
                return {"configured": True, "error": "Unauthorized. Please check your Personal Access Token."}
            elif status == 404:
                return {"configured": True, "error": "Repository not found. Verify it is 'owner/repo' and the PAT has read access."}
            elif status == 403:
                # Detect rate limits
                remaining = exc.response.headers.get("X-RateLimit-Remaining", "1")
                if remaining == "0":
                    return {
                        "configured": True,
                        "error": "GitHub API rate limit exceeded. Please configure a Personal Access Token in settings."
                    }
                return {"configured": True, "error": "Access forbidden. Verify token scopes."}
            
            return {"configured": True, "error": f"GitHub API error (HTTP {status}): {exc.response.text[:200]}"}

        except httpx.RequestError as exc:
            logger.error("GitHub Connection Error: %s", str(exc))
            return {"configured": True, "error": f"Failed to connect to GitHub: {str(exc)}"}
