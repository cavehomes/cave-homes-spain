#!/usr/bin/env python3
"""Build or apply the Spanish Inland Properties partner listing import."""

import argparse
import concurrent.futures
import html as html_lib
import json
import re
import sys
import urllib.request
import xml.etree.ElementTree as ET
from decimal import Decimal
from pathlib import Path

from lxml import html

FEED_URL = (
    "https://www.spanish-inland-properties.com/external/director.php"
    "?call=syndication&feed=atom&content=property&forsale=recent"
)
SUPABASE_URL = "https://lesgzlhvrlxgtfuocadq.supabase.co"
SUPABASE_KEY = "sb_publishable_pPS6fORJPGFcGBIUPcxOxQ_1g4vazyg"
SOURCE_NAME = "Spanish Inland Properties"
ATOM = {"a": "http://www.w3.org/2005/Atom"}


def fetch(url):
    request = urllib.request.Request(url, headers={"User-Agent": "CaveHomesSpainPartnerImport/1.0"})
    with urllib.request.urlopen(request, timeout=35) as response:
        return response.read()


def clean(value):
    return re.sub(r"\s+", " ", html_lib.unescape(value or "")).strip()


def number(value):
    match = re.search(r"([\d,.]+)", value or "")
    if not match:
        return None
    return int(Decimal(match.group(1).replace(",", "")))


def mapped_type(source_type):
    return {
        "Cave House": "Cave Home",
        "Apartment": "Apartment",
        "Land": "Land",
        "Finca": "Finca",
        "Farm Property": "Finca",
        "Country Estate": "Cortijo",
        "Rural Property": "Cortijo",
        "Town House": "House",
        "Village Property": "House",
        "Villa": "House",
        "Log Home": "House",
        "Ruin": "House",
        "Commercial": "House",
    }.get(source_type, "House")


def parse_feed():
    root = ET.fromstring(fetch(FEED_URL))
    items = []
    for entry in root.findall("a:entry", ATOM):
        title = clean(entry.findtext("a:title", default="", namespaces=ATOM))
        url = entry.find("a:link", ATOM).attrib["href"]
        description = clean(entry.findtext("a:content", default="", namespaces=ATOM))
        ref_match = re.search(r"Reference:\s*([A-Za-z0-9-]+)", title)
        place_match = re.search(r",\s*([^,]+)\s*-\s*Reference:", title)
        type_match = re.search(r"For Sale\s*,\s*(.*?)\s+in Spain", title)
        province_match = re.search(r"Andalucia,\s*([^,]+),", title)
        if not ref_match:
            continue
        items.append({
            "source_url": url,
            "source_ref": ref_match.group(1),
            "town": clean(place_match.group(1)) if place_match else "Andalucía",
            "province": clean(province_match.group(1)) if province_match else "Granada",
            "source_type": clean(type_match.group(1)) if type_match else "Property",
            "description": description,
        })
    return items


