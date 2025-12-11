#!/usr/bin/env python3
"""
Test suite for concert research two-pass streaming system.
Tests the full handler used by the API, including draft → proofreading → final phases.

Usage:
  python test_concert_research.py                    # Run all tests
  python test_concert_research.py --list             # List available tests
  python test_concert_research.py gray-area          # Run specific test
  python test_concert_research.py gray-area no-url   # Run multiple tests
"""
import asyncio
import os
import sys
import argparse
from dotenv import load_dotenv
from tasks.concert_research import concert_research_handler

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

@register_test("gray-area", "Gray Area Cultural Incubator Showcase 2025 (full two-pass validation)")
async def test_concert_research_two_pass():
    """
    Test concert research with Gray Area Cultural Incubator Showcase 2025.
    Verifies the two-pass streaming system (draft → proofreading → final).
    This test uses the SAME handler function that the API endpoint uses.
    """
    # Event data for Gray Area Cultural Incubator Showcase
    event_data = {
        "date": "2025-12-10",
        "venue": "Grey Area",
        "title": "Gray Area Cultural Incubator Showcase 2025",
        "url": "https://grayarea.org/event/cultural-incubator-showcase-2025/"
    }

    print("=" * 70)
    print("TESTING TWO-PASS CONCERT RESEARCH SYSTEM")
    print("=" * 70)
    print(f"\nEvent: {event_data['title']}")
    print(f"Venue: {event_data['venue']}")
    print(f"Date: {event_data['date']}")
    print(f"URL: {event_data['url']}")
    print("\n" + "=" * 70)

    # Collect all events from the stream (same as API would receive)
    events = []
    draft_chunks = []

    print("\nPhase 1: Collecting draft chunks...")
    async for event in concert_research_handler(event_data):
        events.append(event)
        event_type = event["event"]

        if event_type == "draft":
            draft_chunks.append(event["data"])
            print(f"  ✓ Draft chunk {len(draft_chunks)} ({len(event['data'])} chars)")
        elif event_type == "status":
            print(f"\n✓ Status: {event['data']}")
        elif event_type == "final":
            print(f"\nPhase 2: Final markdown received ({len(event['data'])} chars)")
        elif event_type == "error":
            print(f"\n❌ Error: {event['data']}")

    print("\n" + "=" * 70)
    print("VALIDATION CHECKS")
    print("=" * 70)

    # Verify we got events
    assert len(events) > 0, "❌ Should receive at least one event"
    print(f"✓ Received {len(events)} total events")

    # Extract event types
    event_types = [e["event"] for e in events]

    # Verify two-pass system structure:
    # 1. Should have "draft" events (streamed chunks)
    assert "draft" in event_types, "❌ Should have draft events from phase 1"
    print(f"✓ Draft phase: {len(draft_chunks)} chunks")

    # 2. Should have "proofreading" status event
    assert "status" in event_types, "❌ Should have status event"
    proofreading_events = [e for e in events if e["event"] == "status" and e["data"] == "proofreading"]
    assert len(proofreading_events) == 1, "❌ Should have exactly one 'proofreading' status event"
    print("✓ Proofreading status event present")

    # 3. Should have "final" event (edited result)
    assert "final" in event_types, "❌ Should have final event from phase 2"
    final_events = [e for e in events if e["event"] == "final"]
    assert len(final_events) == 1, "❌ Should have exactly one final event"
    print("✓ Final event present")

    # Verify event ordering: draft events come before proofreading, final comes last
    proofreading_index = next(i for i, e in enumerate(events) if e["event"] == "status" and e["data"] == "proofreading")
    final_index = next(i for i, e in enumerate(events) if e["event"] == "final")
    first_draft_index = next(i for i, e in enumerate(events) if e["event"] == "draft")

    assert first_draft_index < proofreading_index, "❌ Draft events should come before proofreading status"
    assert proofreading_index < final_index, "❌ Proofreading status should come before final event"
    print("✓ Event ordering correct (draft → proofreading → final)")

    # Verify final markdown content is non-empty
    final_markdown = final_events[0]["data"]
    assert len(final_markdown) > 0, "❌ Final markdown should not be empty"
    print(f"✓ Final markdown length: {len(final_markdown)} chars")

    # Verify final markdown has expected sections
    assert "overview" in final_markdown.lower(), "❌ Final markdown should have Overview section"
    assert "artists" in final_markdown.lower() or "artist" in final_markdown.lower(), "❌ Final markdown should have Artists section"
    print("✓ Final markdown has expected sections (Overview, Artists)")

    # Verify draft content was generated
    assert len(draft_chunks) > 0, "❌ Should have at least one draft chunk"
    draft_text = ''.join(draft_chunks)
    assert len(draft_text) > 0, "❌ Draft text should not be empty"
    print(f"✓ Draft text length: {len(draft_text)} chars")

    # No error events
    error_events = [e for e in events if e["event"] == "error"]
    assert len(error_events) == 0, f"❌ Should not have error events, but got: {error_events}"
    print("✓ No error events")

    print("\n" + "=" * 70)
    print("PHASE 1 OUTPUT (DRAFT) - FULL")
    print("=" * 70)
    print(draft_text)
    print("=" * 70)

    print("\n" + "=" * 70)
    print("PHASE 2 OUTPUT (FINAL - AFTER PROOFREADING) - FULL")
    print("=" * 70)
    print(final_markdown)
    print("=" * 70)

    # Save both outputs
    draft_file = "test_output_gray_area_draft.md"
    final_file = "test_output_gray_area_final.md"

    with open(draft_file, 'w') as f:
        f.write(draft_text)
    with open(final_file, 'w') as f:
        f.write(final_markdown)

    print(f"✓ Draft saved to {draft_file}")
    print(f"✓ Final saved to {final_file}")

    print("\n" + "=" * 70)
    print("✓ ALL TESTS PASSED")
    print("=" * 70)

