"""
SEO Actions Executor
Complete workflows that combine analysis, content generation, and GitHub PRs
"""

import os
import re
from datetime import datetime
from typing import Optional, List, Dict

from .github_tool import (
    github_create_branch_fn,
    github_read_file_fn,
    github_update_file_fn,
    github_create_pr_fn
)
from .content_generator import (
    generate_meta_title_fn,
    generate_meta_description_fn,
    generate_schema_markup_fn,
    generate_blog_content_fn
)
from .web_crawler import fetch_page_content_fn


def fix_meta_tags_fn(
    page_url: str,
    file_path: str,
    target_keyword: str,
    issues: List[str]
) -> dict:
    """
    Complete workflow to fix meta tag issues on a page.
    Creates a branch, applies fixes, and opens a PR.
    
    Args:
        page_url: URL of the page (e.g., https://example.com/services)
        file_path: Path to the file in the repo (e.g., app/services/page.tsx)
        target_keyword: Primary keyword to optimize for
        issues: List of issues to fix (e.g., ["missing_meta_description", "title_too_long"])
    
    Returns:
        PR details and summary of changes
    """
    try:
        fixes_applied = []
        
        # 1. Create branch
        branch_result = github_create_branch_fn("meta-tags")
        if "error" in branch_result:
            return branch_result
        
        branch = branch_result["branch"]
        
        # 2. Read current file
        file_result = github_read_file_fn(file_path)
        if "error" in file_result:
            return file_result
        
        content = file_result["content"]
        new_content = content
        
        # 3. Fetch page content for context
        page_data = fetch_page_content_fn(page_url)
        page_summary = page_data.get("content", "")[:500] if "content" in page_data else ""
        current_title = page_data.get("title", "")
        current_description = page_data.get("meta_description", "")
        
        # 4. Apply fixes based on issues
        for issue in issues:
            if issue == "missing_meta_description" or issue == "improve_meta_description":
                desc_result = generate_meta_description_fn(
                    page_url=page_url,
                    page_content_summary=page_summary,
                    target_keyword=target_keyword,
                    current_description=current_description
                )
                
                if "description" in desc_result:
                    # Insert meta description (Next.js metadata format)
                    new_content = _update_nextjs_metadata(
                        new_content,
                        "description",
                        desc_result["description"]
                    )
                    fixes_applied.append({
                        "type": "meta_description",
                        "old": current_description or "None",
                        "new": desc_result["description"]
                    })
            
            elif issue == "title_too_long" or issue == "improve_title":
                title_result = generate_meta_title_fn(
                    page_url=page_url,
                    current_title=current_title,
                    target_keyword=target_keyword,
                    page_content_summary=page_summary
                )
                
                if "title" in title_result:
                    new_content = _update_nextjs_metadata(
                        new_content,
                        "title",
                        title_result["title"]
                    )
                    fixes_applied.append({
                        "type": "title",
                        "old": current_title,
                        "new": title_result["title"]
                    })
        
        if not fixes_applied:
            return {"error": "No fixes could be applied", "issues": issues}
        
        # 5. Commit changes
        commit_result = github_update_file_fn(
            branch=branch,
            file_path=file_path,
            content=new_content,
            commit_message=f"SEO: Fix meta tags on {file_path}\n\n" + 
                          "\n".join([f"- {f['type']}: Updated" for f in fixes_applied])
        )
        
        if "error" in commit_result:
            return commit_result
        
        # 6. Create PR
        pr_body = _generate_meta_fix_pr_body(page_url, fixes_applied, target_keyword)
        
        pr_result = github_create_pr_fn(
            branch=branch,
            title=f"🔍 SEO: Fix meta tags on {page_url.split('/')[-1] or 'homepage'}",
            body=pr_body,
            labels=["seo", "automated", "meta-tags"]
        )
        
        return {
            "status": "success",
            "branch": branch,
            "pr_url": pr_result.get("pr_url"),
            "pr_number": pr_result.get("pr_number"),
            "fixes_applied": fixes_applied,
            "file_path": file_path
        }
    
    except Exception as e:
        return {"error": str(e)}


