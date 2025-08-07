console.log('=== LazyNFCScanner.tsx LOADING ===');
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Smartphone, Wifi, AlertCircle, CheckCircle2, Settings, Search } from 'lucide-react';

const LazyNFCScanner: React.FC = () => {
  console.log('=== LazyNFCScanner RENDERING ===');
  const [NFCScanner, setNFCScanner] = useState<React.ComponentType | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [librarySearchTerm, setLibrarySearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<string[]>([]);
  
  const { toast } = useToast();

  const loadNFCScanner = async () => {
    console.log('=== Loading NFC Scanner component ===');
    setIsLoading(true);
    try {
      toast({
        title: "NFC Not Available",
        description: "NFC functionality temporarily disabled for testing",
        variant: "destructive"
      });
    } catch (error) {
      console.error('Error loading NFC Scanner:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLibrarySearch = () => {
    console.log('=== Handling library search ===');
    // Mock search results
    const mockResults = [
      'VH321000 - Flick Movie',
      'tt0468569 - Another Flick',
      'RandomID - Some Other Flick'
    ];
    setSearchResults(mockResults.filter(result => result.includes(librarySearchTerm)));
  };

  // If NFC Scanner is loaded, render it
  if (NFCScanner) {
    return <NFCScanner />;
  }

  console.log('=== LazyNFCScanner about to return JSX ===');
  return (
    <div className="container mx-auto p-4">
      <Card className="w-full max-w-lg mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Smartphone className="mr-2 h-5 w-5" /> NFC Scanner
          </CardTitle>
          <CardDescription>
            Scan NFC tags to retrieve data.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="flex items-center space-x-2">
            <Label htmlFor="search">Search Library:</Label>
            <Input
              id="search"
              placeholder="Enter Library ID"
              value={librarySearchTerm}
              onChange={(e) => setLibrarySearchTerm(e.target.value)}
            />
            <Button variant="outline" size="sm" onClick={handleLibrarySearch}>
              <Search className="mr-2 h-4 w-4" />
              Search
            </Button>
          </div>

          {searchResults.length > 0 && (
            <div>
              <Separator className="my-2" />
              <h4 className="text-sm font-bold">Search Results:</h4>
              <ul>
                {searchResults.map((result, index) => (
                  <li key={index} className="text-sm">{result}</li>
                ))}
              </ul>
            </div>
          )}

          <Separator />

          <div className="flex items-center space-x-2">
            <Badge variant="secondary">
              <AlertCircle className="mr-2 h-4 w-4" /> NFC Not Loaded
            </Badge>
          </div>

          <Button onClick={loadNFCScanner} disabled={isLoading}>
            {isLoading ? 'Loading NFC Scanner...' : 'Enable NFC Scanning'}
          </Button>

          {isLoading && (
            <div className="text-center">
              <p>Loading NFC functionality...</p>
            </div>
          )}

          <div className="text-xs text-muted-foreground">
            <p>Click "Enable NFC Scanning" to load NFC functionality when needed.</p>
            <p>This prevents NFC from being initialized on app startup.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LazyNFCScanner;