export interface AnnotationItem {
  id: string;
  type: 'signature' | 'text' | 'stamp' | 'drawing' | 'redact' | 'shape';
  pageNumber: number; // 1-indexed page number
  
  // Coordinates relative to original PDF page size (units in points, top-left origin)
  x: number; 
  y: number;
  width: number;
  height: number;

  // Signatures
  signatureDataUrl?: string; // Base64 PNG image

  // Text insertions
  text?: string;
  fontSize?: number;
  fontColor?: string;
  fontFamily?: string;

  // Stamps
  stampType?: 'APPROVED' | 'REJECTED' | 'SIGN_HERE' | 'INITIAL_HERE' | 'DATE' | 'CHECKMARK' | 'CROSS';

  // Ink drawing
  drawingPoints?: { x: number; y: number }[]; // Coordinates list relative to the original page size
  drawingColor?: string;
  drawingWidth?: number;

  // Shapes
  shapeType?: 'rectangle';
  shapeFillColor?: string;
}

export interface PDFPageSize {
  width: number;
  height: number;
}

export interface SavedSignature {
  id: string;
  dataUrl: string;
  label: string;
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'security';
}
