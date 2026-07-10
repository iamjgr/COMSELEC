'use client';

import React, { useEffect, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

interface QRScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onScanFailure?: (error: unknown) => void;
}

export default function QRScanner({ onScanSuccess, onScanFailure }: QRScannerProps) {
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;

    const html5QrCode = new Html5Qrcode("qr-reader");
    
    html5QrCode.start(
      { facingMode: "environment" },
      {
        fps: 10,
        // qrbox intentionally omitted — we use our own gold corner overlay
      },
      (decodedText) => {
        html5QrCode.stop().then(() => {
          onScanSuccess(decodedText);
        }).catch(err => {
          console.error("Failed to stop scanner", err);
        });
      },
      (errorMessage) => {
        if (onScanFailure) {
          onScanFailure(errorMessage);
        }
      }
    ).catch(err => {
      console.error("Failed to start scanner", err);
    });

    return () => {
      if (html5QrCode.isScanning) {
        html5QrCode.stop().catch(console.error);
      }
    };
  }, [isClient, onScanSuccess, onScanFailure]);

  if (!isClient) return <div>Loading scanner...</div>;

  return (
    <div className="w-full overflow-hidden rounded-xl bg-black relative">
      <div id="qr-reader" className="w-full h-full" />
    </div>
  );
}
