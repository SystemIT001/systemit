import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  Handle,
  Position,
  useReactFlow,
  ReactFlowProvider,
  EdgeLabelRenderer,
  NodeResizer,
} from '@xyflow/react';
import type {
  Edge,
  Node,
  OnNodesChange,
  OnEdgesChange,
  OnConnect,
  EdgeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { v4 as uuidv4 } from 'uuid';
import { useInventory } from '../hooks/useInventory';
import { useProjects } from '../hooks/useProjects';
import { useQuotes } from '../hooks/useQuotes';
import './PipingCalculatorPilot.css';

// --- Custom Nodes ---

const centralHandleStyle = { top: '50%', left: '50%', transform: 'translate(-50%, -50%)', opacity: 0 };

const edgeHandleStyle: React.CSSProperties = {
  width: '10px',
  height: '10px',
  backgroundColor: 'var(--primary-color)',
  border: '2px solid white',
  borderRadius: '50%',
  transition: 'opacity 0.2s, transform 0.2s',
  zIndex: 10,
  // opacity y pointer-events son controlados por CSS para no bloquear el drag
};

const JunctionNode = () => (
  <div className="junction-node">
    <Handle type="target" position={Position.Top} style={centralHandleStyle} />
    <Handle type="source" position={Position.Bottom} style={centralHandleStyle} />
    <div className="junction-core"></div>
  </div>
);

// Device SVG icons for network/security equipment
const DEVICE_ICONS: Record<string, React.ReactNode> = {
  camara_domo: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="9"/>
      <circle cx="12" cy="12" r="4"/>
      <line x1="12" y1="3" x2="12" y2="8"/>
      <path d="M6 18 L12 12 L18 18"/>
    </svg>
  ),
  camara_bullet: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="9" width="13" height="6" rx="2"/>
      <polygon points="16,9 21,7 21,17 16,15"/>
      <circle cx="7" cy="12" r="1.5" fill="currentColor"/>
    </svg>
  ),
  gabinete: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="3" width="18" height="18" rx="2"/>
      <line x1="3" y1="8" x2="21" y2="8"/>
      <line x1="3" y1="16" x2="21" y2="16"/>
      <circle cx="18" cy="5.5" r="1" fill="currentColor"/>
      <circle cx="18" cy="19.5" r="1" fill="currentColor"/>
    </svg>
  ),
  bandeja_red: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="2" y="8" width="20" height="8" rx="1"/>
      <line x1="6" y1="8" x2="6" y2="16"/>
      <line x1="10" y1="8" x2="10" y2="16"/>
      <line x1="14" y1="8" x2="14" y2="16"/>
      <line x1="18" y1="8" x2="18" y2="16"/>
      <path d="M6 5 L6 8 M10 5 L10 8 M14 5 L14 8 M18 5 L18 8" strokeDasharray="1 1"/>
    </svg>
  ),
  dvr_nvr: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="2" y="6" width="20" height="12" rx="2"/>
      <circle cx="17" cy="12" r="2"/>
      <rect x="5" y="9" width="8" height="2" rx="1"/>
      <rect x="5" y="13" width="5" height="2" rx="1"/>
    </svg>
  ),
  ups: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="4" y="4" width="16" height="16" rx="2"/>
      <path d="M12 8 L9 13 L12 13 L12 16 L15 11 L12 11 Z" fill="currentColor" stroke="none"/>
    </svg>
  ),
  router: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="2" y="10" width="20" height="7" rx="2"/>
      <circle cx="17" cy="13.5" r="1" fill="currentColor"/>
      <line x1="7" y1="10" x2="5" y2="5"/>
      <line x1="12" y1="10" x2="12" y2="5"/>
      <line x1="17" y1="10" x2="19" y2="5"/>
    </svg>
  ),
  switch: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="2" y="9" width="20" height="6" rx="2"/>
      <circle cx="6" cy="12" r="1" fill="currentColor"/>
      <circle cx="9" cy="12" r="1" fill="currentColor"/>
      <circle cx="12" cy="12" r="1" fill="currentColor"/>
      <circle cx="15" cy="12" r="1" fill="currentColor"/>
      <circle cx="18" cy="12" r="1" fill="currentColor"/>
      <path d="M5 9 L5 6 M9 9 L9 6 M13 9 L13 6 M17 9 L17 6" />
    </svg>
  ),
  patch_panel: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="2" y="7" width="20" height="10" rx="1"/>
      <circle cx="5.5" cy="12" r="1.2" fill="currentColor"/>
      <circle cx="9" cy="12" r="1.2" fill="currentColor"/>
      <circle cx="12.5" cy="12" r="1.2" fill="currentColor"/>
      <circle cx="16" cy="12" r="1.2" fill="currentColor"/>
      <circle cx="19.5" cy="12" r="1.2" fill="currentColor"/>
      <line x1="5.5" y1="17" x2="5.5" y2="21"/>
      <line x1="9" y1="17" x2="9" y2="21"/>
      <line x1="12.5" y1="17" x2="12.5" y2="21"/>
      <line x1="16" y1="17" x2="16" y2="21"/>
      <line x1="19.5" y1="17" x2="19.5" y2="21"/>
    </svg>
  ),
  caja_2x4: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8">
      {/* Cuerpo rectangular 2x4 (proporción 1:2) */}
      <rect x="5" y="7" width="14" height="10" rx="1"/>
      {/* Tapa con KO central */}
      <rect x="5" y="7" width="14" height="3" rx="1"/>
      {/* Knockout circular en el centro */}
      <circle cx="12" cy="8.5" r="1.2"/>
      {/* Agujero de fijación izquierdo */}
      <circle cx="7" cy="14" r="0.7" fill="currentColor"/>
      {/* Agujero de fijación derecho */}
      <circle cx="17" cy="14" r="0.7" fill="currentColor"/>
      {/* Etiqueta 2x4 */}
      <text x="12" y="20.5" textAnchor="middle" fontSize="3.5" fill="currentColor" stroke="none" fontFamily="monospace">2x4</text>
    </svg>
  ),
  caja_4x4: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8">
      {/* Cuerpo cuadrado 4x4 */}
      <rect x="4" y="4" width="16" height="16" rx="1"/>
      {/* Tapa con KO */}
      <rect x="4" y="4" width="16" height="3.5" rx="1"/>
      {/* Knockout central superior */}
      <circle cx="12" cy="5.8" r="1.2"/>
      {/* Knockout lado izquierdo */}
      <circle cx="5.5" cy="12" r="1.2"/>
      {/* Knockout lado derecho */}
      <circle cx="18.5" cy="12" r="1.2"/>
      {/* Agujeros de fijación en esquinas */}
      <circle cx="6.5" cy="18.5" r="0.7" fill="currentColor"/>
      <circle cx="17.5" cy="18.5" r="0.7" fill="currentColor"/>
      {/* Etiqueta 4x4 */}
      <text x="12" y="15" textAnchor="middle" fontSize="3.5" fill="currentColor" stroke="none" fontFamily="monospace">4x4</text>
    </svg>
  ),
  junction: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="5" fill="currentColor" />
      <path d="M12 2 L12 7 M12 17 L12 22 M2 12 L7 12 M17 12 L22 12" />
    </svg>
  ),
};

const IconNode = ({ data, selected }: any) => {
  const rotation = data.rotation || 0;
  const size = data.size || 40;
  const isCamera = data.type === 'camara_domo' || data.type === 'camara_bullet';
  const showFov = isCamera && data.showFov !== false;

  // Parámetros de Cámara para DORI
  const resolution = data.resolution || 4; // default 4MP (opciones: 2, 4, 8)
  const focalLength = data.focalLength || 2.8; // default 2.8mm
  const sensorSize = data.sensorSize || '1/2.8'; // default 1/2.8"
  const scale = data.scalePixelsPerMeter || 20; // default 20 px/meter

  // Fórmulas DORI simplificadas basadas en el sensor de cámara
  // Ancho del sensor en mm: 1/3" -> 4.8mm, 1/1.8" -> 7.2mm, 1/2.8" -> 5.4mm
  const sensorWidth = sensorSize === '1/3' ? 4.8 : (sensorSize === '1/1.8' ? 7.2 : 5.4);
  const hfovDegrees = 2 * Math.atan(sensorWidth / (2 * focalLength)) * (180 / Math.PI);
  const tanHalf = sensorWidth / (2 * focalLength);

  // Resolución horizontal en píxeles (2MP -> 1920, 4MP -> 2560, 8MP -> 3840)
  const hres = resolution === 2 ? 1920 : (resolution === 8 ? 3840 : 2560);

  // Distancias DORI en metros: D = Hres / (2 * PPM * tan(HFOV/2))
  const dDetect = hres / (2 * 25 * tanHalf);
  const dObserve = hres / (2 * 62 * tanHalf);
  const dRecognize = hres / (2 * 125 * tanHalf);
  const dIdentify = hres / (2 * 250 * tanHalf);

  // Radios en píxeles para el plano 2D
  const rDetect = dDetect * scale;
  const rObserve = dObserve * scale;
  const rRecognize = dRecognize * scale;
  const rIdentify = dIdentify * scale;

  const getArcPath = (radius: number, hfovDeg: number) => {
    const alpha = (hfovDeg * Math.PI / 180) / 2;
    const x1 = -radius * Math.sin(alpha);
    const y1 = -radius * Math.cos(alpha);
    const x2 = radius * Math.sin(alpha);
    const y2 = -radius * Math.cos(alpha);
    return `M 0 0 L ${x1.toFixed(1)} ${y1.toFixed(1)} A ${radius.toFixed(1)} ${radius.toFixed(1)} 0 0 1 ${x2.toFixed(1)} ${y2.toFixed(1)} Z`;
  };

  return (
    <div 
      className={`icon-node ${selected ? 'selected' : ''}`} 
      title={data.label}
      style={{
        width: `${size}px`,
        height: `${size}px`,
      }}
    >
      {/* 4 edge connection handles — clases CSS para posicionamiento y pointer-events */}
      <Handle type="target" position={Position.Top}    id="top"    className="handle-top"    style={edgeHandleStyle} />
      <Handle type="source" position={Position.Bottom} id="bottom" className="handle-bottom" style={edgeHandleStyle} />
      <Handle type="target" position={Position.Left}   id="left"   className="handle-left"   style={edgeHandleStyle} />
      <Handle type="source" position={Position.Right}  id="right"  className="handle-right"  style={edgeHandleStyle} />

      <div style={{
        transform: `rotate(${rotation}deg)`,
        transformOrigin: 'center',
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative'
      }}>
        {showFov && (
          <svg className="fov-cone-container" style={{ position: 'absolute', top: '50%', left: '50%', overflow: 'visible', width: 0, height: 0, pointerEvents: 'none' }}>
            {/* Zonas DORI: Detección -> Observación -> Reconocimiento -> Identificación */}
            <path className="fov-cone-arc" d={getArcPath(rDetect, hfovDegrees)} fill="rgba(46, 204, 113, 0.12)" stroke="rgba(46, 204, 113, 0.35)" strokeWidth="0.8" />
            <path className="fov-cone-arc" d={getArcPath(rObserve, hfovDegrees)} fill="rgba(241, 196, 15, 0.15)" stroke="rgba(241, 196, 15, 0.35)" strokeWidth="0.8" />
            <path className="fov-cone-arc" d={getArcPath(rRecognize, hfovDegrees)} fill="rgba(230, 126, 34, 0.18)" stroke="rgba(230, 126, 34, 0.35)" strokeWidth="0.8" />
            <path className="fov-cone-arc" d={getArcPath(rIdentify, hfovDegrees)} fill="rgba(231, 76, 60, 0.2)" stroke="rgba(231, 76, 60, 0.45)" strokeWidth="0.8" />
            <line x1="0" y1="0" x2="0" y2={-rDetect} stroke="rgba(255, 255, 255, 0.45)" strokeDasharray="3 3" />
          </svg>
        )}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
          {DEVICE_ICONS[data.type] || <span>{data.icon}</span>}
        </div>
      </div>
      
      <div style={{
        position: 'absolute',
        bottom: `-${Math.max(14, size * 0.4)}px`,
        left: '50%',
        transform: 'translateX(-50%)',
        fontSize: '0.6rem',
        color: 'var(--text-muted)',
        whiteSpace: 'nowrap',
        maxWidth: '75px',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        textAlign: 'center'
      }}>
        {data.label}
      </div>
    </div>
  );
};

const FloorplanNode = ({ data }: any) => (
  <div style={{ pointerEvents: 'none' }}>
    <img src={data.url} alt="Plano de Fondo" style={{ opacity: 0.5, maxWidth: 'none', display: 'block' }} />
  </div>
);

// --- NEW STRUCTURAL NODES ---

const RoomNode = ({ selected, data }: any) => {
  const isStructureMode = data.isStructureMode;
  const color = data.color || 'transparent'; // Clean transparent background
  const label = data.label || 'Habitación';
  const widthMeters = data.widthMeters || 5;
  const heightMeters = data.heightMeters || 4;

  return (
    <div style={{
      width: '100%',
      height: '100%',
      backgroundColor: color,
      border: `3px solid ${selected && isStructureMode ? 'var(--primary-color)' : 'var(--text-main)'}`, // Thick solid wall line!
      borderRadius: '2px', // Crisp architectural corner
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '8px',
      boxSizing: 'border-box',
      position: 'relative',
      minWidth: '50px',
      minHeight: '50px',
    }}>
      {isStructureMode && (
        <NodeResizer 
          color="var(--primary-color)" 
          minWidth={50} 
          minHeight={50} 
          isVisible={selected}
        />
      )}
      <div style={{ 
        fontWeight: 700, 
        color: 'var(--text-main)', 
        fontSize: '0.75rem', 
        textAlign: 'center', 
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        wordBreak: 'break-all' 
      }}>
        {label}
      </div>
      <div style={{ 
        fontSize: '0.65rem', 
        color: 'var(--text-muted)', 
        marginTop: '2px',
        fontWeight: 600
      }}>
        {widthMeters.toFixed(1)} × {heightMeters.toFixed(1)}m
      </div>
    </div>
  );
};

const WallPointNode = ({ data }: any) => {
  const isStructureMode = data.isStructureMode;
  if (!isStructureMode) return <div style={{ width: 0, height: 0, opacity: 0 }} />;
  return (
    <div style={{
      width: '12px',
      height: '12px',
      backgroundColor: 'var(--text-main)',
      border: '2px solid var(--bg-color)',
      borderRadius: '50%',
      boxShadow: 'var(--shadow-sm)',
    }}>
      <Handle type="target" position={Position.Top} style={centralHandleStyle} />
      <Handle type="source" position={Position.Bottom} style={centralHandleStyle} />
    </div>
  );
};

// Dimensiones reales en metros para cada tipo de mueble/elemento
const STRUCTURE_REAL_DIMS: Record<string, { w: number; h: number }> = {
  room:         { w: 5,   h: 4   },
  door:         { w: 0.9, h: 0.9 },
  window:       { w: 1.2, h: 0.1 },
  cama:         { w: 2,   h: 1.4 },
  sofa:         { w: 2.2, h: 0.9 },
  mesa:         { w: 1.2, h: 0.8 },
  tv:           { w: 1.4, h: 0.4 },
  refrigerador: { w: 0.7, h: 0.7 },
  estufa:       { w: 0.6, h: 0.6 },
  inodoro:      { w: 0.4, h: 0.7 },
  arbol:        { w: 1,   h: 1   },
  vehiculo:     { w: 1.8, h: 4   },
  poste:        { w: 0.3, h: 0.3 },
  planta:       { w: 0.5, h: 0.5 },
};

