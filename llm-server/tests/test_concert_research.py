#!/usr/bin/env python3
"""
Test suite for concert research system.
Tests the handlers for quick, artists_list, and artists_fields modes.
All tests are for manual verification only.

Usage:
  python test_concert_research.py                    # Show help
  python test_concert_research.py --list             # List available tests
  python test_concert_research.py bobby-young        # Run specific test
  python test_concert_research.py --all              # Run all tests
"""
import asyncio
import os
import sys
import argparse
import json
from pathlib import Path
from typing import Dict, List, Any
from dotenv import load_dotenv

# Add parent directory to path so we can import from tasks
sys.path.insert(0, str(Path(__file__).parent.parent))

from tasks.quick_handler import quick_research_handler
from tasks.artists_list_handler import artists_list_handler
from tasks.artists_fields_handler import artists_fields_handler

load_dotenv()

# Test case registry
TEST_CASES = {}

def register_test(test_id, description):
    """Decorator to register test cases"""
    def decorator(func):
        TEST_CASES[test_id] = {
            "func": func,
            "description": description
        }
        return func
    return decorator


# Helper functions

def print_event_header(event_data: Dict[str, str], test_name: str):
    """Print event information header."""
    print("\n" + "=" * 70)
    print(f"TEST: {test_name}")
    print("=" * 70)
    print(f"\nEvent: {event_data['title']}")
    print(f"Venue: {event_data['venue']}")
    print(f"Date: {event_data['date']}")
    print(f"URL: {event_data.get('url', '') or '(none)'}")
    print("\n" + "=" * 70)


async def run_quick_phase(event_data: Dict[str, str]) -> str:
    """Run quick summary phase and return the full text."""
    print("\n" + "=" * 70)
    print("PHASE 1: QUICK SUMMARY")
    print("=" * 70)
    
    quick_text = ""
    async for event in quick_research_handler(event_data):
        if event["event"] == "data":
            quick_text += event["data"]
            print(event["data"], end="", flush=True)
        elif event["event"] == "error":
            print(f"\n❌ Error: {event['data']}")
    
    print("\n" + "=" * 70)
    return quick_text


async def run_artists_list_phase(event_data: Dict[str, str]) -> List[str]:
    """Run artists list extraction phase and return the list."""
    print("\n" + "=" * 70)
    print("PHASE 2: EXTRACTING ARTISTS")
    print("=" * 70)
    
    artists_list = []
    async for event in artists_list_handler(event_data):
        if event["event"] == "data":
            artists_list = json.loads(event["data"])
            print(f"Found {len(artists_list)} artist(s):")
            for artist in artists_list:
                print(f"  • {artist}")
        elif event["event"] == "error":
            print(f"\n❌ Error: {event['data']}")
    
    print("=" * 70)
    return artists_list


async def run_artists_fields_phase(event_data: Dict[str, str], artists_list: List[str]) -> Dict[str, Dict[str, Any]]:
    """Run artists fields research phase and return collected data."""
    if not artists_list:
        print("\n⚠️  No artists found, skipping field research")
        return {}
    
    print("\n" + "=" * 70)
    print(f"PHASE 3: RESEARCHING FIELDS FOR {len(artists_list)} ARTIST(S)")
    print("=" * 70)
    
    artist_data = {}
    async for event in artists_fields_handler(event_data, artists_list):
        if event["event"] == "data":
            data = json.loads(event["data"])
            if data.get("type") == "artist_datapoint":
                artist = data.get("artist")
                field = data.get("field")
                value = data.get("value")
                if artist not in artist_data:
                    artist_data[artist] = {}
                artist_data[artist][field] = value
                print(f"  ✓ {artist} - {field}")
        elif event["event"] == "error":
            print(f"\n❌ Error: {event['data']}")
    
    print("=" * 70)
    return artist_data


def print_artist_fields_results(artist_data: Dict[str, Dict[str, Any]]):
    """Print formatted artist field research results."""
    print("\n" + "=" * 70)
    print("FINAL RESULTS - ARTIST FIELD RESEARCH")
    print("=" * 70)
    
    for artist, fields in artist_data.items():
        print(f"\n### {artist}")
        for field, value in fields.items():
            if isinstance(value, dict):
                if "markdown" in value:
                    print(f"  {field}: {value['markdown']}")
                elif "error" in value:
                    print(f"  {field}: ERROR - {value['error']}")
                else:
                    print(f"  {field}: {json.dumps(value, indent=4)}")
            else:
                print(f"  {field}: {value}")
    
    print("\n" + "=" * 70)
    print("✓ TEST COMPLETE - MANUAL VERIFICATION REQUIRED")
    print("=" * 70)


async def run_full_research_flow(event_data: Dict[str, str], test_name: str):
    """Run the complete research flow: quick → artists_list → artists_fields."""
    print_event_header(event_data, test_name)
    
    # Phase 1: Quick summary
    quick_text = await run_quick_phase(event_data)
    
    # Phase 2: Extract artists
    artists_list = await run_artists_list_phase(event_data)
    
    # Phase 3: Research fields
    artist_data = await run_artists_fields_phase(event_data, artists_list)
    
    # Print results
    print_artist_fields_results(artist_data)
    
    return {
        "quick_text": quick_text,
        "artists_list": artists_list,
        "artist_data": artist_data
    }


# Test cases

@register_test("bobby-young", "BLUE MONDAYS - Bobby Young (title only)")
async def test_bobby_young_title_only():
    """Test research for 'BLUE MONDAYS - Bobby Young' with minimal event data."""
    event_data = {
        "date": "2025-12-15",
        "venue": "Unknown",
        "title": "BLUE MONDAYS - Bobby Young",
        "url": "",
        "no_cache": True
    }
    await run_full_research_flow(event_data, "BLUE MONDAYS - Bobby Young (title only)")


