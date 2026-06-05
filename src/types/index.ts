export interface BaseItem {
  id: string;
  name: string;
  quantity: number;
  unitCost: number;
  currency?: 'NIO' | 'USD';
  purchasedQuantity?: number;
  isAdditional?: boolean;
}

export interface MaterialItem extends BaseItem {}

export interface EquipmentItem extends BaseItem {
  profitMargin: number | 'manual'; // Margen de ganancia aplicable
  manualPrice?: number; // Precio unitario de venta final manual
}

export interface LaborItem extends BaseItem {}

export interface User {
  id: string;
  username: string;
  role: 'admin' | 'tecnico';
  name: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  unitCost: number;
  stockQuantity: number;
  category: 'materials' | 'equipments';
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

export interface Client {
  id: string;
  name: string;
  documentId: string; // RUC o Cédula
  phone: string;
  email: string;
  address: string;
}

export interface Project {
  id: string;
  projectCode?: number;
  clientId?: string;
  clientName: string;
  projectName: string;
  date: string;
  status: 'draft' | 'completed';
  exchangeRate?: number;
  materials: MaterialItem[];
  equipments: EquipmentItem[];
  labor: LaborItem[];
  invoices?: InvoiceFile[];
  payments?: PaymentItem[];
  expenses?: ExpenseItem[];
  tasks?: ProjectTask[];
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
