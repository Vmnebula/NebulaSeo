"""
Content Generator Tool
AI-powered content generation for SEO: meta tags, schema, blog posts
"""

import os
import json
import re
from typing import Optional, List
from google import genai
from google.genai import types


def get_model():
    """Get Gemini 3 model for content generation"""
    os.environ.setdefault("GOOGLE_CLOUD_PROJECT", "nebulaseo")
    os.environ.setdefault("GOOGLE_CLOUD_LOCATION", "global")
    os.environ.setdefault("GOOGLE_GENAI_USE_VERTEXAI", "True")
    client = genai.Client()
    return client, "gemini-3-pro-preview"


def generate_content(prompt: str, thinking_level: str = "LOW") -> str:
    """Helper to generate content with Gemini 3."""
    client, model_id = get_model()
    
    thinking = types.ThinkingLevel.LOW if thinking_level == "LOW" else types.ThinkingLevel.HIGH
    
    response = client.models.generate_content(
        model=model_id,
        contents=prompt,
        config=types.GenerateContentConfig(
            temperature=0.7,
            thinking_config=types.ThinkingConfig(thinking_level=thinking)
        )
    )
    return response.text


def generate_meta_title_fn(
    page_url: str,
    current_title: str,
    target_keyword: str,
    page_content_summary: str = "",
    brand: str = "NebulaSEO"
) -> dict:
    """
    Generate an SEO-optimized meta title.
    
    Args:
        page_url: URL of the page
        current_title: Current title tag content
        target_keyword: Primary keyword to target
        page_content_summary: Brief summary of page content
        brand: Brand name to include (default: NebulaSEO)
    
    Returns:
        Optimized title with analysis
    """
    try:
        prompt = f"""Generate an SEO-optimized meta title for this page:

URL: {page_url}
Current Title: {current_title}
Target Keyword: {target_keyword}
Page Content: {page_content_summary}
Brand: {brand}

Requirements:
- MUST be 50-60 characters (critical for SERP display)
- Include target keyword naturally, preferably near the beginning
- Include brand name at end with separator (|, -, or :) if space allows
- Make it compelling and click-worthy
- Match user search intent
- Don't use clickbait or misleading text

Return ONLY a JSON object (no markdown):
{{"title": "Your optimized title here", "char_count": 55, "keyword_position": 0, "includes_brand": true, "reasoning": "Brief explanation"}}"""

        text = generate_content(prompt)
        
        # Remove markdown code blocks if present
        if text.startswith("```"):
            text = re.sub(r'^```json?\n?', '', text)
            text = re.sub(r'\n?```$', '', text)
        
        result = json.loads(text)
        result["original_title"] = current_title
        result["target_keyword"] = target_keyword
        
        return result
    
    except json.JSONDecodeError as e:
        return {"error": f"Failed to parse response: {e}", "raw": text}
    except Exception as e:
        return {"error": str(e)}


def generate_meta_description_fn(
    page_url: str,
    page_content_summary: str,
    target_keyword: str,
    current_description: str = ""
) -> dict:
    """
    Generate an SEO-optimized meta description.
    
    Args:
        page_url: URL of the page
        page_content_summary: Summary of page content
        target_keyword: Primary keyword to target
        current_description: Current meta description (if any)
    
    Returns:
        Optimized description with analysis
    """
    try:
        prompt = f"""Generate an SEO-optimized meta description:

URL: {page_url}
Page Content: {page_content_summary}
Target Keyword: {target_keyword}
Current Description: {current_description or "None"}

Requirements:
- MUST be 150-160 characters (critical for SERP display)
- Include the target keyword naturally
- Clear value proposition - what will the user get?
- Include a subtle call-to-action
- Entice clicks from search results
- Match the search intent
- Don't start with "This page..." or "Welcome to..."

Return ONLY a JSON object (no markdown):
{{"description": "Your meta description here", "char_count": 155, "includes_keyword": true, "has_cta": true, "reasoning": "Brief explanation"}}"""

        text = generate_content(prompt)
        
        if text.startswith("```"):
            text = re.sub(r'^```json?\n?', '', text)
            text = re.sub(r'\n?```$', '', text)
        
        result = json.loads(text)
        result["original_description"] = current_description
        result["target_keyword"] = target_keyword
        
        return result
    
    except json.JSONDecodeError as e:
        return {"error": f"Failed to parse response: {e}", "raw": text}
    except Exception as e:
        return {"error": str(e)}


