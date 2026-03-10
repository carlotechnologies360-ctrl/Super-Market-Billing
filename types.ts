
export enum UnitType {
  PIECE = 'pcs',
  KG = 'kg',
  GRAM = 'g',
  LITER = 'L',
  ML = 'ml',
  PACKET = 'Pack',
  BOTTLE = 'Bottle',
  BOX = 'Box',
  DOZEN = 'Dozen',
  METER = 'm',
  BUNDLE = 'Bundle',
  TRAY = 'Tray',
  CAN = 'Can',
  JAR = 'Jar'
}

export enum PaymentMethod {
  CASH = 'Cash',
  UPI = 'UPI',
  CARD = 'Card',
  MIXED = 'Cash + UPI'
}

export enum SalaryType {
  DAILY = 'Daily',
  MONTHLY = 'Monthly'
}

export interface ModuleToggles {
  dashboard: boolean;
  billing: boolean;
  inventory: boolean;
  suppliers: boolean;
  staff: boolean;
  reports: boolean;
  label_printing: boolean;
  settings: boolean;
}

export interface StoreSettings {
  name: string;
  address: string;
  contact: string;
  logo?: string;
  taxEnabled: boolean;
  taxRate: number;
  modules: ModuleToggles;
}

export interface ProductVariant {
  name: string;
  price: number;
  actualPrice?: number;
  barcode?: string;
  stock?: number;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  actualPrice: number;
  price: number;
  costPrice?: number;
  expiryDate?: string;
  unit: UnitType;
  stock: number;
  sizeName?: string;
  imageUrl?: string;
  barcode?: string;
  variants?: ProductVariant[];
}

export interface CartItem extends Product {
  cartQuantity: number;
  selectedVariant?: string;
}

export interface Sale {
  id: string;
  date: string;
  customerName?: string;
  customerMobile?: string;
  items: CartItem[];
  totalAmount: number;
  taxAmount?: number;
  totalSavings?: number;
  paymentMethod: PaymentMethod;
  cashAmount?: number;
  upiAmount?: number;
}

export interface Purchase {
  id: string;
  date: string;
  supplierId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
}

export interface Supplier {
  id: string;
  name: string;
  phone: string;
  address: string;
  productsSupplied: string[];
}

export interface SupplierPayment {
  id: string;
  supplierId: string;
  amount: number;
  date: string;
  method: 'Cash' | 'Online';
  note?: string;
}

export interface Customer {
  mobile: string;
  name: string;
  lastVisit: string;
}

export interface HeldBill {
  id: string;
  timestamp: string;
  customerName?: string;
  customerMobile?: string;
  items: CartItem[];
}

export interface RolePermissions {
  dashboard: boolean;
  billing: boolean;
  inventory: boolean;
  suppliers: boolean;
  staff: boolean;
  reports: boolean;
  label_printing: boolean;
  settings: boolean;
}

export interface Role {
  id: string;
  name: string;
  permissions: RolePermissions;
}

export type UserRole = 'super_admin' | 'manager' | 'cashier';

export interface CurrentUser {
  id: string;
  name: string;
  role: UserRole;
  mobile: string;
}

export interface Staff {
  id: string;
  name: string;
  mobile: string;
  roleId: string;
  joiningDate: string;
  salaryType: SalaryType;
  baseSalary: number;
  status: 'Active' | 'Inactive' | 'Pending';
  pin?: string; // Optional PIN for login
}

export interface Attendance {
  id: string;
  staffId: string;
  date: string;
  checkIn?: string;
  checkOut?: string;
}

export interface SalaryPayment {
  id: string;
  staffId: string;
  month: string;
  amount: number;
  paymentDate: string;
  status: 'Paid' | 'Pending';
}

export type RevenuePeriod = 'Daily' | 'Weekly' | 'Monthly' | 'Custom';

export type ViewState = 
  | 'login'
  | 'dashboard' 
  | 'billing' 
  | 'inventory' 
  | 'staff' 
  | 'suppliers'
  | 'label_printing'
  | 'settings'
  | 'reports'
  | 'report_detail';
