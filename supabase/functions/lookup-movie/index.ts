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
    // Extract movie title from product title (remove format info like "DVD", "Blu-ray", etc.)
    const cleanTitle = productTitle
      .replace(/\(.*?\)/g, '') // Remove parentheses content
      .replace(/\b(DVD|Blu-ray|Blu ray|4K|Ultra HD|HD|Special Edition|Widescreen|Full Screen)\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim()

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
          source: 'barcode_only'
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const movieSearchResponse = await fetch(
      `https://api.themoviedb.org/3/search/movie?api_key=${tmdbApiKey}&query=${encodeURIComponent(cleanTitle)}`
    )

    if (!movieSearchResponse.ok) {
      throw new Error('Failed to search for movie')
    }

    const movieSearchData = await movieSearchResponse.json()

    if (movieSearchData.results && movieSearchData.results.length > 0) {
      const movie = movieSearchData.results[0]
      
      // Get detailed movie info including credits
      const detailsResponse = await fetch(
        `https://api.themoviedb.org/3/movie/${movie.id}?api_key=${tmdbApiKey}&append_to_response=credits,external_ids,alternative_titles`
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
            }
          } catch (error) {
            console.error('Error fetching OMDB data:', error)
          }
        }

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
            source: 'tmdb'
          }),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }
    }

    // Fallback: return basic info from barcode lookup
    return new Response(
      JSON.stringify({
        barcode,
        title: productTitle,
        year: 'Unknown',
        director: 'Unknown', 
        rating: 'N/A',
        overview: 'No detailed movie information found',
        source: 'barcode_only'
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