def generate_schema_markup_fn(
    schema_type: str,
    page_data: dict
) -> dict:
    """
    Generate JSON-LD schema markup for rich snippets.
    
    Args:
        schema_type: Type of schema (Organization, LocalBusiness, Service, Article, FAQ, HowTo, Product)
        page_data: Data to include in the schema
    
    Returns:
        Valid JSON-LD markup
    """
    try:
        prompt = f"""Generate valid JSON-LD schema markup:

Schema Type: {schema_type}
Data: {json.dumps(page_data, indent=2)}

Requirements:
- Must be valid JSON-LD that passes Google's Rich Results Test
- Include all required properties for the schema type
- Use schema.org vocabulary
- Include relevant optional properties for better rich snippets
- For NebulaSEO: We're a Dubai-based product studio specializing in mobile app development and AI solutions

Return ONLY the JSON-LD object (no markdown, no explanation):
{{"@context": "https://schema.org", "@type": "{schema_type}", ...}}"""

        text = generate_content(prompt)
        
        if text.startswith("```"):
            text = re.sub(r'^```json?\n?', '', text)
            text = re.sub(r'\n?```$', '', text)
        
        schema = json.loads(text)
        
        return {
            "schema_type": schema_type,
            "json_ld": schema,
            "html_snippet": f'<script type="application/ld+json">\n{json.dumps(schema, indent=2)}\n</script>'
        }
    
    except json.JSONDecodeError as e:
        return {"error": f"Failed to parse schema: {e}", "raw": text}
    except Exception as e:
        return {"error": str(e)}


def generate_blog_outline_fn(
    topic: str,
    target_keywords: List[str],
    target_audience: str = "business owners and entrepreneurs in Dubai"
) -> dict:
    """
    Generate a detailed blog post outline with SEO considerations.
    
    Args:
        topic: Blog post topic
        target_keywords: List of keywords to target
        target_audience: Target audience description
    
    Returns:
        Detailed outline with sections and SEO notes
    """
    try:
        prompt = f"""Create a detailed SEO-optimized blog post outline:

Topic: {topic}
Target Keywords: {', '.join(target_keywords)}
Target Audience: {target_audience}
Brand: NebulaSEO (Dubai product studio - mobile apps, AI, custom software)

Requirements:
- Create a comprehensive outline with H2 and H3 headings
- Include target keywords in headings naturally
- Plan for 1500-2000 words
- Include FAQ section at the end
- Add internal linking opportunities to NebulaSEO services
- Consider search intent and user journey

Return ONLY a JSON object (no markdown):
{{
  "title": "SEO-optimized blog title",
  "meta_description": "150-160 char description",
  "estimated_word_count": 1800,
  "sections": [
    {{
      "heading": "H2 heading",
      "type": "h2",
      "key_points": ["point 1", "point 2"],
      "target_keyword": "keyword if applicable",
      "subsections": [
        {{"heading": "H3 subheading", "type": "h3", "key_points": ["point"]}}
      ]
    }}
  ],
  "faq_questions": ["Question 1?", "Question 2?"],
  "internal_links": [
    {{"anchor": "anchor text", "target_page": "/services/mobile-development"}}
  ],
  "seo_notes": "Brief SEO strategy notes"
}}"""

        text = generate_content(prompt, thinking_level="HIGH")
        
        if text.startswith("```"):
            text = re.sub(r'^```json?\n?', '', text)
            text = re.sub(r'\n?```$', '', text)
        
        result = json.loads(text)
        result["target_keywords"] = target_keywords
        
        return result
    
    except json.JSONDecodeError as e:
        return {"error": f"Failed to parse outline: {e}", "raw": text}
    except Exception as e:
        return {"error": str(e)}


def generate_blog_content_fn(
    topic: str,
    target_keywords: List[str],
    outline: dict = None,
    word_count: int = 1500,
    tone: str = "professional yet approachable"
) -> dict:
    """
    Generate a full blog post with SEO optimization.
    
    Args:
        topic: Blog post topic
        target_keywords: List of keywords to target
        outline: Optional outline to follow (from generate_blog_outline)
        word_count: Target word count (default 1500)
        tone: Writing tone
    
    Returns:
        Complete blog post in Markdown format
    """
    try:
        outline_text = ""
        if outline:
            outline_text = f"\nFollow this outline:\n{json.dumps(outline, indent=2)}"
        
        prompt = f"""Write a complete SEO-optimized blog post:

Topic: {topic}
Target Keywords: {', '.join(target_keywords)}
Word Count: ~{word_count} words
Tone: {tone}
Brand: NebulaSEO (Dubai product studio - mobile apps, AI, custom software)
{outline_text}

Requirements:
- Write in Markdown format
- Include engaging H1 title at the start
- Use H2 and H3 headings with keywords
- Natural keyword integration (not stuffed)
- Include practical examples and actionable advice
- Add internal link placeholders: [LINK: anchor text -> /target-path]
- Include a FAQ section with 3-5 questions
- End with a clear call-to-action
- Make it valuable and comprehensive
- Write for humans first, search engines second

Write the full blog post now:"""

        content = generate_content(prompt, thinking_level="HIGH")
        word_count_actual = len(content.split())
        
        # Extract internal link suggestions
        link_pattern = r'\[LINK:\s*([^->]+)\s*->\s*([^\]]+)\]'
        links = re.findall(link_pattern, content)
        internal_links = [{"anchor": anchor.strip(), "target": target.strip()} for anchor, target in links]
        
        return {
            "topic": topic,
            "target_keywords": target_keywords,
            "word_count": word_count_actual,
            "content": content,
            "internal_link_suggestions": internal_links,
            "format": "markdown"
        }
    
    except Exception as e:
        return {"error": str(e)}