@register_test("no-url", "Missing URL handling (verify graceful degradation)")
async def test_missing_url_handling():
    """Test that the handler works even when URL is empty"""
    print("\n\n" + "=" * 70)
    print("TESTING MISSING URL HANDLING")
    print("=" * 70)

    event_data = {
        "date": "2025-12-10",
        "venue": "Grey Area",
        "title": "Gray Area Cultural Incubator Showcase 2025",
        "url": ""
    }

    events = []
    async for event in concert_research_handler(event_data):
        events.append(event)

    # Should still complete successfully
    assert any(e["event"] == "final" for e in events), "❌ Should complete with final event even without URL"
    print("✓ Handler completes successfully without URL")

    # Should not have error events
    error_events = [e for e in events if e["event"] == "error"]
    assert len(error_events) == 0, "❌ Should not have errors when URL is missing"
    print("✓ No errors with missing URL")

    print("=" * 70)

@register_test("kat-edmonson", "Kat Edmonson - Artist extraction from descriptive title")
async def test_kat_edmonson():
    """
    Test artist extraction with descriptive title prefix.
    Title has description before artist name: "A foothold in jazz... A KAT EDMONSON CHRISTMAS"
    Should extract "Kat Edmonson" as the artist and get her details.
    """
    print("\n\n" + "=" * 70)
    print("TESTING KAT EDMONSON - DESCRIPTIVE TITLE")
    print("=" * 70)

    event_data = {
        "date": "2025-12-10",
        "venue": "Yoshis",
        "title": "A foothold in jazz, cabaret and vintage cosmopolitanism popA KAT EDMONSON CHRISTMAS",
        "url": "https://www.yoshis.com/event/kat-edmonson-christmas-2025"
    }

    print(f"\nEvent: {event_data['title']}")
    print(f"Venue: {event_data['venue']}")
    print(f"Date: {event_data['date']}")
    print(f"URL: {event_data['url']}")
    print("\n" + "=" * 70)

    # Test detailed mode (two-phase artist extraction)
    events = []
    print("\nPhase 1: Extracting artists...")
    async for event in concert_research_handler(event_data, mode="detailed"):
        events.append(event)
        event_type = event["event"]

        if event_type == "status":
            if event["data"] == "extracting_artists":
                print("  ✓ Status: Extracting artist list")
            elif event["data"] == "researching_artists":
                print("  ✓ Status: Researching artist details")
        elif event_type == "final":
            print(f"\nPhase 2: Final result received ({len(event['data'])} chars)")
        elif event_type == "error":
            print(f"\n❌ Error: {event['data']}")

    print("\n" + "=" * 70)
    print("VALIDATION CHECKS")
    print("=" * 70)

    # Verify we got events
    assert len(events) > 0, "❌ Should receive at least one event"
    print(f"✓ Received {len(events)} total events")

    # Extract event types
    event_types = [e["event"] for e in events]

    # Should have status events
    assert "status" in event_types, "❌ Should have status events"
    extracting_events = [e for e in events if e["event"] == "status" and e["data"] == "extracting_artists"]
    researching_events = [e for e in events if e["event"] == "status" and e["data"] == "researching_artists"]
    assert len(extracting_events) >= 1, "❌ Should have 'extracting_artists' status"
    assert len(researching_events) >= 1, "❌ Should have 'researching_artists' status"
    print("✓ Both phase status events present")

    # Should have final event
    assert "final" in event_types, "❌ Should have final event"
    final_events = [e for e in events if e["event"] == "final"]
    assert len(final_events) == 1, "❌ Should have exactly one final event"
    print("✓ Final event present")

    # Verify final content
    final_content = final_events[0]["data"]
    assert len(final_content) > 0, "❌ Final content should not be empty"
    print(f"✓ Final content length: {len(final_content)} chars")

    # Check if Kat Edmonson was found
    assert "kat edmonson" in final_content.lower() or "edmonson" in final_content.lower(), \
        "❌ Final content should mention Kat Edmonson"
    print("✓ Artist name 'Kat Edmonson' found in results")

    # Check for expected fields (at least one should be present)
    has_links = "links" in final_content.lower()
    has_genres = "genres" in final_content.lower() or "genre" in final_content.lower()
    has_bio = "bio" in final_content.lower()

    fields_found = sum([has_links, has_genres, has_bio])
    assert fields_found > 0, "❌ Should have at least one field (Links/Genres/Bio)"
    print(f"✓ Found {fields_found}/3 expected fields (Links/Genres/Bio)")

    # No error events
    error_events = [e for e in events if e["event"] == "error"]
    assert len(error_events) == 0, f"❌ Should not have error events, but got: {error_events}"
    print("✓ No error events")

    print("\n" + "=" * 70)
    print("FINAL OUTPUT")
    print("=" * 70)
    print(final_content)
    print("=" * 70)

    # Save output
    output_file = "test_output_kat_edmonson.md"
    with open(output_file, 'w') as f:
        f.write(final_content)
    print(f"✓ Output saved to {output_file}")

    print("\n" + "=" * 70)
    print("✓ KAT EDMONSON TEST PASSED")
    print("=" * 70)