def parse_detail(item):
    document = html.fromstring(fetch(item["source_url"]))
    body_text = clean(document.text_content())
    heading = clean(" ".join(document.xpath('//div[contains(@class,"property-detail")]//h2[@itemprop="name"]//text()')))
    heading_match = re.match(r"(.+?)\s+in\s+(.+?),\s*Spain,", heading)
    source_type = clean(heading_match.group(1)) if heading_match else item["source_type"]
    town = clean(heading_match.group(2)) if heading_match else item["town"]
    price_match = re.search(r"Price\s*:\s*€\s*([\d,]+)", body_text)
    detail_ref = re.search(r"Reference\s*:\s*([A-Za-z0-9-]+)", body_text)
    images = []
    for style in document.xpath('//ul[@id="lightSlider"]//div/@style'):
        match = re.search(r"url\(['\"]?([^'\")]+)", style)
        if match and match.group(1) not in images:
            images.append(match.group(1))
    specs = {}
    for row in document.xpath('//div[contains(@class,"property-detail")]//table//tr'):
        cells = [clean(" ".join(cell.xpath(".//text()"))) for cell in row.xpath("./td")]
        for index in range(0, len(cells) - 1, 2):
            specs[cells[index].lower()] = cells[index + 1]
    bedrooms = number(specs.get("number of bedrooms"))
    bathrooms = number(specs.get("number of bathrooms"))
    if bedrooms is None:
        bedrooms_match = re.search(r"(\d+)\s+Bedrooms?", heading, re.I)
        bedrooms = int(bedrooms_match.group(1)) if bedrooms_match else 0
    price = int(price_match.group(1).replace(",", "")) if price_match else 0
    source_ref = detail_ref.group(1) if detail_ref else item["source_ref"]
    detail_paragraphs = []
    for paragraph in document.xpath('//div[contains(@class,"property-detail")]//div[contains(@class,"clearfix")]/p'):
        lines = [clean(text) for text in paragraph.xpath(".//text()") if clean(text)]
        text = "\n".join(lines)
        if len(text) > 100:
            detail_paragraphs.append(text)
    description = max(detail_paragraphs, key=len, default=item["description"])
    title = f'{source_type} in {town} — {source_ref}'
    attribution = (
        f"\n\nListed by {SOURCE_NAME}. Partner reference: {source_ref}. "
        "Please enquire through Cave Homes Spain so your enquiry can be correctly introduced to the selling agent."
    )
    return {
        "title": title,
        "description": description + attribution,
        "town": town,
        "province": item["province"],
        "region": "Andalusia",
        "price": price,
        "bedrooms": bedrooms or 0,
        "bathrooms": bathrooms or 0,
        "floor_area_m2": number(specs.get("build size")),
        "plot_area_m2": number(specs.get("plot size")),
        "property_type": mapped_type(source_type),
        "condition": "See description",
        "featured": False,
        "status": "pending",
        "main_image_url": images[0] if images else None,
        "published": True,
        "image_urls": images[:10],
        "energy_status": "pending",
        "energy_rating": None,
        "energy_certificate_reference": None,
        "energy_exemption_reason": None,
        "energy_declaration_confirmed": False,
    }


def existing_titles():
    url = SUPABASE_URL + "/rest/v1/properties?select=title&limit=2000"
    request = urllib.request.Request(url, headers={"apikey": SUPABASE_KEY})
    with urllib.request.urlopen(request, timeout=30) as response:
        return {row["title"] for row in json.load(response)}


def apply_rows(rows):
    payload = json.dumps(rows, ensure_ascii=False).encode("utf-8")
    request = urllib.request.Request(
        SUPABASE_URL + "/rest/v1/properties",
        data=payload,
        method="POST",
        headers={
            "apikey": SUPABASE_KEY,
            "Authorization": "Bearer " + SUPABASE_KEY,
            "Content-Type": "application/json",
            "Prefer": "return=representation",
        },
    )
    with urllib.request.urlopen(request, timeout=120) as response:
        return json.load(response)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true")
    parser.add_argument("--output", default="sip-import-preview.json")
    args = parser.parse_args()
    feed_items = parse_feed()
    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool:
        rows = list(pool.map(parse_detail, feed_items))
    rows.sort(key=lambda row: row["title"])
    known = existing_titles()
    new_rows = [row for row in rows if row["title"] not in known]
    Path(args.output).write_text(json.dumps(new_rows, ensure_ascii=False, indent=2), encoding="utf-8")
    summary = {
        "active_feed_listings": len(feed_items),
        "parsed": len(rows),
        "already_present": len(rows) - len(new_rows),
        "ready_to_import": len(new_rows),
        "missing_price": sum(not row["price"] for row in new_rows),
        "missing_image": sum(not row["main_image_url"] for row in new_rows),
    }
    if args.apply and new_rows:
        inserted = apply_rows(new_rows)
        summary["inserted"] = len(inserted)
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(f"Import failed: {error}", file=sys.stderr)
        raise
