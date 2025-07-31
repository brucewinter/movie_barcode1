import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Scan, Smartphone, Film, Key, Settings } from 'lucide-react';
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
  const [apiKey, setApiKey] = useState<string>('');
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string>('');
  const [rawMemoryData, setRawMemoryData] = useState<string>('');
  const [memoryBlocks, setMemoryBlocks] = useState<string[]>([]);
  const [tagTechnology, setTagTechnology] = useState<string>('');
  const { toast } = useToast();

  useEffect(() => {
    // Check NFC support on component mount
    checkNFCSupport();
    
    // Load API key from localStorage
    const savedApiKey = localStorage.getItem('omdb_api_key');
    if (savedApiKey) {
      setApiKey(savedApiKey);
    } else {
      setShowApiKeyInput(true);
    }
  }, []);

  const isMobileDevice = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  };

  const checkNFCSupport = async () => {
    try {
      const isMobile = isMobileDevice();
      const hasWebNFC = 'NDEFReader' in window;
      const isNative = Capacitor.isNativePlatform();
      
      console.log('Platform info:', {
        isMobileDevice: isMobile,
        hasWebNFC: hasWebNFC,
        isNativePlatform: isNative,
        platform: Capacitor.getPlatform(),
        userAgent: navigator.userAgent
      });

      // Check for Web NFC API first (works in Chrome on Android)
      if (hasWebNFC) {
        console.log('Web NFC API available');
        setNfcSupported(true);
        return;
      }

      // Try Capacitor NFC plugin if on native platform
      if (isNative) {
        try {
          const supported = await NFC.isSupported();
          console.log('Capacitor NFC support check:', supported);
          setNfcSupported(supported.supported);
          
          if (!supported.supported) {
            toast({
              title: "NFC Not Supported",
              description: "This device doesn't support NFC functionality",
              variant: "destructive"
            });
          }
        } catch (nfcError) {
          console.log('Capacitor NFC not available');
          setNfcSupported(false);
        }
      } else {
        // On mobile browser, assume NFC might be available
        console.log(`${isMobile ? 'Mobile' : 'Desktop'} browser detected`);
        setNfcSupported(isMobile); // Enable for mobile browsers
      }
    } catch (error) {
      console.error('Error checking NFC support:', error);
      setNfcSupported(isMobileDevice()); // Allow on mobile as fallback
    }
  };

  const readRawMemoryBlocks = async () => {
    if (!nfcSupported) {
      toast({
        title: "NFC Not Supported",
        description: "NFC functionality is not available on this device",
        variant: "destructive"
      });
      return;
    }

    setIsScanning(true);
    setDebugInfo('');
    setRawMemoryData('');
    setMemoryBlocks([]);
    setTagTechnology('');

    try {
      if ('NDEFReader' in window) {
        await readRawMemoryWebNFC();
      } else if (Capacitor.isNativePlatform()) {
        await readRawMemoryCapacitor();
      } else {
        toast({
          title: "Raw Memory Access Unavailable",
          description: "Raw memory reading requires NFC support",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Raw memory read error:", error);
      toast({
        title: "Memory Read Failed",
        description: error instanceof Error ? error.message : "Unable to read raw memory",
        variant: "destructive"
      });
    } finally {
      setIsScanning(false);
    }
  };

  const readRawMemoryWebNFC = async () => {
    try {
      // @ts-ignore - Web NFC API types not available
      const ndef = new NDEFReader();
      
      toast({
        title: "Reading Raw Memory",
        description: "Hold device near tag to read memory blocks...",
      });

      await ndef.scan();
      
      ndef.addEventListener("reading", async (event: any) => {
        console.log("FULL NFC EVENT OBJECT:", JSON.stringify(event, null, 2));
        console.log("Event keys:", Object.keys(event));
        console.log("Event prototype:", Object.getPrototypeOf(event));
        
        // Extract tag information
        const { message, serialNumber } = event;
        const tagInfo = {
          serialNumber: serialNumber || 'Unknown', 
          messageRecords: message ? message.records.length : 0,
          timestamp: new Date().toISOString()
        };
        
        setTagTechnology(`ISO 15693 (Serial: ${tagInfo.serialNumber.substring(0, 20)}...)`);
        
        let memoryDump = [];
        let allRawData = '';
        
        // Deep dive into the event object to find raw memory
        console.log("DETAILED EVENT ANALYSIS:");
        console.log("- event.target:", event.target);
        console.log("- event.message:", event.message);
        console.log("- event.serialNumber:", event.serialNumber);
        
        // Try to access the underlying NFC tag object
        if (event.target) {
          console.log("TARGET KEYS:", Object.keys(event.target));
          if (event.target.tag) {
            const tag = event.target.tag;
            console.log("TAG OBJECT:", tag);
            console.log("TAG KEYS:", Object.keys(tag));
            
            // Look for raw memory or technology-specific data
            if (tag.techList) {
              setTagTechnology(`Technologies: ${tag.techList.join(', ')}`);
            }
            
            // Try to access ISO 15693 specific properties
            ['memory', 'blocks', 'data', 'rawData', 'payload', 'content'].forEach(prop => {
              if (tag[prop]) {
                console.log(`TAG.${prop}:`, tag[prop]);
                memoryDump.push(`Tag.${prop}: ${JSON.stringify(tag[prop])}`);
              }
            });
          }
        }
        
        // Analyze NDEF message if present
        if (message && message.records) {
          console.log("MESSAGE RECORDS COUNT:", message.records.length);
          
          for (let i = 0; i < message.records.length; i++) {
            const record = message.records[i];
            console.log(`RECORD ${i} FULL OBJECT:`, record);
            console.log(`RECORD ${i} KEYS:`, Object.keys(record));
            
            if (record.data) {
              const bytes = new Uint8Array(record.data);
              const hexString = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join(' ');
              const asciiAttempt = Array.from(bytes)
                .map(b => (b >= 32 && b <= 126) ? String.fromCharCode(b) : '.')
                .join('');
              
              memoryDump.push(`Record ${i} (${record.recordType || 'unknown'}): ${hexString}`);
              memoryDump.push(`Record ${i} ASCII: "${asciiAttempt}"`);
              allRawData += asciiAttempt + ' ';
              
              console.log(`RECORD ${i} HEX:`, hexString);
              console.log(`RECORD ${i} ASCII:`, asciiAttempt);
            }
            
            // Try alternative data fields
            ['payload', 'content', 'value', 'text'].forEach(field => {
              if (record[field]) {
                console.log(`RECORD ${i}.${field}:`, record[field]);
                memoryDump.push(`Record ${i}.${field}: ${record[field]}`);
              }
            });
          }
        } else {
          memoryDump.push("No NDEF message found - this may be a raw ISO 15693 tag");
        }
        
        // Try to decode the serial number itself for clues
        if (serialNumber) {
          memoryDump.push(`Serial (hex): ${serialNumber}`);
          
          // Convert serial number to see if it contains readable data
          const serialBytes = serialNumber.split(':').map(hex => parseInt(hex, 16));
          const serialDecimal = serialBytes.join(',');
          
          // Enhanced ASCII interpretation
          const serialAscii = serialBytes
            .map(b => {
              if (b >= 32 && b <= 126) return String.fromCharCode(b);
              if (b === 0) return '∅';
              return '·';
            })
            .join('');
            
          // Extract only printable characters
          const readableOnly = serialBytes
            .filter(b => b >= 32 && b <= 126)
            .map(b => String.fromCharCode(b))
            .join('');
          
          memoryDump.push(`Serial bytes: [${serialDecimal}]`);
          memoryDump.push(`Serial ASCII: "${serialAscii}"`);
          if (readableOnly) {
            memoryDump.push(`Serial readable: "${readableOnly}"`);
            allRawData += readableOnly;
          } else {
            memoryDump.push(`Serial readable: (no printable characters)`);
          }
          
          // Check for common patterns
          const hasSequential = serialBytes.some((b, i) => i > 0 && b === serialBytes[i-1] + 1);
          const hasRepeating = serialBytes.some((b, i) => i > 0 && b === serialBytes[i-1]);
          if (hasSequential) memoryDump.push(`Serial pattern: Sequential bytes detected`);
          if (hasRepeating) memoryDump.push(`Serial pattern: Repeating bytes detected`);
        }
        
        setMemoryBlocks(memoryDump);
        setRawMemoryData(`MessageRecords: ${tagInfo.messageRecords}\nTimestamp: ${tagInfo.timestamp}\nSerial: ${tagInfo.serialNumber}`);
        
        // Enhanced library pattern analysis
        const libraryPatterns = analyzeLibraryData(allRawData);
        if (libraryPatterns.length > 0) {
          setDebugInfo(`Library IDs found: ${libraryPatterns.join(', ')}`);
        } else {
          setDebugInfo(`No clear library identifiers in ${memoryDump.length} memory sections. Raw data: "${allRawData.substring(0, 50)}..."`);
        }
        
        toast({
          title: "Memory Analysis Complete",
          description: `Analyzed ${memoryDump.length} memory sections`,
        });
      });

      ndef.addEventListener("readingerror", () => {
        toast({
          title: "Memory Read Error",
          description: "Failed to read raw memory blocks",
          variant: "destructive"
        });
      });

    } catch (error) {
      console.error("Web NFC raw memory error:", error);
      throw error;
    }
  };

  const readRawMemoryCapacitor = async () => {
    try {
      const supported = await NFC.isSupported();
      if (!supported.supported) {
        throw new Error("NFC not supported on this device");
      }

      toast({
        title: "Reading Raw Memory",
        description: "Hold device near tag to read memory blocks...",
      });

      await NFC.onRead(async (data: NDEFMessagesTransformable) => {
        console.log("Capacitor raw memory data:", data);
        
        // Try to extract raw tag information
        const rawString = data.string();
        const hexData = 'No hex data available'; // The Capacitor NFC plugin doesn't provide hex data directly
        
        setTagTechnology('ISO 15693 (Capacitor)');
        setRawMemoryData(`Raw String: ${rawString}\nHex Data: ${hexData}`);
        
        // Analyze the hex data for memory blocks
        const memoryAnalysis = analyzeHexData(hexData);
        setMemoryBlocks(memoryAnalysis);
        
        // Look for library patterns
        const libraryPatterns = analyzeLibraryData(`${rawString} ${hexData}`);
        if (libraryPatterns.length > 0) {
          setDebugInfo(`Potential library identifiers: ${libraryPatterns.join(', ')}`);
        } else {
          setDebugInfo('No library identifiers detected');
        }
        
        toast({
          title: "Memory Read Complete",
          description: `Analyzed ${memoryAnalysis.length} memory sections`,
        });
      });

      await NFC.startScan();
      
    } catch (error) {
      console.error("Capacitor raw memory error:", error);
      throw error;
    }
  };

  const analyzeHexData = (hexString: string): string[] => {
    const analysis = [];
    
    if (!hexString || hexString === 'No hex data available') {
      return ['No hex data to analyze'];
    }
    
    // Split hex string into blocks (assuming 4-byte blocks like ISO 15693)
    const cleanHex = hexString.replace(/[^0-9a-fA-F]/g, '');
    const blockSize = 8; // 4 bytes = 8 hex characters
    
    for (let i = 0; i < cleanHex.length; i += blockSize) {
      const blockNum = Math.floor(i / blockSize);
      const hexBlock = cleanHex.substr(i, blockSize);
      
      if (hexBlock.length === blockSize) {
        // Convert to ASCII
        const ascii = hexBlock.match(/.{2}/g)
          ?.map(hex => {
            const code = parseInt(hex, 16);
            return (code >= 32 && code <= 126) ? String.fromCharCode(code) : '.';
          })
          .join('') || '';
        
        analysis.push(`Block ${blockNum}: ${hexBlock} (${ascii})`);
      }
    }
    
    return analysis.length > 0 ? analysis : ['No valid memory blocks found'];
  };

  const analyzeLibraryData = (rawData: string): string[] => {
    const patterns = [];
    const data = rawData.toLowerCase();
    
    // Look for common library patterns
    const libraryPatterns = [
      /\b\d{10,}\b/g, // Long numbers (barcodes)
      /\b[a-z]{2,3}\d{6,}\b/g, // Library codes (like VH123456)
      /\btt\d{7,}\b/g, // IMDB IDs
      /\b\d{13}\b/g, // ISBN-13
      /\b\d{10}\b/g, // ISBN-10
      /vestavia/g, // Library name
      /dvd/g, // Media type
      /\b[a-z]+\d{4,}\b/g // General alphanumeric codes
    ];
    
    libraryPatterns.forEach((pattern, index) => {
      const matches = data.match(pattern);
      if (matches) {
        patterns.push(...matches.slice(0, 3)); // Limit to first 3 matches per pattern
      }
    });
    
    return [...new Set(patterns)]; // Remove duplicates
  };

  const writeNFCTag = async (movieData: string) => {
    try {
      // @ts-ignore - Web NFC API types not available
      const ndef = new NDEFReader();
      
      toast({
        title: "Writing to NFC Tag",
        description: "Hold your device near the tag to write movie data...",
      });

      await ndef.write({
        records: [{ recordType: "text", data: movieData }]
      });
      
      toast({
        title: "Tag Written Successfully",
        description: "Movie data has been written to the NFC tag",
      });
    } catch (error) {
      console.error("NFC write error:", error);
      toast({
        title: "Write Failed",
        description: error instanceof Error ? error.message : "Unable to write to NFC tag",
        variant: "destructive"
      });
    }
  };

  const startNFCScan = async () => {
    setIsScanning(true);
    
    try {
      // Try Web NFC API first if available
      if ('NDEFReader' in window) {
        console.log('Using Web NFC API');
        await startWebNFCScan();
        return;
      }

      // Try Capacitor NFC if on native platform
      if (Capacitor.isNativePlatform()) {
        console.log('Using Capacitor NFC');
        await startCapacitorNFCScan();
        return;
      }

      // Fallback to demo mode
      console.log('Using demo mode - no NFC available');
      setTimeout(() => {
        const mockMovieData = fetchMockMovieData();
        setMovieData(mockMovieData);
        toast({
          title: "Demo Mode",
          description: `Showing demo data: ${mockMovieData.title}`,
        });
        setIsScanning(false);
      }, 2000);

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

  const startWebNFCScan = async () => {
    try {
      // @ts-ignore - Web NFC API types not available
      const ndef = new NDEFReader();
      
      toast({
        title: "NFC Scanning",
        description: "Hold your device near the DVD's NFC tag...",
      });

      await ndef.scan();
      
      ndef.addEventListener("reading", async ({ message, serialNumber }: any) => {
        console.log("Complete Web NFC event:", { message, serialNumber });
        console.log("Message object keys:", Object.keys(message));
        console.log("Message toString:", message.toString ? message.toString() : 'No toString');
        console.log("Serial number:", serialNumber);
        
        let ndefData = '';
        
        console.log("Message has", message.records.length, "records");
        
        for (let i = 0; i < message.records.length; i++) {
          const record = message.records[i];
          console.log(`Record ${i}:`, {
            recordType: record.recordType,
            mediaType: record.mediaType,
            id: record.id,
            dataLength: record.data ? record.data.byteLength : 0
          });
          
          if (record.data && record.data.byteLength > 0) {
            try {
              // Try different decoding methods based on record type
              if (record.recordType === "text") {
                // For text records, handle language encoding properly
                const data = new Uint8Array(record.data);
                const languageCodeLength = data[0] & 0x3f; // Get language code length
                const textBytes = data.slice(languageCodeLength + 1); // Skip status byte and language code
                const textDecoder = new TextDecoder('utf-8');
                const text = textDecoder.decode(textBytes);
                console.log(`Record ${i} (text):`, text);
                ndefData += text;
              } else if (record.recordType === "url") {
                const textDecoder = new TextDecoder('utf-8');
                const url = textDecoder.decode(record.data);
                console.log(`Record ${i} (url):`, url);
                ndefData += url;
              } else {
                // For unknown types, try UTF-8 decoding
                const textDecoder = new TextDecoder('utf-8');
                const text = textDecoder.decode(record.data);
                console.log(`Record ${i} (${record.recordType}):`, text);
                ndefData += text;
              }
            } catch (error) {
              console.log(`Failed to decode record ${i}:`, error);
              // Try raw bytes as fallback
              const bytes = new Uint8Array(record.data);
              console.log(`Record ${i} raw bytes:`, Array.from(bytes));
            }
          } else {
            console.log(`Record ${i} has no data or empty data`);
          }
        }
        
        console.log("Processed Web NFC data:", ndefData);
        
        // Deep debugging for NFC records
        const debugDetails = message.records.map((record: any, i: number) => {
          console.log(`Full record ${i}:`, record);
          console.log(`Record ${i} keys:`, Object.keys(record));
          
          // Try multiple ways to access data
          const dataAttempts = {
            'record.data': record.data,
            'record.payload': record.payload,
            'record.content': record.content,
            'record.value': record.value,
            'record.text': record.text,
            'record.uri': record.uri
          };
          
          console.log(`Record ${i} data attempts:`, dataAttempts);
          
          return {
            index: i,
            recordType: record.recordType,
            mediaType: record.mediaType,
            id: record.id,
            allKeys: Object.keys(record),
            dataAttempts: dataAttempts,
            rawDataLength: record.data ? record.data.byteLength : 0,
            payloadLength: record.payload ? record.payload.byteLength : 0,
            toString: record.toString ? record.toString() : 'No toString method'
          };
        });
        
        console.log('Complete debug details:', debugDetails);
        
        setDebugInfo(`NFC Records: ${message.records.length}, Data: "${ndefData}" (${ndefData.length} chars)\nDetailed Debug: ${JSON.stringify(debugDetails, null, 2)}`);
        
        const movieId = parseMovieIdFromNFC(ndefData);
        console.log("Parsed movie ID:", movieId);
        
        if (movieId) {
          try {
            const movieData = await fetchMovieData(movieId);
            if (movieData) {
              setMovieData(movieData);
              toast({
                title: "Movie Found!",
                description: `Successfully scanned: ${movieData.title}`,
              });
            } else {
              toast({
                title: "Movie Not Found",
                description: "This movie is not in the OMDB database",
                variant: "destructive"
              });
            }
          } catch (error) {
            toast({
              title: "API Error",
              description: "Failed to fetch movie data",
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
      });

      ndef.addEventListener("readingerror", () => {
        toast({
          title: "NFC Error",
          description: "Error reading NFC tag. Please try again.",
          variant: "destructive"
        });
        setIsScanning(false);
      });

    } catch (error) {
      console.error("Web NFC error:", error);
      throw error;
    }
  };

  const startCapacitorNFCScan = async () => {
    try {
      // Check NFC support
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

      toast({
        title: "NFC Scanning",
        description: "Hold your device near the DVD's NFC tag...",
      });

      // Set up the NFC tag listener
      await NFC.onRead(async (data: NDEFMessagesTransformable) => {
        try {
          console.log("Raw Capacitor NFC data received:", data);
          
          const ndefString = data.string();
          const ndefData = typeof ndefString === 'string' ? ndefString : JSON.stringify(ndefString);
          console.log("Processed Capacitor NFC data:", ndefData);
          
          const movieId = parseMovieIdFromNFC(ndefData);
          console.log("Parsed movie ID:", movieId);
          
          if (movieId) {
            try {
              const movieData = await fetchMovieData(movieId);
              if (movieData) {
                setMovieData(movieData);
                toast({
                  title: "Movie Found!",
                  description: `Successfully scanned: ${movieData.title}`,
                });
              } else {
                toast({
                  title: "Movie Not Found",
                  description: "This movie is not in the OMDB database",
                  variant: "destructive"
                });
              }
            } catch (error) {
              toast({
                title: "API Error",
                description: "Failed to fetch movie data",
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
          console.error("Error parsing Capacitor NFC data:", error);
          toast({
            title: "Scan Error",
            description: "Unable to read movie data from NFC tag",
            variant: "destructive"
          });
          setIsScanning(false);
        }
      });

      await NFC.onError((error) => {
        console.error("Capacitor NFC Error:", error);
        toast({
          title: "NFC Error",
          description: "NFC scanning failed. Please try again.",
          variant: "destructive"
        });
        setIsScanning(false);
      });

      await NFC.startScan();
      console.log('Capacitor NFC scan started successfully');

    } catch (error) {
      console.error("Capacitor NFC error:", error);
      throw error;
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
    console.log("Raw NFC data received:", ndefData);
    console.log("NFC data type:", typeof ndefData);
    console.log("NFC data length:", ndefData.length);
    
    // Handle empty or whitespace-only data
    if (!ndefData || typeof ndefData !== 'string' || !ndefData.trim()) {
      console.log("Empty or invalid NFC data");
      return null;
    }
    
    const cleanData = ndefData.trim();
    console.log("Cleaned NFC data:", cleanData);
    
    try {
      // Try parsing as JSON first
      const parsed = JSON.parse(cleanData);
      console.log("Parsed as JSON:", parsed);
      if (parsed.title) return parsed.title;
      if (parsed.imdbID) return parsed.imdbID;
      if (parsed.movieId) return parsed.movieId;
      if (parsed.movie) return parsed.movie;
    } catch (e) {
      console.log("Not valid JSON, treating as plain text");
    }
    
    // If it looks like an IMDB ID (tt followed by numbers)
    if (/^tt\d+$/i.test(cleanData)) {
      console.log("Detected IMDB ID:", cleanData);
      return cleanData;
    }
    
    // Check for URL patterns (sometimes NFC tags contain URLs)
    const urlMatch = cleanData.match(/(?:imdb\.com\/title\/)?(tt\d+)/i);
    if (urlMatch) {
      console.log("Extracted IMDB ID from URL:", urlMatch[1]);
      return urlMatch[1];
    }
    
    // If the data is very short (likely not a movie title), reject it
    if (cleanData.length < 2) {
      console.log("Data too short to be a movie title:", cleanData);
      return null;
    }
    
    // Otherwise treat as movie title
    console.log("Treating as movie title:", cleanData);
    return cleanData;
  };

  const fetchMovieData = async (movieIdentifier: string): Promise<MovieData | null> => {
    if (!apiKey) {
      toast({
        title: "API Key Required",
        description: "Please enter your OMDB API key to fetch movie data",
        variant: "destructive"
      });
      return null;
    }

    try {
      let url = '';
      
      // Check if it's an IMDB ID (starts with 'tt')
      if (movieIdentifier.startsWith('tt')) {
        url = `https://www.omdbapi.com/?apikey=${apiKey}&i=${movieIdentifier}&plot=full`;
      } else {
        // Search by title
        url = `https://www.omdbapi.com/?apikey=${apiKey}&t=${encodeURIComponent(movieIdentifier)}&plot=full`;
      }
      
      console.log('Fetching movie data from OMDB:', url.replace(apiKey, '[API_KEY]'));
      
      const response = await fetch(url);
      const data = await response.json();
      
      console.log('OMDB API response:', data);
      
      if (data.Response === 'False') {
        console.log('Movie not found:', data.Error);
        return null;
      }
      
      // Extract Rotten Tomatoes rating from Ratings array
      const rtRating = data.Ratings?.find((rating: any) => 
        rating.Source === 'Rotten Tomatoes'
      )?.Value || 'N/A';
      
      return {
        title: data.Title,
        year: data.Year,
        imdbRating: data.imdbRating || 'N/A',
        rottenTomatoesRating: rtRating,
        poster: data.Poster !== 'N/A' ? data.Poster : '/api/placeholder/300/450',
        plot: data.Plot || 'No plot available',
        director: data.Director || 'Unknown',
        genre: data.Genre || 'Unknown'
      };
      
    } catch (error) {
      console.error('Error fetching movie data:', error);
      toast({
        title: "API Error",
        description: "Failed to fetch movie data. Please check your API key.",
        variant: "destructive"
      });
      return null;
    }
  };

  const saveApiKey = (key: string) => {
    localStorage.setItem('omdb_api_key', key);
    setApiKey(key);
    setShowApiKeyInput(false);
    toast({
      title: "API Key Saved",
      description: "Your OMDB API key has been saved locally",
    });
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
        <Badge variant={Capacitor.isNativePlatform() || isMobileDevice() ? "default" : "secondary"}>
          {Capacitor.isNativePlatform() ? 
            `Native Platform (${Capacitor.getPlatform()})` : 
            isMobileDevice() ? 
              `Mobile Browser (${navigator.userAgent.includes('Android') ? 'Android' : 'iOS'})` :
              "Desktop Preview Mode"
          }
        </Badge>
      </div>

      {/* API Key Input */}
      {(showApiKeyInput || !apiKey) && (
        <Card className="bg-secondary/30 border-primary/20 max-w-md mx-auto">
          <CardHeader className="text-center">
            <CardTitle className="text-lg flex items-center justify-center gap-2">
              <Key className="h-5 w-5" />
              OMDB API Key Required
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Enter your free OMDB API key to fetch real movie data
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                type="password"
                placeholder="Enter OMDB API key..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="flex-1"
              />
              <Button 
                onClick={() => saveApiKey(apiKey)}
                disabled={!apiKey.trim()}
                variant="outline"
              >
                Save
              </Button>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Get your free API key at{" "}
              <a 
                href="https://www.omdbapi.com/apikey.aspx" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                omdbapi.com
              </a>
            </p>
            {apiKey && (
              <div className="flex justify-center">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setShowApiKeyInput(false)}
                >
                  Continue without saving
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* API Key Status */}
      {apiKey && !showApiKeyInput && (
        <div className="flex justify-center gap-2">
          <Badge variant="outline" className="text-xs">
            API Key: ••••••••
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowApiKeyInput(true)}
            className="h-6 px-2 text-xs"
          >
            <Settings className="h-3 w-3" />
          </Button>
        </div>
      )}

      {/* Scan and Write Buttons */}
      <div className="flex justify-center gap-4">
        <Button
          onClick={startNFCScan}
          disabled={isScanning}
          size="lg"
          className="bg-gradient-primary hover:shadow-glow transition-all duration-300 transform hover:scale-105"
        >
          {isScanning ? (
            <>
              <Smartphone className="h-5 w-5 mr-2 animate-spin" />
              {(Capacitor.isNativePlatform() || isMobileDevice()) ? "Scanning..." : "Loading Demo..."}
            </>
          ) : (
            <>
              <Scan className="h-5 w-5 mr-2" />
              {(Capacitor.isNativePlatform() || isMobileDevice()) ? "Scan DVD Tag" : "Try Demo"}
            </>
          )}
        </Button>
        
        {(Capacitor.isNativePlatform() || isMobileDevice()) && 'NDEFReader' in window && (
          <Button
            onClick={() => writeNFCTag("tt0468569")}
            variant="outline"
            size="lg"
            className="transition-all duration-300 transform hover:scale-105"
          >
            Write Test Data
          </Button>
        )}
        
        <Button
          onClick={readRawMemoryBlocks}
          disabled={isScanning}
          variant="secondary"
          size="lg"
          className="transition-all duration-300 transform hover:scale-105"
        >
          {isScanning ? (
            <>
              <Smartphone className="h-5 w-5 mr-2 animate-spin" />
              Reading Memory...
            </>
          ) : (
            <>
              <Settings className="h-5 w-5 mr-2" />
              Debug Raw Memory
            </>
          )}
        </Button>
      </div>

      {/* Debug Info */}
      {debugInfo && (
        <Card className="bg-yellow-50 border-yellow-200 max-w-md mx-auto">
          <CardContent className="pt-4">
            <div className="text-center">
              <h3 className="font-semibold text-yellow-800 mb-2">NFC Debug Info</h3>
              <p className="text-sm text-yellow-700 break-all">
                {debugInfo}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tag Technology Info */}
      {tagTechnology && (
        <Card className="bg-blue-50 border-blue-200 max-w-md mx-auto">
          <CardContent className="pt-4">
            <div className="text-center">
              <h3 className="font-semibold text-blue-800 mb-2">Tag Technology</h3>
              <p className="text-sm text-blue-700">
                {tagTechnology}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Raw Memory Data Display */}
      {rawMemoryData && (
        <Card className="bg-green-50 border-green-200 max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="text-lg text-green-800 text-center">Raw Memory Data</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs text-green-700 bg-green-100 p-3 rounded overflow-x-auto whitespace-pre-wrap">
              {rawMemoryData}
            </pre>
          </CardContent>
        </Card>
      )}

      {/* Memory Blocks Display */}
      {memoryBlocks.length > 0 && (
        <Card className="bg-purple-50 border-purple-200 max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle className="text-lg text-purple-800 text-center">
              Memory Blocks Analysis ({memoryBlocks.length} blocks)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {memoryBlocks.map((block, index) => (
                <div key={index} className="text-xs font-mono text-purple-700 bg-purple-100 p-2 rounded">
                  {block}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

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
                {(Capacitor.isNativePlatform() || isMobileDevice()) ? (
                  <>
                    1. Tap the "Scan DVD Tag" button<br />
                    2. Hold your phone near the NFC tag on your DVD<br />
                    3. View instant ratings from IMDB and Rotten Tomatoes
                    {!Capacitor.isNativePlatform() && (
                      <><br /><small>(Using Web NFC API in browser)</small></>
                    )}
                  </>
                ) : (
                  <>
                    1. Tap "Try Demo" to see how it works<br />
                    2. Open on Android device for real NFC scanning<br />
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
