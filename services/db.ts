
import { Product, Sale, Customer, HeldBill, Staff, Role, Purchase, Supplier, SupplierPayment, StoreSettings } from '../types';
import { DUMMY_PRODUCTS, DEFAULT_SETTINGS, DEFAULT_ROLES, DEFAULT_STAFF } from './mockData';

// Local storage keys
const KEYS = {
  SETTINGS: 'smartmart_settings',
  PRODUCTS: 'smartmart_products',
  SALES: 'smartmart_sales',
  CUSTOMERS: 'smartmart_customers',
  STAFF: 'smartmart_staff',
  ROLES: 'smartmart_roles',
  SUPPLIERS: 'smartmart_suppliers',
  PURCHASES: 'smartmart_purchases',
  SUPPLIER_PAYMENTS: 'smartmart_supplier_payments',
  HELD_BILLS: 'smartmart_held_bills'
};

// Helper for localStorage
const getLocal = <T>(key: string, defaultValue: T): T => {
  const stored = localStorage.getItem(key);
  if (!stored) {
    localStorage.setItem(key, JSON.stringify(defaultValue));
    return defaultValue;
  }
  try {
    return JSON.parse(stored);
  } catch {
    return defaultValue;
  }
};

const setLocal = <T>(key: string, value: T): void => {
  localStorage.setItem(key, JSON.stringify(value));
};

// --- SYSTEM SETTINGS API ---
export const getSettings = async (): Promise<StoreSettings> => {
  return getLocal(KEYS.SETTINGS, DEFAULT_SETTINGS);
};

export const saveSettings = async (settings: StoreSettings): Promise<void> => {
  setLocal(KEYS.SETTINGS, settings);
};

// --- INVENTORY API ---
export const getProducts = async (): Promise<Product[]> => {
  return getLocal(KEYS.PRODUCTS, DUMMY_PRODUCTS);
};

export const saveProduct = async (product: Product): Promise<void> => {
  const products = await getProducts();
  const index = products.findIndex(p => p.id === product.id);
  if (index >= 0) {
    products[index] = product;
  } else {
    products.push(product);
  }
  setLocal(KEYS.PRODUCTS, products);
};

export const deleteProduct = async (id: string, name: string): Promise<void> => {
  const products = (await getProducts()).filter(p => p.id !== id);
  setLocal(KEYS.PRODUCTS, products);
};

// --- SALES & POS API ---
export const getSales = async (): Promise<Sale[]> => {
  return getLocal(KEYS.SALES, []);
};

export const saveSale = async (sale: Sale): Promise<void> => {
  const sales = await getSales();
  sales.push(sale);
  setLocal(KEYS.SALES, sales);
};

export const updateSale = async (sale: Sale): Promise<void> => {
  const sales = await getSales();
  const index = sales.findIndex(s => s.id === sale.id);
  if (index >= 0) {
    sales[index] = sale;
    setLocal(KEYS.SALES, sales);
  }
};

// --- CUSTOMERS API ---
export const getCustomerByMobile = async (mobile: string): Promise<Customer | null> => {
  const customers = getLocal<Customer[]>(KEYS.CUSTOMERS, []);
  return customers.find(c => c.mobile === mobile) || null;
};

export const saveCustomer = async (customer: Customer): Promise<void> => {
  const customers = getLocal<Customer[]>(KEYS.CUSTOMERS, []);
  const index = customers.findIndex(c => c.mobile === customer.mobile);
  if (index >= 0) {
    customers[index] = customer;
  } else {
    customers.push(customer);
  }
  setLocal(KEYS.CUSTOMERS, customers);
};

// --- HELD SESSIONS API ---
export const getHeldBills = async (): Promise<HeldBill[]> => {
  return getLocal(KEYS.HELD_BILLS, []);
};

export const saveHeldBill = async (bill: HeldBill): Promise<void> => {
  const bills = await getHeldBills();
  bills.push(bill);
  setLocal(KEYS.HELD_BILLS, bills);
};

