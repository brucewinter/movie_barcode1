import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Scan, Smartphone, Film } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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
  const { toast } = useToast();

  const startNFCScan = async () => {
    setIsScanning(true);
    
    try {
      // Simulate NFC scanning - in real implementation, this would use Capacitor NFC plugin
      toast({
        title: "NFC Scanning",
        description: "Hold your device near the DVD's NFC tag...",
      });

      // Simulate scanning delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Mock movie data - in real app, this would come from the NFC tag and API calls
      const mockMovieData: MovieData = {
        title: "The Dark Knight",
        year: "2008",
        imdbRating: "9.0",
        rottenTomatoesRating: "94%",
        poster: "/api/placeholder/300/450",
        plot: "When the menace known as the Joker wreaks havoc and chaos on the people of Gotham, Batman must accept one of the greatest psychological and physical tests.",
        director: "Christopher Nolan",
        genre: "Action, Crime, Drama"
      };

      setMovieData(mockMovieData);
      toast({
        title: "Movie Found!",
        description: `Successfully scanned: ${mockMovieData.title}`,
      });
    } catch (error) {
      toast({
        title: "Scan Failed",
        description: "Unable to read NFC tag. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsScanning(false);
    }
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
              Scanning...
            </>
          ) : (
            <>
              <Scan className="h-5 w-5 mr-2" />
              Scan DVD Tag
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
                1. Tap the "Scan DVD Tag" button<br />
                2. Hold your phone near the NFC tag on your DVD<br />
                3. View instant ratings from IMDB and Rotten Tomatoes
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default NFCScanner;