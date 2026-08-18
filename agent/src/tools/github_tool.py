"""
GitHub Integration Tool
Create branches, commit changes, and open PRs for SEO fixes
"""

import base64
import logging
import os
from datetime import datetime

from github import Github, GithubException

logger = logging.getLogger(__name__)

# Configuration
GITHUB_REPO = os.getenv("GITHUB_REPO", "your-org/your-website-repo")


def get_github_client():
    """Get authenticated GitHub client"""
    token = os.getenv("GITHUB_TOKEN")
    if not token:
        # Try to get from Secret Manager
        try:
            from google.cloud import secretmanager
            client = secretmanager.SecretManagerServiceClient()
            name = "projects/nebulaseo/secrets/github-token/versions/latest"
            response = client.access_secret_version(request={"name": name})
            token = response.payload.data.decode("UTF-8").strip()
            print(f"[GitHub] Token retrieved from Secret Manager (length: {len(token)})")
        except Exception as e:
            print(f"[GitHub] ERROR: Failed to get token: {e}")
            raise Exception(f"Failed to get GitHub token: {e}")
    
    return Github(token)


def get_repo():
    """Get the NebulaSEO repository"""
    client = get_github_client()
    return client.get_repo(GITHUB_REPO)


def github_list_files_fn(path: str = "", branch: str = "main") -> dict:
    """
    List files in a directory of the repository.
    
    Args:
        path: Directory path (empty for root)
        branch: Branch name (default main)
    
    Returns:
        List of files and directories
    """
    try:
        print(f"[GitHub] Listing files at path='{path}' branch='{branch}'")
        repo = get_repo()
        contents = repo.get_contents(path, ref=branch)
        
        items = []
        for item in contents:
            items.append({
                "name": item.name,
                "path": item.path,
                "type": item.type,  # "file" or "dir"
                "size": item.size if item.type == "file" else None
            })
        
        return {
            "repository": GITHUB_REPO,
            "branch": branch,
            "path": path or "/",
            "items": items
        }
    
    except GithubException as e:
        return {"error": f"GitHub error: {e.data.get('message', str(e))}"}
    except Exception as e:
        return {"error": str(e)}


def github_read_file_fn(file_path: str, branch: str = "main") -> dict:
    """
    Read content of a file from the repository.
    
    Args:
        file_path: Path to the file
        branch: Branch name (default main)
    
    Returns:
        File content and metadata
    """
    try:
        repo = get_repo()
        file_content = repo.get_contents(file_path, ref=branch)
        
        # Decode content
        content = base64.b64decode(file_content.content).decode('utf-8')
        
        return {
            "path": file_path,
            "branch": branch,
            "sha": file_content.sha,
            "size": file_content.size,
            "content": content
        }
    
    except GithubException as e:
        return {"error": f"GitHub error: {e.data.get('message', str(e))}"}
    except Exception as e:
        return {"error": str(e)}


def github_create_branch_fn(branch_name: str, base_branch: str = "main") -> dict:
    """
    Create a new branch for SEO fixes.
    
    Args:
        branch_name: Name for the new branch (will be prefixed with seo-fix/)
        base_branch: Base branch to create from (default main)
    
    Returns:
        Branch creation status
    """
    try:
        repo = get_repo()
        
        # Get base branch SHA
        base = repo.get_branch(base_branch)
        
        # Create full branch name
        timestamp = datetime.now().strftime('%Y%m%d-%H%M%S')
        full_branch_name = f"seo-fix/{branch_name}-{timestamp}"
        
        # Create the branch
        repo.create_git_ref(
            ref=f"refs/heads/{full_branch_name}",
            sha=base.commit.sha
        )
        
        return {
            "status": "success",
            "branch": full_branch_name,
            "base": base_branch,
            "sha": base.commit.sha
        }
    
    except GithubException as e:
        return {"error": f"GitHub error: {e.data.get('message', str(e))}"}
    except Exception as e:
        return {"error": str(e)}