def rewrite_for_seo_fn(
    content: str,
    target_keyword: str,
    content_type: str = "paragraph"
) -> dict:
    """
    Rewrite existing content for better SEO.
    
    Args:
        content: Original content to rewrite
        target_keyword: Keyword to optimize for
        content_type: Type of content (paragraph, heading, bullet_points)
    
    Returns:
        SEO-optimized version of the content
    """
    try:
        prompt = f"""Rewrite this content for better SEO:

Original Content:
{content}

Target Keyword: {target_keyword}
Content Type: {content_type}

Requirements:
- Maintain the original meaning and message
- Integrate the target keyword naturally (don't stuff)
- Improve readability and engagement
- Keep similar length
- Make it more compelling

Return ONLY a JSON object:
{{"rewritten": "The optimized content here", "changes_made": ["list of key changes"], "keyword_density": "X%"}}"""

        text = generate_content(prompt)
        
        if text.startswith("```"):
            text = re.sub(r'^```json?\n?', '', text)
            text = re.sub(r'\n?```$', '', text)
        
        result = json.loads(text)
        result["original"] = content
        result["target_keyword"] = target_keyword
        
        return result
    
    except json.JSONDecodeError as e:
        return {"error": f"Failed to parse response: {e}", "raw": text}
    except Exception as e:
        return {"error": str(e)}


def suggest_internal_links_fn(
    page_content: str,
    available_pages: List[dict]
) -> dict:
    """
    Suggest internal links to add to a page.
    
    Args:
        page_content: Content of the page to add links to
        available_pages: List of available pages to link to [{"url": "/path", "title": "Title", "keywords": ["kw1"]}]
    
    Returns:
        List of suggested internal links with anchor text
    """
    try:
        prompt = f"""Analyze this content and suggest internal links:

Page Content:
{page_content[:3000]}  # Truncate for token limits

Available Pages to Link To:
{json.dumps(available_pages, indent=2)}

Requirements:
- Find natural opportunities to add internal links
- Suggest descriptive anchor text (not "click here")
- Don't over-link - suggest 3-7 quality links
- Links should be contextually relevant
- Consider the user journey

Return ONLY a JSON object:
{{
  "suggestions": [
    {{
      "anchor_text": "suggested anchor text",
      "target_url": "/target-page",
      "context": "sentence or paragraph where link should be added",
      "relevance_score": 0.9
    }}
  ],
  "total_suggestions": 5
}}"""

        text = generate_content(prompt)
        
        if text.startswith("```"):
            text = re.sub(r'^```json?\n?', '', text)
            text = re.sub(r'\n?```$', '', text)
        
        return json.loads(text)
    
    except json.JSONDecodeError as e:
        return {"error": f"Failed to parse response: {e}", "raw": text}
    except Exception as e:
        return {"error": str(e)}


def generate_alt_text_fn(
    image_context: str,
    image_filename: str,
    page_topic: str
) -> dict:
    """
    Generate SEO-friendly alt text for an image.
    
    Args:
        image_context: Context around the image (surrounding text)
        image_filename: Name of the image file
        page_topic: Topic of the page
    
    Returns:
        Alt text and title attribute suggestions
    """
    try:
        prompt = f"""Generate SEO-friendly alt text for an image:

Image Filename: {image_filename}
Page Topic: {page_topic}
Context: {image_context}

Requirements:
- Descriptive but concise (125 characters max)
- Include relevant keyword if natural
- Describe what's IN the image (functional for accessibility)
- Don't start with "Image of" or "Picture of"
- Be specific and useful for screen readers

Return ONLY a JSON object:
{{"alt_text": "Descriptive alt text here", "title_attribute": "Optional title for tooltip", "char_count": 75}}"""

        text = generate_content(prompt)
        
        if text.startswith("```"):
            text = re.sub(r'^```json?\n?', '', text)
            text = re.sub(r'\n?```$', '', text)
        
        result = json.loads(text)
        result["image_filename"] = image_filename
        
        return result
    
    except json.JSONDecodeError as e:
        return {"error": f"Failed to parse response: {e}", "raw": text}
    except Exception as e:
        return {"error": str(e)}


