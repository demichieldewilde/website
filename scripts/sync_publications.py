"""Generate website publication data from public ORCID and arXiv records."""

import html
import json
import re
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path

ORCID_ID = "0009-0001-8236-884X"
AUTHOR_NAME = "Michiel De Wilde"
ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "assets" / "publications.js"
MANUAL = ROOT / "scripts" / "manual-publications.json"
USER_AGENT = "MichielDeWildeWebsite/1.0 (michiel.dewilde@ist.ac.at)"


def fetch(url, accept):
    request = urllib.request.Request(
        url, headers={"Accept": accept, "User-Agent": USER_AGENT}
    )
    with urllib.request.urlopen(request, timeout=30) as response:
        return response.read()


def clean(value):
    return html.unescape(re.sub(r"\s+", " ", value or "").strip())


def normalized_title(value):
    return re.sub(r"\W", "", clean(value)).casefold()


def author_matches_michiel(author):
    normalized = re.sub(r"[^a-z]", "", author.casefold())
    return normalized in {"michieldewilde", "mdewilde"}


def format_crossref_author(author):
    given = clean(author.get("given"))
    family = clean(author.get("family"))
    literal = clean(author.get("name"))
    return clean(" ".join(part for part in [given, family] if part)) or literal


def from_crossref(doi):
    if not doi:
        return {}
    try:
        url = "https://api.crossref.org/works/" + urllib.parse.quote(doi)
        data = json.loads(fetch(url, "application/json"))
        message = data.get("message") or {}
    except Exception:
        return {}
    authors = [
        format_crossref_author(author)
        for author in message.get("author") or []
    ]
    authors = [author for author in authors if author]
    result = {}
    if authors:
        result["authors"] = ", ".join(authors)
    container = message.get("container-title") or []
    if container and clean(container[0]):
        result["venue"] = clean(container[0])
    return result


def arxiv_id_from_url_or_value(value):
    value = clean(value)
    if not value:
        return ""
    value = value.rsplit("/", 1)[-1]
    return re.sub(r"v\d+$", "", value)


def from_arxiv_id(arxiv_id):
    arxiv_id = arxiv_id_from_url_or_value(arxiv_id)
    if not arxiv_id:
        return {}
    params = urllib.parse.urlencode({"id_list": arxiv_id})
    try:
        root = ET.fromstring(fetch(
            f"https://export.arxiv.org/api/query?{params}", "application/atom+xml"
        ))
    except Exception:
        return {}
    atom = {"a": "http://www.w3.org/2005/Atom"}
    entry = root.find("a:entry", atom)
    if entry is None:
        return {}
    authors = [
        clean(author.findtext("a:name", default="", namespaces=atom))
        for author in entry.findall("a:author", atom)
    ]
    authors = [author for author in authors if author]
    return {
        "title": clean(entry.findtext("a:title", default="", namespaces=atom)),
        "authors": ", ".join(authors),
        "venue": "arXiv",
        "url": clean(entry.findtext("a:id", default="", namespaces=atom)),
        "_ids": {"arxiv": arxiv_id},
    }


def get_ids(work):
    result = {}
    for item in (work.get("external-ids") or {}).get("external-id") or []:
        kind = clean(item.get("external-id-type")).lower()
        value = clean(item.get("external-id-value"))
        if kind and value:
            result[kind] = value
    return result


def from_orcid():
    url = f"https://pub.orcid.org/v3.0/{ORCID_ID}/works"
    data = json.loads(fetch(url, "application/json"))
    publications = []
    for group in data.get("group") or []:
        summaries = group.get("work-summary") or []
        if not summaries:
            continue
        work = summaries[0]
        title = clean(((work.get("title") or {}).get("title") or {}).get("value"))
        if not title:
            continue
        ids = get_ids(work)
        date = work.get("publication-date") or {}
        year = clean((date.get("year") or {}).get("value")) or "Forthcoming"
        url_value = clean((work.get("url") or {}).get("value"))
        if not url_value and ids.get("doi"):
            url_value = f"https://doi.org/{ids['doi']}"
        if not url_value and ids.get("arxiv"):
            url_value = f"https://arxiv.org/abs/{ids['arxiv']}"
        arxiv_id = ids.get("arxiv") or (
            arxiv_id_from_url_or_value(url_value) if "arxiv.org/abs/" in url_value else ""
        )
        if arxiv_id:
            ids["arxiv"] = arxiv_id
        publication = {
            "type": "preprint" if "preprint" in clean(work.get("type")).lower() else "paper",
            "year": year,
            "title": title,
            "authors": AUTHOR_NAME,
            "venue": clean((work.get("journal-title") or {}).get("value"))
            or ("arXiv" if ids.get("arxiv") else "ORCID"),
            "url": url_value or f"https://orcid.org/{ORCID_ID}",
            "_ids": ids,
        }
        enrichment = from_crossref(ids.get("doi")) if ids.get("doi") else from_arxiv_id(arxiv_id)
        for key, value in enrichment.items():
            if value and key != "_ids":
                publication[key] = value
        publications.append(publication)
    return publications


