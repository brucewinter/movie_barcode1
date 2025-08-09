import React, { useEffect, useRef, useState } from 'react';
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

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);

  const stopLiveScan = () => {
    try {
      codeReaderRef.current?.reset();
      const stream = (videoRef.current?.srcObject as MediaStream | null) || null;
      stream?.getTracks().forEach((t) => t.stop());
      if (videoRef.current) {
        (videoRef.current as HTMLVideoElement).srcObject = null;
      }
    } catch (e) {
      console.warn('Error stopping live scan', e);
    } finally {
      setIsCapturing(false);
    }
  };

  const takePhoto = async () => {
    // Start live video scan (auto-capture)
    setError('');
    setIsCapturing(true);
    try {
      const codeReader = new BrowserMultiFormatReader();
      codeReaderRef.current = codeReader;

      const devices = await codeReader.listVideoInputDevices();
      let deviceId = devices[0]?.deviceId;
      const back = devices.find((d) => /back|rear|environment/i.test(d.label));
      if (back) deviceId = back.deviceId;

      await codeReader.decodeFromVideoDevice(deviceId, videoRef.current!, (result, err) => {
        if (result) {
          onScan(result.getText());
          stopLiveScan();
        }
      });
    } catch (err) {
      console.error('Live scan failed, attempting photo fallback', err);
      // Optional fallback to single photo capture
      try {
        const image = await Camera.getPhoto({
          quality: 90,
          allowEditing: false,
          resultType: CameraResultType.DataUrl,
          source: CameraSource.Camera,
          promptLabelHeader: 'Scan Barcode',
          promptLabelPhoto: 'Capture',
          promptLabelPicture: 'Choose from Photos',
        });

        if (image.dataUrl) {
          const codeReader = new BrowserMultiFormatReader();
          const img = new Image();
          img.onload = async () => {
            try {
              const result = await codeReader.decodeFromImage(img);
              onScan(result.getText());
            } catch (scanError) {
              setError('No barcode found in the captured image. Please try again.');
            } finally {
              setIsCapturing(false);
            }
          };
          img.onerror = () => {
            setError('Failed to process the captured image. Please try again.');
            setIsCapturing(false);
          };
          img.src = image.dataUrl;
          return;
        }
        setIsCapturing(false);
      } catch (photoErr) {
        console.error('Camera fallback failed', photoErr);
        setError('Unable to access camera. Please check permissions and try again.');
        setIsCapturing(false);
      }
    }
  };

  useEffect(() => {
    return () => {
      stopLiveScan();
    };
  }, []);

  const resetScanner = () => {
    stopLiveScan();
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
        
        <div className="relative w-full max-w-md mx-auto" style={{ aspectRatio: '4/3' }}>
          <video
            ref={videoRef}
            className="absolute inset-0 h-full w-full rounded-lg object-cover"
            autoPlay
            muted
            playsInline
          />
          {!isCapturing && (
            <div className="absolute inset-0 rounded-lg bg-muted flex items-center justify-center">
              <div className="text-center">
                <CameraIcon className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Tap "Start Scan" and align the barcode</p>
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
            {isCapturing ? 'Scanning…' : 'Start Scan'}
          </Button>
          
          {isCapturing && (
            <Button 
              onClick={resetScanner}
              variant="outline"
              className="flex items-center gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Stop
            </Button>
          )}
        </div>

        <p className="text-xs text-muted-foreground text-center">
          Auto-capture: hold the barcode steady until detected
        </p>
      </CardContent>
    </Card>
  );
};

export default CameraScanner;