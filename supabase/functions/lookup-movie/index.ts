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
        `https://api.themoviedb.org/3/movie/${movie.id}?api_key=${tmdbApiKey}&append_to_response=credits,external_ids`
      )

      if (detailsResponse.ok) {
        const details = await detailsResponse.json()
        const director = details.credits?.crew?.find((person: any) => person.job === 'Director')?.name || 'Unknown'

        // Get additional ratings from OMDB if API key is available (prefer IMDb ID lookup)
        let imdbRating = 'N/A'
        let rottenTomatoesRating = 'N/A'
        
        if (omdbApiKey) {
          try {
            const imdbId = details.external_ids?.imdb_id
            const year = details.release_date ? new Date(details.release_date).getFullYear() : ''
            const omdbUrl = imdbId
              ? `https://www.omdbapi.com/?apikey=${omdbApiKey}&i=${encodeURIComponent(imdbId)}`
              : `https://www.omdbapi.com/?apikey=${omdbApiKey}&t=${encodeURIComponent(details.title)}&y=${year}`

            const omdbResponse = await fetch(omdbUrl)
            
            if (omdbResponse.ok) {
              const omdbData = await omdbResponse.json()
              if (omdbData.Response === 'True') {
                imdbRating = omdbData.imdbRating && omdbData.imdbRating !== 'N/A' ? `${omdbData.imdbRating}/10` : 'N/A'
                
                // Find Rotten Tomatoes rating from the Ratings array
                const rtRating = omdbData.Ratings?.find((r: any) => r.Source === 'Rotten Tomatoes')
                rottenTomatoesRating = rtRating ? rtRating.Value : 'N/A'
              } else {
                console.log('OMDB lookup unsuccessful:', omdbData?.Error || 'Unknown error')
              }
            } else {
              console.warn('OMDB response not OK:', omdbResponse.status)
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
            rating: details.vote_average ? `${details.vote_average.toFixed(1)}/10` : 'N/A',
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