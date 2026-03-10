import React, { useRef, useEffect, useState } from 'react';
import { Camera as CameraIcon, X, AlertTriangle } from 'lucide-react';

interface CameraProps {
  onCapture: (base64: string) => void;
  onClose: () => void;
  autoCaptureEnabled?: boolean;
}

export const Camera: React.FC<CameraProps> = ({ onCapture, onClose, autoCaptureEnabled = true }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string>('');
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isBlurred, setIsBlurred] = useState(false);
  const [captureStatus, setCaptureStatus] = useState<'scanning' | 'capturing' | 'blurred'>('scanning');

  useEffect(() => {
    startCamera();
    return () => stopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-capture logic
  useEffect(() => {
    if (!autoCaptureEnabled || !stream || captureStatus !== 'scanning') return;

    // Simulate product detection delay (1s) then start countdown (2s)
    const detectionTimer = setTimeout(() => {
      startAutoCaptureSequence();
    }, 1000);

    return () => clearTimeout(detectionTimer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stream, captureStatus]);

  const startAutoCaptureSequence = () => {
    // 1. Check for blur (Simulation)
    // In a real app, we'd analyze frame variance here
    const isBlurry = Math.random() > 0.9; // 10% chance of random blur for demo
    
    if (isBlurry) {
      setCaptureStatus('blurred');
      setIsBlurred(true);
      setTimeout(() => {
        setIsBlurred(false);
        setCaptureStatus('scanning');
      }, 2000); // Retry after 2s
      return;
    }

    // 2. Start Countdown
    setCaptureStatus('capturing');
    let count = 2;
    setCountdown(count);
    
    const interval = setInterval(() => {
      count--;
      if (count <= 0) {
        clearInterval(interval);
        setCountdown(null);
        capturePhoto();
      } else {
        setCountdown(count);
      }
    }, 1000);
  };

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error("Camera access error:", err);
      setError("Unable to access camera. Please allow permissions.");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        const base64Data = dataUrl.split(',')[1]; 
        onCapture(base64Data);
        stopCamera();
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center">
      {/* Header */}
      <div className="absolute top-4 right-4 z-10">
        <button onClick={onClose} className="p-2 bg-white/20 rounded-full text-white backdrop-blur-sm">
          <X size={24} />
        </button>
      </div>

      {error ? (
        <div className="text-white text-center p-4">
          <p className="mb-4">{error}</p>
          <button onClick={onClose} className="bg-red-500 px-4 py-2 rounded">Close</button>
        </div>
      ) : (
        <div className="relative w-full h-full flex flex-col">
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            className="w-full h-full object-cover"
          />
          <canvas ref={canvasRef} className="hidden" />
          
          {/* Overlays */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            {/* Viewfinder Frame */}
            <div className={`w-64 h-64 border-2 rounded-lg transition-colors duration-300 flex items-center justify-center
              ${isBlurred ? 'border-red-500 bg-red-500/10' : 'border-white/50'}
              ${countdown !== null ? 'border-green-400 border-4' : ''}
            `}>
              {countdown !== null && (
                <span className="text-6xl font-bold text-white drop-shadow-lg animate-pulse">{countdown}</span>
              )}
            </div>

            {/* Messages */}
            <div className="mt-8 bg-black/60 px-4 py-2 rounded-full backdrop-blur-md">
              {isBlurred ? (
                <div className="flex items-center text-red-400 font-bold gap-2">
                   <AlertTriangle size={20} />
                   <span>Image is blurred, please re-capture</span>
                </div>
              ) : countdown !== null ? (
                <span className="text-green-400 font-bold">Capturing automatically...</span>
              ) : (
                <span className="text-white">Point camera at product</span>
              )}
            </div>
          </div>
          
          {/* Manual Trigger (Fallback) */}
          <div className="absolute bottom-10 left-0 right-0 flex justify-center items-center pb-safe pointer-events-auto">
             <div className="border-4 border-white/30 rounded-full p-1">
                <button 
                  onClick={capturePhoto} 
                  className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform"
                >
                  <CameraIcon size={32} className="text-black" />
                </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};