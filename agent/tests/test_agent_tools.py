import pytest
import json
from unittest.mock import MagicMock, patch
from src.tools.serp_analyzer import analyze_serp_fn, suggest_title_improvements_fn
from src.tools.schema_validator_tool import validate_schema_json_fn
from src.tools.github_tool import github_create_pr_fn

def test_serp_analyzer_structure():
    """Verify that SERP analyzer returns structured JSON with expected keys."""
    result_str = analyze_serp_fn(keyword="ai cost optimization", num_results=5)
    data = json.loads(result_str)
    
    assert "keyword" in data
    assert "status" in data
    assert data["status"] == "success"

def test_suggest_title_improvements_length_and_format():
    """Verify title suggestions adhere to SEO best practices."""
    title_str = suggest_title_improvements_fn(
        current_title="Home",
        target_keyword="FastAPI Agent Hosting",
        page_type="service"
    )
    data = json.loads(title_str)
    
    assert "suggestions" in data
    assert len(data["suggestions"]) > 0
    # Check that suggested titles are realistic SEO lengths
    for suggestion in data["suggestions"]:
        assert len(suggestion) <= 100

def test_schema_validator_valid_and_invalid_json():
    """Verify JSON-LD schema validator accepts valid markup and catches malformed JSON."""
    valid_schema = json.dumps({
        "@context": "https://schema.org",
        "@type": "Organization",
        "name": "NebulaSEO",
        "url": "https://example.com",
        "logo": "https://example.com/logo.png"
    })
    
    valid_res = json.loads(validate_schema_json_fn(valid_schema))
    assert valid_res["status"] == "valid"
    assert valid_res["deployable"] is True
    assert valid_res["validation"]["type"] == "Organization"
    
    invalid_schema = "{ @context: schema.org, name: incomplete"
    invalid_res = json.loads(validate_schema_json_fn(invalid_schema))
    assert invalid_res["status"] == "invalid_json"
    assert "error" in invalid_res

@patch("src.tools.github_tool.get_repo")
def test_github_pull_request_builder_mocked(mock_get_repo):
    """Verify GitHub PR generator creates correct branches without real network API calls."""
    mock_repo = MagicMock()
    mock_get_repo.return_value = mock_repo
    
    mock_pr = MagicMock()
    mock_pr.number = 42
    mock_pr.html_url = "https://github.com/your-org/your-repo/pull/42"
    mock_repo.create_pull.return_value = mock_pr
    
    res = github_create_pr_fn(
        branch="seo/schema-organization",
        title="feat: add Organization JSON-LD schema",
        body="Automated PR by NebulaSEO"
    )
    
    assert res["status"] == "success"
    assert res["pr_number"] == 42
    assert "https://github.com/your-org/your-repo/pull/42" in res["pr_url"]
