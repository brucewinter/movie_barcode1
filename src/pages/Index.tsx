import React, { useState } from 'react';
import { BarcodeScanner } from '@/components/BarcodeScanner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Film, Scan } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const Index = () => {
  const [movieInfo, setMovieInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleBarcodeScanned = async (barcode: string) => {
    setIsLoading(true);
    try {
      // Here you would typically look up the movie by barcode
      // For now, we'll just display the barcode
      setMovieInfo({
        barcode,
        title: 'Movie Title (Demo)',
        year: '2024',
        director: 'Demo Director'
      });
      
      toast({
        title: "Barcode Scanned!",
        description: `Found barcode: ${barcode}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to process barcode",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleScanError = (error: string) => {
    toast({
      title: "Scan Error",
      description: error,
      variant: "destructive",
    });
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold flex items-center justify-center gap-2">
          <Film className="h-8 w-8" />
          NFC Flicks Finder
        </h1>
        <p className="text-muted-foreground">
          Scan movie barcodes to get information
        </p>
      </div>

      <BarcodeScanner 
        onScan={handleBarcodeScanned}
        onError={handleScanError}
      />

      {isLoading && (
        <Card>
          <CardContent className="flex items-center justify-center p-6">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-2">Looking up movie...</span>
          </CardContent>
        </Card>
      )}

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
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Index;