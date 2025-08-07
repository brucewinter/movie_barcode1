import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Film, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import CameraScanner from '@/components/CameraScanner';
import { supabase } from '@/integrations/supabase/client';

const Index = () => {
  const [barcode, setBarcode] = React.useState('');
  const [movieInfo, setMovieInfo] = React.useState<any>(null);
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
      const { data, error } = await supabase.functions.invoke('lookup-movie', {
        body: { barcode: scannedBarcode.trim() }
      });

      if (error) {
        throw error;
      }

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
    <div className="container mx-auto p-4 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold flex items-center justify-center gap-2">
          <Film className="h-8 w-8" />
          Flicks Finder
        </h1>
        <p className="text-muted-foreground">
          Scan or enter a movie barcode to get information
        </p>
      </div>

      <CameraScanner onScan={handleBarcodeFound} />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Manual Barcode Entry
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Enter barcode number..."
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleManualSearch()}
            />
            <Button onClick={handleManualSearch} disabled={isLoading}>
              <Search className="h-4 w-4 mr-2" />
              {isLoading ? 'Searching...' : 'Search'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {movieInfo && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Film className="h-5 w-5" />
              Movie Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <span className="font-medium">Barcode:</span> {movieInfo.barcode}
            </div>
            <div>
              <span className="font-medium">Title:</span> {movieInfo.title}
            </div>
            <div>
              <span className="font-medium">Year:</span> {movieInfo.year}
            </div>
            <div>
              <span className="font-medium">Director:</span> {movieInfo.director}
            </div>
            <div>
              <span className="font-medium">Rating:</span> {movieInfo.rating}
            </div>
            {movieInfo.runtime && (
              <div>
                <span className="font-medium">Runtime:</span> {movieInfo.runtime}
              </div>
            )}
            {movieInfo.genres && (
              <div>
                <span className="font-medium">Genres:</span> {movieInfo.genres}
              </div>
            )}
            {movieInfo.overview && (
              <div>
                <span className="font-medium">Overview:</span> 
                <p className="mt-1 text-sm">{movieInfo.overview}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="text-center text-sm text-muted-foreground space-y-2">
        <p>Scan barcodes with your camera or enter them manually above</p>
        {movieInfo?.source === 'barcode_only' && (
          <div className="bg-blue-50 p-3 rounded-lg">
            <p className="text-blue-800 font-medium">Setup Required:</p>
            <p className="text-blue-700 text-xs">
              To get real movie data, add your TMDb API key in Supabase Edge Function Secrets.
              Get a free key at <a href="https://www.themoviedb.org/settings/api" target="_blank" className="underline">themoviedb.org</a>
            </p>
            <p className="text-blue-700 text-xs mt-1">
              In Supabase dashboard → Edge Functions → Secrets, add: <code>TMDB_API_KEY</code>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;