@register_test("peacock-lounge", "Peacock Lounge multi-artist - Link finding test")
async def test_peacock_lounge():
    """
    Test with multiple artists including Jean Carla Rodea who has a personal website.
    Should find links for artists via web search (especially Jean Carla Rodea's website).
    """
    print("\n\n" + "=" * 70)
    print("TESTING PEACOCK LOUNGE - MULTI-ARTIST LINK FINDING")
    print("=" * 70)

    event_data = {
        "date": "2025-12-11",
        "venue": "PEACOCK LOUNGE, S.F. (via The List)",
        "title": "Sterile Garden, Jean Carla Rodea, Human Deselection And Realization Nature Group, Sissisters",
        "url": "https://www.thelistsf.com/"
    }

    print(f"\nEvent: {event_data['title']}")
    print(f"Venue: {event_data['venue']}")
    print(f"Date: {event_data['date']}")
    print(f"URL: {event_data['url']}")
    print("\n" + "=" * 70)

    # Test detailed mode (two-phase artist extraction)
    events = []
    print("\nPhase 1: Extracting artists...")
    async for event in concert_research_handler(event_data, mode="detailed"):
        events.append(event)
        event_type = event["event"]

        if event_type == "status":
            if event["data"] == "extracting_artists":
                print("  ✓ Status: Extracting artist list")
            elif event["data"] == "researching_artists":
                print("  ✓ Status: Researching artist details")
        elif event_type == "final":
            print(f"\nPhase 2: Final result received ({len(event['data'])} chars)")
        elif event_type == "error":
            print(f"\n❌ Error: {event['data']}")

    print("\n" + "=" * 70)
    print("VALIDATION CHECKS")
    print("=" * 70)

    # Verify we got events
    assert len(events) > 0, "❌ Should receive at least one event"
    print(f"✓ Received {len(events)} total events")

    # Extract event types
    event_types = [e["event"] for e in events]

    # Should have status events
    assert "status" in event_types, "❌ Should have status events"
    extracting_events = [e for e in events if e["event"] == "status" and e["data"] == "extracting_artists"]
    researching_events = [e for e in events if e["event"] == "status" and e["data"] == "researching_artists"]
    assert len(extracting_events) >= 1, "❌ Should have 'extracting_artists' status"
    assert len(researching_events) >= 1, "❌ Should have 'researching_artists' status"
    print("✓ Both phase status events present")

    # Should have final event
    assert "final" in event_types, "❌ Should have final event"
    final_events = [e for e in events if e["event"] == "final"]
    assert len(final_events) == 1, "❌ Should have exactly one final event"
    print("✓ Final event present")

    # Verify final content
    final_content = final_events[0]["data"]
    assert len(final_content) > 0, "❌ Final content should not be empty"
    print(f"✓ Final content length: {len(final_content)} chars")

    # Check for expected artists
    expected_artists = ["sterile garden", "jean carla rodea", "sissisters"]
    found_artists = []
    for artist in expected_artists:
        if artist in final_content.lower():
            found_artists.append(artist)
            print(f"✓ Found artist: {artist}")

    assert len(found_artists) >= 2, f"❌ Should find at least 2 artists, found: {found_artists}"

    # Check specifically for Jean Carla Rodea and links
    if "jean carla rodea" in final_content.lower():
        print("\n" + "=" * 70)
        print("JEAN CARLA RODEA LINK CHECK")
        print("=" * 70)

        # Extract Jean Carla Rodea section
        lines = final_content.split('\n')
        jean_section = []
        in_jean_section = False
        for line in lines:
            if 'jean carla rodea' in line.lower():
                in_jean_section = True
            elif in_jean_section and line.strip().startswith('###'):
                break
            if in_jean_section:
                jean_section.append(line)

        jean_text = '\n'.join(jean_section)
        print("\nJean Carla Rodea section:")
        print(jean_text)

        # Check for Link field (not just YouTube)
        has_additional_link = False
        for line in jean_section:
            if '**Link**' in line or '**link**' in line.lower():
                if 'youtube' not in line.lower():
                    has_additional_link = True
                    print("\n✓ Found additional link for Jean Carla Rodea")
                    break

        if not has_additional_link:
            print("\n⚠️  WARNING: No additional link found for Jean Carla Rodea")
            print("   Expected to find her personal website or social media link")

    # No error events
    error_events = [e for e in events if e["event"] == "error"]
    assert len(error_events) == 0, f"❌ Should not have error events, but got: {error_events}"
    print("\n✓ No error events")

    print("\n" + "=" * 70)
    print("FINAL OUTPUT")
    print("=" * 70)
    print(final_content)
    print("=" * 70)

    # Save output
    output_file = "test_output_peacock_lounge.md"
    with open(output_file, 'w') as f:
        f.write(final_content)
    print(f"✓ Output saved to {output_file}")

    print("\n" + "=" * 70)
    print("✓ PEACOCK LOUNGE TEST PASSED")
    print("=" * 70)

