export interface BaseItem {
  id: string;
  name: string;
  quantity: number;
  unitCost: number;
  currency?: 'NIO' | 'USD';
  purchasedQuantity?: number;
  isAdditional?: boolean;
  clientProvides?: boolean;
}

export interface MaterialItem extends BaseItem {}

export interface EquipmentItem extends BaseItem {
  profitMargin: number | 'manual'; // Margen de ganancia aplicable
  manualPrice?: number; // Precio unitario de venta final manual
  serialNumber?: string; // Número de serie o garantía
}

export interface LaborItem extends BaseItem {}

export interface User {
  id: string;
  username: string;
  password?: string;
  role: string;
  name: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  unitCost: number;
  stockQuantity: number;
  category: 'materials' | 'equipments';
  currency?: 'NIO' | 'USD';
  lastUpdated: string;
}

export interface InvoiceFile {
  fileName: string;
  dataUrl: string;
  dateAdded: string;
}

export interface PaymentItem {
  id: string;
  amount: number;
  date: string;
  description: string;
  currency: 'NIO' | 'USD';
  receiptImage?: string; // Imagen en base64 o URL
}

export interface ExpenseItem {
  id: string;
  category: 'Combustible' | 'Viáticos' | 'Comida' | 'Transporte' | 'Material Extra' | 'Otros';
  amount: number;
  date: string;
  description: string;
  currency: 'NIO' | 'USD';
  receiptImage?: string;
}

export interface ProjectTask {
  id: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed';
}

export interface Ticket {
  id: string;
  title: string;
  description: string;
  clientName: string;
  date: string;
  status: 'open' | 'in_progress' | 'resolved';
  priority: 'low' | 'normal' | 'high';
  cost: number;
  currency: 'NIO' | 'USD';
  lastUpdated?: number;
}

export interface Client {
  id: string;
  name: string;
  documentId: string; // RUC o Cédula
  phone: string;
  email: string;
  address: string;
}

export interface ProjectImage {
  fileName: string;
  dataUrl: string;
  dateAdded: string;
}

export interface Project {
  id: string;
  projectCode?: number;
  clientId?: string;
  clientName: string;
  projectName: string;
  date: string;
  status: 'not_started' | 'draft' | 'completed' | 'quote';
  exchangeRate?: number;
  materials: MaterialItem[];
  equipments: EquipmentItem[];
  labor: LaborItem[];
  invoices?: InvoiceFile[];
  payments?: PaymentItem[];
  expenses?: ExpenseItem[];
  tasks?: ProjectTask[];
  images?: ProjectImage[];
  lastUpdated?: number;
}

export interface PurchaseItem {
  id: string;
  name: string;
  quantity: number;
  unitCost: number;
  category: 'materials' | 'equipments';
}

export interface SupplierPurchase {
  id: string;
  providerName: string;
  invoiceNumber: string;
  date: string;
  items: PurchaseItem[];
  totalAmount: number;
  invoiceFile?: InvoiceFile;
}
