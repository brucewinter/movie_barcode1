console.log('=== NFCScanner.tsx LOADING ===');
import React, { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { NFC } from '@exxili/capacitor-nfc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Smartphone, Wifi, AlertCircle, CheckCircle2, Settings, Search } from 'lucide-react';

const NFCScanner: React.FC = () => {
  console.log('=== NFCScanner RENDERING ===');
  const [nfcAvailable, setNfcAvailable] = useState(false);
  const [nfcEnabled, setNfcEnabled] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [tagTechnology, setTagTechnology] = useState('');
  const [rawMemoryData, setRawMemoryData] = useState('');
  const [memoryBlocks, setMemoryBlocks] = useState<string[]>([]);
  const [debugInfo, setDebugInfo] = useState('');
  const [librarySearchTerm, setLibrarySearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<string[]>([]);
  
  const { toast } = useToast();

  useEffect(() => {
    console.log('=== NFCScanner useEffect STARTING ===');
    try {
      console.log('Platform check - isNative:', Capacitor.isNativePlatform());
      console.log('Platform info:', Capacitor.getPlatform());
      
      checkNFCAvailability();
    } catch (error) {
      console.error('Error in useEffect:', error);
      toast({
        title: "Initialization Error",
        description: `Error during app startup: ${error}`,
        variant: "destructive"
      });
    }
  }, []);

  const checkNFCAvailability = async () => {
    console.log('=== Checking NFC availability ===');
    try {
      if (!Capacitor.isNativePlatform()) {
        console.log('Not on native platform, using development mode');
        setNfcAvailable(false);
        setNfcEnabled(false);
        return;
      }

      console.log('Checking if NFC is available...');
      const isAvailable = await NFC.isSupported();
      console.log('NFC availability result:', isAvailable);
      
      setNfcAvailable(isAvailable.supported);

      if (isAvailable.supported) {
        console.log('NFC is supported, assuming enabled for now');
        setNfcEnabled(true);
      } else {
        console.log('NFC not available on this device');
        setNfcEnabled(false);
        toast({
          title: "NFC Not Available",
          description: "NFC functionality is not available on this device",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error checking NFC availability:', error);
      setNfcAvailable(false);
      setNfcEnabled(false);
      toast({
        title: "NFC Check Failed",
        description: `Could not check NFC status: ${error}`,
        variant: "destructive"
      });
    }
  };

  const startScanning = async () => {
    console.log('=== Starting NFC scan ===');
    
    if (!Capacitor.isNativePlatform()) {
      console.log('Development mode - using mock NFC');
      mockNFCRead();
      return;
    }

    if (!nfcAvailable) {
      console.log('NFC not available');
      toast({
        title: "NFC Not Available",
        description: "NFC functionality is not available on this device",
        variant: "destructive"
      });
      return;
    }

    try {
      console.log('Attempting to start NFC scan...');
      setIsScanning(true);
      setDebugInfo('');
      setRawMemoryData('');
      setMemoryBlocks([]);
      setTagTechnology('');

      // Add listener for NFC tag events
      console.log('Adding NFC read listener...');
      NFC.onRead((data: any) => {
        console.log('NFC Tag scanned via onRead:', data);
        handleNFCData(data);
      });

      // Add error listener
      NFC.onError((error: any) => {
        console.error('NFC Error:', error);
        toast({
          title: "NFC Error",
          description: `NFC Error: ${error.error || error}`,
          variant: "destructive"
        });
        setIsScanning(false);
      });

      console.log('Starting NFC scan...');
      await NFC.startScan();
      console.log('NFC scan started successfully');
      console.log('NFC scan started successfully');
      
      toast({
        title: "Scanning Started",
        description: "Hold your device near an NFC tag",
      });

      // Auto-stop after 30 seconds
      setTimeout(() => {
        if (isScanning) {
          stopScanning();
        }
      }, 30000);

    } catch (error) {
      console.error('Error starting NFC scan:', error);
      setIsScanning(false);
      toast({
        title: "Scan Failed",
        description: `Could not start NFC scanning: ${error}`,
        variant: "destructive"
      });
    }
  };

  const stopScanning = async () => {
    console.log('=== Stopping NFC scan ===');
    try {
      if (Capacitor.isNativePlatform()) {
        // No explicit stop method needed, just remove listeners
        console.log('Stopping NFC scan...');
      }
      setIsScanning(false);
      toast({
        title: "Scanning Stopped",
        description: "NFC scanning stopped",
      });
    } catch (error) {
      console.error('Error stopping NFC scan:', error);
      toast({
        title: "Stop Failed",
        description: `Could not stop NFC scanning: ${error}`,
        variant: "destructive"
      });
    }
  };

  const handleNFCData = (data: any) => {
    console.log('=== Handling NFC data ===');
    stopScanning();
    
    try {
      // Get the string representation of the data
      const messages = data.string();
      console.log('NFC Messages:', messages);
      
      setTagTechnology('NDEF Compatible');
      
      if (messages && messages.messages) {
        let rawData = '';
        let debugInfo = '';
        const blocks = [];
        
        messages.messages.forEach((message: any, msgIndex: number) => {
          if (message.records) {
            message.records.forEach((record: any, recIndex: number) => {
              rawData += `Message ${msgIndex}, Record ${recIndex}:\n`;
              rawData += `  Type: ${record.type || 'Unknown'}\n`;
              rawData += `  Payload: ${record.payload || 'No payload'}\n\n`;
              
              blocks.push(`Record ${recIndex}: Type=${record.type}, Data=${record.payload}`);
            });
          }
        });
        
        setRawMemoryData(rawData);
        setMemoryBlocks(blocks);
        setDebugInfo(`Found ${messages.messages.length} message(s)`);
      } else {
        setRawMemoryData('No NDEF data found');
        setMemoryBlocks(['No NDEF records']);
        setDebugInfo('No valid NDEF messages');
      }
      
      toast({
        title: "NFC Tag Read",
        description: "Successfully read NFC tag data",
      });
      
    } catch (error) {
      console.error('Error processing NFC data:', error);
      setRawMemoryData(`Error: ${error}`);
      setMemoryBlocks(['Error reading data']);
      setDebugInfo('Processing error occurred');
      
      toast({
        title: "Processing Error",
        description: `Error processing NFC data: ${error}`,
        variant: "destructive"
      });
    }
  };

  const handleNFCTag = (tag: any) => {
    console.log('=== Handling NFC tag (legacy) ===');
    stopScanning();
    setTagTechnology(tag.techList ? tag.techList.join(', ') : 'Unknown');

    if (tag.ndefMessage) {
      const ndefMessage = tag.ndefMessage;
      const decodedRecords = decodeNdefMessage(ndefMessage);
      setRawMemoryData(decodedRecords);
    }

    if (tag.id) {
      const serialNumber = bytesToHexString(tag.id);
      setDebugInfo(`Serial Number: ${serialNumber}`);
    }

    if (tag.memorySize) {
      const blocks = readNFCMemory(tag);
      setMemoryBlocks(blocks);
    } else {
      setMemoryBlocks(['No memory available']);
    }
  };

  const decodeNdefMessage = (ndefMessage: any): string => {
    console.log('=== Decoding NDEF message ===');
    let decoded = '';
    ndefMessage.records.forEach((record: any, index: number) => {
      decoded += `Record ${index}:\n`;
      decoded += `  Type: ${bytesToString(record.type)}\n`;
      decoded += `  Payload: ${bytesToString(record.payload)}\n`;
    });
    return decoded;
  };

  const bytesToString = (bytes: Uint8Array): string => {
    console.log('=== Converting bytes to string ===');
    try {
      return String.fromCharCode.apply(null, [...bytes]);
    } catch (error) {
      console.error('Error converting bytes to string:', error);
      return 'Unable to decode';
    }
  };

  const bytesToHexString = (bytes: Uint8Array): string => {
    console.log('=== Converting bytes to hex string ===');
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join(':');
  };

  const readNFCMemory = (tag: any): string[] => {
    console.log('=== Reading NFC memory ===');
    const memoryBlocks = [];
    const blockSize = 4; // Most NFC tags have a block size of 4 bytes
    const totalBlocks = tag.memorySize ? Math.ceil(tag.memorySize / blockSize) : 0;

    for (let i = 0; i < totalBlocks; i++) {
      let blockData = '';
      if (tag.id) {
        const start = i * blockSize;
        const end = Math.min(start + blockSize, tag.memorySize || 0);
        const blockBytes = tag.id.slice(start, end); // Simulate reading bytes
        blockData = `Block ${i}: ${bytesToHexString(blockBytes)} | ${bytesToString(blockBytes)}`;
      } else {
        blockData = `Block ${i}: No data`;
      }
      memoryBlocks.push(blockData);
    }
    return memoryBlocks;
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

  const mockNFCRead = () => {
    console.log('=== Mock NFC read started ===');
    setIsScanning(true);
    setDebugInfo('');
    setRawMemoryData('');
    setMemoryBlocks([]);
    setTagTechnology('');

    toast({
      title: "Development Mode",
      description: "Simulating NFC tag read...",
    });

    setTimeout(() => {
      // Simulate NFC tag with library barcode data
      const mockMemoryBlocks = [
        'Block 0: 04 14 9A 12 | ....',
        'Block 1: 56 48 33 32 | VH32',
        'Block 2: 31 30 30 30 | 1000',
        'Block 3: FF FF FF FF | ....',
        'Serial bytes: [4,20,154,18]',
        'Serial ASCII: "....."',
        'NDEF Record 0: 74 74 30 34 36 38 35 36 39 | tt0468569'
      ];
      
      setMemoryBlocks(mockMemoryBlocks);
      setTagTechnology('Mock NFC Tag - ISO 14443');
      setRawMemoryData('Development simulation data\nSerial: 04:14:9A:12\nNDEF: tt0468569');
      setDebugInfo('Library IDs found: VH321000, tt0468569\nTotal memory sections: 7');
      
      toast({
        title: "Mock Scan Complete",
        description: "Found simulated library data",
      });
      
      setIsScanning(false);
      console.log('=== Mock NFC read completed ===');
    }, 2000);
  };

  console.log('=== NFCScanner about to return JSX ===');
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
            <Badge variant={nfcAvailable ? "default" : "destructive"}>
              {nfcAvailable ? (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" /> NFC Available
                </>
              ) : (
                <>
                  <AlertCircle className="mr-2 h-4 w-4" /> NFC Not Available
                </>
              )}
            </Badge>

            <Badge variant={nfcEnabled ? "default" : "destructive"}>
              {nfcEnabled ? (
                <>
                  <Wifi className="mr-2 h-4 w-4" /> NFC Enabled
                </>
              ) : (
                <>
                  <Settings className="mr-2 h-4 w-4" /> NFC Disabled
                </>
              )}
            </Badge>
          </div>

          <Button onClick={isScanning ? stopScanning : startScanning} disabled={!nfcAvailable}>
            {isScanning ? 'Stop Scanning' : 'Start Scanning'}
          </Button>

          {isScanning && (
            <div className="text-center">
              <p>Scanning for NFC tag...</p>
            </div>
          )}

          {tagTechnology && (
            <div>
              <Separator className="my-2" />
              <h4 className="text-sm font-bold">Tag Information:</h4>
              <p className="text-sm">Technology: {tagTechnology}</p>
            </div>
          )}

          {rawMemoryData && (
            <div>
              <Separator className="my-2" />
              <h4 className="text-sm font-bold">Raw Memory Data:</h4>
              <pre className="text-xs whitespace-pre-wrap">{rawMemoryData}</pre>
            </div>
          )}

          {memoryBlocks.length > 0 && (
            <div>
              <Separator className="my-2" />
              <h4 className="text-sm font-bold">Memory Blocks:</h4>
              {memoryBlocks.map((block, index) => (
                <p key={index} className="text-xs">{block}</p>
              ))}
            </div>
          )}

          {debugInfo && (
            <div>
              <Separator className="my-2" />
              <h4 className="text-sm font-bold">Debug Information:</h4>
              <p className="text-xs">{debugInfo}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

console.log('=== NFCScanner component defined ===');
export default NFCScanner;
