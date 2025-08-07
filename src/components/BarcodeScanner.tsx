import React, { useState } from 'react';
import { BarcodeScanner as CapacitorBarcodeScanner } from '@capacitor-community/barcode-scanner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Camera, X } from 'lucide-react';

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  onError?: (error: string) => void;
}

export const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onScan, onError }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [scannedCode, setScannedCode] = useState<string>('');

  const startScan = async () => {
    try {
      setIsScanning(true);
      
      // Check permissions
      const status = await CapacitorBarcodeScanner.checkPermission({ force: true });
      
      if (status.granted) {
        // Hide background to show camera
        document.body.style.background = 'transparent';
        
        // Start scanning
        const result = await CapacitorBarcodeScanner.startScan();
        
        if (result.hasContent) {
          setScannedCode(result.content);
          onScan(result.content);
        }
      } else {
        onError?.('Camera permission denied');
      }
    } catch (error) {
      console.error('Barcode scanning error:', error);
      onError?.('Failed to scan barcode');
    } finally {
      stopScan();
    }
  };

  const stopScan = () => {
    setIsScanning(false);
    CapacitorBarcodeScanner.stopScan();
    document.body.style.background = '';
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="h-5 w-5" />
          Barcode Scanner
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isScanning ? (
          <Button onClick={startScan} className="w-full">
            <Camera className="h-4 w-4 mr-2" />
            Scan Movie Barcode
          </Button>
        ) : (
          <div className="text-center space-y-4">
            <p className="text-sm text-muted-foreground">
              Point your camera at a barcode
            </p>
            <Button onClick={stopScan} variant="outline" className="w-full">
              <X className="h-4 w-4 mr-2" />
              Cancel Scan
            </Button>
          </div>
        )}
        
        {scannedCode && (
          <div className="p-3 bg-muted rounded-md">
            <p className="text-sm font-medium">Scanned Code:</p>
            <p className="text-sm text-muted-foreground">{scannedCode}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};