@register_test("eli-mile-high", "Eli's Mile High Club - Bobby Young")
async def test_eli_mile_high_bobby_young():
    """Test research for Eli's Mile High Club BLUE MONDAYS - Bobby Young."""
    event_data = {
        "date": "2025-12-15",
        "venue": "Eli's Mile High Club",
        "title": "BLUE MONDAYS - Bobby Young",
        "url": "",
        "no_cache": True
    }
    await run_full_research_flow(event_data, "Eli's Mile High Club - Bobby Young")


@register_test("kat-edmonson", "Kat Edmonson - Artist extraction from descriptive title")
async def test_kat_edmonson():
    """Test artist extraction with descriptive title prefix."""
    event_data = {
        "date": "2025-12-10",
        "venue": "Yoshis",
        "title": "A foothold in jazz, cabaret and vintage cosmopolitanism popA KAT EDMONSON CHRISTMAS",
        "url": "https://www.yoshis.com/event/kat-edmonson-christmas-2025",
        "no_cache": True
    }
    await run_full_research_flow(event_data, "Kat Edmonson - Descriptive Title")


@register_test("peacock-lounge", "Peacock Lounge multi-artist - Link finding test")
async def test_peacock_lounge():
    """Test with multiple artists including Jean Carla Rodea who has a personal website."""
    event_data = {
        "date": "2025-12-11",
        "venue": "PEACOCK LOUNGE, S.F. (via The List)",
        "title": "Sterile Garden, Jean Carla Rodea, Human Deselection And Realization Nature Group, Sissisters",
        "url": "https://www.thelistsf.com/",
        "no_cache": True
    }
    await run_full_research_flow(event_data, "Peacock Lounge - Multi-Artist")


@register_test("gray-area", "Gray Area Cultural Incubator Showcase 2025")
async def test_gray_area():
    """Test research for Gray Area Cultural Incubator Showcase 2025."""
    event_data = {
        "date": "2025-12-10",
        "venue": "Grey Area",
        "title": "Gray Area Cultural Incubator Showcase 2025",
        "url": "https://grayarea.org/event/cultural-incubator-showcase-2025/",
        "no_cache": True
    }
    await run_full_research_flow(event_data, "Gray Area Cultural Incubator Showcase")


@register_test("no-url", "Missing URL handling")
async def test_missing_url_handling():
    """Test that the handler works even when URL is empty."""
    event_data = {
        "date": "2025-12-10",
        "venue": "Grey Area",
        "title": "Gray Area Cultural Incubator Showcase 2025",
        "url": "",
        "no_cache": True
    }
    await run_full_research_flow(event_data, "Missing URL Handling")


def list_tests():
    """Display available test cases"""
    print("\n" + "=" * 70)
    print("AVAILABLE TEST CASES")
    print("=" * 70)
    for test_id, test_info in TEST_CASES.items():
        print(f"\n  {test_id:15} - {test_info['description']}")
    print("\n" + "=" * 70)
    print("\nUsage:")
    print("  python test_concert_research.py <test-id>      Run specific test")
    print("  python test_concert_research.py --all          Run all tests")
    print("  python test_concert_research.py --list         List all tests")
    print()


async def run_test(test_id):
    """Run a single test case by ID"""
    if test_id not in TEST_CASES:
        print(f"❌ Unknown test case: {test_id}")
        print(f"Available tests: {', '.join(TEST_CASES.keys())}")
        sys.exit(1)

    test_func = TEST_CASES[test_id]["func"]
    await test_func()


async def run_all_tests():
    """Run all registered test cases"""
    print("\n🧪 Running Concert Research Test Suite\n")

    for test_id, test_info in TEST_CASES.items():
        print(f"\n{'=' * 70}")
        print(f"Running: {test_id}")
        print('=' * 70)
        try:
            await test_info["func"]()
        except Exception as e:
            print(f"\n❌ Test {test_id} failed with error: {e}")
            import traceback
            traceback.print_exc()

    print("\n✅ All tests completed!\n")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Concert research test suite (manual verification only)",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s bobby-young        Run Bobby Young test
  %(prog)s --all              Run all tests
  %(prog)s --list             List available tests
        """
    )
    parser.add_argument(
        "tests",
        nargs="*",
        help="Test IDs to run"
    )
    parser.add_argument(
        "--list", "-l",
        action="store_true",
        help="List available test cases"
    )
    parser.add_argument(
        "--all", "-a",
        action="store_true",
        help="Run all test cases"
    )

    args = parser.parse_args()

    if args.list:
        list_tests()
        sys.exit(0)

    if args.tests:
        # Run specific tests
        print(f"\n🧪 Running {len(args.tests)} test(s): {', '.join(args.tests)}\n")
        for test_id in args.tests:
            asyncio.run(run_test(test_id))
        print("\n✅ All specified tests completed!\n")
    elif args.all:
        # Run all tests with explicit --all flag
        asyncio.run(run_all_tests())
    else:
        # No arguments - show help
        print("\n" + "=" * 70)
        print("CONCERT RESEARCH TEST SUITE")
        print("=" * 70)
        print("\nAvailable test cases:")
        for test_id, test_info in TEST_CASES.items():
            print(f"  • {test_id:15} - {test_info['description']}")
        print("\n" + "=" * 70)
        print("\nUsage:")
        print("  python test_concert_research.py <test-id>      Run specific test")
        print("  python test_concert_research.py --all          Run all tests")
        print("  python test_concert_research.py --list         List all tests")
        print("  python test_concert_research.py --help         Show help")
        print("\nExamples:")
        print("  python test_concert_research.py bobby-young")
        print("  python test_concert_research.py --all")
        print("\n" + "=" * 70 + "\n")