const StructureIconNode = ({ data, selected }: any) => {
  const rotation = data.rotation || 0;
  const isStructureMode = data.isStructureMode;

  return (
    <div
      className={`structure-icon-node ${selected && isStructureMode ? 'selected' : ''}`}
      style={{
        transform: `rotate(${rotation}deg)`,
        transition: 'transform 0.1s ease',
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'transparent', // Transparent background
        border: selected && isStructureMode ? '1px dashed var(--primary-color)' : 'none', // Thin selection outline
        color: 'var(--text-main)', // Wall/object stroke color adapting to light/dark themes
        boxSizing: 'border-box',
        position: 'relative'
      }}
    >
      {isStructureMode && (
        <NodeResizer color="var(--primary-color)" minWidth={20} minHeight={20} isVisible={selected} />
      )}
      {data.type === 'door' && (
        <svg viewBox="0 0 100 100" width="100%" height="100%" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round">
          {/* Mask to block the wall behind the door opening */}
          <rect x="10" y="78" width="80" height="22" fill="var(--bg-color)" stroke="none" />
          {/* Straight wall frame / sill */}
          <line x1="10" y1="90" x2="90" y2="90" strokeWidth="1.5" opacity="0.6" />
          {/* Door panel at 90 deg */}
          <line x1="10" y1="90" x2="10" y2="10" />
          {/* Swing arc */}
          <path d="M 10 10 A 80 80 0 0 1 90 90" strokeDasharray="6 6" />
        </svg>
      )}
      {data.type === 'window' && (
        <svg viewBox="0 0 100 20" width="100%" height="100%" fill="none" stroke="currentColor" strokeWidth="4" preserveAspectRatio="none">
          <rect x="5" y="2" width="90" height="16" fill="var(--bg-color)" />
          <line x1="5" y1="10" x2="95" y2="10" />
        </svg>
      )}
      {data.type === 'arbol' && (
        <svg viewBox="0 0 100 100" width="100%" height="100%" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="50" cy="50" r="42" strokeDasharray="6 4" />
          <circle cx="50" cy="50" r="28" />
          <line x1="50" y1="50" x2="50" y2="12" />
          <line x1="50" y1="50" x2="82" y2="68" />
          <line x1="50" y1="50" x2="18" y2="68" />
        </svg>
      )}
      {data.type === 'vehiculo' && (
        <svg viewBox="0 0 100 200" width="100%" height="100%" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
          <rect x="15" y="10" width="70" height="180" rx="20" />
          <line x1="25" y1="65" x2="75" y2="65" />
          <path d="M 25 65 Q 50 45 75 65" />
          <line x1="25" y1="145" x2="75" y2="145" />
          <path d="M 25 145 Q 50 160 75 145" />
          <rect x="5" y="55" width="10" height="20" rx="3" />
          <rect x="85" y="55" width="10" height="20" rx="3" />
        </svg>
      )}
      {data.type === 'poste' && (
        <svg viewBox="0 0 100 100" width="100%" height="100%" fill="none" stroke="currentColor" strokeWidth="4">
          <circle cx="50" cy="50" r="8" fill="currentColor" />
          <line x1="15" y1="50" x2="85" y2="50" />
          <line x1="50" y1="15" x2="50" y2="85" />
        </svg>
      )}
      {data.type === 'cama' && (
        <svg viewBox="0 0 100 100" width="100%" height="100%" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <rect x="5" y="5" width="90" height="90" rx="4" />
          <line x1="5" y1="35" x2="95" y2="35" />
          <rect x="15" y="10" width="28" height="18" rx="2" />
          <rect x="57" y="10" width="28" height="18" rx="2" />
        </svg>
      )}
      {data.type === 'sofa' && (
        <svg viewBox="0 0 100 100" width="100%" height="100%" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <rect x="5" y="5" width="90" height="90" rx="8" />
          <line x1="50" y1="20" x2="50" y2="95" />
          <rect x="5" y="20" width="12" height="75" rx="2" />
          <rect x="83" y="20" width="12" height="75" rx="2" />
          <line x1="5" y1="20" x2="95" y2="20" />
        </svg>
      )}
      {data.type === 'mesa' && (
        <svg viewBox="0 0 100 100" width="100%" height="100%" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <rect x="25" y="15" width="50" height="70" rx="4" />
          <rect x="10" y="25" width="12" height="15" rx="2" />
          <rect x="10" y="60" width="12" height="15" rx="2" />
          <rect x="78" y="25" width="12" height="15" rx="2" />
          <rect x="78" y="60" width="12" height="15" rx="2" />
        </svg>
      )}
      {data.type === 'refrigerador' && (
        <svg viewBox="0 0 100 100" width="100%" height="100%" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
          <rect x="5" y="5" width="90" height="90" rx="4" />
          <line x1="5" y1="45" x2="95" y2="45" />
          <rect x="12" y="25" width="6" height="35" rx="1" fill="currentColor" />
        </svg>
      )}
      {data.type === 'tv' && (
        <svg viewBox="0 0 100 40" width="100%" height="100%" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" preserveAspectRatio="none">
          <rect x="5" y="5" width="90" height="30" rx="2" />
          <line x1="15" y1="18" x2="85" y2="18" />
          <rect x="35" y="18" width="30" height="6" rx="1" fill="currentColor" />
        </svg>
      )}
      {data.type === 'inodoro' && (
        <svg viewBox="0 0 100 100" width="100%" height="100%" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="20" y="5" width="60" height="25" rx="3" />
          <path d="M 30 30 C 30 75, 70 75, 70 30 Z" />
          <ellipse cx="50" cy="48" rx="14" ry="18" />
        </svg>
      )}
      {data.type === 'estufa' && (
        <svg viewBox="0 0 100 100" width="100%" height="100%" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
          <rect x="5" y="5" width="90" height="90" rx="4" />
          <circle cx="30" cy="30" r="12" />
          <circle cx="70" cy="30" r="12" />
          <circle cx="30" cy="70" r="12" />
          <circle cx="70" cy="70" r="12" />
        </svg>
      )}
      {data.type === 'planta' && (
        <svg viewBox="0 0 100 100" width="100%" height="100%" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
          <circle cx="50" cy="50" r="15" />
          <path d="M 50 35 C 50 20, 60 10, 50 5 C 40 10, 50 20, 50 35 Z" />
          <path d="M 50 65 C 50 80, 60 90, 50 95 C 40 90, 50 80, 50 65 Z" />
          <path d="M 35 50 C 20 50, 10 60, 5 50 C 10 40, 20 50, 35 50 Z" />
          <path d="M 65 50 C 80 50, 90 60, 95 50 Q 90 40, 65 50 Z" />
        </svg>
      )}

      {isStructureMode && selected && data.widthMeters !== undefined && data.heightMeters !== undefined && (
        <div style={{
          position: 'absolute',
          bottom: '-18px',
          left: '50%',
          transform: 'translateX(-50%)',
          fontSize: '0.6rem',
          color: 'var(--text-main)',
          backgroundColor: 'var(--surface-color)',
          padding: '1px 4px',
          borderRadius: '3px',
          border: '1px solid var(--primary-color)',
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
          zIndex: 10,
          fontWeight: 'bold',
          boxShadow: 'var(--shadow-sm)'
        }}>
          {data.widthMeters.toFixed(1)}m × {data.heightMeters.toFixed(1)}m
        </div>
      )}
    </div>
  );
};

// --- CABLE ROUTING AND PIPE SIZING HELPERS ---
interface CableTypeConfig {
  id: string;
  name: string;
  diameter: string;
  capacities: { size: string; maxCables: number }[];
}

const CABLE_CONFIGS: CableTypeConfig[] = [
  {
    id: 'cat5e',
    name: 'Cat 5e',
    diameter: '0.200"',
    capacities: [
      { size: '1/2"', maxCables: 2 },
      { size: '3/4"', maxCables: 5 },
      { size: '1"', maxCables: 9 },
      { size: '1 1/4"', maxCables: 15 },
      { size: '1 1/2"', maxCables: 25 },
      { size: '2"', maxCables: 40 },
      { size: '2 1/2"', maxCables: 70 },
      { size: '3"', maxCables: 100 },
    ]
  },
  {
    id: 'cat6',
    name: 'Cat 6',
    diameter: '0.250"',
    capacities: [
      { size: '1/2"', maxCables: 2 },
      { size: '3/4"', maxCables: 4 },
      { size: '1"', maxCables: 6 },
      { size: '1 1/4"', maxCables: 10 },
      { size: '1 1/2"', maxCables: 14 },
      { size: '2"', maxCables: 26 },
      { size: '2 1/2"', maxCables: 40 },
      { size: '3"', maxCables: 58 },
    ]
  },
  {
    id: 'cat6a_354',
    name: 'Cat 6A (0.354")',
    diameter: '0.354"',
    capacities: [
      { size: '1/2"', maxCables: 1 },
      { size: '3/4"', maxCables: 2 },
      { size: '1"', maxCables: 3 },
      { size: '1 1/4"', maxCables: 5 },
      { size: '1 1/2"', maxCables: 7 },
      { size: '2"', maxCables: 13 },
      { size: '2 1/2"', maxCables: 20 },
      { size: '3"', maxCables: 29 },
    ]
  },
  {
    id: 'cat6a_330',
    name: 'Cat 6A (0.330")',
    diameter: '0.330"',
    capacities: [
      { size: '1/2"', maxCables: 1 },
      { size: '3/4"', maxCables: 2 },
      { size: '1"', maxCables: 4 },
      { size: '1 1/4"', maxCables: 6 },
      { size: '1 1/2"', maxCables: 8 },
      { size: '2"', maxCables: 15 },
      { size: '2 1/2"', maxCables: 23 },
      { size: '3"', maxCables: 33 },
    ]
  },
  {
    id: 'cat6_ftp',
    name: 'Cat 6 FTP',
    diameter: '0.290"',
    capacities: [
      { size: '1/2"', maxCables: 1 },
      { size: '3/4"', maxCables: 3 },
      { size: '1"', maxCables: 5 },
      { size: '1 1/4"', maxCables: 7 },
      { size: '1 1/2"', maxCables: 11 },
      { size: '2"', maxCables: 19 },
      { size: '2 1/2"', maxCables: 30 },
      { size: '3"', maxCables: 43 },
    ]
  }
];

function getPipeSize(cableCount: number, cableTypeId: string): string {
  const config = CABLE_CONFIGS.find((c) => c.id === cableTypeId) || CABLE_CONFIGS[1];
  if (cableCount === 0) return config.capacities[0].size;
  const matched = config.capacities.find((cap) => cableCount <= cap.maxCables);
  return matched ? matched.size : `>${config.capacities[config.capacities.length - 1].size}`;
}

function computeCableRoutes(nodes: Node[], edges: Edge[]) {
  const adj: Record<string, { node: string; edgeId: string; weight: number }[]> = {};
  
  nodes.forEach(n => {
    adj[n.id] = [];
  });
  
  edges.forEach(e => {
    // Skip walls
    if (e.type === 'wallSegment') return;
    
    const u = e.source;
    const v = e.target;
    const weight = (e.data?.length as number) || 1;
    
    if (adj[u] && adj[v]) {
      adj[u].push({ node: v, edgeId: e.id, weight });
      adj[v].push({ node: u, edgeId: e.id, weight });
    }
  });

  const hubs = nodes.filter(n => n.type === 'iconNode' && n.data?.type === 'gabinete').map(n => n.id);
  const cameras = nodes.filter(n => n.type === 'iconNode' && (n.data?.type === 'camara_domo' || n.data?.type === 'camara_bullet')).map(n => n.id);

  const edgeCableCount: Record<string, number> = {};
  edges.forEach(e => {
    if (e.type !== 'wallSegment') {
      edgeCableCount[e.id] = 0;
    }
  });

  let totalCableLength = 0;

  cameras.forEach(camId => {
    if (hubs.length === 0) return;

    const dist: Record<string, number> = {};
    const prev: Record<string, { node: string; edgeId: string } | null> = {};
    const visited = new Set<string>();

    nodes.forEach(n => {
      dist[n.id] = Infinity;
      prev[n.id] = null;
    });

    dist[camId] = 0;

    const activeNodes = new Set(nodes.map(n => n.id));

    while (activeNodes.size > 0) {
      let u: string | null = null;
      let minDist = Infinity;
      activeNodes.forEach(nodeId => {
        if (dist[nodeId] < minDist) {
          minDist = dist[nodeId];
          u = nodeId;
        }
      });

      if (u === null || minDist === Infinity) break;

      activeNodes.delete(u);
      visited.add(u);

      if (hubs.includes(u)) break;

      const neighbors = adj[u] || [];
      for (const neighbor of neighbors) {
        if (visited.has(neighbor.node)) continue;
        const alt = dist[u] + neighbor.weight;
        if (alt < dist[neighbor.node]) {
          dist[neighbor.node] = alt;
          prev[neighbor.node] = { node: u, edgeId: neighbor.edgeId };
        }
      }
    }

    let closestHub: string | null = null;
    let minHubDist = Infinity;
    hubs.forEach(hId => {
      if (dist[hId] < minHubDist) {
        minHubDist = dist[hId];
        closestHub = hId;
      }
    });

    if (closestHub && minHubDist !== Infinity) {
      // Each camera has its OWN dedicated cable from camera → gabinete.
      // So we add the full path distance (minHubDist) for this camera independently.
      totalCableLength += minHubDist;

      // Still mark which edges carry cables (for pipe sizing per segment)
      let curr: any = closestHub;
      let iterations = 0;
      const maxIterations = nodes.length;
      while (curr !== camId && iterations < maxIterations) {
        const step = prev[curr];
        if (!step) break;
        edgeCableCount[step.edgeId] = (edgeCableCount[step.edgeId] || 0) + 1;
        curr = step.node;
        iterations++;
      }
    }
  });

  return {
    edgeCableCount,
    totalCableLength,
    hasHubs: hubs.length > 0,
  };
}

