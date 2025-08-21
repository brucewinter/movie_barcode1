// Movie lookup service - replicates the exact logic from Supabase edge function
// Note: In a frontend app, API keys are visible. Prefer a proxy for third-party calls.

// Allow overriding keys/URLs via Vite env vars
const TMDB_API_KEY = (import.meta as any).env?.VITE_TMDB_API_KEY || '3990f0f87103f7ec8eb498d78875108c';
const OMDB_API_KEY = (import.meta as any).env?.VITE_OMDB_API_KEY || 'bb03f73a';
// Optional: Cloudflare Worker proxy URL for UPC lookup (highly recommended to avoid CORS)
// Set in .env as VITE_UPC_PROXY_URL=https://your-worker.your-subdomain.workers.dev
const UPC_PROXY_URL = (import.meta as any).env?.VITE_UPC_PROXY_URL || '';

// Local barcode overrides for known movies (fallback when APIs fail)
const BARCODE_OVERRIDES: Record<string, string> = {
  '043396275294': 'Casino Royale',
  '883929822355': 'Inception',
  '085391163627': 'The Dark Knight',
  '024543602400': 'Avatar',
  '883929033394': 'Inception',
};

export interface MovieInfo {
  barcode: string;
  title: string;
  year?: string;
  director?: string;
  rating?: string;
  imdbRating?: string;
  rottenTomatoesRating?: string;
  runtime?: string;
  genres?: string;
  overview?: string;
  source?: string;
  debug?: any[];
}

