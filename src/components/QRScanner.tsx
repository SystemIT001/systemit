import React from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { X } from 'lucide-react';

interface QRScannerProps {
  onScan: (decodedText: string) => void;
  onClose: () => void;
}

const QRScanner: React.FC<QRScannerProps> = ({ onScan, onClose }) => {
  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '400px', width: '90%' }}>
        <div className="modal-header">
          <h2>Escanear Código de Barras</h2>
          <button className="btn-icon" onClick={onClose}><X size={20} /></button>
        </div>
        
        <div style={{ marginTop: '1rem', borderRadius: '8px', overflow: 'hidden', position: 'relative' }}>
          <Scanner 
            onScan={(result) => {
              if (result && result.length > 0) {
                onScan(result[0].rawValue);
              }
            }}
            onError={(error: any) => {
              console.error("Scanner Error:", error);
            }}
            components={{
              finder: false,
              torch: true,
              zoom: true,
              onOff: true
            }}
            formats={['code_128', 'code_39', 'ean_13', 'upc_a']}
            constraints={{
              facingMode: 'environment',
              focusMode: 'continuous',
              advanced: [{ zoom: 2.0 } as any]
            } as any}
            styles={{
              container: { width: '100%', aspectRatio: '4/3' }
            }}
          >
            {/* Custom Barcode Rectangle Finder Overlay */}
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '80%',
              height: '30%',
              border: '2px solid rgba(255, 255, 255, 0.5)',
              borderRadius: '8px',
              boxShadow: '0 0 0 4000px rgba(0, 0, 0, 0.4)',
              pointerEvents: 'none',
              zIndex: 10
            }}>
              {/* Laser line effect */}
              <style>{`
                @keyframes scanLine {
                  0% { top: 5%; }
                  50% { top: 95%; }
                  100% { top: 5%; }
                }
              `}</style>
              <div style={{
                width: '100%',
                height: '2px',
                backgroundColor: 'red',
                position: 'absolute',
                left: 0,
                boxShadow: '0 0 4px red',
                opacity: 0.7,
                animation: 'scanLine 2s infinite linear'
              }} />
            </div>
          </Scanner>
        </div>
        
        <p style={{ textAlign: 'center', marginTop: '1rem', color: 'var(--text-muted)' }}>
          Apunta la cámara al código de barras para capturarlo automáticamente.
        </p>
      </div>
    </div>
  );
};

export default QRScanner;
