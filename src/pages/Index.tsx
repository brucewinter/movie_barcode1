import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Film, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import CameraScanner from '@/components/CameraScanner';

const Index = () => {
  const [barcode, setBarcode] = React.useState('');
  const [movieInfo, setMovieInfo] = React.useState<any>(null);
  const { toast } = useToast();

  const handleBarcodeFound = (scannedBarcode: string) => {
    if (!scannedBarcode.trim()) {
      toast({
        title: "Error",
        description: "Invalid barcode",
        variant: "destructive",
      });
      return;
    }

    // Demo movie lookup
    const movieData = {
      barcode: scannedBarcode.trim(),
      title: 'Demo Movie Title',
      year: '2024',
      director: 'Demo Director',
      rating: '8.5/10'
    };

    setMovieInfo(movieData);
    setBarcode(scannedBarcode.trim());

    toast({
      title: "Movie Found!",
      description: `Found movie for barcode: ${scannedBarcode.trim()}`,
    });
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
            <Button onClick={handleManualSearch}>
              <Search className="h-4 w-4 mr-2" />
              Search
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
          </CardContent>
        </Card>
      )}

      <div className="text-center text-sm text-muted-foreground">
        Scan barcodes with your camera or enter them manually above
      </div>
    </div>
  );
};

export default Index;