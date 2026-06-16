import React, { useRef } from 'react';
import SignatureCanvas from 'react-signature-canvas';

interface SignatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (signatureDataUrl: string) => void;
}

const SignatureModal: React.FC<SignatureModalProps> = ({ isOpen, onClose, onSave }) => {
  const sigCanvas = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && sigCanvas.current && containerRef.current) {
      // Ajustar dimensiones internas del canvas para evitar offset en celulares
      const canvas = sigCanvas.current.getCanvas();
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      canvas.width = containerRef.current.offsetWidth * ratio;
      canvas.height = containerRef.current.offsetHeight * ratio;
      canvas.getContext("2d").scale(ratio, ratio);
      sigCanvas.current.clear();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const clear = () => {
    sigCanvas.current?.clear();
  };

  const save = () => {
    if (sigCanvas.current?.isEmpty()) {
      alert("Por favor, dibuje una firma primero.");
      return;
    }
    const dataUrl = sigCanvas.current.getTrimmedCanvas().toDataURL('image/png');
    onSave(dataUrl);
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '1rem'
    }}>
      <div className="card" style={{ width: '100%', maxWidth: '500px', backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)' }}>
        <h3 style={{ marginBottom: '1rem' }}>Firma del Cliente</h3>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1rem', fontSize: '0.9rem' }}>
          Por favor, firme en el recuadro de abajo.
        </p>
        
        <div ref={containerRef} style={{ border: '2px dashed var(--border-color)', borderRadius: '8px', backgroundColor: 'white', marginBottom: '1rem', width: '100%', height: '200px' }}>
          <SignatureCanvas 
            ref={sigCanvas} 
            penColor="black"
            canvasProps={{ className: 'sigCanvas', style: { width: '100%', height: '100%' } }} 
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button className="btn-secondary" onClick={clear}>
            Limpiar
          </button>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button className="btn-primary" onClick={save}>
              Guardar Firma
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignatureModal;