// --- Custom Wall Segment Edge ---
const WallSegmentEdge: React.FC<EdgeProps> = ({ id, sourceX, sourceY, targetX, targetY, style, data }) => {
  const { setEdges } = useReactFlow();
  const isStructureMode = data?.isStructureMode;
  const edgePath = `M${sourceX},${sourceY} L${targetX},${targetY}`;
  const midX = (sourceX + targetX) / 2;
  const midY = (sourceY + targetY) / 2;

  const onDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEdges((eds) => eds.filter((edge) => edge.id !== id));
  };

  return (
    <>
      <path
        d={edgePath}
        fill="none"
        strokeWidth={10}
        stroke="#2c3e50"
        style={{
          stroke: 'var(--text-main)',
          opacity: style?.opacity ?? 1,
        }}
      />
      {isStructureMode && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${midX}px,${midY}px)`,
              pointerEvents: 'all',
              zIndex: 10,
            }}
            className="nodrag nopan"
          >
            <button
              onClick={onDeleteClick}
              style={{
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                backgroundColor: '#e74c3c',
                color: '#fff',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '10px',
                fontWeight: 'bold',
                boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
              }}
              title="Eliminar pared"
            >
              ×
            </button>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
};

// --- Custom Bendable Edge (draggable midpoint) ---
const BendableEdge: React.FC<EdgeProps> = ({ id, source, target, sourceHandleId, targetHandleId, sourceX, sourceY, targetX, targetY, data, style, label, selected }) => {
  const { setEdges, setNodes, screenToFlowPosition } = useReactFlow();
  const isDragging = useRef(false);

  // Default bend point is the midpoint
  const bendX = (data?.bendX as number) ?? (sourceX + targetX) / 2;
  const bendY = (data?.bendY as number) ?? (sourceY + targetY) / 2;

  // Polyline path: source → bend → target
  const edgePath = `M${sourceX},${sourceY} L${bendX},${bendY} L${targetX},${targetY}`;

  // Position label at the midpoint of the longer segment to avoid overlap with bend handle
  const len1 = Math.hypot(bendX - sourceX, bendY - sourceY);
  const len2 = Math.hypot(targetX - bendX, targetY - bendY);
  const labelX = len1 >= len2 ? (sourceX + bendX) / 2 : (bendX + targetX) / 2;
  const labelY = len1 >= len2 ? (sourceY + bendY) / 2 : (bendY + targetY) / 2;

  // Calcula el ángulo del segmento donde va la etiqueta (estilo AutoCAD: texto paralelo a la línea)
  const segAngle = len1 >= len2
    ? Math.atan2(bendY - sourceY, bendX - sourceX)
    : Math.atan2(targetY - bendY, targetX - bendX);
  let labelAngleDeg = segAngle * (180 / Math.PI);
  // Evitar texto al revés: si el ángulo supera 90° o -90°, girar 180°
  if (labelAngleDeg > 90) labelAngleDeg -= 180;
  if (labelAngleDeg < -90) labelAngleDeg += 180;

  // Desplazamiento perpendicular a la línea para no tapar el trazado
  const perpOffset = 14;
  const perpX = -Math.sin(segAngle) * perpOffset;
  const perpY = Math.cos(segAngle) * perpOffset;

  const onBendMouseDown = useCallback((event: React.MouseEvent<SVGCircleElement>) => {
    event.stopPropagation();
    event.preventDefault();
    isDragging.current = true;

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const pos = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      setEdges((eds) =>
        eds.map((edge) =>
          edge.id === id
            ? { ...edge, data: { ...edge.data, bendX: pos.x, bendY: pos.y } }
            : edge
        )
      );
    };

    const handleMouseUp = () => {
      isDragging.current = false;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, [id, setEdges, screenToFlowPosition]);

  return (
    <>
      {/* Invisible thick path for easier click selection */}
      <path
        d={edgePath}
        fill="none"
        strokeOpacity={0}
        strokeWidth={20}
        stroke="transparent"
      />
      {/* Visible edge */}
      <path
        d={edgePath}
        fill="none"
        style={{
          ...style,
          strokeDasharray: '8 4',
          strokeWidth: selected ? 4 : 3,
          stroke: selected ? '#fff' : 'var(--primary-color)',
          filter: selected ? 'drop-shadow(0 0 4px var(--primary-color))' : 'none',
          opacity: style?.opacity ?? 1,
        }}
      />
      {/* Draggable bend handle — always visible */}
      {(style?.opacity === undefined || Number(style.opacity) > 0.5) && (
        <circle
          cx={bendX}
          cy={bendY}
          r={8}
          fill="var(--primary-color)"
          stroke="var(--bg-color)"
          strokeWidth={2}
          className="bend-handle nodrag nopan"
          onMouseDown={onBendMouseDown}
        />
      )}
      
      {/* Símbolo "+" dinámico al estar seleccionado para crear un codo/doblez en la posición actual */}
      {selected && (style?.opacity === undefined || Number(style.opacity) > 0.5) && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${bendX}px,${bendY - 20}px)`,
              pointerEvents: 'all',
              zIndex: 12,
            }}
            className="nodrag nopan"
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                
                const newJunctionId = `junction-auto-${uuidv4()}`;

                // 1. Crear nuevo nodo codo/junta en la posición del bend
                const newJunctionNode = {
                  id: newJunctionId,
                  type: 'junction',
                  position: { x: bendX, y: bendY },
                  data: {},
                };

                // 2. Crear dos nuevos segmentos bendables de tubería
                const edgeA = {
                  id: `e-${source}-${newJunctionId}-${uuidv4()}`,
                  source,
                  target: newJunctionId,
                  sourceHandle: sourceHandleId || null,
                  targetHandle: null,
                  label: '0m',
                  data: { length: 0, autoCalculate: true },
                  type: 'bendable',
                  style: { strokeWidth: 3, stroke: 'var(--primary-color)' },
                };

                const edgeB = {
                  id: `e-${newJunctionId}-${target}-${uuidv4()}`,
                  source: newJunctionId,
                  target,
                  sourceHandle: null,
                  targetHandle: targetHandleId || null,
                  label: '0m',
                  data: { length: 0, autoCalculate: true },
                  type: 'bendable',
                  style: { strokeWidth: 3, stroke: 'var(--primary-color)' },
                };

                // 3. Agregar el nuevo nodo y reemplazar la edge actual con las dos nuevas
                setNodes((nds) => [...nds, newJunctionNode]);
                setEdges((eds) => {
                  const filtered = eds.filter((edge) => edge.id !== id);
                  return [...filtered, edgeA, edgeB];
                });
              }}
              style={{
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                backgroundColor: 'var(--success-color)',
                color: '#fff',
                border: '1.5px solid white',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '11px',
                fontWeight: 'bold',
                boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
              }}
              title="Agregar otro doblez aquí"
            >
              +
            </button>
          </div>
        </EdgeLabelRenderer>
      )}

      {/* Etiqueta estilo AutoCAD: rotada paralela a la línea, desplazada perpendicularmente */}
      {label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX + perpX}px,${labelY + perpY}px) rotate(${labelAngleDeg}deg)`,
              fontSize: 8,
              background: selected ? 'var(--bg-color)' : 'transparent',
              color: selected ? 'var(--primary-color)' : 'var(--text-muted)',
              padding: selected ? '1px 3px' : '0',
              borderRadius: 2,
              border: selected ? `1px solid var(--primary-color)` : 'none',
              pointerEvents: 'none',
              fontWeight: selected ? 700 : 500,
              whiteSpace: 'nowrap',
              letterSpacing: '0.02em',
              opacity: selected ? 1 : 0.6,
              textShadow: selected ? 'none' : '0 0 3px var(--bg-color), 0 0 3px var(--bg-color)',
            }}
            className="nodrag nopan"
          >
            {label as string}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
};

const nodeTypes = {
  junction: JunctionNode,
  iconNode: IconNode,
  floorplan: FloorplanNode,
  room: RoomNode,
  wallPoint: WallPointNode,
  structureIcon: StructureIconNode,
};

const edgeTypes = {
  bendable: BendableEdge,
  wallSegment: WallSegmentEdge,
};

const getDeviceDefaultHeight = (type: string, ceilingHeight: number, ceilingRunOffset: number) => {
  switch (type) {
    case 'camara_domo':
    case 'camara_bullet':
    case 'junction':
      return parseFloat((ceilingHeight - ceilingRunOffset).toFixed(2));
    case 'gabinete':
      return 1.5;
    case 'switch':
    case 'router':
    case 'dvr_nvr':
    case 'patch_panel':
    case 'ups':
      return 1.2;
    case 'bandeja_red':
      return 2.4;
    case 'caja_2x4':
    case 'caja_4x4':
      return 1.2;
    default:
      return 0.3; // sockets, network points, electrical outlets
  }
};

// Helper function to snap door/window structureIcon nodes to nearest wallSegment edge
const snapStructureNode = (
  node: any,
  proposedPos: { x: number; y: number },
  allNodes: any[],
  allEdges: any[],
  scalePixelsPerMeter: number
) => {
  const isDoor = node.data?.type === 'door';
  const isWindow = node.data?.type === 'window';

  if (!isDoor && !isWindow) {
    return null;
  }

  const w = node.width || (node.style?.width as number) || 40;
  const h = node.height || (node.style?.height as number) || 40;

  const halfW = w / 2;
  const halfH = h / 2;

  // Center of proposed position
  const px = proposedPos.x + halfW;
  const py = proposedPos.y + halfH;

  const wallSegments = allEdges.filter(e => e.type === 'wallSegment');
  if (wallSegments.length === 0) {
    return null;
  }

  let closestDist = Infinity;
  let closestQ = { x: px, y: py };
  let closestAngle = 0;
  const snapThreshold = 0.8 * scalePixelsPerMeter; // Snap threshold: 0.8 meters

  for (const edge of wallSegments) {
    const sNode = allNodes.find(n => n.id === edge.source);
    const tNode = allNodes.find(n => n.id === edge.target);
    if (!sNode || !tNode) continue;

    // Wall points centers
    const ax = sNode.position.x + (sNode.width ? sNode.width / 2 : 6);
    const ay = sNode.position.y + (sNode.height ? sNode.height / 2 : 6);
    const bx = tNode.position.x + (tNode.width ? tNode.width / 2 : 6);
    const by = tNode.position.y + (tNode.height ? tNode.height / 2 : 6);

    // Project P (px, py) onto AB
    const abx = bx - ax;
    const aby = by - ay;
    const abLenSq = abx * abx + aby * aby;
    if (abLenSq === 0) continue;

    const apx = px - ax;
    const apy = py - ay;
    const t = Math.max(0, Math.min(1, (apx * abx + apy * aby) / abLenSq));

    const qx = ax + t * abx;
    const qy = ay + t * aby;

    const dx = px - qx;
    const dy = py - qy;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < closestDist) {
      closestDist = dist;
      closestQ = { x: qx, y: qy };
      closestAngle = Math.atan2(aby, abx) * (180 / Math.PI);
    }
  }

  if (closestDist < snapThreshold) {
    if (isWindow) {
      // Snap window center directly to closestQ
      return {
        position: {
          x: closestQ.x - halfW,
          y: closestQ.y - halfH
        },
        rotation: Math.round(closestAngle),
        snapped: true
      };
    } else if (isDoor) {
      // Snap door. We have two options for the swing direction based on mouse position.
      const angleRad = closestAngle * (Math.PI / 180);
      const perpX = -Math.sin(angleRad);
      const perpY = Math.cos(angleRad);

      const c1 = {
        x: closestQ.x - perpX * halfH,
        y: closestQ.y - perpY * halfH
      };
      const c2 = {
        x: closestQ.x + perpX * halfH,
        y: closestQ.y + perpY * halfH
      };

      // Compare distance from mouse pointer P to C1 and C2
      const dist1 = Math.sqrt((px - c1.x) ** 2 + (py - c1.y) ** 2);
      const dist2 = Math.sqrt((px - c2.x) ** 2 + (py - c2.y) ** 2);

      if (dist1 < dist2) {
        return {
          position: {
            x: c1.x - halfW,
            y: c1.y - halfH
          },
          rotation: Math.round(closestAngle),
          snapped: true
        };
      } else {
        return {
          position: {
            x: c2.x - halfW,
            y: c2.y - halfH
          },
          rotation: Math.round(closestAngle + 180) % 360,
          snapped: true
        };
      }
    }
  }

  return null;
};

// --- Main Inner Component ---

const PipingCalculatorInner = () => {
  const [nodes, setNodes] = useNodesState<Node>([]);
  const [edges, setEdges] = useEdgesState<Edge>([]);
  const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  
  const [wastePercentage, setWastePercentage] = useState<number>(10);
  const [standardLength, setStandardLength] = useState<number>(6);
  const [selectedPipeId, setSelectedPipeId] = useState<string>('');
  const [cableType, setCableType] = useState<string>('cat6');
  
  // Modes: 'piping' | 'structure'
  const [activeMode, setActiveMode] = useState<'piping' | 'structure'>('piping');
  const [scalePixelsPerMeter, setScalePixelsPerMeter] = useState<number>(20);
  const [showAllFovs, setShowAllFovs] = useState<boolean>(true);
  const [showEdgeLabels, setShowEdgeLabels] = useState<boolean>(true);

  // Global settings for piping installation standard heights
  const [ceilingHeight, setCeilingHeight] = useState<number>(3.0);
  const [ceilingRunOffset, setCeilingRunOffset] = useState<number>(0.3);
  const [floorRunOffset, setFloorRunOffset] = useState<number>(0.3);
  const [defaultRoutingMode, setDefaultRoutingMode] = useState<string>('ceiling');
  
  // Draw Mode States
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [lastDrawnNodeId, setLastDrawnNodeId] = useState<string | null>(null);
  
  const [isDrawingWallsMode, setIsDrawingWallsMode] = useState(false);
  const [lastDrawnWallPointId, setLastDrawnWallPointId] = useState<string | null>(null);
  
  // Integration States
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const urlId = params.get('id') || '';
  const urlType = params.get('type') || 'project';
  
  const [selectedTargetId, setSelectedTargetId] = useState<string>('');
  const [selectedTargetType, setSelectedTargetType] = useState<'project' | 'quote'>('project');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition, getEdges } = useReactFlow();

  const { inventory } = useInventory();
  const { projects, updateProject } = useProjects();
  const { quotes, updateQuote } = useQuotes();

  const materials = inventory.filter((item) => item.category === 'materials');

  // Pre-load parameters from URL
  useEffect(() => {
    if (urlId) {
      setSelectedTargetId(urlId);
      setSelectedTargetType(urlType === 'quote' ? 'quote' : 'project');
      loadDiagramFromDB(urlId);
    }
  }, [urlId, urlType]);

  // Sincronizar escala en la data de los nodos para que puedan dibujar conos DORI a escala real y reescalar habitaciones/muebles
  useEffect(() => {
    setNodes((nds) => nds.map(n => {
      if (n.type === 'iconNode') {
        return {
          ...n,
          data: {
            ...n.data,
            scalePixelsPerMeter
          }
        };
      }
      if (n.type === 'room' || n.type === 'structureIcon') {
        const wMeters = (n.data as any)?.widthMeters || (n.type === 'room' ? 8 : 1.2);
        const hMeters = (n.data as any)?.heightMeters || (n.type === 'room' ? 6 : 0.8);
        const pxW = Math.round(Number(wMeters) * scalePixelsPerMeter);
        const pxH = Math.round(Number(hMeters) * scalePixelsPerMeter);
        return {
          ...n,
          width: pxW,
          height: pxH,
          style: {
            ...n.style,
            width: pxW,
            height: pxH
          }
        };
      }
      return n;
    }));
  }, [scalePixelsPerMeter, setNodes]);

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => setNodes((nds) => {
      const nextNodes = applyNodeChanges(changes, nds);
      const currentEdges = getEdges();
      return nextNodes.map(node => {
        if (changes.some((c: any) => c.id === node.id && c.type === 'dimensions')) {
          if (node.type === 'room' || node.type === 'structureIcon') {
            const w = node.width || 100;
            const h = node.height || 100;
            return {
              ...node,
              style: {
                ...node.style,
                width: w,
                height: h
              },
              data: {
                ...node.data,
                widthMeters: w / scalePixelsPerMeter,
                heightMeters: h / scalePixelsPerMeter
              }
            };
          }
        }
        
        // Handle position updates with snap for doors and windows
        const posChange = changes.find((c: any) => c.id === node.id && c.type === 'position') as any;
        if (posChange && posChange.position && node.type === 'structureIcon') {
          const snapResult = snapStructureNode(
            node,
            posChange.position,
            nds,
            currentEdges,
            scalePixelsPerMeter
          );
          if (snapResult) {
            return {
              ...node,
              position: snapResult.position,
              data: {
                ...node.data,
                rotation: snapResult.rotation,
                snappedToWall: true
              }
            };
          } else {
            return {
              ...node,
              data: {
                ...node.data,
                snappedToWall: false
              }
            };
          }
        }
        
        return node;
      });
    }),
    [setNodes, scalePixelsPerMeter, getEdges]
  );

  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    [setEdges]
  );

  const onConnect: OnConnect = useCallback(
    (params) => {
      // Connect walls if we are in structure mode
      if (activeMode === 'structure') {
        const newEdge: Edge = { 
          id: `ws-${params.source}-${params.target}-${uuidv4()}`, 
          source: params.source,
          target: params.target,
          type: 'wallSegment',
        };
        setEdges((eds) => addEdge(newEdge, eds));
      } else {
        const newEdge: Edge = { 
          id: `e${params.source}-${params.target}-${uuidv4()}`, 
          source: params.source,
          target: params.target,
          sourceHandle: params.sourceHandle || null,
          targetHandle: params.targetHandle || null,
          label: '0m', 
          data: { length: 0, autoCalculate: true },
          type: 'bendable',
          style: { strokeWidth: 3, stroke: 'var(--primary-color)' },
        };
        setEdges((eds) => addEdge(newEdge, eds));
      }
    },
    [setEdges, activeMode]
  );

  const onSelectionChange = useCallback((params: { nodes: Node[]; edges: Edge[] }) => {
    if (params.edges.length > 0) {
      setSelectedEdge(params.edges[0]);
      setSelectedNode(null);
    } else if (params.nodes.length > 0) {
      setSelectedNode(params.nodes[0]);
      setSelectedEdge(null);
    } else {
      setSelectedEdge(null);
      setSelectedNode(null);
    }
  }, []);

  // --- DRAW MODE LOGIC ---
  const clearCanvas = () => {
    if (window.confirm("¿Está seguro que desea limpiar todo el plano?")) {
      setNodes([]);
      setEdges([]);
      setLastDrawnNodeId(null);
      setLastDrawnWallPointId(null);
      setSelectedEdge(null);
      setSelectedNode(null);
    }
  };

  const toggleDrawMode = () => {
    setIsDrawingMode((prev) => {
      if (!prev) {
        setLastDrawnNodeId(null);
        setIsDrawingWallsMode(false); // turn off walls draw
      }
      return !prev;
    });
  };

  const toggleDrawWallsMode = () => {
    setIsDrawingWallsMode((prev) => {
      if (!prev) {
        setLastDrawnWallPointId(null);
        setIsDrawingMode(false); // turn off pipes draw
      }
      return !prev;
    });
  };

  const onPaneClick = useCallback((event: React.MouseEvent) => {
    // PIPING DRAWING
    if (isDrawingMode && activeMode === 'piping') {
      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNodeId = uuidv4();
      const newNode: Node = {
        id: newNodeId,
        type: 'junction',
        position,
        data: {},
      };

      setNodes((nds) => [...nds, newNode]);

      if (lastDrawnNodeId) {
        const newEdge: Edge = {
          id: `e${lastDrawnNodeId}-${newNodeId}-${uuidv4()}`,
          source: lastDrawnNodeId,
          target: newNodeId,
          label: '0m',
          data: { length: 0, autoCalculate: true },
          type: 'bendable',
          style: { strokeWidth: 3, stroke: 'var(--primary-color)' },
        };
        setEdges((eds) => [...eds, newEdge]);
      }

      setLastDrawnNodeId(newNodeId);
    }
    
    // WALL DRAWING
    else if (isDrawingWallsMode && activeMode === 'structure') {
      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNodeId = `wp-${uuidv4()}`;
      const newNode: Node = {
        id: newNodeId,
        type: 'wallPoint',
        position,
        data: {},
      };

      setNodes((nds) => [...nds, newNode]);

      if (lastDrawnWallPointId) {
        const newEdge: Edge = {
          id: `ws-${lastDrawnWallPointId}-${newNodeId}-${uuidv4()}`,
          source: lastDrawnWallPointId,
          target: newNodeId,
          type: 'wallSegment',
        };
        setEdges((eds) => [...eds, newEdge]);
      }

      setLastDrawnWallPointId(newNodeId);
    }
  }, [isDrawingMode, lastDrawnNodeId, isDrawingWallsMode, lastDrawnWallPointId, activeMode, screenToFlowPosition, setNodes, setEdges]);

  // Pressing ESC stops the continuous line
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setLastDrawnNodeId(null);
        setLastDrawnWallPointId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleModeChange = (mode: 'piping' | 'structure') => {
    setActiveMode(mode);
    setIsDrawingMode(false);
    setIsDrawingWallsMode(false);
    setLastDrawnNodeId(null);
    setLastDrawnWallPointId(null);
    setSelectedNode(null);
    setSelectedEdge(null);
  };

  // --- DRAG AND DROP LOGIC ---
  const onDragStart = (event: React.DragEvent, nodeData: string) => {
    event.dataTransfer.setData('application/reactflow', nodeData);
    event.dataTransfer.effectAllowed = 'move';
  };

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const reactFlowBounds = reactFlowWrapper.current?.getBoundingClientRect();
      const nodeDataStr = event.dataTransfer.getData('application/reactflow');
      
      if (!nodeDataStr || !reactFlowBounds) return;
      const nodeData = JSON.parse(nodeDataStr);

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      if (nodeData.category === 'structure') {
        let newNode: Node;
        if (nodeData.type === 'room') {
          const roomW = Math.round(8 * scalePixelsPerMeter);
          const roomH = Math.round(6 * scalePixelsPerMeter);
          newNode = {
            id: `room-${uuidv4()}`,
            type: 'room',
            position,
            width: roomW,
            height: roomH,
            style: { width: roomW, height: roomH },
            data: {
              label: 'Nueva Habitación',
              color: 'rgba(99, 102, 241, 0.08)',
              widthMeters: 8,
              heightMeters: 6,
            },
          };
        } else {
          // Calcular dimensiones en píxeles a partir de las dimensiones reales del mueble
          const dims = STRUCTURE_REAL_DIMS[nodeData.type] || { w: 1.2, h: 0.8 };
          const pxW = Math.max(20, Math.round(dims.w * scalePixelsPerMeter));
          const pxH = Math.max(20, Math.round(dims.h * scalePixelsPerMeter));
          newNode = {
            id: `struct-${uuidv4()}`,
            type: 'structureIcon',
            position,
            width: pxW,
            height: pxH,
            style: { width: pxW, height: pxH },
            data: {
              type: nodeData.type,
              label: nodeData.label,
              rotation: 0,
              widthMeters: dims.w,
              heightMeters: dims.h,
              size: pxW, // keep data.size synchronized
            },
          };

          // Snap immediately on drop if dragging near a wall
          const snapResult = snapStructureNode(
            newNode,
            position,
            nodes,
            edges,
            scalePixelsPerMeter
          );
          if (snapResult) {
            newNode.position = snapResult.position;
            newNode.data.rotation = snapResult.rotation;
            newNode.data.snappedToWall = true;
          }
        }
        setNodes((nds) => nds.concat(newNode));
      } else {
        const isJunction = nodeData.type === 'junction';
        const newNode: Node = {
          id: uuidv4(),
          type: isJunction ? 'junction' : 'iconNode',
          position,
          data: nodeData,
        };
        setNodes((nds) => nds.concat(newNode));
      }
    },
    [screenToFlowPosition, setNodes, scalePixelsPerMeter, nodes, edges]
  );

  // --- BACKGROUND PLAN UPLOAD ---
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const bgUrl = event.target?.result as string;
        setNodes((nds) => {
          const filtered = nds.filter(n => n.id !== 'floorplan-bg');
          return [
            {
              id: 'floorplan-bg',
              type: 'floorplan',
              position: { x: 0, y: 0 },
              data: { url: bgUrl },
              draggable: false,
              selectable: false,
              zIndex: -2,
            },
            ...filtered
          ];
        });
      };
      reader.readAsDataURL(file);
    }
  };

  // --- EDGE VERTICAL METERS EDITING ---
  const handleVerticalMetersChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value) || 0;
    if (selectedEdge) {
      setEdges((eds) =>
        eds.map((edge) => {
          if (edge.id === selectedEdge.id) {
            edge.data = { ...edge.data, verticalMeters: val };
          }
          return edge;
        })
      );
      setSelectedEdge((prev) => (prev ? { ...prev, data: { ...prev.data, verticalMeters: val } } : null));
    }
  };

  // --- EDGE PIPE SPLIT OVERRIDE ---
  const handlePipeSplitChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Math.max(1, parseInt(e.target.value) || 1);
    if (selectedEdge) {
      setEdges((eds) =>
        eds.map((edge) => {
          if (edge.id === selectedEdge.id) {
            edge.data = { ...edge.data, splitTubes: val };
          }
          return edge;
        })
      );
      setSelectedEdge((prev) => (prev ? { ...prev, data: { ...prev.data, splitTubes: val } } : null));
    }
  };

  // --- CALCULATIONS ---
  const routingData = useMemo(() => {
    return computeCableRoutes(nodes, edges);
  }, [nodes, edges]);

  // Compute calculated positions/meters dynamically based on pixels scale
  const processedEdges = useMemo(() => {
    const { edgeCableCount } = routingData;
    return edges.map((edge) => {
      if (edge.type === 'wallSegment') {
        return {
          ...edge,
          focusable: activeMode === 'structure',
          style: {
            ...edge.style,
            opacity: activeMode === 'piping' ? 0.75 : 1,
          },
          data: {
            ...edge.data,
            isStructureMode: activeMode === 'structure',
          }
        };
      }

      // Calculate horizontal length from positions dynamically if auto-calculate is on
      const sourceNode = nodes.find(n => n.id === edge.source);
      const targetNode = nodes.find(n => n.id === edge.target);
      
      let calcLen = 0;
      if (sourceNode && targetNode) {
        const sourceX = sourceNode.position.x;
        const sourceY = sourceNode.position.y;
        const targetX = targetNode.position.x;
        const targetY = targetNode.position.y;
        
        // Bend point
        const bendX = (edge.data?.bendX as number) ?? (sourceX + targetX) / 2;
        const bendY = (edge.data?.bendY as number) ?? (sourceY + targetY) / 2;
        
        const len1 = Math.hypot(bendX - sourceX, bendY - sourceY);
        const len2 = Math.hypot(targetX - bendX, targetY - bendY);
        calcLen = parseFloat(((len1 + len2) / scalePixelsPerMeter).toFixed(1));
      }

      const autoCalculate = edge.data?.autoCalculate !== false;
      const horizontalLength = autoCalculate ? calcLen : ((edge.data?.length as number) || 0);

      // Auto-calculate vertical meters according to installation standards
      const autoCalculateVertical = edge.data?.autoCalculateVertical !== false;
      let verticalMeters = 0;
      let verticalBreakdown = '';
      
      if (sourceNode && targetNode) {
        const getH = (n: Node) => {
          if ((n.data as any)?.height !== undefined && (n.data as any)?.height !== null) {
            return parseFloat(String((n.data as any).height));
          }
          return getDeviceDefaultHeight((n.data as any)?.type as string || n.type as string, ceilingHeight, ceilingRunOffset);
        };
        const hA = getH(sourceNode);
        const hB = getH(targetNode);
        const routing = edge.data?.routingMode || defaultRoutingMode;
        
        if (routing === 'ceiling') {
          const runH = ceilingHeight - ceilingRunOffset;
          const vertA = Math.max(0, runH - hA);
          const vertB = Math.max(0, runH - hB);
          verticalMeters = parseFloat((vertA + vertB).toFixed(2));
          verticalBreakdown = `Techo (${runH.toFixed(1)}m): Subida ${vertA.toFixed(1)}m + Bajada ${vertB.toFixed(1)}m`;
        } else if (routing === 'floor') {
          const runH = floorRunOffset;
          const vertA = Math.max(0, hA - runH);
          const vertB = Math.max(0, hB - runH);
          verticalMeters = parseFloat((vertA + vertB).toFixed(2));
          verticalBreakdown = `Piso (${runH.toFixed(1)}m): Bajada ${vertA.toFixed(1)}m + Subida ${vertB.toFixed(1)}m`;
        } else if (routing === 'direct') {
          verticalMeters = parseFloat(Math.abs(hA - hB).toFixed(2));
          verticalBreakdown = `Directo: abs(${hA.toFixed(1)}m - ${hB.toFixed(1)}m)`;
        }
      }

      if (!autoCalculateVertical) {
        verticalMeters = (edge.data?.verticalMeters as number) || 0;
        verticalBreakdown = 'Modificado manualmente';
      }

      const cableCount = edgeCableCount[edge.id] || 0;
      const totalLength = horizontalLength + verticalMeters;
      const splitTubes = (edge.data?.splitTubes as number) || 1;
      const cablesPerTube = splitTubes > 1 ? Math.ceil(cableCount / splitTubes) : cableCount;
      const pipeSize = getPipeSize(cablesPerTube, cableType);
      
      const splitLabel = splitTubes > 1 ? ` ×${splitTubes}` : '';
      const vertLabel = verticalMeters > 0 ? ` (+${verticalMeters}m↕)` : '';
      
      // Formato compacto para las etiquetas (AutoCAD style)
      const labelText = showEdgeLabels
        ? (cableCount > 0 
            ? `${horizontalLength}m${vertLabel} • ${cableCount}c (${pipeSize}${splitLabel})`
            : `${horizontalLength}m${vertLabel} (${pipeSize}${splitLabel})`)
        : '';

      return {
        ...edge,
        label: labelText,
        focusable: activeMode === 'piping',
        style: {
          ...edge.style,
          opacity: activeMode === 'structure' ? 0.2 : 1,
        },
        data: {
          ...edge.data,
          autoCalculate,
          length: horizontalLength,
          cableCount,
          pipeSize,
          splitTubes,
          verticalMeters,
          totalLength,
          autoCalculateVertical,
          verticalBreakdown,
          routingMode: edge.data?.routingMode || 'default',
        },
      };
    });
  }, [edges, nodes, routingData, cableType, scalePixelsPerMeter, activeMode, ceilingHeight, ceilingRunOffset, floorRunOffset, defaultRoutingMode, showEdgeLabels]);

  // Dynamically map structural nodes (resizer/meters/modes)
  const processedNodes = useMemo(() => {
    return nodes.map((node) => {
      if (node.type === 'room') {
        const w = node.width || 160;
        const h = node.height || 120;
        return {
          ...node,
          zIndex: -5,
          draggable: activeMode === 'structure',
          selectable: activeMode === 'structure',
          data: {
            ...node.data,
            isStructureMode: activeMode === 'structure',
            widthMeters: w / scalePixelsPerMeter,
            heightMeters: h / scalePixelsPerMeter,
          }
        };
      }
      
      if (node.type === 'structureIcon') {
        const w = node.width || (node.style?.width as number) || 40;
        const h = node.height || (node.style?.height as number) || 40;
        return {
          ...node,
          zIndex: 1,
          draggable: activeMode === 'structure',
          selectable: activeMode === 'structure',
          data: {
            ...node.data,
            isStructureMode: activeMode === 'structure',
            widthMeters: w / scalePixelsPerMeter,
            heightMeters: h / scalePixelsPerMeter,
          }
        };
      }

      if (node.type === 'wallPoint') {
        return {
          ...node,
          zIndex: 3,
          draggable: activeMode === 'structure',
          selectable: activeMode === 'structure',
          data: {
            ...node.data,
            isStructureMode: activeMode === 'structure',
          }
        };
      }

      if (node.type === 'floorplan') {
        return {
          ...node,
          zIndex: -10,
        };
      }

      // Piping node
      return {
        ...node,
        zIndex: 5,
        draggable: activeMode === 'piping',
        selectable: activeMode === 'piping',
        style: {
          ...node.style,
          opacity: activeMode === 'structure' ? 0.25 : 1,
        }
      };
    });
  }, [nodes, activeMode, scalePixelsPerMeter]);

  const activeSelectedEdge = useMemo(() => {
    if (!selectedEdge) return null;
    return processedEdges.find((e) => e.id === selectedEdge.id) || null;
  }, [selectedEdge, processedEdges]);

  const { totalLength, fittingsCount, elementsCount, pipeBreakdown, totalCableLength, hasHubs } = useMemo(() => {
    const pipingEdges = processedEdges.filter(e => e.type !== 'wallSegment');
    
    const total = pipingEdges.reduce((acc, edge) => {
      const tLen = ((edge.data as any)?.totalLength) || 0;
      return acc + tLen;
    }, 0);

    const breakdown: Record<string, number> = {
      '1/2"': 0,
      '3/4"': 0,
      '1"': 0,
      '1 1/4"': 0,
      '1 1/2"': 0,
      '2"': 0,
      '2 1/2"': 0,
      '3"': 0,
    };

    pipingEdges.forEach((edge) => {
      const totalLength = ((edge.data as any)?.totalLength) || 0;
      const pipeSize = ((edge.data as any)?.pipeSize) || '1/2"';
      const splitTubes = ((edge.data as any)?.splitTubes) || 1;
      if (breakdown[pipeSize] === undefined) {
        breakdown[pipeSize] = 0;
      }
      breakdown[pipeSize] += totalLength * splitTubes;
    });

    const nodeConnections: Record<string, number> = {};
    nodes.filter(n => n.type === 'junction').forEach(n => nodeConnections[n.id] = 0);
    
    edges.filter(e => e.type !== 'wallSegment').forEach(e => {
      if (nodeConnections[e.source] !== undefined) nodeConnections[e.source]++;
      if (nodeConnections[e.target] !== undefined) nodeConnections[e.target]++;
    });

    const fittings = { elbows: 0, tees: 0, crosses: 0 };

    Object.values(nodeConnections).forEach(count => {
      if (count === 2) fittings.elbows++;
      if (count === 3) fittings.tees++;
      if (count >= 4) fittings.crosses++;
    });

    const elements = {
      gabinete: nodes.filter(n => n.type === 'iconNode' && n.data?.type === 'gabinete').length,
      camara_domo: nodes.filter(n => n.type === 'iconNode' && n.data?.type === 'camara_domo').length,
      camara_bullet: nodes.filter(n => n.type === 'iconNode' && n.data?.type === 'camara_bullet').length,
      bandeja_red: nodes.filter(n => n.type === 'iconNode' && n.data?.type === 'bandeja_red').length,
      dvr_nvr: nodes.filter(n => n.type === 'iconNode' && n.data?.type === 'dvr_nvr').length,
      ups: nodes.filter(n => n.type === 'iconNode' && n.data?.type === 'ups').length,
      router: nodes.filter(n => n.type === 'iconNode' && n.data?.type === 'router').length,
      switch: nodes.filter(n => n.type === 'iconNode' && n.data?.type === 'switch').length,
      patch_panel: nodes.filter(n => n.type === 'iconNode' && n.data?.type === 'patch_panel').length,
      caja_2x4: nodes.filter(n => n.type === 'iconNode' && n.data?.type === 'caja_2x4').length,
      caja_4x4: nodes.filter(n => n.type === 'iconNode' && n.data?.type === 'caja_4x4').length,
    };

    return { 
      totalLength: total, 
      fittingsCount: fittings, 
      elementsCount: elements,
      pipeBreakdown: breakdown,
      totalCableLength: routingData.totalCableLength,
      hasHubs: routingData.hasHubs,
    };
  }, [nodes, edges, processedEdges, routingData]);

  // --- LOCALSTORAGE SAVE/LOAD ---
  const saveToLocalStorage = () => {
    const layout = {
      nodes,
      edges,
      scale: scalePixelsPerMeter,
      settings: {
        ceilingHeight,
        ceilingRunOffset,
        floorRunOffset,
        defaultRoutingMode
      }
    };
    localStorage.setItem('systemit_piping_layout_temp', JSON.stringify(layout));
    alert("Diagrama guardado temporalmente en este navegador.");
  };

  const loadFromLocalStorage = () => {
    const saved = localStorage.getItem('systemit_piping_layout_temp');
    if (saved) {
      try {
        const layout = JSON.parse(saved);
        setNodes(layout.nodes || []);
        setEdges(layout.edges || []);
        setScalePixelsPerMeter(layout.scale || 20);
        if (layout.settings) {
          setCeilingHeight(layout.settings.ceilingHeight ?? 3.0);
          setCeilingRunOffset(layout.settings.ceilingRunOffset ?? 0.3);
          setFloorRunOffset(layout.settings.floorRunOffset ?? 0.3);
          setDefaultRoutingMode(layout.settings.defaultRoutingMode ?? 'ceiling');
        } else {
          setCeilingHeight(3.0);
          setCeilingRunOffset(0.3);
          setFloorRunOffset(0.3);
          setDefaultRoutingMode('ceiling');
        }
        alert("Diagrama cargado con éxito.");
      } catch (e) {
        alert("Error al cargar el archivo de guardado.");
      }
    } else {
      alert("No hay ningún plano guardado temporalmente.");
    }
  };

  // --- EXPORT/IMPORT JSON FILE ---
  const exportToJson = () => {
    const layout = {
      nodes,
      edges,
      scale: scalePixelsPerMeter,
      settings: {
        ceilingHeight,
        ceilingRunOffset,
        floorRunOffset,
        defaultRoutingMode
      }
    };
    const blob = new Blob([JSON.stringify(layout, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Plano_Tuberias_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const importFromJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const layout = JSON.parse(event.target?.result as string);
          setNodes(layout.nodes || []);
          setEdges(layout.edges || []);
          setScalePixelsPerMeter(layout.scale || 20);
          if (layout.settings) {
            setCeilingHeight(layout.settings.ceilingHeight ?? 3.0);
            setCeilingRunOffset(layout.settings.ceilingRunOffset ?? 0.3);
            setFloorRunOffset(layout.settings.floorRunOffset ?? 0.3);
            setDefaultRoutingMode(layout.settings.defaultRoutingMode ?? 'ceiling');
          } else {
            setCeilingHeight(3.0);
            setCeilingRunOffset(0.3);
            setFloorRunOffset(0.3);
            setDefaultRoutingMode('ceiling');
          }
          alert("Plano importado con éxito.");
        } catch (err) {
          alert("Archivo JSON no válido.");
        }
      };
      reader.readAsText(file);
    }
  };

  // --- DATABASE SAVING AND INTEGRATION ---
  const loadDiagramFromDB = async (targetId?: string) => {
    const lookupId = targetId || selectedTargetId;
    if (!lookupId) return;
    try {
      const res = await fetch(`/api/piping-diagrams.php?id=${lookupId}`);
      const data = await res.json();
      if (data) {
        setNodes(data.nodes || []);
        setEdges(data.edges || []);
        setScalePixelsPerMeter(data.scale || 20);
        if (data.settings) {
          setCeilingHeight(data.settings.ceilingHeight ?? 3.0);
          setCeilingRunOffset(data.settings.ceilingRunOffset ?? 0.3);
          setFloorRunOffset(data.settings.floorRunOffset ?? 0.3);
          setDefaultRoutingMode(data.settings.defaultRoutingMode ?? 'ceiling');
        } else {
          setCeilingHeight(3.0);
          setCeilingRunOffset(0.3);
          setFloorRunOffset(0.3);
          setDefaultRoutingMode('ceiling');
        }
        if (!targetId) alert("Diagrama cargado desde la Base de Datos.");
      } else {
        if (!targetId) alert("No se encontró ningún diagrama guardado para esta cotización/proyecto.");
      }
    } catch (e) {
      console.error(e);
      alert("Error al conectar con la base de datos.");
    }
  };

  // Helper matching functions
  const findInventoryPipeForSize = useCallback((size: string) => {
    const selectedPipe = inventory.find(item => item.id === selectedPipeId);
    if (selectedPipe && selectedPipe.name.toLowerCase().includes(size)) {
      return selectedPipe;
    }
    return inventory.find(item => 
      item.category === 'materials' && 
      (item.name.toLowerCase().includes('tubo') || item.name.toLowerCase().includes('conduit') || item.name.toLowerCase().includes('tuber')) &&
      item.name.toLowerCase().includes(size)
    );
  }, [inventory, selectedPipeId]);

  const findInventoryFitting = useCallback((type: 'elbow' | 'tee' | 'cross', size: string) => {
    const keywords = {
      elbow: ['codo', 'elbow'],
      tee: ['tee'],
      cross: ['cruz', 'cross']
    };
    const keys = keywords[type];
    return inventory.find(item => 
      item.category === 'materials' && 
      keys.some(k => item.name.toLowerCase().includes(k)) &&
      item.name.toLowerCase().includes(size)
    );
  }, [inventory]);

  const findInventoryCable = useCallback((typeId: string) => {
    const config = CABLE_CONFIGS.find(c => c.id === typeId);
    const nameToSearch = config ? config.name.toLowerCase() : 'cable';
    return inventory.find(item => 
      item.category === 'materials' && 
      item.name.toLowerCase().includes('cable') &&
      item.name.toLowerCase().includes(nameToSearch.replace('cat', 'cat '))
    ) || inventory.find(item => 
      item.category === 'materials' && 
      item.name.toLowerCase().includes('cable') &&
      item.name.toLowerCase().includes(nameToSearch)
    );
  }, [inventory]);

  const findInventoryEquipment = useCallback((type: string) => {
    const keywords: Record<string, string[]> = {
      gabinete: ['gabinete', 'rack', 'cabinet'],
      camara_domo: ['domo', 'dome', 'cámara domo', 'camara domo'],
      camara_bullet: ['bullet', 'cámara bullet', 'camara bullet', 'tubo'],
      bandeja_red: ['bandeja', 'tray'],
      dvr_nvr: ['dvr', 'nvr', 'grabador'],
      ups: ['ups', 'no break', 'batería', 'bateria'],
      router: ['router'],
      switch: ['switch', 'conmutador'],
      patch_panel: ['patch', 'panel de parcheo'],
      caja_2x4: ['caja 2x4', 'caja 2*4', 'cajas 2*4', 'caja 2x4 metálica'],
      caja_4x4: ['caja 4x4', 'caja 4*4', 'cajas 4*4', 'caja 4x4 metálica'],
    };
    const keys = keywords[type] || [type.toLowerCase()];
    return inventory.find(item => 
      item.category === 'equipments' && 
      keys.some(k => item.name.toLowerCase().includes(k))
    );
  }, [inventory]);

  const saveDiagramAndBOMToDB = async () => {
    if (!selectedTargetId) {
      alert("Por favor seleccione un Proyecto o Cotización.");
      return;
    }

    try {
      // 1. Guardar el diagrama estructural y de tuberías (JSON de React Flow)
      const diagramData = {
        id: selectedTargetId,
        nodes,
        edges,
        scale: scalePixelsPerMeter,
        settings: {
          ceilingHeight,
          ceilingRunOffset,
          floorRunOffset,
          defaultRoutingMode
        }
      };
      
      const saveDiagRes = await fetch('/api/piping-diagrams.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(diagramData)
      });
      if (!saveDiagRes.ok) throw new Error("Error guardando el diagrama en la base de datos.");

      // 2. Tareas de integración de BOM
      const targetRecord = selectedTargetType === 'quote' 
        ? quotes.find(q => q.id === selectedTargetId)
        : projects.find(p => p.id === selectedTargetId);

      if (!targetRecord) {
        alert("No se pudo cargar el registro correspondiente en el cliente. Intente refrescar.");
        return;
      }

      // Filtrar materiales y equipos previos que provienen de la calculadora para no duplicar
      const cleanMaterials = (targetRecord.materials || []).filter(m => !m.name.endsWith('(Calc. Tuberías)'));
      const cleanEquipments = (targetRecord.equipments || []).filter(e => !e.name.endsWith('(Calc. Tuberías)'));

      const newMaterialsList: any[] = [];
      const newEquipmentsList: any[] = [];

      // A) Añadir tubos
      Object.entries(pipeBreakdown).forEach(([size, length]) => {
        if (length === 0) return;
        const lengthWithWaste = length * (1 + wastePercentage / 100);
        const tubesCount = Math.ceil(lengthWithWaste / standardLength);
        const matchedItem = findInventoryPipeForSize(size);

        newMaterialsList.push({
          id: `pipe-${size}-${uuidv4()}`,
          name: `${matchedItem?.name || `Tubo Conduit ${size}`} (Calc. Tuberías)`,
          quantity: tubesCount,
          unitCost: matchedItem?.unitCost || 5.0,
          currency: matchedItem?.currency || 'USD',
        });
      });

      // B) Añadir uniones y accesorios
      // Codos
      if (fittingsCount.elbows > 0) {
        const mostCommonSize = Object.entries(pipeBreakdown).reduce((a, b) => a[1] > b[1] ? a : b)[0] || '3/4"';
        const matchedElbow = findInventoryFitting('elbow', mostCommonSize);
        newMaterialsList.push({
          id: `elbow-${uuidv4()}`,
          name: `${matchedElbow?.name || `Codo 90° Conduit ${mostCommonSize}`} (Calc. Tuberías)`,
          quantity: fittingsCount.elbows,
          unitCost: matchedElbow?.unitCost || 1.25,
          currency: matchedElbow?.currency || 'USD',
        });
      }
      // Tees
      if (fittingsCount.tees > 0) {
        const mostCommonSize = Object.entries(pipeBreakdown).reduce((a, b) => a[1] > b[1] ? a : b)[0] || '3/4"';
        const matchedTee = findInventoryFitting('tee', mostCommonSize);
        newMaterialsList.push({
          id: `tee-${uuidv4()}`,
          name: `${matchedTee?.name || `Tee Conduit ${mostCommonSize}`} (Calc. Tuberías)`,
          quantity: fittingsCount.tees,
          unitCost: matchedTee?.unitCost || 1.85,
          currency: matchedTee?.currency || 'USD',
        });
      }
      // Cruces
      if (fittingsCount.crosses > 0) {
        const mostCommonSize = Object.entries(pipeBreakdown).reduce((a, b) => a[1] > b[1] ? a : b)[0] || '3/4"';
        const matchedCross = findInventoryFitting('cross', mostCommonSize);
        newMaterialsList.push({
          id: `cross-${uuidv4()}`,
          name: `${matchedCross?.name || `Cruz Conduit ${mostCommonSize}`} (Calc. Tuberías)`,
          quantity: fittingsCount.crosses,
          unitCost: matchedCross?.unitCost || 2.50,
          currency: matchedCross?.currency || 'USD',
        });
      }

      // C) Añadir cable UTP
      const cableLengthWithWaste = parseFloat((totalCableLength * (1 + wastePercentage / 100)).toFixed(1));
      if (cableLengthWithWaste > 0) {
        const matchedCable = findInventoryCable(cableType);
        newMaterialsList.push({
          id: `cable-${uuidv4()}`,
          name: `${matchedCable?.name || `Cable UTP ${cableType}`} (Calc. Tuberías)`,
          quantity: cableLengthWithWaste,
          unitCost: matchedCable?.unitCost || 0.45,
          currency: matchedCable?.currency || 'USD',
        });
      }

      // D) Equipos en el plano
      const eqMapLabels: Record<string, string> = {
        gabinete: 'Gabinete / Rack',
        camara_domo: 'Cámara Domo',
        camara_bullet: 'Cámara Bullet',
        bandeja_red: 'Bandeja de Red',
        dvr_nvr: 'DVR / NVR',
        ups: 'UPS',
        router: 'Router',
        switch: 'Switch de Red',
        patch_panel: 'Patch Panel',
        caja_2x4: 'Caja 2x4 Metálica',
        caja_4x4: 'Caja 4x4 Metálica',
      };

      Object.entries(elementsCount).forEach(([key, count]) => {
        if (count === 0) return;
        const label = eqMapLabels[key] || key;
        const matchedEq = findInventoryEquipment(key);

        newEquipmentsList.push({
          id: `eq-${key}-${uuidv4()}`,
          name: `${matchedEq?.name || label} (Calc. Tuberías)`,
          quantity: count,
          unitCost: matchedEq?.unitCost || 0,
          currency: matchedEq?.currency || 'USD',
          profitMargin: 0,
          manualPrice: matchedEq?.unitCost || 0,
        });
      });

      // 3. Mandar la actualización
      const updatedRecord = {
        ...targetRecord,
        materials: [...cleanMaterials, ...newMaterialsList],
        equipments: [...cleanEquipments, ...newEquipmentsList]
      };

      let statusOk = false;
      if (selectedTargetType === 'quote') {
        const res = await updateQuote(updatedRecord);
        statusOk = res.success;
      } else {
        const res = await updateProject(updatedRecord);
        statusOk = res.success;
      }

      if (statusOk) {
        alert("Plano guardado y materiales/equipos transferidos con éxito al registro correspondiente.");
      } else {
        alert("Error al actualizar la lista de materiales/equipos del proyecto o cotización.");
      }

    } catch (e: any) {
      console.error(e);
      alert(`Ocurrió un error: ${e.message}`);
    }
  };


  return (
    <div className={`piping-calculator-container ${!showAllFovs ? 'hide-fovs' : ''}`}>
      <div className="flow-area" ref={reactFlowWrapper}>
        
        {/* Visual Mode Selector & Action Toolbar */}
        <div className="toolbar">
          <div className="mode-selector-tabs">
            <button 
              className={`tab-mode-btn ${activeMode === 'piping' ? 'active' : ''}`}
              onClick={() => handleModeChange('piping')}
            >
              🔌 Modo Tuberías y Equipos
            </button>
            <button 
              className={`tab-mode-btn ${activeMode === 'structure' ? 'active' : ''}`}
              onClick={() => handleModeChange('structure')}
            >
              🏗️ Modo Estructura Edificio
            </button>
          </div>

          <div className="separator" style={{ width: '1px', backgroundColor: 'var(--border-color)', margin: '0 4px' }} />

          {activeMode === 'piping' ? (
            <button 
              className={`btn-toolbar ${isDrawingMode ? 'active' : ''}`} 
              onClick={toggleDrawMode}
            >
              {isDrawingMode ? '🛑 Detener Tuberías (Esc)' : '✏️ Trazar Tubería'}
            </button>
          ) : (
            <button 
              className={`btn-toolbar ${isDrawingWallsMode ? 'active' : ''}`} 
              onClick={toggleDrawWallsMode}
            >
              {isDrawingWallsMode ? '🛑 Detener Paredes (Esc)' : '✏️ Dibujar Paredes'}
            </button>
          )}
          
          <button 
            className={`btn-toolbar ${showAllFovs ? 'active' : ''}`}
            onClick={() => setShowAllFovs(prev => !prev)}
            title="Mostrar u ocultar los conos de visión de todas las cámaras"
          >
            {showAllFovs ? '👁️ Ocultar Coberturas' : '👁️ Mostrar Coberturas'}
          </button>

          <button 
            className={`btn-toolbar ${showEdgeLabels ? 'active' : ''}`}
            onClick={() => setShowEdgeLabels(prev => !prev)}
            title="Mostrar u ocultar medidas y diámetros de las tuberías"
          >
            {showEdgeLabels ? '📏 Ocultar Medidas' : '📏 Mostrar Medidas'}
          </button>
          
          <button className="btn-toolbar" onClick={() => fileInputRef.current?.click()}>
            🖼️ Subir Plano
          </button>
          <input 
            type="file" 
            accept="image/*" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            style={{ display: 'none' }} 
          />
          <button className="btn-toolbar btn-danger" onClick={clearCanvas}>
            🗑️ Limpiar Todo
          </button>
        </div>

        {/* Visual Scale bar */}
        <div style={{
          position: 'absolute',
          bottom: '15px',
          left: '15px',
          zIndex: 4,
          backgroundColor: 'var(--surface-color)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-sm)',
          padding: '6px 10px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          boxShadow: 'var(--shadow-sm)',
          pointerEvents: 'none',
        }}>
          <div style={{
            width: `${5 * scalePixelsPerMeter}px`,
            height: '6px',
            borderLeft: '2px solid var(--text-main)',
            borderRight: '2px solid var(--text-main)',
            borderBottom: '2px solid var(--text-main)',
            marginBottom: '4px',
            transition: 'width 0.1s ease',
          }} />
          <span style={{ fontSize: '0.65rem', fontWeight: 'bold', color: 'var(--text-main)' }}>5 m (Escala)</span>
        </div>

        <ReactFlow
          nodes={processedNodes}
          edges={processedEdges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onSelectionChange={onSelectionChange}
          onPaneClick={onPaneClick}
          onDrop={onDrop}
          onDragOver={onDragOver}
          defaultEdgeOptions={{ type: 'bendable' }}
          fitView
          minZoom={0.01}
          maxZoom={30}
        >
          <Controls />
          <MiniMap />
          <Background gap={24} size={1} color="var(--border-color)" />
        </ReactFlow>
      </div>

      <div className="sidebar-panel">
        
        {/* Dynamic Project/Quote Linkage */}
        <div className="project-selector-card">
          <h4 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--primary-color)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            📁 Integración con Cotización / Proyecto
          </h4>
          
          {urlId ? (
            <div style={{ fontSize: '0.82rem', color: 'var(--text-main)', fontWeight: 'bold', margin: '0.5rem 0' }}>
              {urlType === 'quote' ? '📝 Cotización: ' : '🏢 Proyecto: '}
              {urlType === 'quote' 
                ? quotes.find(q => q.id === urlId)?.projectName || 'Cargando...'
                : projects.find(p => p.id === urlId)?.projectName || 'Cargando...'}
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: '0.5rem' }}>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Tipo de registro:</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button 
                    className={`btn-toolbar ${selectedTargetType === 'project' ? 'active' : ''}`}
                    onClick={() => { setSelectedTargetType('project'); setSelectedTargetId(''); }}
                    style={{ flex: 1, fontSize: '0.75rem', padding: '4px', height: '28px', justifyContent: 'center' }}
                  >
                    🏢 Proyecto
                  </button>
                  <button 
                    className={`btn-toolbar ${selectedTargetType === 'quote' ? 'active' : ''}`}
                    onClick={() => { setSelectedTargetType('quote'); setSelectedTargetId(''); }}
                    style={{ flex: 1, fontSize: '0.75rem', padding: '4px', height: '28px', justifyContent: 'center' }}
                  >
                    📝 Cotización
                  </button>
                </div>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: '0.5rem' }}>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Seleccionar Proyecto/Cotización:</label>
                <select 
                  value={selectedTargetId}
                  onChange={(e) => setSelectedTargetId(e.target.value)}
                  style={{ width: '100%', padding: '0.4rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-main)', fontSize: '0.8rem' }}
                >
                  <option value="">Seleccione...</option>
                  {selectedTargetType === 'project' 
                    ? projects.map(p => <option key={p.id} value={p.id}>{p.projectName} ({p.clientName})</option>)
                    : quotes.map(q => <option key={q.id} value={q.id}>{q.projectName} ({q.clientName})</option>)}
                </select>
              </div>
            </>
          )}

          {selectedTargetId && (
            <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.75rem' }}>
              <button 
                onClick={() => loadDiagramFromDB()}
                className="btn-toolbar"
                style={{ flex: 1, fontSize: '0.75rem', padding: '6px', justifyContent: 'center', backgroundColor: '#34495e', color: 'white', border: 'none' }}
              >
                ✏️ Editar / Cargar
              </button>
              <button 
                onClick={saveDiagramAndBOMToDB}
                className="btn-toolbar"
                style={{ flex: 1, fontSize: '0.75rem', padding: '6px', justifyContent: 'center', backgroundColor: 'var(--success-color)', color: 'white', borderColor: 'var(--success-color)' }}
              >
                💾 Guardar Plano
              </button>
            </div>
          )}

          {urlId && (
            <button 
              onClick={() => window.location.href = `/views/proyecto-detalle.html?id=${urlId}${urlType === 'quote' ? '&type=quote' : ''}`}
              className="btn-toolbar"
              style={{ width: '100%', fontSize: '0.75rem', padding: '6px', justifyContent: 'center', backgroundColor: 'var(--surface-hover)', marginTop: '0.5rem' }}
            >
              ⬅️ Volver a Detalle
            </button>
          )}
        </div>

        <hr style={{ borderColor: 'var(--border-color)', margin: '0.5rem 0', width: '100%' }} />

        {/* CAD Tools based on current Mode */}
        {activeMode === 'structure' ? (
          <>
            <h3 style={{ marginBottom: '0.25rem' }}>Herramientas de Plano</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 0 }}>Arrastra elementos al lienzo:</p>

            {/* Sección: Edificio */}
            <p style={{ fontSize: '0.7rem', fontWeight: 'bold', color: 'var(--text-muted)', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>🏗️ Edificio</p>
            <div className="dnd-sidebar">
              {[
                { type: 'room', label: 'Habitación', category: 'structure', emoji: '⏹️' },
                { type: 'door', label: 'Puerta', category: 'structure', emoji: '🚪' },
                { type: 'window', label: 'Ventana', category: 'structure', emoji: '🪟' },
              ].map(({ type, label, category, emoji }) => (
                <div key={type} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div className="dnd-node" draggable onDragStart={(e) => onDragStart(e, JSON.stringify({ type, label, category }))} style={{ color: 'var(--text-main)', fontSize: '1.4rem' }}>
                    {emoji}
                  </div>
                  <div className="dnd-label">{label}</div>
                </div>
              ))}
            </div>

            {/* Sección: Exterior */}
            <p style={{ fontSize: '0.7rem', fontWeight: 'bold', color: 'var(--text-muted)', marginBottom: '0.25rem', marginTop: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>🌳 Exterior</p>
            <div className="dnd-sidebar">
              {[
                { type: 'arbol', label: 'Árbol', category: 'structure', emoji: '🌳' },
                { type: 'vehiculo', label: 'Vehículo', category: 'structure', emoji: '🚗' },
                { type: 'poste', label: 'Poste', category: 'structure', emoji: '💈' },
                { type: 'planta', label: 'Planta', category: 'structure', emoji: '🌿' },
              ].map(({ type, label, category, emoji }) => (
                <div key={type} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div className="dnd-node" draggable onDragStart={(e) => onDragStart(e, JSON.stringify({ type, label, category }))} style={{ color: 'var(--text-main)', fontSize: '1.4rem' }}>
                    {emoji}
                  </div>
                  <div className="dnd-label">{label}</div>
                </div>
              ))}
            </div>

            {/* Sección: Sala / Habitación */}
            <p style={{ fontSize: '0.7rem', fontWeight: 'bold', color: 'var(--text-muted)', marginBottom: '0.25rem', marginTop: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>🛋️ Sala / Habitación</p>
            <div className="dnd-sidebar">
              {[
                { type: 'cama', label: 'Cama', category: 'structure', emoji: '🛏️' },
                { type: 'sofa', label: 'Sofá', category: 'structure', emoji: '🛋️' },
                { type: 'mesa', label: 'Mesa', category: 'structure', emoji: '🪑' },
                { type: 'tv', label: 'TV', category: 'structure', emoji: '📺' },
              ].map(({ type, label, category, emoji }) => (
                <div key={type} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div className="dnd-node" draggable onDragStart={(e) => onDragStart(e, JSON.stringify({ type, label, category }))} style={{ color: 'var(--text-main)', fontSize: '1.4rem' }}>
                    {emoji}
                  </div>
                  <div className="dnd-label">{label}</div>
                </div>
              ))}
            </div>

            {/* Sección: Cocina / Baño */}
            <p style={{ fontSize: '0.7rem', fontWeight: 'bold', color: 'var(--text-muted)', marginBottom: '0.25rem', marginTop: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>🍳 Cocina / Baño</p>
            <div className="dnd-sidebar">
              {[
                { type: 'refrigerador', label: 'Refri', category: 'structure', emoji: '🧊' },
                { type: 'estufa', label: 'Estufa', category: 'structure', emoji: '🍳' },
                { type: 'inodoro', label: 'Inodoro', category: 'structure', emoji: '🚽' },
              ].map(({ type, label, category, emoji }) => (
                <div key={type} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div className="dnd-node" draggable onDragStart={(e) => onDragStart(e, JSON.stringify({ type, label, category }))} style={{ color: 'var(--text-main)', fontSize: '1.4rem' }}>
                    {emoji}
                  </div>
                  <div className="dnd-label">{label}</div>
                </div>
              ))}
            </div>
          </>

        ) : (
          <>
            <h3>Herramientas CAD (Equipos)</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Arrastra elementos de red al lienzo:</p>
            <div className="dnd-sidebar">
              {[
                { type: 'camara_domo', label: 'Cám. Domo' },
                { type: 'camara_bullet', label: 'Cám. Bullet' },
                { type: 'gabinete', label: 'Gabinete' },
                { type: 'bandeja_red', label: 'Bandeja Red' },
                { type: 'dvr_nvr', label: 'DVR / NVR' },
                { type: 'ups', label: 'UPS' },
                { type: 'router', label: 'Router' },
                { type: 'switch', label: 'Switch' },
                { type: 'patch_panel', label: 'Patch Panel' },
                { type: 'caja_2x4', label: 'Caja 2x4' },
                { type: 'caja_4x4', label: 'Caja 4x4' },
                { type: 'junction', label: 'Codo / Junta' },
              ].map(({ type, label }) => (
                <div key={type}>
                  <div
                    className="dnd-node"
                    draggable
                    onDragStart={(e) => onDragStart(e, JSON.stringify({ type, label }))}
                    style={{ color: 'var(--primary-color)' }}
                  >
                    {DEVICE_ICONS[type]}
                  </div>
                  <div className="dnd-label">{label}</div>
                </div>
              ))}
            </div>
          </>
        )}

        <hr style={{ borderColor: 'var(--border-color)', margin: '0.5rem 0', width: '100%' }} />

        {/* Selected Element Editor */}
        {selectedNode && (() => {
          const isRoom = selectedNode.type === 'room';
          const isStructIcon = selectedNode.type === 'structureIcon';
          const isPipingDevice = selectedNode.type === 'iconNode' || selectedNode.type === 'junction';

          const handleDeleteNode = () => {
            setNodes((nds) => nds.filter(n => n.id !== selectedNode.id));
            setEdges((eds) => eds.filter(e => e.source !== selectedNode.id && e.target !== selectedNode.id));
            setSelectedNode(null);
          };

          return (
            <div style={{ padding: '1rem', backgroundColor: 'var(--surface-hover)', borderRadius: 'var(--radius-md)', border: '1px solid var(--primary-color)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <label style={{ color: 'var(--primary-color)', fontWeight: 'bold', margin: 0, fontSize: '0.85rem' }}>
                {isRoom ? '⏹️ Editar Habitación / Zona' : isStructIcon ? '🚪 Editar Elemento Estructura' : '⚙️ Editar Equipo / Junta'}
              </label>

              {isRoom && (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-main)', margin: 0 }}>Nombre</label>
                    <input
                      type="text"
                      value={(selectedNode.data as any).label || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setNodes((nds) => nds.map(n => n.id === selectedNode.id ? { ...n, data: { ...n.data, label: val } } : n));
                        setSelectedNode(prev => prev ? { ...prev, data: { ...prev.data, label: val } } : null);
                      }}
                      style={{ padding: '0.4rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-main)', fontSize: '0.85rem' }}
                    />
                  </div>

                  {/* Medidas de Habitación en Metros */}
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 1 }}>
                      <label style={{ fontSize: '0.8rem', color: 'var(--text-main)', margin: 0 }}>Ancho (m)</label>
                      <input
                        type="number"
                        min="0.1"
                        step="0.1"
                        value={(selectedNode.data as any).widthMeters !== undefined ? (selectedNode.data as any).widthMeters : (selectedNode.width ? selectedNode.width / scalePixelsPerMeter : 8.0)}
                        onChange={(e) => {
                          const val = Math.max(0.1, parseFloat(e.target.value) || 0.1);
                          const wPx = Math.round(val * scalePixelsPerMeter);
                          setNodes((nds) => nds.map(n => n.id === selectedNode.id ? {
                            ...n,
                            width: wPx,
                            style: { ...n.style, width: wPx },
                            data: { ...n.data, widthMeters: val }
                          } : n));
                          setSelectedNode(prev => prev ? {
                            ...prev,
                            width: wPx,
                            style: { ...prev.style, width: wPx },
                            data: { ...prev.data, widthMeters: val }
                          } : null);
                        }}
                        style={{ padding: '0.4rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-main)', fontSize: '0.85rem' }}
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 1 }}>
                      <label style={{ fontSize: '0.8rem', color: 'var(--text-main)', margin: 0 }}>Alto (m)</label>
                      <input
                        type="number"
                        min="0.1"
                        step="0.1"
                        value={(selectedNode.data as any).heightMeters !== undefined ? (selectedNode.data as any).heightMeters : (selectedNode.height ? selectedNode.height / scalePixelsPerMeter : 6.0)}
                        onChange={(e) => {
                          const val = Math.max(0.1, parseFloat(e.target.value) || 0.1);
                          const hPx = Math.round(val * scalePixelsPerMeter);
                          setNodes((nds) => nds.map(n => n.id === selectedNode.id ? {
                            ...n,
                            height: hPx,
                            style: { ...n.style, height: hPx },
                            data: { ...n.data, heightMeters: val }
                          } : n));
                          setSelectedNode(prev => prev ? {
                            ...prev,
                            height: hPx,
                            style: { ...prev.style, height: hPx },
                            data: { ...prev.data, heightMeters: val }
                          } : null);
                        }}
                        style={{ padding: '0.4rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-main)', fontSize: '0.85rem' }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-main)', margin: 0 }}>Color de Fondo</label>
                    <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                      {[
                        { name: 'Gris', value: 'rgba(120, 120, 120, 0.08)' },
                        { name: 'Índigo', value: 'rgba(99, 102, 241, 0.08)' },
                        { name: 'Verde', value: 'rgba(46, 204, 113, 0.08)' },
                        { name: 'Naranja', value: 'rgba(230, 126, 34, 0.08)' },
                        { name: 'Rojo', value: 'rgba(231, 76, 60, 0.08)' },
                        { name: 'Celeste', value: 'rgba(52, 152, 219, 0.08)' },
                      ].map((c) => (
                        <button
                          key={c.value}
                          onClick={() => {
                            setNodes((nds) => nds.map(n => n.id === selectedNode.id ? { ...n, data: { ...n.data, color: c.value } } : n));
                            setSelectedNode(prev => prev ? { ...prev, data: { ...prev.data, color: c.value } } : null);
                          }}
                          style={{
                            fontSize: '0.7rem',
                            padding: '3px 6px',
                            borderRadius: '4px',
                            border: '1px solid var(--border-color)',
                            backgroundColor: c.value,
                            color: 'var(--text-main)',
                            cursor: 'pointer',
                            fontWeight: (selectedNode.data as any).color === c.value ? 'bold' : 'normal',
                          }}
                        >
                          {c.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Controles de Nombre/Etiqueta */}
              {((isPipingDevice && (selectedNode.data as any).label) || isStructIcon) && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-main)', margin: 0 }}>Nombre / Etiqueta</label>
                  <input
                    type="text"
                    value={(selectedNode.data as any).label || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setNodes((nds) => nds.map(n => n.id === selectedNode.id ? { ...n, data: { ...n.data, label: val } } : n));
                      setSelectedNode(prev => prev ? { ...prev, data: { ...prev.data, label: val } } : null);
                    }}
                    style={{ padding: '0.4rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-main)', fontSize: '0.85rem' }}
                  />
                </div>
              )}

              {/* Dimensiones Estructurales en metros */}
              {isStructIcon && (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 1 }}>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-main)', margin: 0 }}>Ancho (m)</label>
                    <input
                      type="number"
                      min="0.1"
                      step="0.05"
                      value={(selectedNode.data as any).widthMeters !== undefined ? (selectedNode.data as any).widthMeters : (selectedNode.width ? selectedNode.width / scalePixelsPerMeter : 1.0)}
                      onChange={(e) => {
                        const val = Math.max(0.1, parseFloat(e.target.value) || 0.1);
                        const wPx = Math.round(val * scalePixelsPerMeter);
                        setNodes((nds) => nds.map(n => n.id === selectedNode.id ? {
                          ...n,
                          width: wPx,
                          style: { ...n.style, width: wPx },
                          data: { ...n.data, widthMeters: val, size: wPx }
                        } : n));
                        setSelectedNode(prev => prev ? {
                          ...prev,
                          width: wPx,
                          style: { ...prev.style, width: wPx },
                          data: { ...prev.data, widthMeters: val, size: wPx }
                        } : null);
                      }}
                      style={{ padding: '0.4rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-main)', fontSize: '0.85rem' }}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 1 }}>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-main)', margin: 0 }}>Alto (m)</label>
                    <input
                      type="number"
                      min="0.1"
                      step="0.05"
                      value={(selectedNode.data as any).heightMeters !== undefined ? (selectedNode.data as any).heightMeters : (selectedNode.height ? selectedNode.height / scalePixelsPerMeter : 1.0)}
                      onChange={(e) => {
                        const val = Math.max(0.1, parseFloat(e.target.value) || 0.1);
                        const hPx = Math.round(val * scalePixelsPerMeter);
                        setNodes((nds) => nds.map(n => n.id === selectedNode.id ? {
                          ...n,
                          height: hPx,
                          style: { ...n.style, height: hPx },
                          data: { ...n.data, heightMeters: val }
                        } : n));
                        setSelectedNode(prev => prev ? {
                          ...prev,
                          height: hPx,
                          style: { ...prev.style, height: hPx },
                          data: { ...prev.data, heightMeters: val }
                        } : null);
                      }}
                      style={{ padding: '0.4rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-main)', fontSize: '0.85rem' }}
                    />
                  </div>
                </div>
              )}

              {/* Altura de Instalación para Equipos de Tubería */}
              {isPipingDevice && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-main)', margin: 0 }}>↕️ Altura de Instalación (m)</label>
                  <input
                    type="number"
                    min="0"
                    max="20"
                    step="0.1"
                    value={(selectedNode.data as any).height !== undefined ? (selectedNode.data as any).height : getDeviceDefaultHeight((selectedNode.data as any)?.type as string || selectedNode.type as string, ceilingHeight, ceilingRunOffset)}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setNodes((nds) => nds.map(n => n.id === selectedNode.id ? { ...n, data: { ...n.data, height: isNaN(val) ? undefined : val } } : n));
                      setSelectedNode(prev => prev ? { ...prev, data: { ...prev.data, height: isNaN(val) ? undefined : val } } : null);
                    }}
                    style={{ padding: '0.4rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-main)', fontSize: '0.85rem' }}
                  />
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    Por defecto: {getDeviceDefaultHeight((selectedNode.data as any)?.type as string || selectedNode.type as string, ceilingHeight, ceilingRunOffset).toFixed(2)}m (Techo: {(ceilingHeight - ceilingRunOffset).toFixed(1)}m, Interruptor: 1.2m, Toma: 0.3m)
                  </span>
                </div>
              )}

              {/* Slider de Tamaño de Icono */}
              {(isStructIcon || (isPipingDevice && selectedNode.type !== 'junction')) && (
                <div className="slider-group">
                  <div className="slider-header">
                    <span>Tamaño del Icono:</span>
                    <strong>{(selectedNode.data as any).size || (isStructIcon ? 32 : 40)}px</strong>
                  </div>
                  <input 
                    type="range" 
                    min="16" 
                    max="128" 
                    value={(selectedNode.data as any).size || (isStructIcon ? 32 : 40)}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      setNodes((nds) => nds.map(n => {
                        if (n.id === selectedNode.id) {
                          if (n.type === 'structureIcon') {
                            return {
                              ...n,
                              width: val,
                              height: val,
                              style: { ...n.style, width: val, height: val },
                              data: {
                                ...n.data,
                                size: val,
                                widthMeters: val / scalePixelsPerMeter,
                                heightMeters: val / scalePixelsPerMeter
                              }
                            };
                          }
                          return { ...n, data: { ...n.data, size: val } };
                        }
                        return n;
                      }));
                      setSelectedNode(prev => {
                        if (!prev) return null;
                        if (prev.type === 'structureIcon') {
                          return {
                            ...prev,
                            width: val,
                            height: val,
                            style: { ...prev.style, width: val, height: val },
                            data: {
                              ...prev.data,
                              size: val,
                              widthMeters: val / scalePixelsPerMeter,
                              heightMeters: val / scalePixelsPerMeter
                            }
                          };
                        }
                        return { ...prev, data: { ...prev.data, size: val } };
                      });
                    }}
                    className="slider-input"
                  />
                </div>
              )}

              {/* Slider de Orientación / Rotación */}
              {(isStructIcon || (isPipingDevice && selectedNode.type !== 'junction')) && (
                <div className="slider-group">
                  <div className="slider-header">
                    <span>Orientación:</span>
                    <strong>{(selectedNode.data as any).rotation || 0}°</strong>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="359" 
                    value={(selectedNode.data as any).rotation || 0}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      setNodes((nds) => nds.map(n => n.id === selectedNode.id ? { ...n, data: { ...n.data, rotation: val } } : n));
                      setSelectedNode(prev => prev ? { ...prev, data: { ...prev.data, rotation: val } } : null);
                    }}
                    className="slider-input"
                  />
                  <div style={{ display: 'flex', gap: '0.25rem', marginTop: '0.25rem' }}>
                    {[0, 90, 180, 270].map((angle) => (
                      <button
                        key={angle}
                        onClick={() => {
                          setNodes((nds) => nds.map(n => n.id === selectedNode.id ? { ...n, data: { ...n.data, rotation: angle } } : n));
                          setSelectedNode(prev => prev ? { ...prev, data: { ...prev.data, rotation: angle } } : null);
                        }}
                        style={{ flex: 1, padding: '2px', fontSize: '0.7rem', cursor: 'pointer', border: '1px solid var(--border-color)', borderRadius: '3px', backgroundColor: 'var(--bg-color)', color: 'var(--text-main)' }}
                      >
                        {angle}°
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Ajustes Ópticos Específicos para Cámaras */}
              {isPipingDevice && ((selectedNode.data as any).type === 'camara_domo' || (selectedNode.data as any).type === 'camara_bullet') && (
                <div className="optical-group" style={{ marginTop: '0.25rem' }}>
                  <label style={{ fontSize: '0.78rem', fontWeight: 'bold', color: 'var(--primary-color)', margin: 0 }}>
                    📷 Ajustes Ópticos (CCTV)
                  </label>
                  
                  {/* Selección de Resolución */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                    <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', margin: 0 }}>Resolución de Cámara</label>
                    <select
                      value={(selectedNode.data as any).resolution || 4}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        setNodes((nds) => nds.map(n => n.id === selectedNode.id ? { ...n, data: { ...n.data, resolution: val } } : n));
                        setSelectedNode(prev => prev ? { ...prev, data: { ...prev.data, resolution: val } } : null);
                      }}
                      style={{ padding: '3px', fontSize: '0.78rem', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-main)', outline: 'none' }}
                    >
                      <option value={2}>2 MP (1080p)</option>
                      <option value={4}>4 MP (2K)</option>
                      <option value={8}>8 MP (4K UltraHD)</option>
                    </select>
                  </div>

                  {/* Selección de Distancia Focal (Lente) */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                    <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', margin: 0 }}>Lente / Focal (mm)</label>
                    <select
                      value={(selectedNode.data as any).focalLength || 2.8}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setNodes((nds) => nds.map(n => n.id === selectedNode.id ? { ...n, data: { ...n.data, focalLength: val } } : n));
                        setSelectedNode(prev => prev ? { ...prev, data: { ...prev.data, focalLength: val } } : null);
                      }}
                      style={{ padding: '3px', fontSize: '0.78rem', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-main)', outline: 'none' }}
                    >
                      <option value={2.8}>2.8 mm (~90° HFOV)</option>
                      <option value={4.0}>4.0 mm (~70° HFOV)</option>
                      <option value={6.0}>6.0 mm (~48° HFOV)</option>
                      <option value={12.0}>12.0 mm (~23° HFOV)</option>
                    </select>
                  </div>

                  {/* Formato de Sensor */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                    <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', margin: 0 }}>Tamaño del Sensor</label>
                    <select
                      value={(selectedNode.data as any).sensorSize || '1/2.8'}
                      onChange={(e) => {
                        const val = e.target.value;
                        setNodes((nds) => nds.map(n => n.id === selectedNode.id ? { ...n, data: { ...n.data, sensorSize: val } } : n));
                        setSelectedNode(prev => prev ? { ...prev, data: { ...prev.data, sensorSize: val } } : null);
                      }}
                      style={{ padding: '3px', fontSize: '0.78rem', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-main)', outline: 'none' }}
                    >
                      <option value="1/3">1/3" (Básico estándar)</option>
                      <option value="1/2.8">1/2.8" (Starvis nocturno)</option>
                      <option value="1/1.8">1/1.8" (Sensor Pro grande)</option>
                    </select>
                  </div>

                  {/* Alternancia de FOV Individual */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.2rem' }}>
                    <input
                      type="checkbox"
                      id="camera-fov-check"
                      checked={(selectedNode.data as any).showFov !== false}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setNodes((nds) => nds.map(n => n.id === selectedNode.id ? { ...n, data: { ...n.data, showFov: checked } } : n));
                        setSelectedNode(prev => prev ? { ...prev, data: { ...prev.data, showFov: checked } } : null);
                      }}
                    />
                    <label htmlFor="camera-fov-check" style={{ fontSize: '0.75rem', color: 'var(--text-main)', margin: 0, cursor: 'pointer' }}>
                      👁️ Mostrar cono de cobertura
                    </label>
                  </div>
                </div>
              )}

              <button
                onClick={handleDeleteNode}
                className="btn-toolbar btn-danger"
                style={{ fontSize: '0.8rem', padding: '6px', justifyContent: 'center', marginTop: '0.5rem', width: '100%' }}
              >
                🗑️ Eliminar del Plano
              </button>
            </div>
          );
        })()}

        {activeSelectedEdge && (() => {
          const edgeData = activeSelectedEdge.data as any;
          const cableCount = edgeData?.cableCount || 0;
          const pipeSize = edgeData?.pipeSize || '1/2"';
          const splitTubes = edgeData?.splitTubes || 1;
          const horizontalLen = edgeData?.length || 0;
          const verticalLen = edgeData?.verticalMeters || 0;
          const totalLen = horizontalLen + verticalLen;
          const cablesPerTube = splitTubes > 1 ? Math.ceil(cableCount / splitTubes) : cableCount;
          const autoCalculate = edgeData?.autoCalculate !== false;

          return (
            <div style={{ padding: '1rem', backgroundColor: 'var(--surface-hover)', borderRadius: 'var(--radius-md)', border: '1px solid var(--primary-color)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <label style={{ color: 'var(--primary-color)', fontWeight: 'bold', margin: 0, fontSize: '0.85rem' }}>✏️ Editar Línea Seleccionada</label>

              {/* Info chips */}
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '12px', backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                  {cableCount} cables
                </span>
                <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '12px', backgroundColor: 'var(--bg-color)', border: '1px solid var(--primary-color)', color: 'var(--primary-color)', fontWeight: 'bold' }}>
                  {splitTubes > 1 ? `${splitTubes}× ` : ''}Tubo {pipeSize} {splitTubes > 1 ? `(${cablesPerTube} cab/tubo)` : ''}
                </span>
                <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '12px', backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                  Total: {totalLen.toFixed(1)}m
                </span>
              </div>

              {/* Auto calculate checkbox */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                <input
                  type="checkbox"
                  id="auto-calc-check"
                  checked={autoCalculate}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setEdges((eds) => eds.map((edge) => {
                      if (edge.id === selectedEdge!.id) {
                        return { ...edge, data: { ...edge.data, autoCalculate: checked } };
                      }
                      return edge;
                    }));
                    setSelectedEdge((prev) => prev ? { ...prev, data: { ...prev.data, autoCalculate: checked } } : null);
                  }}
                />
                <label htmlFor="auto-calc-check" style={{ fontSize: '0.8rem', color: 'var(--text-main)', margin: 0, cursor: 'pointer' }}>
                  📐 Auto-calcular metros desde escala
                </label>
              </div>

              {/* Horizontal length */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-main)', margin: 0 }}>
                  📐 Longitud horizontal (m) {autoCalculate && <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>(Auto)</span>}
                </label>
                <input
                  type="number"
                  value={horizontalLen}
                  disabled={autoCalculate}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0;
                    setEdges((eds) => eds.map((edge) => {
                      if (edge.id === selectedEdge!.id) {
                        edge.data = { ...edge.data, length: val, autoCalculate: false };
                      }
                      return edge;
                    }));
                    setSelectedEdge((prev) => prev ? { ...prev, data: { ...prev.data, length: val, autoCalculate: false } } : null);
                  }}
                  min="0"
                  step="0.1"
                  style={{ padding: '0.4rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-main)', fontSize: '0.9rem', opacity: autoCalculate ? 0.6 : 1 }}
                />
              </div>

              {/* Routing Mode Selector */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-main)', margin: 0 }}>Modo de Tendido (Ruteo)</label>
                <select
                  value={edgeData?.routingMode || 'default'}
                  onChange={(e) => {
                    const val = e.target.value;
                    setEdges((eds) => eds.map((edge) => {
                      if (edge.id === selectedEdge!.id) {
                        return { ...edge, data: { ...edge.data, routingMode: val } };
                      }
                      return edge;
                    }));
                    setSelectedEdge((prev) => prev ? { ...prev, data: { ...prev.data, routingMode: val } } : null);
                  }}
                  style={{ padding: '0.4rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-main)', fontSize: '0.9rem' }}
                >
                  <option value="default">Por defecto del sistema ({defaultRoutingMode === 'ceiling' ? 'Techo' : defaultRoutingMode === 'floor' ? 'Piso' : 'Directo'})</option>
                  <option value="ceiling">Techo (Cielo Raso)</option>
                  <option value="floor">Piso (Canaleta)</option>
                  <option value="direct">Directo (Punto a punto)</option>
                </select>
              </div>

              {/* Auto-calculate Vertical Checkbox */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                <input
                  type="checkbox"
                  id="auto-calc-vert-check"
                  checked={edgeData?.autoCalculateVertical !== false}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setEdges((eds) => eds.map((edge) => {
                      if (edge.id === selectedEdge!.id) {
                        return { ...edge, data: { ...edge.data, autoCalculateVertical: checked } };
                      }
                      return edge;
                    }));
                    setSelectedEdge((prev) => prev ? { ...prev, data: { ...prev.data, autoCalculateVertical: checked } } : null);
                  }}
                />
                <label htmlFor="auto-calc-vert-check" style={{ fontSize: '0.8rem', color: 'var(--text-main)', margin: 0, cursor: 'pointer' }}>
                  ↕️ Auto-calcular metros verticales
                </label>
              </div>

              {/* Vertical meters */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-main)', margin: 0 }}>
                  ↕️ Metros verticales (bajada/subida) {edgeData?.autoCalculateVertical !== false && <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>(Auto)</span>}
                </label>
                {edgeData?.autoCalculateVertical !== false ? (
                  <div style={{ padding: '0.5rem', backgroundColor: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', fontSize: '0.8rem', color: 'var(--text-main)' }}>
                    <strong style={{ fontSize: '1rem', color: 'var(--primary-color)' }}>{verticalLen.toFixed(2)}m</strong>
                    <div style={{ marginTop: '0.25rem', fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                      {edgeData?.verticalBreakdown}
                    </div>
                  </div>
                ) : (
                  <input
                    type="number"
                    value={verticalLen}
                    onChange={handleVerticalMetersChange}
                    min="0"
                    step="0.1"
                    placeholder="Ej: 3 (del techo al cielo falso)"
                    style={{ padding: '0.4rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-main)', fontSize: '0.9rem' }}
                  />
                )}
                {verticalLen > 0 && (
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    Total efectivo: {horizontalLen}m + {verticalLen}m = <strong>{totalLen.toFixed(1)}m</strong>
                  </span>
                )}
              </div>

              {/* Split tubes */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-main)', margin: 0 }}>🔀 Dividir en N tubos paralelos</label>
                <input
                  type="number"
                  value={splitTubes}
                  onChange={handlePipeSplitChange}
                  min="1"
                  max="10"
                  step="1"
                  style={{ padding: '0.4rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-main)', fontSize: '0.9rem' }}
                />
                {splitTubes > 1 && (
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    {cableCount} cables ÷ {splitTubes} tubos = {cablesPerTube} cables/tubo → Tubo {pipeSize} cada uno
                  </span>
                )}
              </div>
            </div>
          );
        })()}

        <h3>Ajustes Generales</h3>

        <details style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.5rem', backgroundColor: 'var(--surface-hover)', cursor: 'pointer', marginBottom: '0.5rem' }} open>
          <summary style={{ fontWeight: 'bold', fontSize: '0.85rem', color: 'var(--primary-color)' }}>📐 Alturas y Ruteo Estándar</summary>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem', cursor: 'default' }} onClick={(e) => e.stopPropagation()}>
            <div className="form-group">
              <label style={{ fontSize: '0.78rem' }}>Altura del Techo (m)</label>
              <input
                type="number"
                step="0.1"
                min="1"
                max="10"
                value={ceilingHeight}
                onChange={(e) => setCeilingHeight(Math.max(1, parseFloat(e.target.value) || 3.0))}
              />
            </div>
            <div className="form-group">
              <label style={{ fontSize: '0.78rem' }}>Margen Tubería Techo (m)</label>
              <input
                type="number"
                step="0.05"
                min="0"
                max="5"
                value={ceilingRunOffset}
                onChange={(e) => setCeilingRunOffset(Math.max(0, parseFloat(e.target.value) || 0))}
              />
            </div>
            <div className="form-group">
              <label style={{ fontSize: '0.78rem' }}>Margen Tubería Piso (m)</label>
              <input
                type="number"
                step="0.05"
                min="0"
                max="5"
                value={floorRunOffset}
                onChange={(e) => setFloorRunOffset(Math.max(0, parseFloat(e.target.value) || 0))}
              />
            </div>
            <div className="form-group">
              <label style={{ fontSize: '0.78rem' }}>Ruteo Global por Defecto</label>
              <select
                value={defaultRoutingMode}
                onChange={(e) => setDefaultRoutingMode(e.target.value)}
                style={{ padding: '0.4rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-main)', fontSize: '0.85rem' }}
              >
                <option value="ceiling">Techo (Cielo Raso)</option>
                <option value="floor">Piso (Canaleta)</option>
                <option value="direct">Directo (Punto a punto)</option>
              </select>
            </div>
          </div>
        </details>

        <details style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.5rem', backgroundColor: 'var(--surface-hover)', cursor: 'pointer', marginBottom: '0.75rem' }}>
          <summary style={{ fontWeight: 'bold', fontSize: '0.85rem', color: 'var(--primary-color)' }}>📖 Guía: Colocación de Tubos (Distancias)</summary>
          <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', cursor: 'default' }} onClick={(e) => e.stopPropagation()}>
            <img 
              src="/Captura.PNG" 
              alt="Normas de Colocación" 
              style={{ width: '100%', borderRadius: '4px', border: '1px solid var(--border-color)', display: 'block' }} 
            />
            <ul style={{ fontSize: '0.72rem', color: 'var(--text-muted)', paddingLeft: '1.2rem', margin: 0, lineHeight: '1.3' }}>
              <li><strong>Trazado Techo/Piso:</strong> a 30 cm de distancia.</li>
              <li><strong>Trazado Vertical:</strong> a 20 cm máx. de esquinas y marcos.</li>
              <li><strong>Tomas / Datos:</strong> a 30 cm del piso (aconsejable).</li>
              <li><strong>Interruptores:</strong> a 110 - 120 cm de altura.</li>
            </ul>
          </div>
        </details>
        
        <div className="form-group">
          <label>Escala: Píxeles por Metro (px/m)</label>
          <input 
            type="number" 
            value={scalePixelsPerMeter} 
            onChange={(e) => setScalePixelsPerMeter(Math.max(1, parseFloat(e.target.value) || 1))} 
            min="1"
            max="150"
          />
          <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '-2px' }}>
            Ajusta esta medida para calibrar el tamaño del dibujo con los metros reales.
          </span>
        </div>

        <div className="form-group">
          <label>Tubo Conduit (Catálogo)</label>
          <select value={selectedPipeId} onChange={(e) => setSelectedPipeId(e.target.value)}>
            <option value="">Seleccione un tubo...</option>
            {materials.map((m) => (
              <option key={m.id} value={m.id}>{m.name} (${m.unitCost})</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Tipo/Categoría de Cable UTP</label>
          <select value={cableType} onChange={(e) => setCableType(e.target.value)}>
            {CABLE_CONFIGS.map((config) => (
              <option key={config.id} value={config.id}>
                {config.name} ({config.diameter})
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Largo estándar tubo (m)</label>
          <input 
            type="number" 
            value={standardLength} 
            onChange={(e) => setStandardLength(parseFloat(e.target.value) || 1)} 
            min="1"
          />
        </div>

        <div className="form-group">
          <label>Margen de Desperdicio (%)</label>
          <input 
            type="number" 
            value={wastePercentage} 
            onChange={(e) => setWastePercentage(parseFloat(e.target.value) || 0)} 
            min="0"
          />
        </div>

        <div className="results-section">
          {/* UTP Cable Metraje Card */}
          <div className="result-card" style={{ borderLeft: '3px solid var(--primary-color)' }}>
            <h4 style={{ color: 'var(--primary-color)' }}>Metraje de Cable UTP</h4>
            {!hasHubs ? (
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                ⚠️ Agrega un Gabinete (🏢) como centro de cableado para calcular las rutas de cable.
              </div>
            ) : (
              <>
                <div className="result-item">
                  <span>Cable Dibujado:</span>
                  <strong>{totalCableLength.toFixed(2)} m</strong>
                </div>
                <div className="result-item">
                  <span>Con Desperdicio (+{wastePercentage}%):</span>
                  <strong>{(totalCableLength * (1 + wastePercentage / 100)).toFixed(2)} m</strong>
                </div>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: '0.5rem 0 0 0', lineHeight: '1.2' }}>
                  * Calcula la ruta de cada Cámara (📷) al Gabinete (🏢) más cercano.
                </p>
              </>
            )}
          </div>

          <div className="result-card">
            <h4>Tubería a Comprar</h4>
            <div className="result-item">
              <span>Metraje Total Dibujado:</span>
              <strong>{totalLength.toFixed(2)} m</strong>
            </div>
            <div className="result-item">
              <span>Metraje Con Desperdicio:</span>
              <strong>{(totalLength * (1 + wastePercentage / 100)).toFixed(2)} m</strong>
            </div>

            {/* Breakdown per size */}
            <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)' }}>
              <h5 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Desglose por Diámetro</h5>
              {Object.entries(pipeBreakdown).map(([size, length]) => {
                if (length === 0) return null;
                const lengthWithWaste = length * (1 + wastePercentage / 100);
                const tubes = Math.ceil(lengthWithWaste / standardLength);
                return (
                  <div key={size} className="result-item" style={{ fontSize: '0.82rem', marginBottom: '0.25rem' }}>
                    <span>Tubo {size}:</span>
                    <strong>{length.toFixed(1)}m → {tubes} {tubes === 1 ? 'tubo' : 'tubos'}</strong>
                  </div>
                );
              })}
              {Object.values(pipeBreakdown).every(l => l === 0) && (
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  Sin tuberías dibujadas
                </div>
              )}
            </div>

            <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Total Tubos por Medida:</span>
              <strong style={{ fontSize: '1.05rem', color: 'var(--primary-color)', textAlign: 'right' }}>
                {(() => {
                  const items = Object.entries(pipeBreakdown)
                    .map(([size, length]) => {
                      if (length === 0) return null;
                      const lengthWithWaste = length * (1 + wastePercentage / 100);
                      const tubes = Math.ceil(lengthWithWaste / standardLength);
                      return `${tubes} (${size})`;
                    })
                    .filter(Boolean);
                  return items.length > 0 ? items.join(' + ') : '0 tubos';
                })()}
              </strong>
            </div>
          </div>

          <div className="result-card">
            <h4>Uniones y Codos</h4>
            <div className="result-item">
              <span>Codos 90°:</span>
              <strong>{fittingsCount.elbows}</strong>
            </div>
            <div className="result-item">
              <span>Tees (3 vías):</span>
              <strong>{fittingsCount.tees}</strong>
            </div>
            <div className="result-item">
              <span>Cruces (4 vías):</span>
              <strong>{fittingsCount.crosses}</strong>
            </div>
          </div>

          <div className="result-card" style={{ borderLeft: '3px solid var(--success-color)' }}>
            <h4 style={{ color: 'var(--success-color)' }}>Equipos en Plano</h4>
            {([
              ['gabinete', 'Gabinetes'],
              ['camara_domo', 'Cám. Domo'],
              ['camara_bullet', 'Cám. Bullet'],
              ['bandeja_red', 'Bandejas de Red'],
              ['dvr_nvr', 'DVR / NVR'],
              ['ups', 'Baterías UPS'],
              ['router', 'Routers'],
              ['switch', 'Switches'],
              ['patch_panel', 'Patch Panels'],
              ['caja_2x4', 'Cajas 2x4'],
              ['caja_4x4', 'Cajas 4x4'],
            ] as [keyof typeof elementsCount, string][]).map(([key, label]) => {
              const count = elementsCount[key] || 0;
              if (count === 0) return null;
              return (
                <div key={key} className="result-item">
                  <span>{label}:</span>
                  <strong>{count}</strong>
                </div>
              );
            })}
            {Object.values(elementsCount).every(v => v === 0) && (
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Sin equipos en el plano</div>
            )}
          </div>

          {/* Backup Action Bar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>Copia de Seguridad Local:</span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={saveToLocalStorage} style={{ flex: 1, padding: '5px', fontSize: '0.75rem', cursor: 'pointer', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--surface-color)', color: 'var(--text-main)' }}>
                💾 Temp Guardar
              </button>
              <button onClick={loadFromLocalStorage} style={{ flex: 1, padding: '5px', fontSize: '0.75rem', cursor: 'pointer', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--surface-color)', color: 'var(--text-main)' }}>
                📂 Temp Cargar
              </button>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={exportToJson} style={{ flex: 1, padding: '5px', fontSize: '0.75rem', cursor: 'pointer', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--surface-color)', color: 'var(--text-main)' }}>
                📤 Exportar JSON
              </button>
              <button onClick={() => document.getElementById('import-json-file')?.click()} style={{ flex: 1, padding: '5px', fontSize: '0.75rem', cursor: 'pointer', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--surface-color)', color: 'var(--text-main)' }}>
                📥 Importar JSON
              </button>
              <input 
                type="file" 
                id="import-json-file" 
                accept=".json" 
                onChange={importFromJson} 
                style={{ display: 'none' }} 
              />
            </div>
          </div>

          {/* Reference Sizing Table */}
          <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-color)' }}>
            <h4 style={{ fontSize: '0.85rem', marginBottom: '0.5rem', color: 'var(--text-main)', fontWeight: 'bold' }}>Capacidad Máxima de Cables UTP (40% Ocupación)</h4>
            <div style={{ overflowX: 'auto', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.72rem', textAlign: 'center', minWidth: '340px' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--surface-hover)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-main)', fontWeight: 'bold' }}>
                    <th style={{ padding: '6px 4px', textAlign: 'left' }}>Tubo</th>
                    <th style={{ padding: '6px 4px', backgroundColor: cableType === 'cat5e' ? 'rgba(99, 102, 241, 0.15)' : 'transparent' }}>5e</th>
                    <th style={{ padding: '6px 4px', backgroundColor: cableType === 'cat6' ? 'rgba(99, 102, 241, 0.15)' : 'transparent' }}>6</th>
                    <th style={{ padding: '6px 4px', backgroundColor: cableType === 'cat6a_354' ? 'rgba(99, 102, 241, 0.15)' : 'transparent' }}>6A(.35)</th>
                    <th style={{ padding: '6px 4px', backgroundColor: cableType === 'cat6a_330' ? 'rgba(99, 102, 241, 0.15)' : 'transparent' }}>6A(.33)</th>
                    <th style={{ padding: '6px 4px', backgroundColor: cableType === 'cat6_ftp' ? 'rgba(99, 102, 241, 0.15)' : 'transparent' }}>6FTP</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { size: '1/2"', c5: 2, c6: 2, c6a1: 1, c6a2: 1, cftp: 1 },
                    { size: '3/4"', c5: 5, c6: 4, c6a1: 2, c6a2: 2, cftp: 3 },
                    { size: '1"', c5: 9, c6: 6, c6a1: 3, c6a2: 4, cftp: 5 },
                    { size: '1 1/4"', c5: 15, c6: 10, c6a1: 5, c6a2: 6, cftp: 7 },
                    { size: '1 1/2"', c5: 25, c6: 14, c6a1: 7, c6a2: 8, cftp: 11 },
                    { size: '2"', c5: 40, c6: 26, c6a1: 13, c6a2: 15, cftp: 19 },
                    { size: '2 1/2"', c5: 70, c6: 40, c6a1: 20, c6a2: 23, cftp: 30 },
                    { size: '3"', c5: 100, c6: 58, c6a1: 29, c6a2: 33, cftp: 43 },
                  ].map((row, idx) => (
                    <tr key={idx} style={{ borderBottom: idx < 7 ? '1px solid var(--border-color)' : 'none', color: 'var(--text-muted)' }}>
                      <td style={{ padding: '6px 4px', textAlign: 'left', fontWeight: 'bold', color: 'var(--text-main)' }}>{row.size}</td>
                      <td style={{ padding: '6px 4px', backgroundColor: cableType === 'cat5e' ? 'rgba(99, 102, 241, 0.1)' : 'transparent', color: cableType === 'cat5e' ? 'var(--primary-color)' : 'inherit', fontWeight: cableType === 'cat5e' ? 'bold' : 'normal' }}>{row.c5}</td>
                      <td style={{ padding: '6px 4px', backgroundColor: cableType === 'cat6' ? 'rgba(99, 102, 241, 0.1)' : 'transparent', color: cableType === 'cat6' ? 'var(--primary-color)' : 'inherit', fontWeight: cableType === 'cat6' ? 'bold' : 'normal' }}>{row.c6}</td>
                      <td style={{ padding: '6px 4px', backgroundColor: cableType === 'cat6a_354' ? 'rgba(99, 102, 241, 0.1)' : 'transparent', color: cableType === 'cat6a_354' ? 'var(--primary-color)' : 'inherit', fontWeight: cableType === 'cat6a_354' ? 'bold' : 'normal' }}>{row.c6a1}</td>
                      <td style={{ padding: '6px 4px', backgroundColor: cableType === 'cat6a_330' ? 'rgba(99, 102, 241, 0.1)' : 'transparent', color: cableType === 'cat6a_330' ? 'var(--primary-color)' : 'inherit', fontWeight: cableType === 'cat6a_330' ? 'bold' : 'normal' }}>{row.c6a2}</td>
                      <td style={{ padding: '6px 4px', backgroundColor: cableType === 'cat6_ftp' ? 'rgba(99, 102, 241, 0.1)' : 'transparent', color: cableType === 'cat6_ftp' ? 'var(--primary-color)' : 'inherit', fontWeight: cableType === 'cat6_ftp' ? 'bold' : 'normal' }}>{row.cftp}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.4rem', fontStyle: 'italic', lineHeight: '1.2' }}>
              * La columna resaltada indica la categoría seleccionada actualmente en la calculadora.
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

const PipingCalculatorPilot: React.FC = () => {
  return (
    <ReactFlowProvider>
      <PipingCalculatorInner />
    </ReactFlowProvider>
  );
};

export default PipingCalculatorPilot;
