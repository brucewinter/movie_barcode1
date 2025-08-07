import React, { useRef, useEffect, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/library';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Camera, CameraOff, RotateCcw } from 'lucide-react';

interface CameraScannerProps {
  onScan: (result: string) => void;
}

const CameraScanner: React.FC<CameraScannerProps> = ({ onScan }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string>('');
  const [codeReader] = useState(new BrowserMultiFormatReader());

  const startScanning = async () => {
    try {
      setError('');
      setIsScanning(true);
      
      if (videoRef.current) {
        await codeReader.decodeFromVideoDevice(
          undefined,
          videoRef.current,
          (result, err) => {
            if (result) {
              onScan(result.getText());
              stopScanning();
            }
            if (err && !(err.name === 'NotFoundException')) {
              console.error('Scanning error:', err);
            }
          }
        );
      }
    } catch (err) {
      console.error('Error starting scanner:', err);
      setError('Failed to access camera. Please check permissions.');
      setIsScanning(false);
    }
  };

  const stopScanning = () => {
    codeReader.reset();
    setIsScanning(false);
  };

  useEffect(() => {
    return () => {
      codeReader.reset();
    };
  }, [codeReader]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="h-5 w-5" />
          Camera Scanner
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="p-3 bg-destructive/10 text-destructive rounded-md text-sm">
            {error}
          </div>
        )}
        
        <div className="relative">
          <video
            ref={videoRef}
            className="w-full max-w-md mx-auto rounded-lg bg-black"
            style={{ aspectRatio: '4/3' }}
            playsInline
            muted
          />
          {!isScanning && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg">
              <div className="text-center">
                <Camera className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                <p className="text-sm text-gray-500">Camera preview will appear here</p>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2 justify-center">
          {!isScanning ? (
            <Button onClick={startScanning} className="flex items-center gap-2">
              <Camera className="h-4 w-4" />
              Start Scanning
            </Button>
          ) : (
            <Button onClick={stopScanning} variant="outline" className="flex items-center gap-2">
              <CameraOff className="h-4 w-4" />
              Stop Scanning
            </Button>
          )}
          
          {isScanning && (
            <Button 
              onClick={() => {
                stopScanning();
                setTimeout(startScanning, 100);
              }} 
              variant="outline"
              className="flex items-center gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Reset
            </Button>
          )}
        </div>

        <p className="text-xs text-muted-foreground text-center">
          Position a barcode in front of your camera to scan
        </p>
      </CardContent>
    </Card>
  );
};

export default CameraScanner;