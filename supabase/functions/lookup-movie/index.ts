import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
// Function to lookup movie information from barcode

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { barcode } = await req.json()
    console.log('lookup-movie: incoming', { barcode })
    const debugLogs: any[] = []
    debugLogs.push({ label: 'incoming', data: { barcode } })

    if (!barcode) {
      return new Response(
        JSON.stringify({ error: 'Barcode is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Step 1: Look up the barcode to get product info
    const upcResponse = await fetch(`https://api.upcitemdb.com/prod/trial/lookup?upc=${barcode}`)
    
    if (!upcResponse.ok) {
      throw new Error('Failed to lookup barcode')
    }

    const upcData = await upcResponse.json()
    
    if (!upcData.items || upcData.items.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No product found for this barcode' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const product = upcData.items[0]
    const productTitle = product.title

// Step 2: Search for movie using the product title
// Extract movie title from product title (remove format info like "DVD", "Blu-ray", etc.) and vendor/category noise
const removeParens = (s: string) => s.replace(/\(.*?\)/g, ' ').trim()
const baseFromMultiSpace = (s: string) => {
  const parts = s.split(/\s{2,}/)
  return (parts[0] || s).trim()
}
const stripKnownFormats = (s: string) => s.replace(/\b(DVD|Blu[- ]?ray|Blu ray|4K|Ultra HD|UHD|HD|Special Edition|Widescreen|Full Screen|Steelbook|Combo Pack)\b/gi, ' ')
const normalizeSpaces = (s: string) => s.replace(/\s+/g, ' ').trim()
const stripAfterSeparators = (s: string) => s.split(/[-–—|\/•·]/)[0].trim()
const stripGenreNoise = (s: string) => {
  const markers = ['mystery & suspense','mystery','suspense','thriller','horror','comedy','drama','action','adventure','romance','fantasy','science fiction','sci-fi','documentary','animation','western','family','music','war','history','sport','kids','children','tv series','season','magenta light']
  const lower = s.toLowerCase()
  let cut = s.length
  for (const m of markers) {
    const idx = lower.indexOf(m)
    if (idx !== -1 && idx < cut) cut = idx
  }
  return s.slice(0, cut).trim()
}
const productNoParens = removeParens(productTitle)
const cleanTitle = normalizeSpaces(stripKnownFormats(productNoParens))
const firstSegment = normalizeSpaces(baseFromMultiSpace(productNoParens))
const titleNoSeparators = normalizeSpaces(stripAfterSeparators(productNoParens))
const minimalTitle = normalizeSpaces(stripGenreNoise(cleanTitle)).split(':')[0]
const firstTwoWords = (() => {
  const tokens = cleanTitle.split(' ').filter(Boolean)
  return tokens.slice(0, Math.min(2, tokens.length)).join(' ')
})()

console.log('lookup-movie: upc', { title: productTitle, cleanTitle, firstSegment, titleNoSeparators, minimalTitle, firstTwoWords })
debugLogs.push({ label: 'upc', data: { title: productTitle, cleanTitle, firstSegment, titleNoSeparators, minimalTitle, firstTwoWords } })

    // Use The Movie Database API (free tier)
    const tmdbApiKey = Deno.env.get('TMDB_API_KEY')
    const omdbApiKey = Deno.env.get('OMDB_API_KEY')
    console.log('TMDB API Key status:', tmdbApiKey ? 'Found' : 'Not found')
    console.log('OMDB API Key status:', omdbApiKey ? 'Found' : 'Not found')
    
    if (!tmdbApiKey) {
      return new Response(
        JSON.stringify({ 
          barcode,
          title: productTitle,
          year: 'Unknown',
          director: 'Unknown',
          rating: 'N/A',
          overview: 'Movie database API key not configured',
           source: 'barcode_only',
           debug: debugLogs
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Enhanced TMDb search with year and scoring
    const extractYear = (s: string): number | undefined => {
      const m = s.match(/(19|20)\d{2}/)
      return m ? parseInt(m[0], 10) : undefined
    }

    const primaryYear = extractYear(productTitle) || extractYear(cleanTitle)

    const stripExtras = (s: string) => s
      .replace(/\b(uncut|unrated|special edition|limited edition|collector'?s edition|steelbook|combo pack|digital|ultraviolet|uv|with .*|and .*|\d+-disc|dvd|blu[- ]?ray|4k|uhd|ultra hd|widescreen|full screen|region \w+)\b/gi, '')
      .replace(/[:\-–].*$/,'')
      .replace(/\(.*?\)/g, '')
      .replace(/\s+/g, ' ')
      .trim()

    const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')

const queries = Array.from(new Set([
  cleanTitle,
  stripExtras(productTitle),
  stripExtras(cleanTitle),
  firstSegment,
  titleNoSeparators,
  minimalTitle,
  firstTwoWords,
].filter(q => q && q.length >= 2)))

    console.log('lookup-movie: search prep', { primaryYear, queries })
    debugLogs.push({ label: 'search prep', data: { primaryYear, queries } })

    type Candidate = { id: number; title: string; release_date?: string; score: number }
    let best: Candidate | null = null

    const trySearch = async (q: string, useYear: boolean) => {
      const url = new URL('https://api.themoviedb.org/3/search/movie')
      url.searchParams.set('api_key', tmdbApiKey)
      url.searchParams.set('query', q)
      if (useYear && primaryYear) url.searchParams.set('primary_release_year', String(primaryYear))
      const res = await fetch(url.toString())
      if (!res.ok) return
      const json = await res.json()
      const list = Array.isArray(json.results) ? json.results : []
      for (const r of list) {
        const nQ = normalize(q)
        const nT = normalize(r.title || r.original_title || '')
        let score = 0
        if (nT === nQ) score += 10
        else if (nT.startsWith(nQ) || nQ.startsWith(nT)) score += 6
        const y = r.release_date ? parseInt(r.release_date.slice(0,4), 10) : undefined
        if (primaryYear && y && Math.abs(y - primaryYear) <= 1) score += 4
        if ((r.vote_count || 0) > 50) score += 1
        if (!best || score > best.score) {
          best = { id: r.id, title: r.title, release_date: r.release_date, score }
        }
      }
    }

    for (const q of queries) {
      await trySearch(q, true)
      if (!best) await trySearch(q, false)
    }
    console.log('lookup-movie: tmdb best', best)
    debugLogs.push({ label: 'tmdb best', data: best })

    if (best) {
      const detailsResponse = await fetch(
        `https://api.themoviedb.org/3/movie/${best.id}?api_key=${tmdbApiKey}&append_to_response=credits,external_ids,alternative_titles`
      )


      if (detailsResponse.ok) {
        const details = await detailsResponse.json()
        const director = details.credits?.crew?.find((person: any) => person.job === 'Director')?.name || 'Unknown'

        // Get additional ratings from OMDB if API key is available (prefer IMDb ID lookup)
        let imdbRating = 'N/A'
        let rottenTomatoesRating = 'N/A'

        // TMDb rating: only show if there are votes and average > 0
        const tmdbRatingValue = (typeof details.vote_average === 'number' && details.vote_average > 0 && (details.vote_count ?? 0) > 0)
          ? `${details.vote_average.toFixed(1)}/10`
          : 'N/A'
        
        if (omdbApiKey) {
          try {
            const imdbId = details.external_ids?.imdb_id
            const yearNum = details.release_date ? new Date(details.release_date).getFullYear() : undefined

            const build = (p: Record<string, string | number | undefined>) => {
              const u = new URL('https://www.omdbapi.com/')
              u.searchParams.set('apikey', omdbApiKey)
              Object.entries(p).forEach(([k, v]) => {
                if (v !== undefined && v !== '') u.searchParams.set(k, String(v))
              })
              return u.toString()
            }

            // Collect alternative titles from TMDb (prioritize US/GB/CA/AU and working/alternative types)
            const altTitles: string[] = Array.isArray(details.alternative_titles?.titles)
              ? details.alternative_titles.titles
                  .filter((t: any) => ['US','GB','CA','AU'].includes(t.iso_3166_1) || (t.type || '').toLowerCase().includes('working') || (t.type || '').toLowerCase().includes('alternative'))
                  .map((t: any) => t.title)
                  .filter(Boolean)
              : []

            const uniqueTitles: string[] = Array.from(new Set([
              details.title,
              details.original_title,
              ...altTitles,
            ].filter(Boolean)))

            console.log('lookup-movie: omdb titles', { uniqueTitles, yearNum })
            debugLogs.push({ label: 'omdb titles', data: { uniqueTitles, yearNum } })

            // Attempt order: IMDb ID → each title (+/- year)
            const attempts: string[] = []
            if (imdbId) attempts.push(build({ i: imdbId }))
            for (const t of uniqueTitles) {
              if (yearNum) attempts.push(build({ t, y: yearNum, type: 'movie' }))
              attempts.push(build({ t, type: 'movie' }))
            }

            let omdbData: any | null = null
            for (const url of attempts) {
              try {
                const res = await fetch(url)
                if (!res.ok) {
                  console.warn('OMDB response not OK:', res.status)
                  continue
                }
                const data = await res.json()
                if (data && data.Response === 'True') {
                  omdbData = data
                  console.log('lookup-movie: omdb direct match', { title: data.Title, year: data.Year })
                  debugLogs.push({ label: 'omdb direct match', data: { title: data.Title, year: data.Year } })
                  break
                } else {
                  console.log('OMDB attempt failed:', data?.Error || 'Unknown error')
                }
              } catch (e) {
                console.warn('OMDB attempt error:', e)
              }
            }

            // Fallback: OMDb search to find an IMDb ID, then fetch full details
            if (!omdbData) {
              const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')
              const inYearTol = (yStr: string | undefined, target?: number) => {
                if (!yStr || !target) return false
                const m = yStr.match(/\d{4}/)
                if (!m) return false
                const y = parseInt(m[0], 10)
                return Math.abs(y - target) <= 1
              }

              for (const title of uniqueTitles) {
                try {
                  const searchUrl = build({ s: title, type: 'movie' })
                  const sRes = await fetch(searchUrl)
                  if (!sRes.ok) continue
                  const sData = await sRes.json()
                  if (sData?.Response === 'True' && Array.isArray(sData.Search)) {
                    const nTitle = normalize(title)
                    let best: any = null
                    let bestScore = -Infinity
                    for (const r of sData.Search) {
                      const nr = normalize(r.Title || '')
                      let score = 0
                      if (nr === nTitle) score += 10
                      else if (nr.startsWith(nTitle) || nTitle.startsWith(nr)) score += 5
                      if (inYearTol(r.Year, yearNum)) score += 3
                      if (score > bestScore) { bestScore = score; best = r }
                    }
                    if (best?.imdbID) {
                      const byId = await fetch(build({ i: best.imdbID }))
                      if (byId.ok) {
                        const byIdData = await byId.json()
                        if (byIdData?.Response === 'True') {
                          omdbData = byIdData
                           console.log('lookup-movie: omdb search match', { title: byIdData.Title, year: byIdData.Year })
                           debugLogs.push({ label: 'omdb search match', data: { title: byIdData.Title, year: byIdData.Year } })
                          break
                        }
                      }
                    }
                  }
                } catch (e) {
                  console.warn('OMDB search error:', e)
                }
              }
            }

            if (omdbData) {
              imdbRating = omdbData.imdbRating && omdbData.imdbRating !== 'N/A' ? `${omdbData.imdbRating}/10` : 'N/A'
              const rtRating = omdbData.Ratings?.find((r: any) => r.Source === 'Rotten Tomatoes')
              rottenTomatoesRating = rtRating ? rtRating.Value : 'N/A'
            } else {
              console.log('OMDB: no match after attempts and search')
              debugLogs.push({ label: 'omdb no match' })
            }
          } catch (error) {
            console.error('Error fetching OMDB data:', error)
          }
        }

         console.log('lookup-movie: returning tmdb', { barcode, title: details.title, best })
         debugLogs.push({ label: 'returning tmdb', data: { barcode, title: details.title, best } })
        return new Response(
          JSON.stringify({
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
          }),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }
    }

    // Fallback: return basic info from barcode lookup
     console.log('lookup-movie: returning barcode_only', { barcode, productTitle })
     debugLogs.push({ label: 'returning barcode_only', data: { barcode, productTitle } })
    return new Response(
      JSON.stringify({
        barcode,
        title: productTitle,
        year: 'Unknown',
        director: 'Unknown', 
        rating: 'N/A',
        overview: 'No detailed movie information found',
         source: 'barcode_only',
         debug: debugLogs
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error looking up movie:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to lookup movie information' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})