def add_schema_markup_fn(
    page_url: str,
    file_path: str,
    schema_type: str,
    schema_data: dict
) -> dict:
    """
    Add JSON-LD schema markup to a page.
    
    Args:
        page_url: URL of the page
        file_path: Path to the file in the repo
        schema_type: Type of schema (Organization, Service, FAQ, etc.)
        schema_data: Data to include in the schema
    
    Returns:
        PR details
    """
    try:
        # 1. Generate schema
        schema_result = generate_schema_markup_fn(schema_type, schema_data)
        
        if "error" in schema_result:
            return schema_result
        
        # 2. Create branch
        branch_result = github_create_branch_fn(f"schema-{schema_type.lower()}")
        if "error" in branch_result:
            return branch_result
        
        branch = branch_result["branch"]
        
        # 3. Read current file
        file_result = github_read_file_fn(file_path)
        if "error" in file_result:
            return file_result
        
        content = file_result["content"]
        
        # 4. Insert schema (for Next.js, add to metadata)
        json_ld = schema_result["json_ld"]
        new_content = _insert_schema_to_nextjs(content, json_ld)
        
        # 5. Commit
        commit_result = github_update_file_fn(
            branch=branch,
            file_path=file_path,
            content=new_content,
            commit_message=f"SEO: Add {schema_type} schema to {file_path}"
        )
        
        if "error" in commit_result:
            return commit_result
        
        # 6. Create PR
        pr_body = f"""## 🔍 SEO: Add {schema_type} Schema Markup

### Page
{page_url}

### Schema Type
`{schema_type}`

### JSON-LD Added
```json
{schema_result['html_snippet']}
```

### Expected Impact
- ✅ Enables rich snippets in Google search results
- ✅ Improves click-through rates
- ✅ Better understanding of page content by search engines

### Validation
- [ ] Test with [Google Rich Results Test](https://search.google.com/test/rich-results)
- [ ] Verify no JavaScript errors

---
*Generated by NebulaSEO SEO Agent v4.0*
"""
        
        pr_result = github_create_pr_fn(
            branch=branch,
            title=f"🔍 SEO: Add {schema_type} schema to {page_url.split('/')[-1] or 'homepage'}",
            body=pr_body,
            labels=["seo", "automated", "schema"]
        )
        
        return {
            "status": "success",
            "branch": branch,
            "pr_url": pr_result.get("pr_url"),
            "pr_number": pr_result.get("pr_number"),
            "schema_type": schema_type
        }
    
    except Exception as e:
        return {"error": str(e)}


def create_blog_post_fn(
    topic: str,
    target_keywords: List[str],
    slug: str,
    author: str = "NebulaSEO Team"
) -> dict:
    """
    Create a complete blog post and submit as PR.
    
    Args:
        topic: Blog post topic
        target_keywords: Keywords to target
        slug: URL slug for the post (e.g., "mobile-app-development-guide")
        author: Author name
    
    Returns:
        PR details and content summary
    """
    try:
        # 1. Generate content
        content_result = generate_blog_content_fn(
            topic=topic,
            target_keywords=target_keywords,
            word_count=1500
        )
        
        if "error" in content_result:
            return content_result
        
        # 2. Create branch
        branch_result = github_create_branch_fn(f"blog-{slug[:20]}")
        if "error" in branch_result:
            return branch_result
        
        branch = branch_result["branch"]
        
        # 3. Create file content with frontmatter (MDX format for Next.js)
        date = datetime.now().strftime("%Y-%m-%d")
        
        # Extract title from content
        title_match = re.search(r'^#\s+(.+)$', content_result["content"], re.MULTILINE)
        title = title_match.group(1) if title_match else topic
        
        file_content = f"""---
title: "{title}"
date: "{date}"
author: "{author}"
keywords: {target_keywords}
description: "{content_result['content'][:150].replace('"', "'")}"
---

{content_result['content']}
"""
        
        # 4. Commit the file
        file_path = f"content/blog/{slug}.mdx"
        
        commit_result = github_update_file_fn(
            branch=branch,
            file_path=file_path,
            content=file_content,
            commit_message=f"Add blog post: {topic}"
        )
        
        if "error" in commit_result:
            return commit_result
        
        # 5. Create PR
        pr_body = f"""## 📝 New Blog Post: {topic}

### Details
- **Target Keywords:** {', '.join(target_keywords)}
- **Word Count:** {content_result['word_count']}
- **Author:** {author}
- **File:** `{file_path}`

### Internal Links Suggested
{chr(10).join([f"- [{l['anchor']}]({l['target']})" for l in content_result.get('internal_link_suggestions', [])])}

### SEO Checklist
- [ ] Title optimized for primary keyword
- [ ] Meta description added
- [ ] H2/H3 structure with keywords
- [ ] Internal links added
- [ ] Images with alt text (if applicable)
- [ ] FAQ schema (consider adding)

### Preview Content
```markdown
{content_result['content'][:500]}...
```

---
*Generated by NebulaSEO SEO Agent v4.0*
"""
        
        pr_result = github_create_pr_fn(
            branch=branch,
            title=f"📝 New Blog: {topic[:50]}",
            body=pr_body,
            labels=["content", "automated", "blog"]
        )
        
        return {
            "status": "success",
            "branch": branch,
            "pr_url": pr_result.get("pr_url"),
            "pr_number": pr_result.get("pr_number"),
            "file_path": file_path,
            "word_count": content_result["word_count"],
            "topic": topic
        }
    
    except Exception as e:
        return {"error": str(e)}


