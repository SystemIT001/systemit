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
        
        <div style={{ marginTop: '1rem', borderRadius: '8px', overflow: 'hidden' }}>
          <Scanner 
            onScan={(result) => {
              if (result && result.length > 0) {
                onScan(result[0].rawValue);
              }
            }}
            onError={(error: any) => {
              console.error("Scanner Error:", error);
            }}
            formats={['code_128', 'code_39', 'ean_13', 'upc_a']}
            constraints={{
              facingMode: 'environment',
              advanced: [{ zoom: 2.0 } as any]
            }}
          />
        </div>
        
        <p style={{ textAlign: 'center', marginTop: '1rem', color: 'var(--text-muted)' }}>
          Apunta la cámara al código de barras para capturarlo automáticamente.
        </p>
      </div>
    </div>
  );
};

export default QRScanner;
