# AI Research System Architecture

## Overview

The AI research system provides a streamlined interface for fetching and displaying concert research data through a multi-phase streaming process.

## Desired Flow

Upon starting the `useAiResearch` flow (`handleAIResearch`), we trigger a process on the server that includes three steps:

1. **Quick Summary** - A brief overview of the event
2. **Artists List** - Extraction of artist names from the event
3. **Parallel Lookups** - Concurrent field lookups for each artist (YouTube, genres, bio, website, music, etc.)

Each of these results can be streamed back to the client. Progress bars are needed for the individual fields on the artists.

## Public API

`useAiResearch` has a limited public API and doesn't expose its inner workings. It exposes:

### State
- `data.quickSummary` (string) - The quick summary text
- `data.artists` (array) - A sorted array of Artist objects
- `researchPhase` (string) - Current phase in the pipeline (e.g., 'idle', 'quick_loading', 'quick_done', 'extracting_artists', 'researching_fields', 'complete', 'error')
- `aiError` (string | null) - Error message if something went wrong

### Artist Object Structure
Each Artist object in the `data.artists` array contains:
- `name` (string) - Artist name
- `fields` (object) - Object containing field data with keys:
  - `youtube` - YouTube link data
  - `bio_genres` - Bio and genres data (contains `bio` string and `genres` array)
  - `website` - Website/social link data
  - `music` - Music platform link data

### Actions
- `handleAIResearch(forceRefetch?: boolean)` - Start the research process
- `handleArtistsResearch()` - Manually trigger artists research (if needed)
- `clearCache()` - Clear cached research data

## Internal Architecture

- `useAiResearch` internally uses hooks for individual phase processors:
  - `useQuickStage` - Handles quick summary phase (streaming SSE events)
  - `useArtistsResearch` - Handles artists research phase (artist list extraction + parallel field lookups)
  - `useArtistProgress` - Manages progress timers for individual artist fields
- Each phase processor handles its state internally and doesn't leak implementation details into `useAiResearch`
- Phase processors communicate with `useAiResearch` through callback functions:
  - `setQuickSummary` - Updates the quick summary text
  - `setArtistOrder` - Sets the ordered list of artist names
  - `setArtists` - Updates artist entries with field data
  - `setResearchPhase` - Updates the current phase
  - `setAiError` - Sets error messages
- `useAiResearch` handles integrating the results of these phase processors into the unified `data` structure
- Internal state structure: `{ quickSummary: string, artists: { order: string[], entries: Record<string, ArtistEntry> } }`
- Public API transforms this to: `{ quickSummary: string, artists: Array<{ name: string, fields: object }> }`

## Design Principles

1. **Encapsulation**: Phase processors manage their own state
2. **Clean API**: `useAiResearch` exposes only what consumers need
3. **Integration**: `useAiResearch` coordinates phase processors and integrates their results
4. **Progress Tracking**: Individual field progress is tracked for UI feedback