def fix_heading_structure_fn(
    page_url: str,
    file_path: str,
    issues: List[dict]
) -> dict:
    """
    Fix heading structure issues (missing H1, multiple H1s, hierarchy problems).
    
    Args:
        page_url: URL of the page
        file_path: Path to the file
        issues: List of heading issues [{"type": "missing_h1"}, {"type": "multiple_h1", "count": 3}]
    
    Returns:
        PR details
    """
    try:
        # 1. Create branch
        branch_result = github_create_branch_fn("heading-structure")
        if "error" in branch_result:
            return branch_result
        
        branch = branch_result["branch"]
        
        # 2. Read file
        file_result = github_read_file_fn(file_path)
        if "error" in file_result:
            return file_result
        
        content = file_result["content"]
        new_content = content
        fixes_applied = []
        
        for issue in issues:
            if issue.get("type") == "multiple_h1":
                # Convert extra H1s to H2s
                h1_pattern = r'<h1([^>]*)>([^<]+)</h1>'
                matches = list(re.finditer(h1_pattern, new_content, re.IGNORECASE))
                
                # Keep first H1, convert rest to H2
                for match in matches[1:]:
                    old_tag = match.group(0)
                    new_tag = f'<h2{match.group(1)}>{match.group(2)}</h2>'
                    new_content = new_content.replace(old_tag, new_tag, 1)
                    fixes_applied.append(f"Converted extra H1 to H2: {match.group(2)[:30]}...")
        
        if not fixes_applied:
            return {"status": "no_changes_needed", "message": "No heading fixes could be applied automatically"}
        
        # 3. Commit
        commit_result = github_update_file_fn(
            branch=branch,
            file_path=file_path,
            content=new_content,
            commit_message=f"SEO: Fix heading structure on {file_path}"
        )
        
        # 4. Create PR
        pr_body = f"""## 🔍 SEO: Fix Heading Structure

### Page
{page_url}

### Issues Fixed
{chr(10).join([f"- ✅ {fix}" for fix in fixes_applied])}

### Why This Matters
- H1 should be unique per page (main heading)
- Proper hierarchy (H1 → H2 → H3) helps search engines understand content structure
- Improves accessibility for screen readers

---
*Generated by NebulaSEO SEO Agent v4.0*
"""
        
        pr_result = github_create_pr_fn(
            branch=branch,
            title=f"🔍 SEO: Fix heading structure",
            body=pr_body,
            labels=["seo", "automated", "headings"]
        )
        
        return {
            "status": "success",
            "branch": branch,
            "pr_url": pr_result.get("pr_url"),
            "fixes_applied": fixes_applied
        }
    
    except Exception as e:
        return {"error": str(e)}


# Helper functions

def _update_nextjs_metadata(content: str, field: str, value: str) -> str:
    """Update Next.js metadata export"""
    # Pattern for metadata object
    metadata_pattern = r'(export\s+const\s+metadata[^{]*\{[^}]*' + field + r'\s*:\s*["\'])[^"\']*(["\'])'
    
    if re.search(metadata_pattern, content):
        # Update existing field
        return re.sub(metadata_pattern, rf'\g<1>{value}\g<2>', content)
    else:
        # Add field to metadata object
        # Find metadata object and add field
        metadata_obj_pattern = r'(export\s+const\s+metadata[^{]*\{)'
        if re.search(metadata_obj_pattern, content):
            return re.sub(metadata_obj_pattern, rf'\g<1>\n  {field}: "{value}",', content)
    
    return content