# Tool declarations for the agent
CONTENT_TOOLS = [
    {
        "name": "generate_meta_title",
        "description": "Generate an SEO-optimized meta title (50-60 characters) for a page",
        "parameters": {
            "type": "object",
            "properties": {
                "page_url": {"type": "string", "description": "URL of the page"},
                "current_title": {"type": "string", "description": "Current title tag"},
                "target_keyword": {"type": "string", "description": "Primary keyword to target"},
                "page_content_summary": {"type": "string", "description": "Brief summary of page content"},
                "brand": {"type": "string", "description": "Brand name (default: NebulaSEO)"}
            },
            "required": ["page_url", "current_title", "target_keyword"]
        }
    },
    {
        "name": "generate_meta_description",
        "description": "Generate an SEO-optimized meta description (150-160 characters)",
        "parameters": {
            "type": "object",
            "properties": {
                "page_url": {"type": "string", "description": "URL of the page"},
                "page_content_summary": {"type": "string", "description": "Summary of page content"},
                "target_keyword": {"type": "string", "description": "Primary keyword to target"},
                "current_description": {"type": "string", "description": "Current meta description if any"}
            },
            "required": ["page_url", "page_content_summary", "target_keyword"]
        }
    },
    {
        "name": "generate_schema_markup",
        "description": "Generate JSON-LD schema markup for rich snippets (Organization, Service, Article, FAQ, etc.)",
        "parameters": {
            "type": "object",
            "properties": {
                "schema_type": {"type": "string", "description": "Schema type: Organization, LocalBusiness, Service, Article, FAQ, HowTo, Product"},
                "page_data": {"type": "object", "description": "Data to include in the schema"}
            },
            "required": ["schema_type", "page_data"]
        }
    },
    {
        "name": "generate_blog_outline",
        "description": "Generate a detailed SEO-optimized blog post outline",
        "parameters": {
            "type": "object",
            "properties": {
                "topic": {"type": "string", "description": "Blog post topic"},
                "target_keywords": {"type": "array", "items": {"type": "string"}, "description": "Keywords to target"},
                "target_audience": {"type": "string", "description": "Target audience description"}
            },
            "required": ["topic", "target_keywords"]
        }
    },
    {
        "name": "generate_blog_content",
        "description": "Generate a full SEO-optimized blog post in Markdown format",
        "parameters": {
            "type": "object",
            "properties": {
                "topic": {"type": "string", "description": "Blog post topic"},
                "target_keywords": {"type": "array", "items": {"type": "string"}, "description": "Keywords to target"},
                "outline": {"type": "object", "description": "Optional outline to follow"},
                "word_count": {"type": "integer", "description": "Target word count (default 1500)"},
                "tone": {"type": "string", "description": "Writing tone"}
            },
            "required": ["topic", "target_keywords"]
        }
    },
    {
        "name": "rewrite_for_seo",
        "description": "Rewrite existing content for better SEO while maintaining meaning",
        "parameters": {
            "type": "object",
            "properties": {
                "content": {"type": "string", "description": "Original content to rewrite"},
                "target_keyword": {"type": "string", "description": "Keyword to optimize for"},
                "content_type": {"type": "string", "description": "Type: paragraph, heading, bullet_points"}
            },
            "required": ["content", "target_keyword"]
        }
    },
    {
        "name": "suggest_internal_links",
        "description": "Suggest internal links to add to a page for better SEO",
        "parameters": {
            "type": "object",
            "properties": {
                "page_content": {"type": "string", "description": "Content of the page"},
                "available_pages": {"type": "array", "description": "List of pages to link to"}
            },
            "required": ["page_content", "available_pages"]
        }
    },
    {
        "name": "generate_alt_text",
        "description": "Generate SEO-friendly alt text for images",
        "parameters": {
            "type": "object",
            "properties": {
                "image_context": {"type": "string", "description": "Context around the image"},
                "image_filename": {"type": "string", "description": "Image filename"},
                "page_topic": {"type": "string", "description": "Topic of the page"}
            },
            "required": ["image_context", "image_filename", "page_topic"]
        }
    }
]