def github_update_file_fn(
    branch: str,
    file_path: str,
    content: str,
    commit_message: str
) -> dict:
    """
    Update or create a file in the repository.
    
    Args:
        branch: Branch to commit to
        file_path: Path to the file
        content: New file content
        commit_message: Commit message
    
    Returns:
        Commit status
    """
    try:
        repo = get_repo()
        
        try:
            # Try to get existing file
            existing = repo.get_contents(file_path, ref=branch)
            
            # Update existing file
            result = repo.update_file(
                path=file_path,
                message=commit_message,
                content=content,
                sha=existing.sha,
                branch=branch
            )
            
            return {
                "status": "updated",
                "path": file_path,
                "branch": branch,
                "commit_sha": result["commit"].sha,
                "commit_url": result["commit"].html_url
            }
        
        except GithubException as e:
            if e.status == 404:
                # File doesn't exist, create it
                result = repo.create_file(
                    path=file_path,
                    message=commit_message,
                    content=content,
                    branch=branch
                )
                
                return {
                    "status": "created",
                    "path": file_path,
                    "branch": branch,
                    "commit_sha": result["commit"].sha,
                    "commit_url": result["commit"].html_url
                }
            raise
    
    except GithubException as e:
        return {"error": f"GitHub error: {e.data.get('message', str(e))}"}
    except Exception as e:
        return {"error": str(e)}


def github_create_pr_fn(
    branch: str,
    title: str,
    body: str,
    labels: list[str] = None
) -> dict:
    """
    Create a Pull Request for SEO fixes.
    
    Args:
        branch: Source branch (the branch with changes)
        title: PR title
        body: PR description (markdown supported)
        labels: List of labels to add (default: ["seo", "automated"])
    
    Returns:
        PR details
    """
    try:
        repo = get_repo()
        
        # Create the PR
        pr = repo.create_pull(
            title=title,
            body=body,
            head=branch,
            base="main"
        )
        
        # Add labels
        if labels is None:
            labels = ["seo", "automated"]
        
        try:
            pr.add_to_labels(*labels)
        except Exception:
            logger.debug("Could not apply labels %s; they may not exist", labels)
        
        return {
            "status": "success",
            "pr_number": pr.number,
            "pr_url": pr.html_url,
            "title": title,
            "branch": branch,
            "labels": labels
        }
    
    except GithubException as e:
        return {"error": f"GitHub error: {e.data.get('message', str(e))}"}
    except Exception as e:
        return {"error": str(e)}


def github_get_pr_status_fn(pr_number: int) -> dict:
    """
    Get status of a Pull Request.
    
    Args:
        pr_number: PR number
    
    Returns:
        PR status and details
    """
    try:
        repo = get_repo()
        pr = repo.get_pull(pr_number)
        
        return {
            "pr_number": pr.number,
            "title": pr.title,
            "state": pr.state,  # open, closed
            "merged": pr.merged,
            "mergeable": pr.mergeable,
            "created_at": pr.created_at.isoformat(),
            "updated_at": pr.updated_at.isoformat(),
            "url": pr.html_url,
            "user": pr.user.login,
            "changed_files": pr.changed_files,
            "additions": pr.additions,
            "deletions": pr.deletions
        }
    
    except GithubException as e:
        return {"error": f"GitHub error: {e.data.get('message', str(e))}"}
    except Exception as e:
        return {"error": str(e)}


def github_list_prs_fn(state: str = "open") -> dict:
    """
    List Pull Requests in the repository.
    
    Args:
        state: PR state filter (open, closed, all)
    
    Returns:
        List of PRs
    """
    try:
        repo = get_repo()
        prs = repo.get_pulls(state=state, sort="updated", direction="desc")
        
        pr_list = []
        for pr in prs[:20]:  # Limit to 20
            pr_list.append({
                "number": pr.number,
                "title": pr.title,
                "state": pr.state,
                "merged": pr.merged,
                "created_at": pr.created_at.isoformat(),
                "user": pr.user.login,
                "url": pr.html_url,
                "labels": [label.name for label in pr.labels]
            })
        
        return {
            "repository": GITHUB_REPO,
            "state_filter": state,
            "total": len(pr_list),
            "pull_requests": pr_list
        }
    
    except GithubException as e:
        return {"error": f"GitHub error: {e.data.get('message', str(e))}"}
    except Exception as e:
        return {"error": str(e)}


