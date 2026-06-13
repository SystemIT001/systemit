import React, { useEffect, useState } from 'react';
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { X } from 'lucide-react';

interface QRScannerProps {
  onScan: (decodedText: string) => void;
  onClose: () => void;
}

const QRScanner: React.FC<QRScannerProps> = ({ onScan, onClose }) => {
  const [error, setError] = useState<string>('');

  useEffect(() => {
    // We create the scanner on mount
    const scannerId = "qr-reader";
    
    try {
      const html5QrcodeScanner = new Html5QrcodeScanner(
        scannerId,
        { 
          fps: 10, 
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
          formatsToSupport: [
            Html5QrcodeSupportedFormats.QR_CODE,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.UPC_A
          ],
          rememberLastUsedCamera: true
        },
        /* verbose= */ false
      );

      html5QrcodeScanner.render(
        (decodedText) => {
          html5QrcodeScanner.clear().catch(console.error);
          onScan(decodedText);
        },
        (errorMessage) => {
          // It's normal for it to fail continuously while looking for a QR
          // We don't want to spam the user with errors unless it's a camera init error
          if (!errorMessage.includes("NotFound")) {
             console.log("QR Scan Error:", errorMessage);
          }
        }
      );

      // Cleanup on unmount
      return () => {
        html5QrcodeScanner.clear().catch(console.error);
      };
    } catch (err) {
      setError("No se pudo inicializar la cámara. Asegúrate de dar permisos.");
      console.error(err);
    }
  }, [onScan]);

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '400px' }}>
        <div className="modal-header">
          <h2>Escanear Código</h2>
          <button className="btn-icon" onClick={onClose}><X size={20} /></button>
        </div>
        
        {error && <div style={{ color: 'var(--danger-color)', marginBottom: '1rem' }}>{error}</div>}
        
        <div id="qr-reader" style={{ width: '100%' }}></div>
        
        <p style={{ textAlign: 'center', marginTop: '1rem', color: 'var(--text-muted)' }}>
          Apunta la cámara al código QR o de barras para capturarlo automáticamente.
        </p>
      </div>
    </div>
  );
};

export default QRScanner;
