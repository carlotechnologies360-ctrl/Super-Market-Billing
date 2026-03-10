
import { Product, Staff, Role, StoreSettings } from './types';

export const DUMMY_PRODUCTS: Product[] = [
    {
        id: 'P001',
        name: 'Basmati Rice',
        category: 'Grains',
        price: 120,
        stock: 50,
        unit: 'kg',
        barcode: '8901234567890',
        minStock: 10,
        gst: 5
    },
    {
        id: 'P002',
        name: 'Sunflower Oil',
        category: 'Oil',
        price: 180,
        stock: 30,
        unit: 'lt',
        barcode: '8901234567891',
        minStock: 5,
        gst: 12
    },
    {
        id: 'P003',
        name: 'Tata Salt',
        category: 'Spices',
        price: 25,
        stock: 100,
        unit: 'pkt',
        barcode: '8901234567892',
        minStock: 20,
        gst: 0
    },
    {
        id: 'P004',
        name: 'Milk',
        category: 'Dairy',
        price: 30,
        stock: 40,
        unit: 'pkt',
        barcode: '8901234567893',
        minStock: 15,
        gst: 0
    },
    {
        id: 'P005',
        name: 'Sugar',
        category: 'Grains',
        price: 45,
        stock: 60,
        unit: 'kg',
        barcode: '8901234567894',
        minStock: 10,
        gst: 5
    }
];

export const DEFAULT_SETTINGS: StoreSettings = {
    name: 'Smart Mart Pro',
    address: '123, Enterprise Ave, Digital City',
    contact: '9876543210',
    taxEnabled: true,
    taxRate: 18,
    modules: {
        dashboard: true,
        billing: true,
        inventory: true,
        suppliers: true,
        staff: true,
        reports: true,
        label_printing: true,
        settings: true
    }
};

export const DEFAULT_ROLES: Role[] = [
    { id: 'admin', name: 'Admin', permissions: ['all'] },
    { id: 'cashier', name: 'Cashier', permissions: ['billing', 'dashboard'] }
];

export const DEFAULT_STAFF: Staff[] = [
    {
        id: 'ST001',
        name: 'Admin User',
        role: 'admin',
        mobile: '9999999999',
        status: 'Active',
        joinDate: new Date().toISOString()
    },
    {
        id: 'ST002',
        name: 'Cashier One',
        role: 'cashier',
        mobile: '8888888888',
        status: 'Active',
        joinDate: new Date().toISOString()
    }
];
