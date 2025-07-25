import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Scan, Smartphone, Film } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Capacitor } from '@capacitor/core';
import { NFC, NDEFMessagesTransformable } from '@exxili/capacitor-nfc';

interface MovieData {
  title: string;
  year: string;
  imdbRating: string;
  rottenTomatoesRating: string;
  poster: string;
  plot: string;
  director: string;
  genre: string;
}

const NFCScanner = () => {
  const [isScanning, setIsScanning] = useState(false);
  const [movieData, setMovieData] = useState<MovieData | null>(null);
  const [nfcSupported, setNfcSupported] = useState<boolean>(false);
  const { toast } = useToast();

  useEffect(() => {
    // Check NFC support on component mount
    checkNFCSupport();
  }, []);

  const checkNFCSupport = async () => {
    try {
      console.log('Platform info:', {
        isNativePlatform: Capacitor.isNativePlatform(),
        platform: Capacitor.getPlatform()
      });

      if (Capacitor.isNativePlatform()) {
        const supported = await NFC.isSupported();
        console.log('NFC support check:', supported);
        setNfcSupported(supported.supported);
        
        if (!supported.supported) {
          toast({
            title: "NFC Not Supported",
            description: "This device doesn't support NFC functionality",
            variant: "destructive"
          });
        }
      } else {
        console.log('Not on native platform - web preview');
        setNfcSupported(false);
      }
    } catch (error) {
      console.error('Error checking NFC support:', error);
      setNfcSupported(false);
    }
  };

  const startNFCScan = async () => {
    setIsScanning(true);
    
    try {
      // Check if we're on a native platform first
      if (!Capacitor.isNativePlatform()) {
        console.log('Web platform detected - using mock data');
        // For web preview, simulate scanning after a delay
        setTimeout(() => {
          const mockMovieData = fetchMockMovieData();
          setMovieData(mockMovieData);
          toast({
            title: "Demo Mode",
            description: `Showing demo data: ${mockMovieData.title}`,
          });
          setIsScanning(false);
        }, 2000);
        return;
      }

      // Check NFC support
      if (!nfcSupported) {
        const supported = await NFC.isSupported();
        if (!supported.supported) {
          toast({
            title: "NFC Not Supported",
            description: "This device doesn't support NFC functionality",
            variant: "destructive"
          });
          setIsScanning(false);
          return;
        }
      }

      toast({
        title: "NFC Scanning",
        description: "Hold your device near the DVD's NFC tag...",
      });

      // Set up the NFC tag listener
      await NFC.onRead((data: NDEFMessagesTransformable) => {
        try {
          console.log("Raw NFC data received:", data);
          
          // Convert the NDEF message to string and extract movie ID
          const ndefString = data.string();
          const ndefData = typeof ndefString === 'string' ? ndefString : JSON.stringify(ndefString);
          console.log("Processed NFC data:", ndefData);
          
          // Extract movie identifier from NFC data
          const movieId = parseMovieIdFromNFC(ndefData);
          console.log("Parsed movie ID:", movieId);
          
          if (movieId) {
            const movieData = fetchMovieData(movieId);
            if (movieData) {
              setMovieData(movieData);
              toast({
                title: "Movie Found!",
                description: `Successfully scanned: ${movieData.title}`,
              });
            } else {
              toast({
                title: "Movie Not Found",
                description: "This DVD is not in our database",
                variant: "destructive"
              });
            }
          } else {
            toast({
              title: "Invalid Tag",
              description: "This NFC tag doesn't contain movie data",
              variant: "destructive"
            });
          }
          setIsScanning(false);
        } catch (error) {
          console.error("Error parsing NFC data:", error);
          toast({
            title: "Scan Error",
            description: "Unable to read movie data from NFC tag",
            variant: "destructive"
          });
          setIsScanning(false);
        }
      });

      // Set up error handling
      await NFC.onError((error) => {
        console.error("NFC Error:", error);
        toast({
          title: "NFC Error",
          description: "NFC scanning failed. Please try again.",
          variant: "destructive"
        });
        setIsScanning(false);
      });

      // Start scanning
      await NFC.startScan();
      console.log('NFC scan started successfully');

    } catch (error) {
      console.error("NFC scan error:", error);
      toast({
        title: "Scan Failed",
        description: error instanceof Error ? error.message : "Unable to start NFC scanning",
        variant: "destructive"
      });
      setIsScanning(false);
    }
  };

  const fetchMockMovieData = (): MovieData => {
    return {
      title: "The Dark Knight",
      year: "2008",
      imdbRating: "9.0",
      rottenTomatoesRating: "94%",
      poster: "/api/placeholder/300/450",
      plot: "When the menace known as the Joker wreaks havoc and chaos on the people of Gotham, Batman must accept one of the greatest psychological and physical tests.",
      director: "Christopher Nolan",
      genre: "Action, Crime, Drama"
    };
  };

  const parseMovieIdFromNFC = (ndefData: string): string | null => {
    // Look for movie ID patterns in the NFC data
    // This could be a URL, JSON, or simple string identifier
    try {
      // Try parsing as JSON first
      const parsed = JSON.parse(ndefData);
      if (parsed.movieId) return parsed.movieId;
      if (parsed.title) return parsed.title.toLowerCase().replace(/\s+/g, '_');
    } catch {
      // If not JSON, treat as plain text and look for known patterns
      const cleanData = ndefData.toLowerCase().trim();
      
      // Check for direct movie ID matches
      if (cleanData.includes('dark_knight') || cleanData.includes('the dark knight')) {
        return 'dark_knight';
      }
      if (cleanData.includes('inception')) {
        return 'inception';
      }
      
      // Return the cleaned data as potential movie ID
      return cleanData.replace(/\s+/g, '_');
    }
    
    return null;
  };

  const fetchMovieData = (movieId: string): MovieData | null => {
    // Mock data mapping - in production, this would call a real API
    const movieDatabase: Record<string, MovieData> = {
      "dark_knight": {
        title: "The Dark Knight",
        year: "2008",
        imdbRating: "9.0",
        rottenTomatoesRating: "94%",
        poster: "/api/placeholder/300/450",
        plot: "When the menace known as the Joker wreaks havoc and chaos on the people of Gotham, Batman must accept one of the greatest psychological and physical tests.",
        director: "Christopher Nolan",
        genre: "Action, Crime, Drama"
      },
      "inception": {
        title: "Inception",
        year: "2010",
        imdbRating: "8.8",
        rottenTomatoesRating: "87%",
        poster: "/api/placeholder/300/450",
        plot: "A thief who steals corporate secrets through dream-sharing technology is given the inverse task of planting an idea into the mind of a C.E.O.",
        director: "Christopher Nolan",
        genre: "Action, Sci-Fi, Thriller"
      }
    };

    return movieDatabase[movieId] || null;
  };

  return (
    <div className="min-h-screen bg-background p-4 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2 pt-8">
        <div className="flex justify-center mb-4">
          <div className="relative">
            <Film className="h-12 w-12 text-primary animate-pulse" />
            <div className="absolute -top-1 -right-1 h-4 w-4 bg-gradient-primary rounded-full shadow-glow"></div>
          </div>
        </div>
        <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
          DVD Scanner
        </h1>
        <p className="text-muted-foreground">
          Scan NFC tags to get movie ratings instantly
        </p>
      </div>

      {/* Platform Status */}
      <div className="flex justify-center">
        <Badge variant={Capacitor.isNativePlatform() ? "default" : "secondary"}>
          {Capacitor.isNativePlatform() ? 
            `Native Platform (${Capacitor.getPlatform()})` : 
            "Web Preview Mode"
          }
        </Badge>
      </div>

      {/* Scan Button */}
      <div className="flex justify-center">
        <Button
          onClick={startNFCScan}
          disabled={isScanning}
          size="lg"
          className="bg-gradient-primary hover:shadow-glow transition-all duration-300 transform hover:scale-105"
        >
          {isScanning ? (
            <>
              <Smartphone className="h-5 w-5 mr-2 animate-spin" />
              {Capacitor.isNativePlatform() ? "Scanning..." : "Loading Demo..."}
            </>
          ) : (
            <>
              <Scan className="h-5 w-5 mr-2" />
              {Capacitor.isNativePlatform() ? "Scan DVD Tag" : "Try Demo"}
            </>
          )}
        </Button>
      </div>

      {/* Movie Information Card */}
      {movieData && (
        <Card className="bg-gradient-card border-primary/20 shadow-cinema">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-primary">{movieData.title}</CardTitle>
            <Badge variant="secondary" className="w-fit mx-auto">
              {movieData.year} • {movieData.genre}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Movie Poster & Details */}
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-shrink-0">
                <img
                  src={movieData.poster}
                  alt={movieData.title}
                  className="w-32 h-48 object-cover rounded-lg mx-auto md:mx-0 shadow-lg"
                />
              </div>
              <div className="flex-grow space-y-3">
                <div>
                  <h3 className="font-semibold text-primary mb-1">Director</h3>
                  <p className="text-foreground">{movieData.director}</p>
                </div>
                <div>
                  <h3 className="font-semibold text-primary mb-1">Plot</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {movieData.plot}
                  </p>
                </div>
              </div>
            </div>

            {/* Ratings */}
            <div className="grid grid-cols-2 gap-4">
              <Card className="bg-secondary/50 border-accent/30">
                <CardContent className="pt-4 text-center">
                  <div className="text-2xl font-bold text-accent mb-1">
                    {movieData.imdbRating}
                  </div>
                  <div className="text-sm text-muted-foreground">IMDB Rating</div>
                </CardContent>
              </Card>
              <Card className="bg-secondary/50 border-accent/30">
                <CardContent className="pt-4 text-center">
                  <div className="text-2xl font-bold text-accent mb-1">
                    {movieData.rottenTomatoesRating}
                  </div>
                  <div className="text-sm text-muted-foreground">Rotten Tomatoes</div>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      {!movieData && (
        <Card className="bg-secondary/30 border-muted">
          <CardContent className="pt-6 text-center space-y-4">
            <Smartphone className="h-8 w-8 text-muted-foreground mx-auto" />
            <div>
              <h3 className="font-semibold mb-2">How to use</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {Capacitor.isNativePlatform() ? (
                  <>
                    1. Tap the "Scan DVD Tag" button<br />
                    2. Hold your phone near the NFC tag on your DVD<br />
                    3. View instant ratings from IMDB and Rotten Tomatoes
                  </>
                ) : (
                  <>
                    1. Tap "Try Demo" to see how it works<br />
                    2. Deploy to Android device for real NFC scanning<br />
                    3. Enjoy instant movie ratings!
                  </>
                )}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default NFCScanner;
