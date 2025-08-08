import React, { useState } from 'react';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Camera as CameraIcon, RotateCcw } from 'lucide-react';
import { BrowserMultiFormatReader } from '@zxing/library';

interface CameraScannerProps {
  onScan: (result: string) => void;
}

const CameraScanner: React.FC<CameraScannerProps> = ({ onScan }) => {
  const [isCapturing, setIsCapturing] = useState(false);
  const [error, setError] = useState<string>('');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

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
      
      if (image.dataUrl) {
        setCapturedImage(image.dataUrl);
        
        // Scan the captured image for barcodes
        try {
          console.log('Starting barcode scan of captured image...');
          const codeReader = new BrowserMultiFormatReader();
          
          // Create an image element from the data URL
          const img = new Image();
          img.onload = async () => {
            try {
              console.log('Image loaded, attempting to decode barcode...');
              const result = await codeReader.decodeFromImage(img);
              
              console.log('Barcode found:', result.getText());
              onScan(result.getText());
            } catch (scanError: any) {
              console.error('Barcode scanning failed:', scanError);
              setError('No barcode found in the captured image. Please try again with a clearer photo.');
            }
          };
          
          img.onerror = () => {
            setError('Failed to process the captured image. Please try again.');
          };
          
          img.src = image.dataUrl;
        } catch (scanError: any) {
          console.error('Barcode reader initialization failed:', scanError);
          setError('Barcode scanning not available. Please try again.');
        }
      }
      
      setIsCapturing(false);
    } catch (err: any) {
      console.error('Camera error details:', {
        message: err.message,
        name: err.name,
        code: err.code,
        stack: err.stack,
        fullError: err
      });
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
          Take a photo of the barcode for scanning
        </p>
      </CardContent>
    </Card>
  );
};

export default CameraScanner;