"""
Web Crawler Tool - Fetches and analyzes actual website content
"""
import json
import logging
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

# Headers to mimic a real browser
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
}

def fetch_page_content(url: str) -> dict:
    """
    Fetches a webpage and extracts SEO-relevant content.
    Returns structured data about the page.
    """
    try:
        response = requests.get(url, headers=HEADERS, timeout=15)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.text, 'lxml')
        
        # Extract SEO elements
        title = soup.find('title')
        title_text = title.get_text().strip() if title else None
        title_length = len(title_text) if title_text else 0
        
        # Meta description
        meta_desc = soup.find('meta', attrs={'name': 'description'})
        meta_description = meta_desc.get('content', '').strip() if meta_desc else None
        meta_desc_length = len(meta_description) if meta_description else 0
        
        # Meta keywords (less important but still tracked)
        meta_kw = soup.find('meta', attrs={'name': 'keywords'})
        meta_keywords = meta_kw.get('content', '').strip() if meta_kw else None
        
        # Canonical URL
        canonical = soup.find('link', attrs={'rel': 'canonical'})
        canonical_url = canonical.get('href') if canonical else None
        
        # Robots meta
        robots = soup.find('meta', attrs={'name': 'robots'})
        robots_content = robots.get('content', '').strip() if robots else 'index, follow'
        
        # Headings structure
        headings = {
            'h1': [h.get_text().strip() for h in soup.find_all('h1')],
            'h2': [h.get_text().strip() for h in soup.find_all('h2')],
            'h3': [h.get_text().strip() for h in soup.find_all('h3')[:10]],  # Limit h3
        }
        
        # Main content (try common content containers)
        main_content = ""
        content_selectors = ['main', 'article', '[role="main"]', '.content', '#content', '.post-content']
        for selector in content_selectors:
            content_elem = soup.select_one(selector)
            if content_elem:
                main_content = content_elem.get_text(separator=' ', strip=True)[:3000]
                break
        
        if not main_content:
            # Fallback: get body text
            body = soup.find('body')
            if body:
                # Remove script and style elements
                for script in body(["script", "style", "nav", "footer", "header"]):
                    script.decompose()
                main_content = body.get_text(separator=' ', strip=True)[:3000]
        
        # Word count
        word_count = len(main_content.split()) if main_content else 0
        
        # Internal and external links
        internal_links = []
        external_links = []
        base_domain = urlparse(url).netloc
        
        for link in soup.find_all('a', href=True):
            href = link.get('href')
            full_url = urljoin(url, href)
            link_domain = urlparse(full_url).netloc
            
            if link_domain == base_domain:
                internal_links.append({
                    'url': full_url,
                    'anchor_text': link.get_text().strip()[:100]
                })
            elif link_domain and not href.startswith('#'):
                external_links.append({
                    'url': full_url,
                    'anchor_text': link.get_text().strip()[:100]
                })
        
        # Images analysis
        images = []
        for img in soup.find_all('img')[:20]:  # Limit to 20 images
            images.append({
                'src': img.get('src', ''),
                'alt': img.get('alt', ''),
                'has_alt': bool(img.get('alt')),
            })
        
        images_without_alt = sum(1 for img in images if not img['has_alt'])
        
        # Schema markup detection
        schema_types = []
        for script in soup.find_all('script', type='application/ld+json'):
            try:
                schema_data = json.loads(script.string)
                if isinstance(schema_data, dict):
                    schema_types.append(schema_data.get('@type', 'Unknown'))
                elif isinstance(schema_data, list):
                    for item in schema_data:
                        if isinstance(item, dict):
                            schema_types.append(item.get('@type', 'Unknown'))
            except (ValueError, TypeError, AttributeError):
                logger.debug("Skipping malformed JSON-LD block on %s", url)
        
        # Open Graph tags
        og_tags = {}
        for og in soup.find_all('meta', property=lambda x: x and x.startswith('og:')):
            og_tags[og.get('property')] = og.get('content', '')
        
        return {
            "url": url,
            "status": "success",
            "seo_data": {
                "title": title_text,
                "title_length": title_length,
                "title_optimal": 50 <= title_length <= 60,
                "meta_description": meta_description,
                "meta_description_length": meta_desc_length,
                "meta_description_optimal": 150 <= meta_desc_length <= 160,
                "meta_keywords": meta_keywords,
                "canonical_url": canonical_url,
                "robots": robots_content,
            },
            "content_analysis": {
                "headings": headings,
                "h1_count": len(headings['h1']),
                "h1_issues": "Multiple H1 tags" if len(headings['h1']) > 1 else ("Missing H1" if len(headings['h1']) == 0 else "OK"),
                "word_count": word_count,
                "content_length_assessment": "Thin content" if word_count < 300 else ("Good" if word_count < 1500 else "Comprehensive"),
                "main_content_preview": main_content[:500] + "..." if len(main_content) > 500 else main_content,
            },
            "links": {
                "internal_links_count": len(internal_links),
                "external_links_count": len(external_links),
                "internal_links_sample": internal_links[:5],
                "external_links_sample": external_links[:5],
            },
            "images": {
                "total_images": len(images),
                "images_without_alt": images_without_alt,
                "alt_text_coverage": f"{((len(images) - images_without_alt) / len(images) * 100):.0f}%" if images else "N/A",
            },
            "technical": {
                "schema_markup": schema_types if schema_types else "None detected",
                "open_graph": bool(og_tags),
                "og_tags": og_tags if og_tags else None,
            }
        }
        
    except requests.exceptions.RequestException as e:
        return {
            "url": url,
            "status": "error",
            "error": str(e)
        }
    except Exception as e:
        return {
            "url": url,
            "status": "error", 
            "error": f"Parsing error: {str(e)}"
        }