def from_arxiv():
    params = urllib.parse.urlencode({
        "search_query": 'au:"De Wilde, M"',
        "start": 0,
        "max_results": 100,
        "sortBy": "submittedDate",
        "sortOrder": "descending",
    })
    root = ET.fromstring(fetch(
        f"https://export.arxiv.org/api/query?{params}", "application/atom+xml"
    ))
    atom = {"a": "http://www.w3.org/2005/Atom"}
    publications = []
    for entry in root.findall("a:entry", atom):
        authors = [
            clean(author.findtext("a:name", default="", namespaces=atom))
            for author in entry.findall("a:author", atom)
        ]
        # The author search is broad; accept full names and common initials.
        if not any(author_matches_michiel(author) for author in authors):
            continue
        entry_url = clean(entry.findtext("a:id", default="", namespaces=atom))
        arxiv_id = re.sub(r"v\d+$", "", entry_url.rsplit("/", 1)[-1])
        published = clean(entry.findtext("a:published", default="", namespaces=atom))
        publications.append({
            "type": "preprint",
            "year": published[:4] or "Forthcoming",
            "title": clean(entry.findtext("a:title", default="", namespaces=atom)),
            "authors": ", ".join(authors),
            "venue": "arXiv",
            "url": entry_url,
            "_ids": {"arxiv": arxiv_id},
        })
    return publications


def publication_key(publication):
    ids = publication.get("_ids", {})
    if ids.get("doi"):
        return "doi:" + ids["doi"].lower()
    if ids.get("arxiv"):
        return "arxiv:" + ids["arxiv"].lower()
    return "title:" + re.sub(r"\W", "", publication["title"]).casefold()


def merge_publication(existing, incoming):
    published_existing = existing.get("type") != "preprint" and existing.get("venue") not in {"arXiv", "ORCID"}
    published_incoming = incoming.get("type") != "preprint" and incoming.get("venue") not in {"arXiv", "ORCID"}
    if published_existing or not published_incoming:
        base_source, supplement = existing, incoming
    else:
        base_source, supplement = incoming, existing
    base = dict(base_source)
    for key in ["year", "title", "venue", "url", "type"]:
        if not base.get(key) and supplement.get(key):
            base[key] = supplement[key]
    if len(incoming.get("authors", "")) > len(existing.get("authors", "")):
        base["authors"] = incoming["authors"]
    else:
        base["authors"] = existing.get("authors", incoming.get("authors", ""))
    ids = dict(existing.get("_ids", {}))
    ids.update(incoming.get("_ids", {}))
    if ids:
        base["_ids"] = ids
    return base


def main():
    manual = json.loads(MANUAL.read_text(encoding="utf-8"))
    merged = {}
    title_index = {}
    # arXiv comes last because it often includes complete author lists.
    for publication in [*manual, *from_orcid(), *from_arxiv()]:
        key = publication_key(publication)
        title_key = normalized_title(publication.get("title", ""))
        existing_key = title_index.get(title_key)
        if existing_key:
            merged[existing_key] = merge_publication(merged[existing_key], publication)
            continue
        merged[key] = publication
        if title_key:
            title_index[title_key] = key
    publications = sorted(
        merged.values(),
        key=lambda item: (item.get("year", ""), item.get("title", "")),
        reverse=True,
    )
    for publication in publications:
        publication.pop("_ids", None)
    payload = json.dumps(publications, ensure_ascii=False, indent=2)
    OUTPUT.write_text(
        "// Generated by scripts/sync_publications.py — do not edit manually.\n"
        f"window.PUBLICATIONS = {payload};\n",
        encoding="utf-8",
    )
    print(f"Wrote {len(publications)} publication(s)")


if __name__ == "__main__":
    main()
