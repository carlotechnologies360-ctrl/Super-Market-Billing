
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Product, UnitType } from '../types';
import { Camera } from './Camera';
import { suggestProductDetails, identifyProductsFromImage, readBarcodeFromImage } from '../services/geminiService';
import { Plus, Camera as CameraIcon, Loader2, Trash2, Search, Upload, Filter, AlertTriangle, X, Tag, Barcode, Ruler, CheckCircle2, Layers, Info, ChevronRight } from 'lucide-react';

interface InventoryProps {
  products: Product[];
  onAddProduct: (p: Product) => void;
  onDeleteProduct: (id: string, name: string, sizeName?: string) => void;
}

export const Inventory: React.FC<InventoryProps> = ({ products, onAddProduct, onDeleteProduct }) => {
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Track if we are editing an existing product or creating a new one
  const [isEditMode, setIsEditMode] = useState(false);
  const [isAddingVariant, setIsAddingVariant] = useState(false);
  const [originalProduct, setOriginalProduct] = useState<Product | null>(null);

  // Multiple Variant Selection State
  const [variantSelectionList, setVariantSelectionList] = useState<Product[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const csvImportRef = useRef<HTMLInputElement>(null);

  // Delete Confirmation State
  const [deleteConfirmItem, setDeleteConfirmItem] = useState<{ id: string, name: string, sizeName?: string } | null>(null);

  // Form State
  const [editingProduct, setEditingProduct] = useState<Partial<Product>>({
    id: '',
    name: '',
    category: 'Groceries',
    actualPrice: undefined,
    price: undefined,
    unit: UnitType.PIECE,
    stock: undefined,
    sizeName: '',
    imageUrl: '',
    barcode: '',
    variants: []
  });

  const categories = [
    'Groceries',
    'Fruits & Vegetables',
    'Dairy Products',
    'Bakery & Breads',
    'Beverages',
    'Snacks & Packaged Foods',
    'Frozen Foods',
    'Meat, Fish & Eggs',
    'Personal Care',
    'Household & Cleaning',
    'Baby Care',
    'Health & Wellness',
    'Stationery & General Items',
    'Pet Care'
  ];

  // Unique ID generation logic
  const generateNextNumericId = () => {
    return Date.now().toString();
  };

  // Calculate Summary
  const summary = useMemo(() => {
    return {
      totalProducts: products.length,
      totalStockValue: products.reduce((acc, p) => acc + (p.stock * p.price), 0),
      lowStockCount: products.filter(p => p.stock < 50).length
    }
  }, [products]);

  // Filter Products
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.barcode?.includes(searchTerm) ||
        p.id.includes(searchTerm);
      const matchesStock = showLowStockOnly ? p.stock < 50 : true;
      return matchesSearch && matchesStock;
    });
  }, [products, searchTerm, showLowStockOnly]);

  // Selection Handlers for Variants
  const selectVariantForEditing = (variant: Product) => {
    setIsEditMode(true);
    setIsAddingVariant(false);
    setOriginalProduct(variant);
    setEditingProduct(prev => ({
      ...variant,
      imageUrl: prev.imageUrl && prev.imageUrl.startsWith('data:') ? prev.imageUrl : (variant.imageUrl || prev.imageUrl)
    }));
    setVariantSelectionList([]);
  };

  const createNewVariantBasedOn = (baseProduct: Product) => {
    setIsEditMode(false);
    setIsAddingVariant(true);
    setOriginalProduct(baseProduct);
    setEditingProduct(prev => ({
      ...baseProduct,
      actualPrice: undefined,
      price: undefined,
      stock: undefined,
      sizeName: '',
      barcode: '',
      imageUrl: prev.imageUrl && prev.imageUrl.startsWith('data:') ? prev.imageUrl : (baseProduct.imageUrl || prev.imageUrl)
    }));
    setVariantSelectionList([]);
  };

  const handleNameChange = (newName: string) => {
    const trimmedName = newName.trim().toLowerCase();
    setEditingProduct(prev => ({ ...prev, name: newName }));

    if (!trimmedName) {
      setIsEditMode(false);
      setIsAddingVariant(false);
      setOriginalProduct(null);
      setIsEditMode(false);
      setIsAddingVariant(false);
      setOriginalProduct(null);
      setEditingProduct(prev => ({
        ...prev,
        id: generateNextNumericId(),
        barcode: '',
        actualPrice: undefined,
        price: undefined,
        stock: undefined
      }));
      return;
    }

    const matches = products.filter(p => p.name.toLowerCase().trim() === trimmedName);
    if (matches.length > 0) {
      const currentId = editingProduct.id;
      // Fixed: removed space in variable name 'alreadyHandlingThisProduct'
      const alreadyHandlingThisProduct = matches.some(m => m.id === currentId);
      if (!alreadyHandlingThisProduct) {
        setVariantSelectionList(matches);
      }
      setEditingProduct(prev => ({ ...prev, id: matches[0].id }));
    } else {
      const nextId = generateNextNumericId();
      if (editingProduct.id !== nextId && !isEditMode && !isAddingVariant) {
        setEditingProduct(prev => ({ ...prev, id: nextId }));
      }
    }
  };

  const handleSizeChange = (newSize: string) => {
    setEditingProduct(prev => ({ ...prev, sizeName: newSize }));
    if (!editingProduct.name) return;
    const trimmedName = editingProduct.name.trim().toLowerCase();
    const trimmedSize = newSize.trim().toLowerCase();
    const exactMatch = products.find(p =>
      p.name.toLowerCase().trim() === trimmedName &&
      (p.sizeName || '').toLowerCase().trim() === trimmedSize
    );

    if (exactMatch) {
      if (originalProduct?.id === exactMatch.id && originalProduct?.sizeName === exactMatch.sizeName) return;
      setIsEditMode(true);
      setIsAddingVariant(false);
      setOriginalProduct(exactMatch);
      setEditingProduct(prev => ({
        ...exactMatch,
        name: editingProduct.name,
        imageUrl: prev.imageUrl || exactMatch.imageUrl
      }));
    } else if (isEditMode) {
      setIsEditMode(false);
      setIsAddingVariant(true);
      setOriginalProduct(null);
      setEditingProduct(prev => ({
        ...prev,
        actualPrice: undefined,
        price: undefined,
        stock: undefined,
        barcode: ''
      }));
    }
  };

  const handleCapture = async (base64: string) => {
    setIsCameraOpen(false);
    setShowForm(true);
    setApiError(null);
    setIsAddingVariant(false);
    setIsEditMode(false);
    setOriginalProduct(null);

    const imageUrl = `data:image/jpeg;base64,${base64}`;
    setEditingProduct(prev => ({
      ...prev,
      id: generateNextNumericId(),
      name: '',
      imageUrl
    }));

    setIsAnalyzing(true);

    try {
      const [barcode, visualMatches] = await Promise.all([
        readBarcodeFromImage(base64),
        identifyProductsFromImage(base64, products)
      ]);

      let detectedName = '';
      if (visualMatches.length > 0) {
        detectedName = visualMatches[0].productName;
      }

      let matches: Product[] = [];
      if (barcode) {
        const barcodeMatches = products.filter(p => p.barcode === barcode);
        if (barcodeMatches.length > 0) matches = barcodeMatches;
      }

      if (matches.length === 0 && detectedName) {
        matches = products.filter(p => p.name.toLowerCase() === detectedName.toLowerCase());
      }

      if (matches.length > 0) {
        setVariantSelectionList(matches);
        const baseMatch = matches[0];
        setEditingProduct({
          id: baseMatch.id,
          name: baseMatch.name,
          category: baseMatch.category,
          actualPrice: undefined,
          price: undefined,
          unit: baseMatch.unit,
          stock: undefined,
          sizeName: '',
          imageUrl: imageUrl,
          barcode: barcode || '',
          variants: []
        });
      } else {
        const suggestion = await suggestProductDetails(base64);
        setEditingProduct({
          id: generateNextNumericId(),
          name: suggestion?.name || detectedName || '',
          category: 'Groceries',
          actualPrice: undefined,
          price: undefined,
          unit: (suggestion?.unit as UnitType) || UnitType.PIECE,
          stock: undefined,
          sizeName: '',
          imageUrl: imageUrl,
          barcode: barcode || '',
          variants: []
        });
      }

    } catch (error: any) {
      console.error("AI Analysis Failed:", error);
      setApiError("AI is currently unavailable. Please enter details manually.");
      setEditingProduct(prev => ({ ...prev, id: generateNextNumericId() }));
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleEditClick = (product: Product) => {
    setIsEditMode(true);
    setIsAddingVariant(false);
    setOriginalProduct(product);
    setEditingProduct({ ...product });
    setApiError(null);
    setShowForm(true);
  };

  const handleAddNewClick = () => {
    setIsEditMode(false);
    setIsAddingVariant(false);
    setOriginalProduct(null);
    setApiError(null);
    setEditingProduct({
      id: generateNextNumericId(),
      name: '',
      category: 'Groceries',
      actualPrice: undefined,
      price: undefined,
      unit: UnitType.PIECE,
      stock: undefined,
      sizeName: '',
      imageUrl: '',
      barcode: '',
      variants: []
    });
    setShowForm(true);
  };

  const confirmDelete = () => {
    if (deleteConfirmItem) {
      onDeleteProduct(deleteConfirmItem.id, deleteConfirmItem.name, deleteConfirmItem.sizeName);
      setDeleteConfirmItem(null);
    }
  };

  const processSave = () => {
    const rawId = editingProduct.id;
    const rawName = editingProduct.name?.trim();
    const rawSize = editingProduct.sizeName?.trim() || '';
    if (!rawId || !rawName) return false;

    const mrp = Number(editingProduct.actualPrice || 0);
    const sellingPrice = Number(editingProduct.price || 0);

    // Validation: MRP Price must be greater than or equal to Selling Price
    if (mrp < sellingPrice) {
      alert(`Validation Error: MRP Price (₹${mrp}) cannot be less than Selling Price (₹${sellingPrice}).`);
      return false;
    }

    const nameMatch = products.find(p => p.name.toLowerCase().trim() === rawName.toLowerCase());
    if (nameMatch && nameMatch.id !== rawId) {
      alert(`A product named "${nameMatch.name}" already exists with ID ${nameMatch.id}.`);
      return false;
    }

    onAddProduct({
      ...editingProduct,
      id: rawId,
      name: rawName,
      actualPrice: mrp,
      price: sellingPrice,
      stock: Number(editingProduct.stock || 0),
      sizeName: rawSize
    } as Product);
    return true;
  };

  const handleSaveOnly = (e: React.FormEvent) => {
    e.preventDefault();
    if (processSave()) setShowForm(false);
  };

  const handleSaveAndAddVariant = (e: React.MouseEvent) => {
    e.preventDefault();
    const currentId = editingProduct.id;
    if (processSave()) {
      setShowSaveSuccess(true);
      setTimeout(() => setShowSaveSuccess(false), 2000);
      setIsAddingVariant(true);
      setEditingProduct(prev => ({
        ...prev,
        id: currentId,
        actualPrice: undefined,
        price: undefined,
        stock: undefined,
        sizeName: '',
        barcode: ''
      }));
      setIsEditMode(false);
      setOriginalProduct(null);
    }
  };

  const handleCSVImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;
      const rows = text.split(/\r?\n/).filter(row => row.trim());
      if (rows.length < 2) return;
      const headers = rows[0].split(',').map(h => h.trim().toLowerCase());
      const dataRows = rows.slice(1);
      dataRows.forEach(row => {
        const values = row.split(',').map(v => v.trim());
        if (values.length < headers.length) return;
        const rowData: any = {};
        headers.forEach((header, i) => rowData[header] = values[i]);
        const name = rowData.name || rowData.productname;
        if (!name) return;
        onAddProduct({
          id: generateNextNumericId(),
          name,
          category: rowData.category || 'Groceries',
          actualPrice: parseFloat(rowData.mrp || '0'),
          price: parseFloat(rowData.price || '0'),
          unit: (rowData.unit || UnitType.PIECE) as UnitType,
          stock: parseInt(rowData.stock || '0'),
          sizeName: rowData.size || '',
          barcode: rowData.barcode || '',
          variants: []
        });
      });
      if (csvImportRef.current) csvImportRef.current.value = '';
    };
    reader.readAsText(file);
  };

  if (isCameraOpen) {
    return <Camera onCapture={handleCapture} onClose={() => setIsCameraOpen(false)} autoCaptureEnabled={true} />;
  }

  const isPriceInvalid = (editingProduct.actualPrice !== undefined && editingProduct.price !== undefined) && (Number(editingProduct.actualPrice) < Number(editingProduct.price));

  return (
    <div className="p-6 h-full bg-gray-50 flex flex-col">
      <input type="file" ref={csvImportRef} accept=".csv" className="hidden" onChange={handleCSVImport} />

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-4">Inventory Management</h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <p className="text-gray-500 text-sm font-semibold">Total Products</p>
            <p className="text-2xl font-black text-slate-900">{summary.totalProducts}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <p className="text-gray-500 text-sm font-semibold">Total Stock Value</p>
            <p className="text-2xl font-black text-green-600">₹{summary.totalStockValue.toLocaleString()}</p>
          </div>
          <div className={`bg-white p-4 rounded-lg shadow-sm border border-gray-200 ${summary.lowStockCount > 0 ? 'bg-red-50 border-red-200' : ''}`}>
            <p className="text-gray-500 text-sm flex items-center gap-2 font-semibold">Low Stock Items</p>
            <p className={`text-2xl font-black ${summary.lowStockCount > 0 ? 'text-red-700' : 'text-slate-900'}`}>{summary.lowStockCount}</p>
          </div>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex items-center gap-2 flex-1 min-w-[300px]">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text" placeholder="Search by Name, Barcode, or ID..."
              value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-400 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900 font-medium"
            />
          </div>
          <button
            onClick={() => setShowLowStockOnly(!showLowStockOnly)}
            className={`px-4 py-2 rounded-lg border flex items-center gap-2 text-sm font-bold transition-colors ${showLowStockOnly ? 'bg-red-100 border-red-300 text-red-700' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}
          >
            <Filter size={16} /> Filter
          </button>
          <button
            onClick={() => csvImportRef.current?.click()}
            className="bg-white border border-gray-300 text-blue-600 px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-bold"
          >
            <Upload size={16} /> Import
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex-1 overflow-y-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Image</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Product Name</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Category</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Selling Price</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Stock</th>
              <th className="px-6 py-3 text-right text-xs font-bold text-gray-400 uppercase tracking-widest">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredProducts.map((product, idx) => (
              <tr key={`${product.id}-${idx}`} onClick={() => handleEditClick(product)} className="hover:bg-blue-50 cursor-pointer transition-colors">
                <td className="px-6 py-4">
                  <div className="h-10 w-10 rounded-md bg-gray-100 overflow-hidden shadow-inner">
                    {product.imageUrl ? <img src={product.imageUrl} className="h-full w-full object-cover" /> : null}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <p className="font-bold text-slate-900">{product.name}</p>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5 uppercase tracking-tighter">ID: {product.id}</p>
                  {product.sizeName && <p className="text-xs font-black text-blue-600">{product.sizeName}</p>}
                </td>
                <td className="px-6 py-4 text-slate-500 font-medium">{product.category}</td>
                <td className="px-6 py-4 text-slate-900 font-black">₹{product.price.toFixed(2)}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 inline-flex text-xs leading-5 font-black rounded-full ${product.stock < 50 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                    {product.stock} {product.unit}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button onClick={(e) => { e.stopPropagation(); setDeleteConfirmItem({ id: product.id, name: product.name, sizeName: product.sizeName }); }} className="text-red-600 p-2 hover:bg-red-50 rounded-full">
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex justify-end gap-3">
        <button
          onClick={() => setIsCameraOpen(true)}
          className="bg-gray-800 hover:bg-black text-white font-black py-3 px-8 rounded-lg shadow-lg flex items-center gap-2 transform active:scale-95 transition-all"
        >
          <CameraIcon size={20} /> Capture Image
        </button>
        <button
          onClick={handleAddNewClick}
          className="bg-blue-600 hover:bg-blue-700 text-white font-black py-3 px-8 rounded-lg shadow-lg flex items-center gap-2 transform active:scale-95 transition-all"
        >
          <Plus size={20} /> Add Product
        </button>
      </div>

      {deleteConfirmItem && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-xl shadow-2xl p-6">
            <h3 className="text-lg font-black text-slate-900 mb-2">Delete Product</h3>
            <p className="text-slate-500 mb-6 font-medium">Are you sure you want to delete this product?</p>
            <div className="flex gap-3 w-full">
              <button onClick={() => setDeleteConfirmItem(null)} className="flex-1 px-4 py-2 bg-gray-100 font-bold rounded-lg text-slate-600">Cancel</button>
              <button onClick={confirmDelete} className="flex-1 px-4 py-2 bg-red-600 text-white font-bold rounded-lg">Delete</button>
            </div>
          </div>
        </div>
      )}

      {variantSelectionList.length > 0 && (
        <div className="fixed inset-0 z-[70] bg-black/70 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b flex justify-between items-center bg-gray-50">
              <h3 className="font-black text-slate-800 flex items-center gap-2 uppercase tracking-tighter"><Layers size={18} className="text-blue-600" /> Existing Variants Found</h3>
              <button onClick={() => setVariantSelectionList([])} className="text-slate-400"><X size={20} /></button>
            </div>
            <div className="p-2 max-h-80 overflow-y-auto no-scrollbar">
              {variantSelectionList.map((variant, idx) => (
                <button
                  key={`${variant.id}-${variant.sizeName}-${idx}`}
                  onClick={() => selectVariantForEditing(variant)}
                  className="w-full flex items-center justify-between p-4 hover:bg-blue-50 border-b last:border-0 border-gray-100"
                >
                  <div className="text-left">
                    <p className="font-black text-slate-900">{variant.name}</p>
                    <span className="text-xs font-black text-blue-600 bg-blue-50 px-1.5 rounded uppercase">{variant.sizeName || 'Standard'}</span>
                  </div>
                  <ChevronRight size={20} className="text-slate-300" />
                </button>
              ))}
            </div>
            <div className="p-4 bg-blue-50 border-t border-blue-100">
              <button
                onClick={() => createNewVariantBasedOn(variantSelectionList[0])}
                className="w-full bg-blue-600 text-white py-3 rounded-xl font-black flex items-center justify-center gap-2"
              >
                <Plus size={18} /> Create New Variant (Size)
              </button>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto no-scrollbar">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
              <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter">
                {isEditMode ? 'Edit Product' : isAddingVariant ? 'Add New Variant' : 'Add New Product'}
              </h2>
              <div className="flex items-center gap-4">
                {showSaveSuccess && <span className="text-green-600 text-sm font-black animate-in fade-in">Saved!</span>}
                <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={24} /></button>
              </div>
            </div>

            <form onSubmit={handleSaveOnly} className="p-6 space-y-6">
              <div className="flex flex-col md:flex-row gap-8">
                <div className="w-full md:w-1/3 space-y-4">
                  <div
                    onClick={() => setIsCameraOpen(true)}
                    className="aspect-square bg-gray-50 rounded-2xl flex items-center justify-center cursor-pointer border-2 border-dashed border-gray-200 overflow-hidden relative shadow-inner group"
                  >
                    {editingProduct.imageUrl ? (
                      <img src={editingProduct.imageUrl} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <CameraIcon size={32} className="text-slate-300" />
                        <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Capture</span>
                      </div>
                    )}
                    {isAnalyzing && <div className="absolute inset-0 bg-white/60 flex flex-col items-center justify-center z-10 gap-2 backdrop-blur-[1px]"><Loader2 className="animate-spin text-blue-600" size={32} /><span className="text-[10px] font-black text-blue-600 uppercase">AI Analyzing</span></div>}
                  </div>

                  <div className="p-3 rounded-xl border border-gray-400 bg-white shadow-sm ring-1 ring-gray-50">
                    <label className="block text-[10px] font-black text-slate-400 mb-1 uppercase tracking-widest">BARCODE</label>
                    <input
                      type="text"
                      disabled={isEditMode}
                      value={editingProduct.barcode || ''}
                      onChange={e => setEditingProduct({ ...editingProduct, barcode: e.target.value })}
                      className="w-full bg-white text-slate-900 font-black text-sm outline-none placeholder:text-slate-200"
                      placeholder="Scan Barcode"
                    />
                  </div>
                  <div className="p-3 rounded-xl border border-gray-200 bg-gray-50/50">
                    <label className="block text-[10px] font-black text-slate-400 mb-1 uppercase tracking-widest">PRODUCT ID</label>
                    <input
                      type="text"
                      readOnly
                      value={editingProduct.id || ''}
                      className="w-full bg-transparent text-slate-500 font-bold text-sm outline-none cursor-default"
                    />
                  </div>
                </div>

                <div className="w-full md:w-2/3 space-y-5">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 mb-1 uppercase tracking-widest ml-1">Product Name</label>
                    <input
                      type="text"
                      required
                      disabled={isEditMode || isAddingVariant}
                      value={editingProduct.name}
                      onChange={e => handleNameChange(e.target.value)}
                      className="w-full bg-white border border-gray-400 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500 font-black text-slate-900 text-lg shadow-sm placeholder:text-slate-200"
                      placeholder="e.g. Premium Basmati Rice"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 mb-1 uppercase tracking-widest ml-1">Category</label>
                    <select
                      disabled={isEditMode || isAddingVariant}
                      value={editingProduct.category}
                      onChange={e => setEditingProduct({ ...editingProduct, category: e.target.value })}
                      className="w-full bg-white border border-gray-400 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500 font-black text-slate-900 appearance-none shadow-sm cursor-pointer"
                    >
                      {categories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 mb-1 uppercase tracking-widest ml-1">MRP Price (₹)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={editingProduct.actualPrice ?? ''}
                        onChange={e => setEditingProduct({ ...editingProduct, actualPrice: parseFloat(e.target.value) })}
                        className={`w-full bg-white border rounded-xl p-3 font-black text-slate-900 outline-none focus:ring-2 shadow-sm ${isPriceInvalid ? 'border-red-500 focus:ring-red-100' : 'border-gray-400 focus:ring-blue-500'}`}
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 mb-1 uppercase tracking-widest ml-1 text-blue-600">Selling Price (₹)</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={editingProduct.price ?? ''}
                        onChange={e => setEditingProduct({ ...editingProduct, price: parseFloat(e.target.value) })}
                        className={`w-full bg-white border-2 rounded-xl p-3 font-black text-slate-900 outline-none focus:ring-4 text-xl shadow-sm ${isPriceInvalid ? 'border-red-500 focus:ring-red-100' : 'border-blue-500 focus:ring-blue-50'}`}
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  {isPriceInvalid && (
                    <div className="flex items-center gap-2 text-red-500 animate-in fade-in slide-in-from-top-1">
                      <AlertTriangle size={14} />
                      <p className="text-[10px] font-black uppercase tracking-widest">MRP must be greater than or equal to Selling Price</p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 mb-1 uppercase tracking-widest ml-1">Current Stock</label>
                      <input
                        type="number"
                        value={editingProduct.stock ?? ''}
                        onChange={e => setEditingProduct({ ...editingProduct, stock: parseInt(e.target.value) })}
                        className="w-full bg-white border border-gray-400 rounded-xl p-3 font-black text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 mb-1 uppercase tracking-widest ml-1">Unit</label>
                      <select
                        disabled={isEditMode || isAddingVariant}
                        value={editingProduct.unit}
                        onChange={e => setEditingProduct({ ...editingProduct, unit: e.target.value as UnitType })}
                        className="w-full bg-white border border-gray-400 rounded-xl p-3 font-black text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 shadow-sm cursor-pointer"
                      >
                        <option value={UnitType.PIECE}>Piece (pcs)</option>
                        <option value={UnitType.KG}>Kilogram (kg)</option>
                        <option value={UnitType.GRAM}>Gram (g)</option>
                        <option value={UnitType.LITER}>Liter (L)</option>
                        <option value={UnitType.ML}>Milliliter (ml)</option>
                        <option value={UnitType.PACKET}>Packet / Pack</option>
                        <option value={UnitType.BOTTLE}>Bottle</option>
                        <option value={UnitType.BOX}>Box</option>
                        <option value={UnitType.DOZEN}>Dozen</option>
                        <option value={UnitType.METER}>Meter (m)</option>
                        <option value={UnitType.BUNDLE}>Bundle / Bunch</option>
                        <option value={UnitType.TRAY}>Tray</option>
                        <option value={UnitType.CAN}>Can</option>
                        <option value={UnitType.JAR}>Jar</option>
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-[10px] font-black text-slate-400 mb-1 uppercase tracking-widest ml-1">Size / Variant (e.g. 1kg, 500ml)</label>
                      <input
                        type="text"
                        disabled={isEditMode}
                        value={editingProduct.sizeName}
                        onChange={e => handleSizeChange(e.target.value)}
                        className="w-full bg-white border border-gray-400 rounded-xl p-3 font-black text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 shadow-sm placeholder:text-slate-200"
                        placeholder="e.g. 500ml"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-8 border-t border-gray-100 flex justify-end gap-3 sticky bottom-0 bg-white pb-2">
                <button type="button" onClick={() => setShowForm(false)} className="px-6 py-3 text-slate-500 font-bold hover:bg-gray-50 rounded-xl transition-colors">Cancel</button>
                {!isEditMode && (
                  <button type="button" onClick={handleSaveAndAddVariant} className="px-6 py-3 rounded-xl font-black border-2 border-blue-600 text-blue-600 hover:bg-blue-50 transition-all active:scale-95">Save & Add Another Variant</button>
                )}
                <button type="submit" className="px-10 py-3 rounded-xl font-black bg-blue-600 text-white shadow-xl shadow-blue-100 hover:bg-blue-700 active:scale-95 transition-all">Save Product</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
