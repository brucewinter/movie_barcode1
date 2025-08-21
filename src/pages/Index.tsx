import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Film, Search, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import CameraScanner from '@/components/CameraScanner';
import { lookupMovie, type MovieInfo } from '@/services/movieLookup';

const Index = () => {
  const [barcode, setBarcode] = React.useState('');
  const [movieInfo, setMovieInfo] = React.useState<MovieInfo | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const { toast } = useToast();

  const handleBarcodeFound = async (scannedBarcode: string) => {
    if (!scannedBarcode.trim()) {
      toast({
        title: "Error",
        description: "Invalid barcode",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setBarcode(scannedBarcode.trim());

    try {
      const data = await lookupMovie(scannedBarcode.trim());
      setMovieInfo(data);

      toast({
        title: "Movie Found!",
        description: `Found: ${data.title}`,
      });
    } catch (error) {
      console.error('Error looking up movie:', error);
      toast({
        title: "Error",
        description: "Failed to lookup movie information",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualSearch = () => {
    handleBarcodeFound(barcode);
  };

  return (
    <div className="container mx-auto p-2 space-y-3">
      <div className="text-center space-y-1">
        <h1 className="text-2xl font-bold flex items-center justify-center gap-2">
          <Film className="h-6 w-6" />
          MovieBarcode
        </h1>
        <p className="text-muted-foreground text-sm">
          Scan or enter a movie barcode to get information
        </p>
      </div>

      <CameraScanner onScan={handleBarcodeFound} />

      {movieInfo && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Film className="h-4 w-4" />
              Movie Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <div><span className="font-medium">Barcode:</span> {movieInfo.barcode}</div>
            <div><span className="font-medium">Title:</span> {movieInfo.title}</div>
            {movieInfo.year && <div><span className="font-medium">Year:</span> {movieInfo.year}</div>}
            {movieInfo.director && <div><span className="font-medium">Director:</span> {movieInfo.director}</div>}
            <div className="flex items-center justify-between">
              <span><span className="font-medium">TMDb:</span> {movieInfo.rating}</span>
              <Button 
                variant="outline" 
                size="sm" 
                className="h-6 px-2 text-xs"
                onClick={() => window.open(`https://www.themoviedb.org/search?query=${encodeURIComponent(movieInfo.title)}`, '_blank')}
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                View
              </Button>
            </div>
            {movieInfo.imdbRating && movieInfo.imdbRating !== 'N/A' && (
              <div className="flex items-center justify-between">
                <span><span className="font-medium">IMDB:</span> {movieInfo.imdbRating}</span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-6 px-2 text-xs"
                  onClick={() => window.open(`https://www.imdb.com/find?q=${encodeURIComponent(movieInfo.title)}`, '_blank')}
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  View
                </Button>
              </div>
            )}
            {movieInfo.rottenTomatoesRating && movieInfo.rottenTomatoesRating !== 'N/A' && (
              <div className="flex items-center justify-between">
                <span><span className="font-medium">Rotten Tomatoes:</span> {movieInfo.rottenTomatoesRating}</span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-6 px-2 text-xs"
                  onClick={() => window.open(`https://www.rottentomatoes.com/search?search=${encodeURIComponent(movieInfo.title)}`, '_blank')}
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  View
                </Button>
              </div>
            )}
            {movieInfo.runtime && <div><span className="font-medium">Runtime:</span> {movieInfo.runtime}</div>}
            {movieInfo.genres && <div><span className="font-medium">Genres:</span> {movieInfo.genres}</div>}
            {movieInfo.overview && (
              <div>
                <span className="font-medium">Overview:</span> 
                <p className="mt-0.5 text-xs">{movieInfo.overview}</p>
              </div>
            )}
            {Array.isArray(movieInfo.debug) && movieInfo.debug.length > 0 && (
              <div className="mt-4">
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="debug">
                    <AccordionTrigger>Debug details</AccordionTrigger>
                    <AccordionContent>
                      <pre className="bg-muted rounded-md p-3 text-xs overflow-x-auto">
                        {JSON.stringify(movieInfo.debug, null, 2)}
                      </pre>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Search className="h-4 w-4" />
            Manual Entry
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex gap-2">
            <Input
              placeholder="Enter barcode..."
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleManualSearch()}
              className="text-sm"
            />
            <Button onClick={handleManualSearch} disabled={isLoading} size="sm">
              <Search className="h-3 w-3 mr-1" />
              {isLoading ? 'Searching...' : 'Search'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="text-center text-sm text-muted-foreground space-y-2">
        <p>Scan barcodes with your camera or enter them manually above</p>
        {movieInfo?.source === 'barcode_only' && movieInfo?.overview?.includes('TMDb API key not configured') && (
          <div className="bg-blue-50 p-3 rounded-lg">
            <p className="text-blue-800 font-medium">Setup Required:</p>
            <p className="text-blue-700 text-xs">
              To get real movie data, add your TMDb API key in <code>src/services/movieLookup.ts</code>.
              Get a free key at <a href="https://www.themoviedb.org/settings/api" target="_blank" className="underline">themoviedb.org</a>
            </p>
            <p className="text-blue-700 text-xs mt-1">
              For additional ratings, you can also add an OMDB API key from <a href="http://www.omdbapi.com/apikey.aspx" target="_blank" className="underline">omdbapi.com</a>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;