def crawl_sitemap(sitemap_url: str, limit: int = 50) -> dict:
    """
    Fetches and parses a sitemap to get all URLs.
    """
    try:
        response = requests.get(sitemap_url, headers=HEADERS, timeout=15)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.text, 'lxml-xml')
        
        urls = []
        for loc in soup.find_all('loc')[:limit]:
            url_data = {
                'url': loc.get_text().strip()
            }
            
            # Get lastmod if available
            parent = loc.parent
            lastmod = parent.find('lastmod')
            if lastmod:
                url_data['lastmod'] = lastmod.get_text().strip()
            
            priority = parent.find('priority')
            if priority:
                url_data['priority'] = priority.get_text().strip()
                
            urls.append(url_data)
        
        return {
            "sitemap_url": sitemap_url,
            "status": "success",
            "total_urls_found": len(urls),
            "urls": urls
        }
        
    except Exception as e:
        return {
            "sitemap_url": sitemap_url,
            "status": "error",
            "error": str(e)
        }


def analyze_competitor(competitor_url: str, target_keyword: str) -> dict:
    """
    Analyzes a competitor page for a specific keyword.
    """
    page_data = fetch_page_content(competitor_url)
    
    if page_data.get('status') == 'error':
        return page_data
    
    # Keyword analysis
    title = page_data['seo_data'].get('title', '') or ''
    meta_desc = page_data['seo_data'].get('meta_description', '') or ''
    h1_tags = page_data['content_analysis']['headings'].get('h1', [])
    h2_tags = page_data['content_analysis']['headings'].get('h2', [])
    content = page_data['content_analysis'].get('main_content_preview', '') or ''
    
    keyword_lower = target_keyword.lower()
    
    keyword_analysis = {
        "target_keyword": target_keyword,
        "in_title": keyword_lower in title.lower(),
        "in_meta_description": keyword_lower in meta_desc.lower(),
        "in_h1": any(keyword_lower in h1.lower() for h1 in h1_tags),
        "in_h2": any(keyword_lower in h2.lower() for h2 in h2_tags),
        "keyword_density_estimate": f"{(content.lower().count(keyword_lower) / max(len(content.split()), 1) * 100):.2f}%",
        "title_starts_with_keyword": title.lower().startswith(keyword_lower),
    }
    
    page_data['keyword_analysis'] = keyword_analysis
    
    return page_data


# Function exports for the agent
def fetch_page_content_fn(url: str) -> str:
    """Wrapper function for the agent to call."""
    result = fetch_page_content(url)
    return json.dumps(result, indent=2)


def crawl_sitemap_fn(sitemap_url: str, limit: int = 50) -> str:
    """Wrapper function for the agent to call."""
    result = crawl_sitemap(sitemap_url, limit)
    return json.dumps(result, indent=2)


def analyze_competitor_fn(competitor_url: str, target_keyword: str) -> str:
    """Wrapper function for the agent to call."""
    result = analyze_competitor(competitor_url, target_keyword)
    return json.dumps(result, indent=2)