export async function lookupMovie(barcode: string): Promise<MovieInfo> {
  const debugLogs: any[] = [];
  debugLogs.push({ label: 'incoming', data: { barcode } });

  try {
    // Step 1: UPC Lookup using multiple APIs
    let productTitle: string | null = null;

    const fetchJsonWithCorsFallback = async (url: string, sourceLabel: string) => {
      // Try direct fetch first
      try {
        const res = await fetch(url);
        if (res.ok) {
          return await res.json();
        }
        debugLogs.push({ label: `${sourceLabel}_error`, error: `HTTP ${res.status}` });
      } catch (e: any) {
        debugLogs.push({ label: `${sourceLabel}_error`, error: e?.message || 'Fetch failed' });
      }
      
      // Always try CORS fallback when direct fetch fails
      try {
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
        debugLogs.push({ label: `${sourceLabel}_fallback_attempt`, url: proxyUrl });
        const res2 = await fetch(proxyUrl);
        if (res2.ok) {
          const text = await res2.text();
          try {
            const data = JSON.parse(text);
            debugLogs.push({ label: `${sourceLabel}_fallback_success`, data });
            return data;
          } catch (parseError: any) {
            debugLogs.push({ label: `${sourceLabel}_fallback_parse_error`, error: parseError?.message });
            return null;
          }
        } else {
          debugLogs.push({ label: `${sourceLabel}_fallback_error`, error: `HTTP ${res2.status}` });
        }
      } catch (e: any) {
        debugLogs.push({ label: `${sourceLabel}_fallback_error`, error: e?.message || 'Fallback fetch failed' });
      }
      return null;
    };

    const fetchTextWithCorsFallback = async (url: string, sourceLabel: string) => {
      // Try direct fetch first
      try {
        const res = await fetch(url);
        if (res.ok) return await res.text();
        debugLogs.push({ label: `${sourceLabel}_error`, error: `HTTP ${res.status}` });
      } catch (e: any) {
        debugLogs.push({ label: `${sourceLabel}_error`, error: e?.message || 'Fetch failed' });
      }
      
      // Always try CORS fallback when direct fetch fails
      try {
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
        debugLogs.push({ label: `${sourceLabel}_fallback_attempt`, url: proxyUrl });
        const res2 = await fetch(proxyUrl);
        if (res2.ok) {
          const text = await res2.text();
          debugLogs.push({ label: `${sourceLabel}_fallback_success`, length: text.length });
          return text;
        } else {
          debugLogs.push({ label: `${sourceLabel}_fallback_error`, error: `HTTP ${res2.status}` });
        }
      } catch (e: any) {
        debugLogs.push({ label: `${sourceLabel}_fallback_error`, error: e?.message || 'Fallback fetch failed' });
      }
      return null;
    };

    // Try Cloudflare Worker proxy first (if configured)
    if (UPC_PROXY_URL) {
      try {
        const proxyRes = await fetch(`${UPC_PROXY_URL}?upc=${encodeURIComponent(barcode)}`);
        if (proxyRes.ok) {
          const proxyData = await proxyRes.json();
          const title = proxyData?.title || proxyData?.items?.[0]?.title;
          if (title) {
            productTitle = title;
            debugLogs.push({ label: 'upc_success', data: { source: 'proxy', title: productTitle } });
          } else {
            debugLogs.push({ label: 'proxy_no_title', data: proxyData });
          }
        } else {
          debugLogs.push({ label: 'proxy_error', error: `HTTP ${proxyRes.status}` });
        }
      } catch (e: any) {
        debugLogs.push({ label: 'proxy_error', error: e?.message || 'Proxy fetch failed' });
      }
    }
    
    // Try UPCItemDB next (with CORS fallback)
    if (!productTitle) {
      const upcData = await fetchJsonWithCorsFallback(`https://api.upcitemdb.com/prod/trial/lookup?upc=${barcode}`,'upcitemdb');
      if (upcData && Array.isArray(upcData.items) && upcData.items.length > 0) {
        productTitle = upcData.items[0].title ?? null;
        if (productTitle) {
          debugLogs.push({ label: 'upc_success', data: { source: 'upcitemdb', title: productTitle } });
        }
      }
    }

    // Try OpenFoodFacts (with CORS fallback)
    if (!productTitle) {
      const offData = await fetchJsonWithCorsFallback(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`, 'openfoodfacts');
      if (offData?.product?.product_name) {
        productTitle = offData.product.product_name;
        debugLogs.push({ label: 'upc_success', data: { source: 'openfoodfacts', title: productTitle } });
      }
    }

    // Additional free, CORS-friendly UPC sources
    if (!productTitle) {
      const bm = await fetchJsonWithCorsFallback(`https://barcode.monster/api/${encodeURIComponent(barcode)}`,'barcode_monster');
      if (bm) {
        const title = bm?.product || bm?.name || bm?.title || bm?.description;
        if (title) {
          productTitle = title;
          debugLogs.push({ label: 'upc_success', data: { source: 'barcode.monster', title: productTitle } });
        } else {
          debugLogs.push({ label: 'barcode_monster_no_title', data: bm });
        }
      }
    }

         // Try scraping HTML pages that often contain the product title (no API key required)
     if (!productTitle) {
       const html = await fetchTextWithCorsFallback(`https://www.barcodelookup.com/${encodeURIComponent(barcode)}`, 'barcodelookup');
       if (html && typeof html === 'string') {
         // Check for security verification pages
         if (html.includes('Security Verification') || html.includes('security') || html.includes('captcha')) {
           debugLogs.push({ label: 'barcodelookup_blocked', message: 'Blocked by security verification' });
         } else {
           const ogMatch = html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["'][^>]*>/i);
           const titleTag = html.match(/<title>([^<]+)<\/title>/i);
           const candidate = (ogMatch?.[1] || titleTag?.[1] || '').replace(/\s*\|\s*Barcode Lookup.*/i, '').trim();
           if (candidate && !candidate.toLowerCase().includes('security')) {
             productTitle = candidate;
             debugLogs.push({ label: 'upc_success', data: { source: 'barcodelookup_html', title: productTitle } });
           }
         }
       }
     }

         if (!productTitle) {
       const html = await fetchTextWithCorsFallback(`https://www.barcodespider.com/${encodeURIComponent(barcode)}`, 'barcodespider');
       if (html && typeof html === 'string') {
         // Skip generic lookup pages
         if (html.includes('UPC') && html.includes('Lookup') && html.includes(barcode)) {
           debugLogs.push({ label: 'barcodespider_generic', message: 'Generic lookup page, skipping' });
         } else {
           const h1 = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
           const titleTag = html.match(/<title>([^<]+)<\/title>/i);
           const raw = (h1?.[1] || titleTag?.[1] || '').trim();
           const candidate = raw.replace(/\s*\|\s*Barcode Spider.*/i, '').trim();
           if (candidate && !candidate.toLowerCase().includes('upc') && !candidate.toLowerCase().includes('lookup')) {
             productTitle = candidate;
             debugLogs.push({ label: 'upc_success', data: { source: 'barcodespider_html', title: productTitle } });
           }
         }
       }
     }

    // Try upcdatabase.org (no API key required, CORS-friendly)
    if (!productTitle) {
      const upcDb = await fetchJsonWithCorsFallback(`https://api.upcdatabase.org/product/${encodeURIComponent(barcode)}`, 'upcdatabase');
      if (upcDb && upcDb.title) {
        productTitle = upcDb.title;
        debugLogs.push({ label: 'upc_success', data: { source: 'upcdatabase', title: productTitle } });
      } else if (upcDb && upcDb.description) {
        productTitle = upcDb.description;
        debugLogs.push({ label: 'upc_success', data: { source: 'upcdatabase_desc', title: productTitle } });
      }
    }

    if (!productTitle) {
      try {
        const ofacts = [
          'https://world.openproductsfacts.org/api/v0/product/',
          'https://world.openbeautyfacts.org/api/v0/product/',
          'https://world.openpetfoodfacts.org/api/v0/product/'
        ];
        for (const base of ofacts) {
          const res = await fetch(`${base}${barcode}.json`);
          if (!res.ok) continue;
          const data = await res.json();
          const title = data?.product?.product_name || data?.product?.brands || data?.product?.generic_name;
          if (title) {
            productTitle = title;
            debugLogs.push({ label: 'upc_success', data: { source: base.includes('beauty') ? 'openbeautyfacts' : base.includes('petfood') ? 'openpetfoodfacts' : 'openproductsfacts', title: productTitle } });
            break;
          }
        }
      } catch (e: any) {
        debugLogs.push({ label: 'openproducts_variants_error', error: e?.message || 'Fetch failed' });
      }
    }

         // Try local barcode overrides as final fallback
     if (!productTitle && BARCODE_OVERRIDES[barcode]) {
       productTitle = BARCODE_OVERRIDES[barcode];
       debugLogs.push({ label: 'upc_success', data: { source: 'local_override', title: productTitle } });
     }

     if (!productTitle) {
       debugLogs.push({ label: 'no_upc_title', message: 'No UPC title found, searching TMDb with barcode' });
      
      if (!TMDB_API_KEY) {
        return {
          barcode,
          title: 'Unknown Title',
          overview: 'TMDb API key not configured',
          source: 'barcode_only',
          debug: debugLogs
        };
      }

      // Direct TMDb search with barcode
      const tmdbResponse = await fetch(`https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(barcode)}`);
      const tmdbData = await tmdbResponse.json();
      
      debugLogs.push({ label: 'tmdb_barcode_search', query: barcode, data: tmdbData });

      if (!tmdbData.results || tmdbData.results.length === 0) {
        return {
          barcode,
          title: 'Unknown Movie',
          overview: 'No movie found for this barcode',
          source: 'tmdb_not_found',
          debug: debugLogs
        };
      }

      const bestMatch = tmdbData.results[0];
      return await getMovieDetails(bestMatch.id, barcode, debugLogs);
    }

    // Step 2: Advanced title cleaning (from edge function)
    const removeParens = (s: string) => s.replace(/\(.*?\)/g, ' ').trim();
    const baseFromMultiSpace = (s: string) => {
      const parts = s.split(/\s{2,}/);
      return (parts[0] || s).trim();
    };
    const stripKnownFormats = (s: string) => s.replace(/\b(DVD|Blu[- ]?ray|Blu ray|4K|Ultra HD|UHD|HD|Special Edition|Widescreen|Full Screen|Steelbook|Combo Pack)\b/gi, ' ');
    const normalizeSpaces = (s: string) => s.replace(/\s+/g, ' ').trim();
    const stripAfterSeparators = (s: string) => s.split(/[-–—|\/•·]/)[0].trim();
    const stripGenreNoise = (s: string) => {
      const markers = ['mystery & suspense','mystery','suspense','thriller','horror','comedy','drama','action','adventure','romance','fantasy','science fiction','sci-fi','documentary','animation','western','family','music','war','history','sport','kids','children','tv series','season','magenta light'];
      const lower = s.toLowerCase();
      let cut = s.length;
      for (const m of markers) {
        const idx = lower.indexOf(m);
        if (idx !== -1 && idx < cut) cut = idx;
      }
      return s.slice(0, cut).trim();
    };

    const productNoParens = removeParens(productTitle);
    const cleanTitle = normalizeSpaces(stripKnownFormats(productNoParens));
    const firstSegment = normalizeSpaces(baseFromMultiSpace(productNoParens));
    const titleNoSeparators = normalizeSpaces(stripAfterSeparators(productNoParens));
    const minimalTitle = normalizeSpaces(stripGenreNoise(cleanTitle)).split(':')[0];
    const firstTwoWords = (() => {
      const tokens = cleanTitle.split(' ').filter(Boolean);
      return tokens.slice(0, Math.min(2, tokens.length)).join(' ');
    })();

    debugLogs.push({ label: 'upc', data: { title: productTitle, cleanTitle, firstSegment, titleNoSeparators, minimalTitle, firstTwoWords } });

    if (!TMDB_API_KEY) {
      return {
        barcode,
        title: productTitle,
        year: 'Unknown',
        director: 'Unknown',
        rating: 'N/A',
        overview: 'Movie database API key not configured',
        source: 'barcode_only',
        debug: debugLogs
      };
    }

    // Step 3: Enhanced TMDb search with multiple queries and scoring
    const extractYear = (s: string): number | undefined => {
      const m = s.match(/(19|20)\d{2}/);
      return m ? parseInt(m[0], 10) : undefined;
    };

    const primaryYear = extractYear(productTitle) || extractYear(cleanTitle);

    const stripExtras = (s: string) => s
      .replace(/\b(uncut|unrated|special edition|limited edition|collector'?s edition|steelbook|combo pack|digital|ultraviolet|uv|with .*|and .*|\d+-disc|dvd|blu[- ]?ray|4k|uhd|ultra hd|widescreen|full screen|region \w+)\b/gi, '')
      .replace(/[:\-–].*$/,'')
      .replace(/\(.*?\)/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

    const queries = Array.from(new Set([
      cleanTitle,
      stripExtras(productTitle),
      stripExtras(cleanTitle),
      firstSegment,
      titleNoSeparators,
      minimalTitle,
      firstTwoWords,
    ].filter(q => q && q.length >= 2)));

    debugLogs.push({ label: 'search prep', data: { primaryYear, queries } });

    type Candidate = { id: number; title: string; release_date?: string; score: number };
    let best: Candidate | null = null;

    const trySearch = async (q: string, useYear: boolean) => {
      const url = new URL('https://api.themoviedb.org/3/search/movie');
      url.searchParams.set('api_key', TMDB_API_KEY);
      url.searchParams.set('query', q);
      if (useYear && primaryYear) url.searchParams.set('primary_release_year', String(primaryYear));
      
      const res = await fetch(url.toString());
      if (!res.ok) return;
      
      const json = await res.json();
      const list = Array.isArray(json.results) ? json.results : [];
      
      for (const r of list) {
        const nQ = normalize(q);
        const nT = normalize(r.title || r.original_title || '');
        let score = 0;
        if (nT === nQ) score += 10;
        else if (nT.startsWith(nQ) || nQ.startsWith(nT)) score += 6;
        const y = r.release_date ? parseInt(r.release_date.slice(0,4), 10) : undefined;
        if (primaryYear && y && Math.abs(y - primaryYear) <= 1) score += 4;
        if ((r.vote_count || 0) > 50) score += 1;
        if (!best || score > best.score) {
          best = { id: r.id, title: r.title, release_date: r.release_date, score };
        }
      }
    };

    for (const q of queries) {
      await trySearch(q, true);
      if (!best) await trySearch(q, false);
    }
    
    debugLogs.push({ label: 'tmdb best', data: best });

    if (best) {
      return await getMovieDetails(best.id, barcode, debugLogs);
    }

    // Fallback: return basic info from barcode lookup
    debugLogs.push({ label: 'returning barcode_only', data: { barcode, productTitle } });
    return {
      barcode,
      title: productTitle,
      year: 'Unknown',
      director: 'Unknown', 
      rating: 'N/A',
      overview: 'No detailed movie information found',
      source: 'barcode_only',
      debug: debugLogs
    };

  } catch (error: any) {
    debugLogs.push({ label: 'error', error: error.message });
    
    return {
      barcode,
      title: 'Error',
      overview: `Failed to lookup movie: ${error.message}`,
      source: 'error',
      debug: debugLogs
    };
  }
}

async function getMovieDetails(movieId: number, barcode: string, debugLogs: any[]): Promise<MovieInfo> {
  const detailsResponse = await fetch(
    `https://api.themoviedb.org/3/movie/${movieId}?api_key=${TMDB_API_KEY}&append_to_response=credits,external_ids,alternative_titles`
  );

  if (!detailsResponse.ok) {
    throw new Error('Failed to get movie details');
  }

  const details = await detailsResponse.json();
  const director = details.credits?.crew?.find((person: any) => person.job === 'Director')?.name || 'Unknown';

  // Get additional ratings from OMDB if API key is available
  let imdbRating = 'N/A';
  let rottenTomatoesRating = 'N/A';

  // TMDb rating: only show if there are votes and average > 0
  const tmdbRatingValue = (typeof details.vote_average === 'number' && details.vote_average > 0 && (details.vote_count ?? 0) > 0)
    ? `${details.vote_average.toFixed(1)}/10`
    : 'N/A';
  
  if (OMDB_API_KEY) {
    try {
      const imdbId = details.external_ids?.imdb_id;
      const yearNum = details.release_date ? new Date(details.release_date).getFullYear() : undefined;

      const build = (p: Record<string, string | number | undefined>) => {
        const u = new URL('https://www.omdbapi.com/');
        u.searchParams.set('apikey', OMDB_API_KEY);
        Object.entries(p).forEach(([k, v]) => {
          if (v !== undefined && v !== '') u.searchParams.set(k, String(v));
        });
        return u.toString();
      };

      // Collect alternative titles from TMDb
      const altTitles: string[] = Array.isArray(details.alternative_titles?.titles)
        ? details.alternative_titles.titles
            .filter((t: any) => ['US','GB','CA','AU'].includes(t.iso_3166_1) || (t.type || '').toLowerCase().includes('working') || (t.type || '').toLowerCase().includes('alternative'))
            .map((t: any) => t.title)
            .filter(Boolean)
        : [];

      const uniqueTitles: string[] = Array.from(new Set([
        details.title,
        details.original_title,
        ...altTitles,
      ].filter(Boolean)));

      debugLogs.push({ label: 'omdb titles', data: { uniqueTitles, yearNum } });

      // Attempt order: IMDb ID → each title (+/- year)
      const attempts: string[] = [];
      if (imdbId) attempts.push(build({ i: imdbId }));
      for (const t of uniqueTitles) {
        if (yearNum) attempts.push(build({ t, y: yearNum, type: 'movie' }));
        attempts.push(build({ t, type: 'movie' }));
      }

      let omdbData: any | null = null;
      for (const url of attempts) {
        try {
          const res = await fetch(url);
          if (!res.ok) continue;
          const data = await res.json();
          if (data && data.Response === 'True') {
            omdbData = data;
            debugLogs.push({ label: 'omdb direct match', data: { title: data.Title, year: data.Year } });
            break;
          }
        } catch (e) {
          // Continue to next attempt
        }
      }

      // Fallback: OMDb search to find an IMDb ID, then fetch full details
      if (!omdbData) {
        const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
        const inYearTol = (yStr: string | undefined, target?: number) => {
          if (!yStr || !target) return false;
          const m = yStr.match(/\d{4}/);
          if (!m) return false;
          const y = parseInt(m[0], 10);
          return Math.abs(y - target) <= 1;
        };

        for (const title of uniqueTitles) {
          try {
            const searchUrl = build({ s: title, type: 'movie' });
            const sRes = await fetch(searchUrl);
            if (!sRes.ok) continue;
            const sData = await sRes.json();
            if (sData?.Response === 'True' && Array.isArray(sData.Search)) {
              const nTitle = normalize(title);
              let best: any = null;
              let bestScore = -Infinity;
              for (const r of sData.Search) {
                const nr = normalize(r.Title || '');
                let score = 0;
                if (nr === nTitle) score += 10;
                else if (nr.startsWith(nTitle) || nTitle.startsWith(nr)) score += 5;
                if (inYearTol(r.Year, yearNum)) score += 3;
                if (score > bestScore) { bestScore = score; best = r; }
              }
              if (best?.imdbID) {
                const byId = await fetch(build({ i: best.imdbID }));
                if (byId.ok) {
                  const byIdData = await byId.json();
                  if (byIdData?.Response === 'True') {
                    omdbData = byIdData;
                    debugLogs.push({ label: 'omdb search match', data: { title: byIdData.Title, year: byIdData.Year } });
                    break;
                  }
                }
              }
            }
          } catch (e) {
            // Continue to next title
          }
        }
      }

      if (omdbData) {
        imdbRating = omdbData.imdbRating && omdbData.imdbRating !== 'N/A' ? `${omdbData.imdbRating}/10` : 'N/A';
        const rtRating = omdbData.Ratings?.find((r: any) => r.Source === 'Rotten Tomatoes');
        rottenTomatoesRating = rtRating ? rtRating.Value : 'N/A';
      } else {
        debugLogs.push({ label: 'omdb no match' });
      }
    } catch (error) {
      debugLogs.push({ label: 'omdb_error', error: (error as any).message });
    }
  }

  debugLogs.push({ label: 'returning tmdb', data: { barcode, title: details.title } });
  
  return {
    barcode,
    title: details.title,
    year: details.release_date ? new Date(details.release_date).getFullYear().toString() : 'Unknown',
    director,
    rating: tmdbRatingValue,
    imdbRating,
    rottenTomatoesRating,
    overview: details.overview || 'No overview available',
    runtime: details.runtime ? `${details.runtime} minutes` : 'Unknown',
    genres: details.genres?.map((g: any) => g.name).join(', ') || 'Unknown',
    source: 'tmdb',
    debug: debugLogs
  };
}