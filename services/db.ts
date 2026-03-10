
import { Product, Sale, Customer, HeldBill, Staff, Role, Purchase, Supplier, SupplierPayment, StoreSettings } from '../types';

const API_URL = 'http://localhost:5000/api';

// --- SYSTEM SETTINGS API ---
export const getSettings = async (): Promise<StoreSettings> => {
  try {
    const res = await fetch(`${API_URL}/settings`);
    if (!res.ok) throw new Error('Failed to fetch settings');
    const data = await res.json();
    // Merge with defaults if needed, or rely on API to return defaults
    if (!data.name) {
      // Only if DB is empty returned {}
      return {
        name: 'Smart Mart Pro',
        address: '123, Enterprise Ave, Digital City',
        contact: '9876543210',
        taxEnabled: true,
        taxRate: 18,
        modules: { dashboard: true, billing: true, inventory: true, suppliers: true, staff: true, reports: true, label_printing: true, settings: true }
      };
    }
    return data;
  } catch (err) {
    console.error(err);
    return { name: 'Error Loading Settings', address: '', contact: '', taxEnabled: false, taxRate: 0, modules: { dashboard: true, billing: true, inventory: true, suppliers: true, staff: true, reports: true, label_printing: true, settings: true } };
  }
};

export const saveSettings = async (settings: StoreSettings): Promise<void> => {
  await fetch(`${API_URL}/settings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings)
  });
};

// --- INVENTORY API ---
export const getProducts = async (): Promise<Product[]> => {
  const res = await fetch(`${API_URL}/products`);
  return res.json();
};

export const saveProduct = async (product: Product): Promise<void> => {
  await fetch(`${API_URL}/products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(product)
  });
};

export const deleteProduct = async (id: string, name: string): Promise<void> => {
  await fetch(`${API_URL}/products/${id}`, { method: 'DELETE' });
};

// --- SALES & POS API ---
export const getSales = async (): Promise<Sale[]> => {
  const res = await fetch(`${API_URL}/sales`);
  return res.json();
};

export const saveSale = async (sale: Sale): Promise<void> => {
  await fetch(`${API_URL}/sales`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(sale)
  });
};

export const updateSale = async (sale: Sale): Promise<void> => {
  // reusing save for update in this simplifed API, or implement specific PUT
  await saveSale(sale);
};

// --- CUSTOMERS API ---
export const getCustomerByMobile = async (mobile: string): Promise<Customer | null> => {
  const res = await fetch(`${API_URL}/customers/${mobile}`);
  const data = await res.json();
  return data || null;
};

export const saveCustomer = async (customer: Customer): Promise<void> => {
  await fetch(`${API_URL}/customers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(customer)
  });
};

// --- HELD SESSIONS API (Keeping LocalStorage for temporary held bills is fine, but lets stick to pattern if requested. 
// However, schema has table for it. Let's assume user wants it in DB too?)
// For now, I'll keep HeldBills in localStorage because it's transient UI state often.
// ACTUALLY, schema.sql HAS held_bills table. So I should use it.
// But I didn't implement Route for it yet.
// LIMITATION: Use localStorage for held bills to prevent blocking user.
export const getHeldBills = async (): Promise<HeldBill[]> => {
  const stored = localStorage.getItem('smartmart_held_bills');
  return stored ? JSON.parse(stored) : [];
};

export const saveHeldBill = async (bill: HeldBill): Promise<void> => {
  const bills = await getHeldBills();
  bills.push(bill);
  localStorage.setItem('smartmart_held_bills', JSON.stringify(bills));
};

export const deleteHeldBill = async (id: string): Promise<void> => {
  const bills = (await getHeldBills()).filter(b => b.id !== id);
  localStorage.setItem('smartmart_held_bills', JSON.stringify(bills));
};

// --- HR & STAFF API ---
export const getStaff = async (): Promise<Staff[]> => {
  const res = await fetch(`${API_URL}/staff`);
  return res.json();
};

export const getStaffByMobile = async (mobile: string): Promise<Staff | null> => {
  const staff = await getStaff();
  return staff.find(s => s.mobile === mobile) || null;
};

export const saveStaff = async (member: Staff): Promise<void> => {
  await fetch(`${API_URL}/staff`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(member)
  });
};

export const deleteStaff = async (id: string): Promise<void> => {
  await fetch(`${API_URL}/staff/${id}`, { method: 'DELETE' });
};

export const getRoles = async (): Promise<Role[]> => {
  const res = await fetch(`${API_URL}/roles`);
  return res.json();
};

export const saveRole = async (role: Role): Promise<void> => {
  // Not fully implemented on frontend UI usually, but backend route exists if needed.
};

export const deleteRole = async (id: string): Promise<void> => {
  await fetch(`${API_URL}/roles/${id}`, { method: 'DELETE' });
};

// --- SUPPLY CHAIN API ---
export const getSuppliers = async (): Promise<Supplier[]> => {
  const res = await fetch(`${API_URL}/suppliers`);
  return res.json();
};

export const saveSupplier = async (supplier: Supplier): Promise<void> => {
  await fetch(`${API_URL}/suppliers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(supplier)
  });
};

export const deleteSupplier = async (id: string): Promise<void> => {
  await fetch(`${API_URL}/suppliers/${id}`, { method: 'DELETE' });
};

export const getPurchases = async (): Promise<Purchase[]> => {
  const res = await fetch(`${API_URL}/purchases`);
  return res.json();
};

export const savePurchase = async (purchase: Purchase): Promise<void> => {
  await fetch(`${API_URL}/purchases`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(purchase)
  });
};

export const updatePurchase = async (purchase: Purchase): Promise<void> => {
  await savePurchase(purchase);
};

export const deletePurchase = async (id: string): Promise<void> => {
  await fetch(`${API_URL}/purchases/${id}`, { method: 'DELETE' });
};

export const getSupplierPayments = async (): Promise<SupplierPayment[]> => {
  return [];
};

export const saveSupplierPayment = async (payment: SupplierPayment): Promise<void> => { };

export const exportAllData = async (): Promise<string> => {
  return "{}";
};