def list_tests():
    """Display available test cases"""
    print("\n" + "=" * 70)
    print("AVAILABLE TEST CASES")
    print("=" * 70)
    for test_id, test_info in TEST_CASES.items():
        print(f"\n  {test_id:15} - {test_info['description']}")
    print("\n" + "=" * 70)
    print("\nUsage:")
    print("  python test_concert_research.py                # Run all tests")
    print("  python test_concert_research.py gray-area      # Run specific test")
    print("  python test_concert_research.py --list         # Show this list")
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

    failed = []
    for test_id, test_info in TEST_CASES.items():
        try:
            await test_info["func"]()
        except AssertionError as e:
            failed.append((test_id, str(e)))
        except Exception as e:
            failed.append((test_id, f"Unexpected error: {e}"))

    if failed:
        print("\n" + "=" * 70)
        print("❌ SOME TESTS FAILED")
        print("=" * 70)
        for test_id, error in failed:
            print(f"\n  {test_id}: {error}")
        print()
        sys.exit(1)
    else:
        print("\n✅ All test suites passed!\n")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Concert research test suite",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s                    Run all tests
  %(prog)s --list             List available tests
  %(prog)s gray-area          Run Gray Area test only
  %(prog)s gray-area no-url   Run multiple specific tests
        """
    )
    parser.add_argument(
        "tests",
        nargs="*",
        help="Test IDs to run (omit to run all)"
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
        print("\n✅ All specified tests passed!\n")
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
        print("  python test_concert_research.py gray-area")
        print("  python test_concert_research.py gray-area no-url")
        print("  python test_concert_research.py --all")
        print("\n" + "=" * 70 + "\n")