def github_get_repo_info_fn() -> dict:
    """
    Get repository information and recent activity.
    
    Returns:
        Repository details
    """
    try:
        repo = get_repo()
        
        # Get recent commits
        commits = list(repo.get_commits()[:5])
        recent_commits = [
            {
                "sha": c.sha[:7],
                "message": c.commit.message.split('\n')[0],
                "author": c.commit.author.name,
                "date": c.commit.author.date.isoformat()
            }
            for c in commits
        ]
        
        return {
            "repository": GITHUB_REPO,
            "url": repo.html_url,
            "default_branch": repo.default_branch,
            "description": repo.description,
            "language": repo.language,
            "open_prs": repo.get_pulls(state="open").totalCount,
            "open_issues": repo.open_issues_count,
            "last_push": repo.pushed_at.isoformat() if repo.pushed_at else None,
            "recent_commits": recent_commits
        }
    
    except GithubException as e:
        return {"error": f"GitHub error: {e.data.get('message', str(e))}"}
    except Exception as e:
        return {"error": str(e)}


# Tool declarations for the agent
GITHUB_TOOLS = [
    {
        "name": "github_list_files",
        "description": "List files and directories in the NebulaSEO website repository",
        "parameters": {
            "type": "object",
            "properties": {
                "path": {
                    "type": "string",
                    "description": "Directory path (empty for root)"
                },
                "branch": {
                    "type": "string",
                    "description": "Branch name (default: main)"
                }
            }
        }
    },
    {
        "name": "github_read_file",
        "description": "Read the content of a file from the NebulaSEO repository",
        "parameters": {
            "type": "object",
            "properties": {
                "file_path": {
                    "type": "string",
                    "description": "Path to the file to read"
                },
                "branch": {
                    "type": "string",
                    "description": "Branch name (default: main)"
                }
            },
            "required": ["file_path"]
        }
    },
    {
        "name": "github_create_branch",
        "description": "Create a new branch for SEO fixes (branch name will be prefixed with seo-fix/)",
        "parameters": {
            "type": "object",
            "properties": {
                "branch_name": {
                    "type": "string",
                    "description": "Name for the branch (e.g., 'meta-tags', 'schema-markup')"
                },
                "base_branch": {
                    "type": "string",
                    "description": "Base branch (default: main)"
                }
            },
            "required": ["branch_name"]
        }
    },
    {
        "name": "github_update_file",
        "description": "Update or create a file in the repository on a specific branch",
        "parameters": {
            "type": "object",
            "properties": {
                "branch": {
                    "type": "string",
                    "description": "Branch to commit to"
                },
                "file_path": {
                    "type": "string",
                    "description": "Path to the file"
                },
                "content": {
                    "type": "string",
                    "description": "New file content"
                },
                "commit_message": {
                    "type": "string",
                    "description": "Commit message"
                }
            },
            "required": ["branch", "file_path", "content", "commit_message"]
        }
    },
    {
        "name": "github_create_pr",
        "description": "Create a Pull Request for SEO fixes that will trigger automatic deployment when merged",
        "parameters": {
            "type": "object",
            "properties": {
                "branch": {
                    "type": "string",
                    "description": "Source branch with changes"
                },
                "title": {
                    "type": "string",
                    "description": "PR title"
                },
                "body": {
                    "type": "string",
                    "description": "PR description (markdown supported)"
                },
                "labels": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Labels to add (default: ['seo', 'automated'])"
                }
            },
            "required": ["branch", "title", "body"]
        }
    },
    {
        "name": "github_get_pr_status",
        "description": "Get the status of a Pull Request",
        "parameters": {
            "type": "object",
            "properties": {
                "pr_number": {
                    "type": "integer",
                    "description": "PR number"
                }
            },
            "required": ["pr_number"]
        }
    },
    {
        "name": "github_list_prs",
        "description": "List Pull Requests in the NebulaSEO repository",
        "parameters": {
            "type": "object",
            "properties": {
                "state": {
                    "type": "string",
                    "description": "Filter by state: open, closed, all (default: open)"
                }
            }
        }
    },
    {
        "name": "github_get_repo_info",
        "description": "Get NebulaSEO repository information and recent activity",
        "parameters": {
            "type": "object",
            "properties": {}
        }
    }
]
