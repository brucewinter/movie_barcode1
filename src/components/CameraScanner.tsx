import React, { useEffect, useRef, useState } from 'react';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Camera as CameraIcon, RotateCcw, Flashlight } from 'lucide-react';
import { BrowserMultiFormatReader } from '@zxing/library';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface CameraScannerProps {
  onScan: (result: string) => void;
}

const CameraScanner: React.FC<CameraScannerProps> = ({ onScan }) => {
  const [isCapturing, setIsCapturing] = useState(false);
  const [error, setError] = useState<string>('');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  const [isTorchOn, setIsTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [vibrateOnScan, setVibrateOnScan] = useState(true);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);

  const getVideoTrack = () => {
    const stream = (videoRef.current?.srcObject as MediaStream | null) || null;
    return stream?.getVideoTracks()[0] || null;
  };

  const checkTorchSupport = () => {
    try {
      const track = getVideoTrack() as any;
      const caps = track?.getCapabilities?.();
      const supported = !!(caps && 'torch' in caps);
      setTorchSupported(supported);
      return supported;
    } catch {
      setTorchSupported(false);
      return false;
    }
  };

  const setTorch = async (on: boolean) => {
    try {
      const track = getVideoTrack() as any;
      if (!track) return;
      await track.applyConstraints({ advanced: [{ torch: on }] });
      setIsTorchOn(on);
    } catch (e) {
      console.warn('Torch toggle failed', e);
    }
  };

  // Auto-torch brightness monitor
  const brightnessTimerRef = useRef<number | null>(null);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const startBrightnessMonitor = () => {
    if (!offscreenCanvasRef.current) {
      offscreenCanvasRef.current = document.createElement('canvas');
    }
    if (brightnessTimerRef.current) return;
    brightnessTimerRef.current = window.setInterval(() => {
      if (!isCapturing) return;
      const video = videoRef.current;
      if (!video) return;
      const w = 160, h = 120;
      const canvas = offscreenCanvasRef.current!;
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      try {
        ctx.drawImage(video, 0, 0, w, h);
        const { data } = ctx.getImageData(0, 0, w, h);
        let sum = 0;
        const step = 4 * 8; // sample every 8th pixel
        for (let i = 0; i < data.length; i += step) {
          const r = data[i], g = data[i+1], b = data[i+2];
          const y = 0.2126*r + 0.7152*g + 0.0722*b; // luminance
          sum += y;
        }
        const samples = Math.ceil(data.length / step);
        const avg = sum / samples;
        const thresholdOn = 55; // low-light threshold
        if (avg < thresholdOn && torchSupported && !isTorchOn) {
          setTorch(true);
        }
      } catch {}
    }, 800);
  };

  const stopBrightnessMonitor = () => {
    if (brightnessTimerRef.current) {
      clearInterval(brightnessTimerRef.current);
      brightnessTimerRef.current = null;
    }
  };

  useEffect(() => {
    if (isCapturing) {
      const t = setTimeout(() => {
        const supported = checkTorchSupport();
        if (supported) startBrightnessMonitor();
      }, 400);
      return () => clearTimeout(t);
    } else {
      stopBrightnessMonitor();
      setIsTorchOn(false);
      setTorchSupported(false);
    }
  }, [isCapturing]);
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
      // Stop helpers and reset state
      try { setTorch(false); } catch {}
      stopBrightnessMonitor();
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
          try {
            if (vibrateOnScan && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
              // Vibrate briefly on successful scan
              (navigator as any).vibrate?.(100);
            }
          } catch {}
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
    setIsTorchOn(false);
    setTorchSupported(false);
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
          {isCapturing && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="relative w-[80%] h-[60%] border-2 border-primary/60 rounded-md">
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 w-1/2 h-px bg-primary/40" />
                <div className="absolute left-1/2 top-1/2 -translate-y-1/2 h-1/2 w-px bg-primary/40" />
              </div>
            </div>
          )}
          {!isCapturing && (
            <div className="absolute inset-0 rounded-lg bg-muted flex items-center justify-center">
              <div className="text-center">
                <CameraIcon className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Tap "Start Scan" and align the barcode</p>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2 justify-center">
          <Button 
            onClick={takePhoto} 
            disabled={isCapturing}
            className="flex items-center gap-2"
          >
            <CameraIcon className="h-4 w-4" />
            {isCapturing ? 'Scanning…' : 'Start Scan'}
          </Button>
          
          {isCapturing && (
            <>
              <Button 
                onClick={resetScanner}
                variant="outline"
                className="flex items-center gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                Stop
              </Button>

              {torchSupported && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setTorch(!isTorchOn)}
                  className="flex items-center gap-2"
                >
                  <Flashlight className="h-4 w-4" />
                  {isTorchOn ? 'Torch On' : 'Torch Off'}
                </Button>
              )}
            </>
          )}
        </div>

        <div className="flex items-center justify-center gap-3">
          <Label htmlFor="vibrate-on-scan" className="text-sm text-muted-foreground">
            Vibrate on scan
          </Label>
          <Switch id="vibrate-on-scan" checked={vibrateOnScan} onCheckedChange={setVibrateOnScan} />
        </div>

        <p className="text-xs text-muted-foreground text-center">
          Auto-capture: hold the barcode steady until detected
        </p>
      </CardContent>
    </Card>
  );
};

export default CameraScanner;