def _insert_schema_to_nextjs(content: str, schema: dict) -> str:
    """Insert JSON-LD schema into Next.js page"""
    import json
    
    schema_script = f"""
// JSON-LD Schema
const jsonLd = {json.dumps(schema, indent=2)}

"""
    
    # Add after imports
    import_end = content.rfind('import ')
    if import_end > -1:
        # Find end of import line
        line_end = content.find('\n', import_end)
        if line_end > -1:
            return content[:line_end+1] + schema_script + content[line_end+1:]
    
    return schema_script + content


def _generate_meta_fix_pr_body(page_url: str, fixes: List[dict], keyword: str) -> str:
    """Generate PR body for meta tag fixes"""
    
    changes_table = "| Type | Before | After |\n|------|--------|-------|\n"
    for fix in fixes:
        old_val = fix['old'][:50] + "..." if len(str(fix['old'])) > 50 else fix['old']
        new_val = fix['new'][:50] + "..." if len(str(fix['new'])) > 50 else fix['new']
        changes_table += f"| {fix['type']} | {old_val} | {new_val} |\n"
    
    return f"""## 🔍 SEO: Meta Tag Optimization

### Page
{page_url}

### Target Keyword
`{keyword}`

### Changes Made
{changes_table}

### Expected Impact
- 📈 Improved click-through rate (CTR) from search results
- 🎯 Better keyword targeting
- 📱 Optimal display on search engine results pages (SERP)

### Validation Checklist
- [ ] Title under 60 characters
- [ ] Description under 160 characters
- [ ] Contains target keyword naturally
- [ ] Compelling and click-worthy

### How to Test
1. Merge this PR
2. Wait for Cloud Build deployment
3. Verify changes at: {page_url}
4. Test with [Google Rich Results Test](https://search.google.com/test/rich-results)

---
*Generated by NebulaSEO SEO Agent v4.0*
"""


# Tool declarations
SEO_ACTION_TOOLS = [
    {
        "name": "fix_meta_tags",
        "description": "Complete workflow to fix meta tag issues - creates branch, applies AI-generated fixes, and opens a PR",
        "parameters": {
            "type": "object",
            "properties": {
                "page_url": {"type": "string", "description": "URL of the page"},
                "file_path": {"type": "string", "description": "Path to file in repo (e.g., app/services/page.tsx)"},
                "target_keyword": {"type": "string", "description": "Primary keyword to optimize for"},
                "issues": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Issues to fix: missing_meta_description, title_too_long, improve_title, improve_meta_description"
                }
            },
            "required": ["page_url", "file_path", "target_keyword", "issues"]
        }
    },
    {
        "name": "add_schema_markup",
        "description": "Add JSON-LD schema markup to a page for rich snippets - creates PR with generated schema",
        "parameters": {
            "type": "object",
            "properties": {
                "page_url": {"type": "string", "description": "URL of the page"},
                "file_path": {"type": "string", "description": "Path to file in repo"},
                "schema_type": {"type": "string", "description": "Schema type: Organization, Service, FAQ, Article, etc."},
                "schema_data": {"type": "object", "description": "Data for the schema"}
            },
            "required": ["page_url", "file_path", "schema_type", "schema_data"]
        }
    },
    {
        "name": "create_blog_post",
        "description": "Generate a complete SEO-optimized blog post and submit as PR to the website repo",
        "parameters": {
            "type": "object",
            "properties": {
                "topic": {"type": "string", "description": "Blog post topic"},
                "target_keywords": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Keywords to target"
                },
                "slug": {"type": "string", "description": "URL slug (e.g., mobile-app-development-guide)"},
                "author": {"type": "string", "description": "Author name (default: NebulaSEO Team)"}
            },
            "required": ["topic", "target_keywords", "slug"]
        }
    },
    {
        "name": "fix_heading_structure",
        "description": "Fix heading structure issues (multiple H1s, missing H1, etc.) - creates PR with fixes",
        "parameters": {
            "type": "object",
            "properties": {
                "page_url": {"type": "string", "description": "URL of the page"},
                "file_path": {"type": "string", "description": "Path to file in repo"},
                "issues": {
                    "type": "array",
                    "items": {"type": "object"},
                    "description": "List of heading issues"
                }
            },
            "required": ["page_url", "file_path", "issues"]
        }
    }
]
