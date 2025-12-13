import { useEffect, useRef, useState } from 'react';
import { API_CONFIG } from '../config';

const QUICK_TIMEOUT_MS = API_CONFIG.QUICK_TIMEOUT_MS || 10000;
const DETAILED_TIMEOUT_MS = API_CONFIG.DETAILED_TIMEOUT_MS || 300000;
const ARTIST_PROGRESS_DURATION_MS = API_CONFIG.ARTIST_PROGRESS_DURATION_MS || 20000;

export default function useAIResearch(event) {
  const [showAIModal, setShowAIModal] = useState(false);
  const [quickSummary, setQuickSummary] = useState('');
  const [aiContent, setAiContent] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);
  const [aiProofreading, setAiProofreading] = useState(false);
  const [aiDrafting, setAiDrafting] = useState(false);
  const [detailedLoading, setDetailedLoading] = useState(false);
  const [artistOrder, setArtistOrder] = useState([]);
  const [artists, setArtists] = useState({});

  const eventSourceRef = useRef(null);
  const detailedEventSourceRef = useRef(null);
  const quickSummaryTimeoutRef = useRef(null);
  const artistProgressTimersRef = useRef({});
  const quickSummaryRef = useRef('');

  const cacheKey = (mode = 'quick') =>
    `aiCache:${mode}:${event.date}:${event.source.commonName}:${event.title}`;

  const clearCache = (key) => {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.warn('AI cache clear failed', e);
    }
  };

  const clearArtistProgress = () => {
    Object.values(artistProgressTimersRef.current).forEach(clearInterval);
    artistProgressTimersRef.current = {};
    setArtists((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((k) => {
        next[k] = { ...next[k], progress: 0 };
      });
      return next;
    });
  };

  const stopArtistProgress = (artist) => {
    const timer = artistProgressTimersRef.current[artist];
    if (timer) {
      clearInterval(timer);
      delete artistProgressTimersRef.current[artist];
    }
  };

  const startArtistProgress = (list) => {
    clearArtistProgress();
    list.forEach((artist) => {
      const start = Date.now();
      const tick = () => {
        const elapsed = Date.now() - start;
        const pct = Math.min(100, Math.round((elapsed / ARTIST_PROGRESS_DURATION_MS) * 100));
        setArtists((prev) => ({
          ...prev,
          [artist]: { ...(prev[artist] || {}), progress: pct, status: 'in_progress' }
        }));
        if (elapsed >= ARTIST_PROGRESS_DURATION_MS) {
          stopArtistProgress(artist);
        }
      };
      tick();
      artistProgressTimersRef.current[artist] = setInterval(tick, 300);
    });
  };

  const buildContentFromState = (order, artistMap) =>
    order
      .map((artistName) => {
        const entry = artistMap[artistName] || {};
        if (entry.content) return entry.content;

        const f = entry.fields || {};

        let ytLine = '- **YouTube**: Loading...';
        if (f.youtube) {
          if (f.youtube.error) ytLine = `- **YouTube**: (error: ${f.youtube.error})`;
          else {
            const url = f.youtube.youtube_url || f.youtube.url || f.youtube.fallback_search_url;
            if (url) ytLine = `- **YouTube**: [link](${url})`;
          }
        }

        let genresLine = '- **Genres**: Loading...';
        if (f.bio_genres) {
          if (f.bio_genres.error) genresLine = `- **Genres**: (error: ${f.bio_genres.error})`;
          else if (f.bio_genres.genres) genresLine = `- **Genres**: ${f.bio_genres.genres.join(', ')}`;
        }

        let bioLine = '- **Bio**: Loading...';
        if (f.bio_genres) {
          if (f.bio_genres.error) bioLine = `- **Bio**: (error: ${f.bio_genres.error})`;
          else if (f.bio_genres.bio) bioLine = `- **Bio**: ${f.bio_genres.bio}`;
        }

        let linkLine = null;
        if (f.website) {
          if (f.website.error) linkLine = `- **Link**: (error: ${f.website.error})`;
          else if (f.website.url) linkLine = `- **Link**: [${f.website.label || 'Website'}](${f.website.url})`;
        }

        let musicLine = null;
        if (f.music) {
          if (f.music.error) musicLine = `- **Music**: (error: ${f.music.error})`;
          else if (f.music.url) musicLine = `- **Music**: [${f.music.platform || 'Music'}](${f.music.url})`;
        }

        return [
          `### ${artistName}`,
          ytLine,
          linkLine,
          genresLine,
          bioLine,
          musicLine,
        ].filter(Boolean).join('\n');
      })
      .join('\n\n');

  const closeAIModal = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (detailedEventSourceRef.current) {
      detailedEventSourceRef.current.close();
      detailedEventSourceRef.current = null;
    }
    if (quickSummaryTimeoutRef.current) {
      clearTimeout(quickSummaryTimeoutRef.current);
      quickSummaryTimeoutRef.current = null;
    }
    clearArtistProgress();
    setShowAIModal(false);
    setQuickSummary('');
    quickSummaryRef.current = '';
    setAiContent('');
    setAiError(null);
    setAiDrafting(false);
    setAiProofreading(false);
    setAiLoading(false);
    setDetailedLoading(false);
    setArtistOrder([]);
    setArtists({});
  };

  const handleDetailedResearch = () => {
    const detailedCacheKey = cacheKey('detailed');

    if (detailedEventSourceRef.current) {
      return;
    }

    const cached = localStorage.getItem(detailedCacheKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        setAiContent(parsed.aiContent || '');
        setDetailedLoading(false);
        setAiProofreading(false);
        setAiDrafting(false);
        return;
      } catch (e) {
        console.warn('AI detailed cache parse failed', e);
      }
    }

    setAiContent('');
    setDetailedLoading(true);
    setAiProofreading(false);
    setAiDrafting(true);

    if (API_CONFIG.USE_SAMPLE_DATA) {
      fetch('/sample_ai_research.md')
        .then(response => response.text())
        .then(text => {
          setAiContent(text);
          setDetailedLoading(false);
          setAiDrafting(false);
        });
      return;
    }

    const params = new URLSearchParams({
      date: event.date,
      title: event.title,
      venue: event.source.commonName,
      url: event.url,
      mode: 'detailed'
    });

    const es = new EventSource(`${API_CONFIG.CONCERT_RESEARCH_ENDPOINT}?${params.toString()}`);
    detailedEventSourceRef.current = es;

    es.onmessage = null;

    es.addEventListener('status', (e) => {
      if (e.data === 'extracting_artists') {
        setDetailedLoading(true);
        setAiDrafting(true);
      } else if (e.data === 'researching_artists') {
        setAiProofreading(true);
        setAiDrafting(false);
      }
    });

    es.addEventListener('artist_list', (e) => {
      const list = JSON.parse(e.data);
      startArtistProgress(list);
      const placeholders = list.map(artist =>
        `### ${artist}\n- **YouTube**: Loading...\n- **Genres**: Loading...\n- **Bio**: Loading...`
      ).join('\n\n');

      setArtistOrder(list);
      setArtists(list.reduce((acc, name) => ({
        ...acc,
        [name]: { status: 'in_progress', progress: 0, fields: {}, content: null }
      }), {}));
      setAiContent(placeholders);
      setDetailedLoading(false);
      setAiDrafting(false);
    });

    es.addEventListener('artist_datapoint', (e) => {
      let dp;
      try {
        dp = JSON.parse(e.data || '{}');
      } catch (err) {
        console.warn('[AI Detailed] Bad artist_datapoint payload', err, e.data);
        return;
      }
      if (!dp || !dp.artist || !dp.field) return;
      const { artist, field, value } = dp;
      setArtists((prev) => {
        const current = prev[artist] || {};
        const mergedFields = { ...(current.fields || {}), [field]: value };
        const next = {
          ...prev,
          [artist]: { ...current, fields: mergedFields }
        };
        setAiContent(buildContentFromState(artistOrder, next));
        return next;
      });
    });

    es.addEventListener('artist_result', (e) => {
      const resultData = JSON.parse(e.data);
      const { artist, content } = resultData;

      stopArtistProgress(artist);

      setArtists((prev) => {
        const updated = {
          ...prev,
          [artist]: { ...(prev[artist] || {}), content, progress: null, status: 'done' }
        };
        setAiContent(buildContentFromState(artistOrder, updated));
        return updated;
      });
    });

    es.addEventListener('complete', () => {
      setDetailedLoading(false);
      setAiProofreading(false);
      setAiDrafting(false);
      clearArtistProgress();
      const cacheData = { aiContent };
      localStorage.setItem(detailedCacheKey, JSON.stringify(cacheData));
      es.close();
      detailedEventSourceRef.current = null;
    });

    es.onerror = (err) => {
      console.error('SSE Detailed Error:', err);
      es.close();
      detailedEventSourceRef.current = null;
      setDetailedLoading(false);
      setAiProofreading(false);
      setAiDrafting(false);
    };

    setTimeout(() => {
      es.close();
      detailedEventSourceRef.current = null;
    }, DETAILED_TIMEOUT_MS);
  };

  const handleAIResearch = (forceRefetch = false) => {
    const quickCacheKey = cacheKey('quick');
    const detailedCacheKey = cacheKey('detailed');

    if (!forceRefetch) {
      const quickCached = localStorage.getItem(quickCacheKey);
      const detailedCached = localStorage.getItem(detailedCacheKey);

      if (quickCached) {
        try {
          const quickParsed = JSON.parse(quickCached);
          const quick = quickParsed.quickSummary || '';
          let detailedContent = '';
          if (detailedCached) {
            const detailedParsed = JSON.parse(detailedCached);
            detailedContent = detailedParsed.aiContent || '';
          }
          setShowAIModal(true);
          setQuickSummary(quick);
          setAiContent(detailedContent);
    setAiLoading(false);
    setAiError(null);
    setDetailedLoading(false);
          return;
        } catch (e) {
          console.warn('AI quick cache parse failed', e);
        }
      }
    } else {
      clearCache(quickCacheKey);
      clearCache(detailedCacheKey);
    }

    setShowAIModal(true);
    setQuickSummary('');
    setAiContent('');
    setAiLoading(true);
    setAiError(null);
    setDetailedLoading(false);

    if (API_CONFIG.USE_SAMPLE_DATA) {
      setQuickSummary('This is a sample quick summary for testing. The show features experimental electronic music at an intimate venue.');
      setAiLoading(false);
      return;
    }

    const params = new URLSearchParams({
      date: event.date,
      title: event.title,
      venue: event.source.commonName,
      url: event.url,
      mode: 'quick'
    });

    const es = new EventSource(`${API_CONFIG.CONCERT_RESEARCH_ENDPOINT}?${params.toString()}`);
    eventSourceRef.current = es;
    es.onmessage = null;

    es.addEventListener('quick', (e) => {
      setQuickSummary((prev) => prev + e.data);
      setAiLoading(false);
    });

    es.onerror = (err) => {
      console.error('SSE Quick Error:', err);
      es.close();
      eventSourceRef.current = null;

      if (quickSummaryTimeoutRef.current) {
        clearTimeout(quickSummaryTimeoutRef.current);
        quickSummaryTimeoutRef.current = null;
      }

      setAiLoading(false);
      setAiError('Failed to connect. Please try again.');
    };

    quickSummaryTimeoutRef.current = setTimeout(() => {
      es.close();
      eventSourceRef.current = null;
      const cacheData = { quickSummary: quickSummaryRef.current };
      localStorage.setItem(quickCacheKey, JSON.stringify(cacheData));
      handleDetailedResearch();
    }, QUICK_TIMEOUT_MS);
  };

  useEffect(() => {
    quickSummaryRef.current = quickSummary;
  }, [quickSummary]);

  useEffect(() => () => {
    closeAIModal();
  }, []);

  const aiPhase =
    aiLoading ? 'gathering_overview'
    : detailedLoading && !aiProofreading ? 'preparing_items'
    : aiProofreading ? 'filling_details'
    : aiContent ? 'complete'
    : 'idle';

  const progress = artistOrder.map((name) => {
    const entry = artists[name] || {};
    return {
      name,
      progress: entry.progress ?? null,
      done: entry.status === 'done' || !!entry.content,
    };
  });

  const artistsData = artistOrder.map((name) => {
    const entry = artists[name] || {};
    const fields = entry.fields || {};
    const fieldList = Object.entries(fields).map(([fieldName, fieldValue]) => ({
      field: fieldName,
      value: fieldValue,
      status: fieldValue ? 'done' : (entry.status || 'pending'),
      progress: entry.progress ?? null,
    }));
    return {
      name,
      status: entry.status || (entry.content ? 'done' : 'pending'),
      progress: entry.progress ?? null,
      content: entry.content || null,
      fields: fieldList,
    };
  });

  return {
    state: {
      showAIModal,
      quickSummary,
      aiContent,
      aiLoading,
      aiError,
      aiProofreading,
      aiDrafting,
      detailedLoading,
      artistOrder,
      artists,
      aiPhase,
      progress,
      artistsData,
    },
    actions: {
      handleAIResearch,
      handleDetailedResearch,
      clearCache,
    },
  };
}