export const deleteHeldBill = async (id: string): Promise<void> => {
  const bills = (await getHeldBills()).filter(b => b.id !== id);
  setLocal(KEYS.HELD_BILLS, bills);
};

// --- HR & STAFF API ---
export const getStaff = async (): Promise<Staff[]> => {
  return getLocal(KEYS.STAFF, DEFAULT_STAFF);
};

export const getStaffByMobile = async (mobile: string): Promise<Staff | null> => {
  const staff = await getStaff();
  return staff.find(s => s.mobile === mobile) || null;
};

export const saveStaff = async (member: Staff): Promise<void> => {
  const staffList = await getStaff();
  const index = staffList.findIndex(s => s.id === member.id);
  if (index >= 0) {
    staffList[index] = member;
  } else {
    staffList.push(member);
  }
  setLocal(KEYS.STAFF, staffList);
};

export const deleteStaff = async (id: string): Promise<void> => {
  const staffList = (await getStaff()).filter(s => s.id !== id);
  setLocal(KEYS.STAFF, staffList);
};

export const getRoles = async (): Promise<Role[]> => {
  return getLocal(KEYS.ROLES, DEFAULT_ROLES);
};

export const saveRole = async (role: Role): Promise<void> => {
  const roles = await getRoles();
  const index = roles.findIndex(r => r.id === role.id);
  if (index >= 0) {
    roles[index] = role;
  } else {
    roles.push(role);
  }
  setLocal(KEYS.ROLES, roles);
};

export const deleteRole = async (id: string): Promise<void> => {
  const roles = (await getRoles()).filter(r => r.id !== id);
  setLocal(KEYS.ROLES, roles);
};

// --- SUPPLY CHAIN API ---
export const getSuppliers = async (): Promise<Supplier[]> => {
  return getLocal(KEYS.SUPPLIERS, []);
};

export const saveSupplier = async (supplier: Supplier): Promise<void> => {
  const suppliers = await getSuppliers();
  const index = suppliers.findIndex(s => s.id === supplier.id);
  if (index >= 0) {
    suppliers[index] = supplier;
  } else {
    suppliers.push(supplier);
  }
  setLocal(KEYS.SUPPLIERS, suppliers);
};

export const deleteSupplier = async (id: string): Promise<void> => {
  const suppliers = (await getSuppliers()).filter(s => s.id !== id);
  setLocal(KEYS.SUPPLIERS, suppliers);
};

export const getPurchases = async (): Promise<Purchase[]> => {
  return getLocal(KEYS.PURCHASES, []);
};

export const savePurchase = async (purchase: Purchase): Promise<void> => {
  const purchases = await getPurchases();
  const index = purchases.findIndex(p => p.id === purchase.id);
  if (index >= 0) {
    purchases[index] = purchase;
  } else {
    purchases.push(purchase);
  }
  setLocal(KEYS.PURCHASES, purchases);
};

export const updatePurchase = async (purchase: Purchase): Promise<void> => {
  await savePurchase(purchase);
};

export const deletePurchase = async (id: string): Promise<void> => {
  const purchases = (await getPurchases()).filter(p => p.id !== id);
  setLocal(KEYS.PURCHASES, purchases);
};

export const getSupplierPayments = async (): Promise<SupplierPayment[]> => {
  return getLocal(KEYS.SUPPLIER_PAYMENTS, []);
};

export const saveSupplierPayment = async (payment: SupplierPayment): Promise<void> => {
  const payments = await getSupplierPayments();
  payments.push(payment);
  setLocal(KEYS.SUPPLIER_PAYMENTS, payments);
};

export const exportAllData = async (): Promise<string> => {
  const data = {
    settings: await getSettings(),
    products: await getProducts(),
    sales: await getSales(),
    customers: getLocal(KEYS.CUSTOMERS, []),
    staff: await getStaff(),
    roles: await getRoles(),
    suppliers: await getSuppliers(),
    purchases: await getPurchases(),
    payments: await getSupplierPayments()
  };
  return JSON.stringify(data, null, 2);
};
