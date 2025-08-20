// Movie lookup service - independent of Supabase
// Note: API keys are exposed in frontend code

const TMDB_API_KEY = ''; // Add your TMDb API key here
const OMDB_API_KEY = ''; // Add your OMDB API key here (optional)

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
  const debug: any[] = [];
  
  try {
    // Step 1: Get product info from UPC database
    const upcResponse = await fetch(`https://api.upcitemdb.com/prod/trial/lookup?upc=${barcode}`);
    const upcData = await upcResponse.json();
    
    debug.push({ step: 'upc_lookup', data: upcData });
    
    if (!upcData.items || upcData.items.length === 0) {
      return {
        barcode,
        title: 'Unknown Product',
        overview: 'No product found for this barcode',
        source: 'barcode_only',
        debug
      };
    }
    
    const product = upcData.items[0];
    const productTitle = product.title;
    
    // Clean up the title for movie search
    const cleanTitle = productTitle
      .replace(/\(.*?\)/g, '') // Remove parentheses content
      .replace(/\[.*?\]/g, '') // Remove brackets content
      .replace(/\b(DVD|Blu-ray|4K|UHD|Digital|HD)\b/gi, '') // Remove format indicators
      .replace(/\s+/g, ' ')
      .trim();
    
    debug.push({ step: 'title_cleanup', original: productTitle, cleaned: cleanTitle });
    
    if (!TMDB_API_KEY) {
      return {
        barcode,
        title: cleanTitle,
        overview: 'TMDb API key not configured. Add your API key to src/services/movieLookup.ts',
        source: 'barcode_only',
        debug
      };
    }
    
    // Step 2: Search TMDb
    const tmdbSearchUrl = `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(cleanTitle)}`;
    const tmdbResponse = await fetch(tmdbSearchUrl);
    const tmdbData = await tmdbResponse.json();
    
    debug.push({ step: 'tmdb_search', data: tmdbData });
    
    if (!tmdbData.results || tmdbData.results.length === 0) {
      return {
        barcode,
        title: cleanTitle,
        overview: 'No movie found in TMDb database',
        source: 'upc_only',
        debug
      };
    }
    
    const bestMatch = tmdbData.results[0];
    
    // Step 3: Get detailed movie info from TMDb
    const detailsUrl = `https://api.themoviedb.org/3/movie/${bestMatch.id}?api_key=${TMDB_API_KEY}&append_to_response=credits`;
    const detailsResponse = await fetch(detailsUrl);
    const movieDetails = await detailsResponse.json();
    
    debug.push({ step: 'tmdb_details', data: movieDetails });
    
    // Extract director
    const director = movieDetails.credits?.crew?.find((person: any) => person.job === 'Director')?.name;
    
    // Format runtime
    const runtime = movieDetails.runtime ? `${movieDetails.runtime} minutes` : undefined;
    
    // Format genres
    const genres = movieDetails.genres?.map((g: any) => g.name).join(', ');
    
    // Extract year
    const year = movieDetails.release_date ? movieDetails.release_date.split('-')[0] : undefined;
    
    const result: MovieInfo = {
      barcode,
      title: movieDetails.title,
      year,
      director,
      rating: movieDetails.vote_average ? `${movieDetails.vote_average}/10` : undefined,
      runtime,
      genres,
      overview: movieDetails.overview,
      source: 'tmdb',
      debug
    };
    
    // Step 4: Try to get OMDB ratings (optional)
    if (OMDB_API_KEY) {
      try {
        const omdbUrl = `https://www.omdbapi.com/?apikey=${OMDB_API_KEY}&t=${encodeURIComponent(movieDetails.title)}&y=${year}`;
        const omdbResponse = await fetch(omdbUrl);
        const omdbData = await omdbResponse.json();
        
        debug.push({ step: 'omdb_lookup', data: omdbData });
        
        if (omdbData.Response === 'True') {
          result.imdbRating = omdbData.imdbRating;
          result.rottenTomatoesRating = omdbData.Ratings?.find((r: any) => r.Source === 'Rotten Tomatoes')?.Value;
        }
      } catch (error) {
        debug.push({ step: 'omdb_error', error: error.message });
      }
    }
    
    return result;
    
  } catch (error) {
    debug.push({ step: 'error', error: error.message });
    
    return {
      barcode,
      title: 'Error',
      overview: `Failed to lookup movie: ${error.message}`,
      source: 'error',
      debug
    };
  }
}