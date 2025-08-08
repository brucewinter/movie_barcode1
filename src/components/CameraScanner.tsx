import React, { useState, useEffect } from 'react';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Camera as CameraIcon, RotateCcw } from 'lucide-react';

interface CameraScannerProps {
  onScan: (result: string) => void;
}

const CameraScanner: React.FC<CameraScannerProps> = ({ onScan }) => {
  const [isCapturing, setIsCapturing] = useState(false);
  const [error, setError] = useState<string>('');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const BUILD_TAG = 'sim-v2';
  useEffect(() => { console.info('[CameraScanner]', BUILD_TAG, 'simulation enabled'); }, []);

  const takePhoto = async () => {
    try {
      setError('');
      setIsCapturing(true);
      
      console.log('Requesting camera permission through Capacitor...');
      
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
        promptLabelHeader: 'Scan Barcode',
        promptLabelPhoto: 'Take Photo',
        promptLabelPicture: 'Choose from Photos'
      });

      console.log('Photo captured successfully');
      
      const preview = image.dataUrl ?? image.webPath ?? null;
      if (preview) {
        setCapturedImage(preview);
      }
      
      // Simulate a barcode scan result to keep web flow working
      const simulatedBarcode = '1234567890123';
      onScan(simulatedBarcode);
      
      setIsCapturing(false);
    } catch (err: any) {
      console.error('Camera error:', err);
      setIsCapturing(false);
      
      let errorMessage = 'Failed to access camera. ';
      
      if (err.message?.includes('permission') || err.message?.includes('denied')) {
        errorMessage += 'Camera permission denied. Please grant camera access in your device settings.';
      } else if (err.message?.includes('cancelled')) {
        errorMessage += 'Camera capture was cancelled.';
      } else if (err.message?.includes('not available')) {
        errorMessage += 'Camera not available on this device.';
      } else {
        errorMessage += 'Please check camera permissions and try again.';
      }
      
      setError(errorMessage);
    }
  };

  const resetScanner = () => {
    setCapturedImage(null);
    setError('');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CameraIcon className="h-5 w-5" />
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
          {capturedImage ? (
            <img
              src={capturedImage}
              alt="Captured barcode"
              className="w-full max-w-md mx-auto rounded-lg"
              style={{ aspectRatio: '4/3', objectFit: 'cover' }}
            />
          ) : (
            <div className="w-full max-w-md mx-auto bg-gray-100 rounded-lg flex items-center justify-center" style={{ aspectRatio: '4/3' }}>
              <div className="text-center">
                <CameraIcon className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                <p className="text-sm text-gray-500">Tap "Take Photo" to capture barcode</p>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2 justify-center">
          <Button 
            onClick={takePhoto} 
            disabled={isCapturing}
            className="flex items-center gap-2"
          >
            <CameraIcon className="h-4 w-4" />
            {isCapturing ? 'Opening Camera...' : 'Take Photo'}
          </Button>
          
          {capturedImage && (
            <Button 
              onClick={resetScanner}
              variant="outline"
              className="flex items-center gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Reset
            </Button>
          )}
        </div>

        <p className="text-xs text-muted-foreground text-center">
          Take a photo of the barcode for scanning — Simulation mode active (sim-v2)
        </p>
      </CardContent>
    </Card>
  );
};

export default CameraScanner;