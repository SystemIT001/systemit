import React, { useState, useEffect, useRef } from 'react';

import { ArrowLeft, Save, Plus, Trash2, FileText, FileDown, Upload, Eye } from 'lucide-react';
import { useProjects } from '../hooks/useProjects';
import { useInventory } from '../hooks/useInventory';
import { useClients } from '../hooks/useClients';
import { useAuth } from '../hooks/useAuth';
import type { Project, MaterialItem, EquipmentItem, LaborItem, InvoiceFile } from '../types';
import { generateId, formatCurrency, calculateItemTotal, calculateProjectTotalsDual, calculateItemsTotalsDual, calculateProjectCostsDual, calculateExpensesDual } from '../utils';
import { InvoiceImporter } from '../components/InvoiceImporter';

type Tab = 'info' | 'materials' | 'equipments' | 'additionals' | 'purchasing_control' | 'labor' | 'planificacion' | 'payments' | 'invoices' | 'expenses' | 'gallery';

const ProjectDetail: React.FC = () => {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  const { projects, loading, getProject, updateProject } = useProjects();
  const { inventory, addInventoryItem, updateInventoryItem } = useInventory();
  const { clients, addClient } = useClients();
  const { user } = useAuth();
  const [project, setProject] = useState<Project | null>(null);

  const [activeTab, setActiveTab] = useState<Tab>('info');

  // Form states
  const [itemName, setItemName] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [quantity, setQuantity] = useState<number | ''>('');
  const [unitCost, setUnitCost] = useState<number | ''>('');
  const [itemCurrency, setItemCurrency] = useState<'USD' | 'NIO'>('USD');
  const [profitMargin, setProfitMargin] = useState<number | 'manual'>(30);
  const [manualPrice, setManualPrice] = useState<number | ''>('');
  
  // Payment states
  const [paymentAmount, setPaymentAmount] = useState<number | ''>('');
  const [paymentDesc, setPaymentDesc] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentCurrency, setPaymentCurrency] = useState<'USD' | 'NIO'>('USD');

  // Form states - Expenses
  const [expenseCategory, setExpenseCategory] = useState<'Combustible' | 'Viáticos' | 'Comida' | 'Transporte' | 'Material Extra' | 'Otros'>('Combustible');
  const [expenseAmount, setExpenseAmount] = useState<number | ''>('');
  const [expenseCurrency, setExpenseCurrency] = useState<'USD' | 'NIO'>('USD');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [expenseDesc, setExpenseDesc] = useState('');

  const [editingItem, setEditingItem] = useState<{ id: string, type: 'materials'|'equipments'|'labor', data: any } | null>(null);
  const [additionalType, setAdditionalType] = useState<'materials'|'equipments'>('materials');
  const [taskDesc, setTaskDesc] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (id && !loading) {
      const p = getProject(id);
      if (p) setProject(p);
    }
  }, [id, projects, loading]);

  if (loading) return <div style={{ padding: '2rem' }}>Cargando proyecto...</div>;
  if (!project) return <div style={{ padding: '2rem' }}>Proyecto no encontrado.</div>;

  const handleSave = () => {
    updateProject(project);
    alert('Proyecto guardado exitosamente');
  };

  const handleLinkNewClient = () => {
    if (!project || !project.clientName) return;
    
    // Check if a client with that exact name exists first
    const existing = clients.find(c => c.name.toLowerCase() === project.clientName.toLowerCase());
    if (existing) {
      const updatedProject = { ...project, clientId: existing.id };
      setProject(updatedProject);
      updateProject(updatedProject);
      alert(`Cliente enlazado automáticamente con el directorio existente.`);
      return;
    }

    // Create new
    const newClient = {
      id: generateId(),
      name: project.clientName,
      documentId: '',
      phone: '',
      email: '',
      address: ''
    };
    addClient(newClient);
    
    const updatedProject = { ...project, clientId: newClient.id };
    setProject(updatedProject);
    updateProject(updatedProject);
    alert(`Cliente "${newClient.name}" agregado al directorio y enlazado exitosamente.`);
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName || quantity === '' || unitCost === '' || quantity <= 0 || unitCost < 0) return;

    const newItem = {
      id: generateId(),
      name: itemName,
      quantity: Number(quantity),
      unitCost: Number(unitCost),
      currency: itemCurrency
    };

    let updatedProject = { ...project };

    let targetTab = activeTab as string;
    if (activeTab === 'additionals') {
      targetTab = additionalType;
    }

    if (targetTab === 'materials') {
      updatedProject.materials = [...updatedProject.materials, { 
        ...newItem, 
        profitMargin, 
        manualPrice: profitMargin === 'manual' ? Number(manualPrice) : undefined,
        isAdditional: activeTab === 'additionals' 
      } as MaterialItem];
    } else if (targetTab === 'equipments') {
      updatedProject.equipments = [...updatedProject.equipments, { 
        ...newItem, 
        profitMargin, 
        manualPrice: profitMargin === 'manual' ? Number(manualPrice) : undefined,
        isAdditional: activeTab === 'additionals'
      } as EquipmentItem];
    } else if (targetTab === 'labor') {
      updatedProject.labor = [...updatedProject.labor, newItem as LaborItem];
    }

    setProject(updatedProject);
    updateProject(updatedProject);
    
    // Reset form
    setItemName('');
    setQuantity('');
    setUnitCost('');
  };

  const handleImportedItems = (items: any[], invoiceData: InvoiceFile) => {
    let updatedProject = { ...project };
    
    items.forEach(item => {
      // Calculate how much goes to the project vs inventory
      let projectQuantity = item.quantity;
      if (item.addToInventory && item.inventoryQuantity > 0) {
        projectQuantity = item.quantity - item.inventoryQuantity;
      }

      if (projectQuantity > 0) {
        const newItem = { id: item.id, name: item.name, quantity: projectQuantity, unitCost: item.unitCost, currency: 'USD' as 'USD' | 'NIO' }; // Default to USD or parse if needed
        if (item.category === 'materials') {
          updatedProject.materials = [...updatedProject.materials, { ...newItem, profitMargin: item.profitMargin } as MaterialItem];
        } else if (item.category === 'equipments') {
          updatedProject.equipments = [...updatedProject.equipments, { ...newItem, profitMargin: item.profitMargin } as EquipmentItem];
        } else if (item.category === 'labor') {
          updatedProject.labor = [...updatedProject.labor, newItem as LaborItem];
        }
      }

      // Add to global inventory ONLY if requested
      if (item.addToInventory && item.inventoryQuantity > 0) {
        const existingInvItem = inventory.find(inv => inv.name.toLowerCase() === item.name.toLowerCase());
        if (existingInvItem) {
          updateInventoryItem({
            ...existingInvItem,
            stockQuantity: existingInvItem.stockQuantity + item.inventoryQuantity,
            unitCost: item.unitCost, // Actualizar con el precio de la factura más reciente
            lastUpdated: new Date().toISOString().split('T')[0]
          });
        } else {
          addInventoryItem({
            id: generateId(),
            name: item.name,
            category: item.category,
            unitCost: item.unitCost,
            stockQuantity: item.inventoryQuantity,
            lastUpdated: new Date().toISOString().split('T')[0]
          });
        }
      }
    });

    const currentInvoices = updatedProject.invoices || [];
    updatedProject.invoices = [...currentInvoices, invoiceData];

    try {
      updateProject(updatedProject);
      setProject(updatedProject);
    } catch (e) {
      alert("Error: El archivo PDF es demasiado grande para la memoria local (Límite 5MB). Se importaron los ítems correctamente, pero no se pudo adjuntar el archivo PDF en sí.");
      updatedProject.invoices = currentInvoices;
      updateProject(updatedProject);
      setProject(updatedProject);
    }
  };

  const handleDeleteItem = (tab: 'materials'|'equipments'|'labor', itemId: string) => {
    let updatedProject = { ...project };
    updatedProject[tab] = updatedProject[tab].filter((item: any) => item.id !== itemId) as any;
    setProject(updatedProject);
    updateProject(updatedProject);
  };

  const handleSaveEdit = () => {
    if (!editingItem || !project) return;
    let updatedProject = { ...project };
    const items = updatedProject[editingItem.type] as any[];
    const idx = items.findIndex(i => i.id === editingItem.id);
    if (idx !== -1) {
      items[idx] = editingItem.data;
    }
    setProject(updatedProject);
    setEditingItem(null);
  };



  const handleDeleteInvoice = (index: number) => {
    if (window.confirm('¿Estás seguro de eliminar este documento adjunto?')) {
      let updatedProject = { ...project };
      updatedProject.invoices = updatedProject.invoices?.filter((_, i) => i !== index);
      setProject(updatedProject);
      updateProject(updatedProject);
    }
  };

  const handleAddPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentAmount || !paymentDesc) return;

    const newPayment = {
      id: generateId(),
      amount: Number(paymentAmount),
      date: paymentDate,
      description: paymentDesc,
      currency: paymentCurrency
    };

    let updatedProject = { ...project! };
    updatedProject.payments = [...(updatedProject.payments || []), newPayment];
    setProject(updatedProject);
    
    setPaymentAmount('');
    setPaymentDesc('');
  };

  const handleDeletePayment = (id: string) => {
    let updatedProject = { ...project! };
    updatedProject.payments = updatedProject.payments?.filter(p => p.id !== id);
    setProject(updatedProject);
  };

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseAmount || !expenseDesc) return;

    const newExpense = {
      id: generateId(),
      category: expenseCategory,
      amount: Number(expenseAmount),
      date: expenseDate,
      description: expenseDesc,
      currency: expenseCurrency
    };

    let updatedProject = { ...project! };
    updatedProject.expenses = [...(updatedProject.expenses || []), newExpense as any];
    setProject(updatedProject);
    
    setExpenseAmount('');
    setExpenseDesc('');
  };

  const handleDeleteExpense = (id: string) => {
    let updatedProject = { ...project! };
    updatedProject.expenses = updatedProject.expenses?.filter(e => e.id !== id);
    setProject(updatedProject);
  };

  const handleUploadPaymentReceipt = async (paymentId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const originalNameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
    const customName = window.prompt("Ingrese un nombre para este recibo de pago:", originalNameWithoutExt);
    if (customName === null) {
      if (e.target) e.target.value = '';
      return; // El usuario canceló
    }

    const formData = new FormData();
    if (customName.trim() !== '') {
      formData.append('customName', customName.trim());
    }
    formData.append('type', 'pagos');
    formData.append('file', file);

    try {
      const response = await fetch('http://localhost:3001/api/upload', {
        method: 'POST',
        body: formData
      });
      const data = await response.json();
      
      let updatedProject = { ...project! };
      const payment = updatedProject.payments?.find(p => p.id === paymentId);
      if (payment) {
        // Guardamos la URL estática del backend, que debe apuntar a la ruta correcta con puerto 3001
        payment.receiptImage = `http://localhost:3001${data.url}`;
        updateProject(updatedProject);
        setProject(updatedProject);
      }
    } catch (err) {
      alert("Error al subir el archivo al servidor.");
    }
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskDesc.trim()) return;

    const newTask = {
      id: generateId(),
      description: taskDesc,
      status: 'pending' as const
    };

    let updatedProject = { ...project! };
    updatedProject.tasks = [...(updatedProject.tasks || []), newTask];
    setProject(updatedProject);
    updateProject(updatedProject);
    
    setTaskDesc('');
  };

  const handleUpdateTaskStatus = (id: string, status: 'pending' | 'in_progress' | 'completed') => {
    let updatedProject = { ...project! };
    const task = updatedProject.tasks?.find(t => t.id === id);
    if (task) {
      task.status = status;
      setProject(updatedProject);
      updateProject(updatedProject);
    }
  };

  const handleDeleteTask = (id: string) => {
    let updatedProject = { ...project! };
    updatedProject.tasks = updatedProject.tasks?.filter(t => t.id !== id);
    setProject(updatedProject);
    updateProject(updatedProject);
  };

  const handleDirectFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const originalNameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
    const customName = window.prompt("Ingrese un nombre para este documento:", originalNameWithoutExt);
    if (customName === null) {
      if (fileInputRef.current) fileInputRef.current.value = '';
      return; // El usuario canceló
    }

    const formData = new FormData();
    if (customName.trim() !== '') {
      formData.append('customName', customName.trim());
    }
    
    // Carpeta basada en el nombre del proyecto
    const safeProjectName = project!.projectName.replace(/[^a-zA-Z0-9_-]/g, '_');
    formData.append('type', `proyectos/${safeProjectName}/facturas`);
    formData.append('file', file);

    try {
      const response = await fetch('http://localhost:3001/api/upload', {
        method: 'POST',
        body: formData
      });
      const data = await response.json();

      const invoiceData = {
        fileName: data.fileName,
        dataUrl: `http://localhost:3001${data.url}`,
        dateAdded: new Date().toISOString()
      };
      
      let updatedProject = { ...project! };
      const currentInvoices = updatedProject.invoices || [];
      updatedProject.invoices = [...currentInvoices, invoiceData];
      
      updateProject(updatedProject);
      setProject(updatedProject);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      alert("Error al subir el archivo PDF al servidor.");
    }
  };

  const handleProjectImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    let updatedProject = { ...project! };
    let currentImages = updatedProject.images || [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const formData = new FormData();
      
      // Carpeta basada en el nombre del proyecto
      const safeProjectName = project!.projectName.replace(/[^a-zA-Z0-9_-]/g, '_');
      formData.append('type', `proyectos/${safeProjectName}/galeria`);
      formData.append('file', file);

      try {
        const response = await fetch('http://localhost:3001/api/upload', {
          method: 'POST',
          body: formData
        });
        const data = await response.json();
        
        currentImages.push({
          fileName: data.fileName,
          dataUrl: `http://localhost:3001${data.url}`,
          dateAdded: new Date().toISOString()
        });
      } catch (err) {
        alert(`Error al subir la imagen ${file.name}.`);
      }
    }
    
    updatedProject.images = currentImages;
    updateProject(updatedProject);
    setProject(updatedProject);
  };

  const handleDeleteImage = (index: number) => {
    if (!window.confirm("¿Seguro que deseas eliminar esta imagen?")) return;
    let updatedProject = { ...project! };
    let currentImages = updatedProject.images || [];
    currentImages.splice(index, 1);
    updatedProject.images = currentImages;
    updateProject(updatedProject);
    setProject(updatedProject);
  };

  const handleViewFile = (dataUrl: string) => {
    fetch(dataUrl)
      .then(res => res.blob())
      .then(blob => {
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        setTimeout(() => URL.revokeObjectURL(url), 10000);
      })
      .catch(() => {
        // Fallback para navegadores que bloqueen el fetch de un dataUrl (raro, pero posible)
        const newWindow = window.open();
        if (newWindow) {
          if (dataUrl.startsWith('data:image')) {
            newWindow.document.write(`<img src="${dataUrl}" style="max-width:100%;" />`);
          } else {
            newWindow.document.write(`<iframe src="${dataUrl}" width="100%" height="100%" style="border:none;"></iframe>`);
          }
        }
      });
  };

  const renderTable = (items: any[], type: 'materials'|'equipments'|'labor') => {
    if (items.length === 0) return <p style={{ color: 'var(--text-muted)' }}>No hay ítems registrados.</p>;
    
    return (
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
            <th style={{ padding: '0.75rem' }}>Descripción</th>
            <th style={{ padding: '0.75rem' }}>Cantidad</th>
            <th style={{ padding: '0.75rem' }}>Costo Unitario</th>
            {(type === 'equipments' || type === 'materials') && <th style={{ padding: '0.75rem' }}>Ganancia</th>}
            <th style={{ padding: '0.75rem' }}>Total</th>
            <th style={{ padding: '0.75rem' }}></th>
          </tr>
        </thead>
        <tbody>
          {items.map(item => {
            if (editingItem && editingItem.id === item.id && editingItem.type === type) {
              return (
                <tr key={item.id} style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: 'rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '0.75rem' }}>
                    <input type="text" value={editingItem.data.name} onChange={e => setEditingItem({...editingItem, data: {...editingItem.data, name: e.target.value}})} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--primary-color)', backgroundColor: 'var(--bg-color)' }} />
                  </td>
                  <td style={{ padding: '0.75rem' }}>
                    <input type="number" value={editingItem.data.quantity} onChange={e => setEditingItem({...editingItem, data: {...editingItem.data, quantity: Number(e.target.value)}})} style={{ width: '80px', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--primary-color)', backgroundColor: 'var(--bg-color)' }} />
                  </td>
                  <td style={{ padding: '0.75rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <input type="number" step="0.01" value={editingItem.data.unitCost} onChange={e => setEditingItem({...editingItem, data: {...editingItem.data, unitCost: Number(e.target.value)}})} style={{ width: '100px', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--primary-color)', backgroundColor: 'var(--bg-color)' }} />
                      <select value={editingItem.data.currency} onChange={e => setEditingItem({...editingItem, data: {...editingItem.data, currency: e.target.value}})} style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--primary-color)', backgroundColor: 'var(--bg-color)' }}>
                        <option value="NIO">NIO</option>
                        <option value="USD">USD</option>
                      </select>
                    </div>
                  </td>
                  {(type === 'equipments' || type === 'materials') && (
                    <td style={{ padding: '0.75rem' }}>
                      <select value={editingItem.data.profitMargin} onChange={e => setEditingItem({...editingItem, data: {...editingItem.data, profitMargin: e.target.value === 'manual' ? 'manual' : Number(e.target.value)}})} style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--primary-color)', backgroundColor: 'var(--bg-color)' }}>
                        <option value="manual">Manual</option>
                        <option value="0">0%</option>
                        <option value="10">10%</option>
                        <option value="15">15%</option>
                        <option value="20">20%</option>
                        <option value="25">25%</option>
                        <option value="30">30%</option>
                        <option value="35">35%</option>
                        <option value="40">40%</option>
                        <option value="45">45%</option>
                        <option value="50">50%</option>
                        <option value="60">60%</option>
                        <option value="70">70%</option>
                        <option value="100">100%</option>
                      </select>
                    </td>
                  )}
                  <td style={{ padding: '0.75rem', fontWeight: 600 }}>{formatCurrency(calculateItemTotal(editingItem.data), editingItem.data.currency)}</td>
                  <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                    <button style={{ color: 'var(--success-color)', marginRight: '1rem' }} onClick={handleSaveEdit}>
                      <Save size={16} />
                    </button>
                    <button style={{ color: 'var(--text-muted)' }} onClick={() => setEditingItem(null)}>
                      <Trash2 size={16} style={{ display: 'none' }} /> Cancelar
                    </button>
                  </td>
                </tr>
              );
            }

            return (
              <tr key={item.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={{ padding: '0.75rem' }}>{item.name}</td>
                <td style={{ padding: '0.75rem' }}>{item.quantity}</td>
                <td style={{ padding: '0.75rem' }}>{formatCurrency(item.unitCost, item.currency)}</td>
                {(type === 'equipments' || type === 'materials') && (
                  <td style={{ padding: '0.75rem' }}>
                    {item.profitMargin === 'manual' ? 'Manual' : (item.profitMargin ? `${item.profitMargin}%` : '0%')}
                  </td>
                )}
                <td style={{ padding: '0.75rem', fontWeight: 600 }}>{formatCurrency(calculateItemTotal(item), item.currency)}</td>
                <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                  <button style={{ color: 'var(--primary-color)', marginRight: '1rem' }} onClick={() => setEditingItem({ id: item.id, type, data: { ...item } })}>
                    Editar
                  </button>
                  <button style={{ color: 'var(--danger-color)' }} onClick={() => handleDeleteItem(type, item.id)}>
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    );
  };

  const handleUpdatePurchasedQuantity = (tab: 'materials'|'equipments', itemId: string, quantity: number) => {
    let updatedProject = { ...project };
    const items = updatedProject[tab] as any[];
    const item = items.find((i: any) => i.id === itemId);
    if (item) {
      item.purchasedQuantity = quantity;
      setProject(updatedProject);
      updateProject(updatedProject);
    }
  };

  const renderPurchasingTable = (items: any[], type: 'materials'|'equipments', title: string) => {
    if (items.length === 0) return null;
    
    return (
      <div style={{ marginBottom: '2rem' }}>
        <h4 style={{ marginBottom: '1rem' }}>{title}</h4>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left', backgroundColor: 'rgba(0,0,0,0.02)' }}>
              <th style={{ padding: '0.75rem' }}>Descripción</th>
              <th style={{ padding: '0.75rem', textAlign: 'center' }}>Total Req.</th>
              <th style={{ padding: '0.75rem', width: '150px' }}>Comprado</th>
              <th style={{ padding: '0.75rem', textAlign: 'center' }}>Pendiente</th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => {
              const purchased = item.purchasedQuantity || 0;
              const pending = Math.max(0, item.quantity - purchased);
              const isComplete = pending === 0;

              return (
                <tr key={item.id} style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: isComplete ? 'rgba(34, 197, 94, 0.05)' : 'transparent' }}>
                  <td style={{ padding: '0.75rem', textDecoration: isComplete ? 'line-through' : 'none', color: isComplete ? 'var(--success-color)' : 'inherit' }}>
                    {item.name} {item.isAdditional ? <span style={{ fontSize: '0.75rem', backgroundColor: 'var(--primary-color)', color: 'white', padding: '0.1rem 0.4rem', borderRadius: '12px', marginLeft: '0.5rem' }}>Extra</span> : ''}
                  </td>
                  <td style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 600 }}>{item.quantity}</td>
                  <td style={{ padding: '0.75rem' }}>
                    <input 
                      type="number" 
                      min="0"
                      step="0.01"
                      value={purchased || ''} 
                      onChange={e => handleUpdatePurchasedQuantity(type, item.id, Number(e.target.value))}
                      style={{ width: '80px', padding: '0.4rem', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', textAlign: 'center' }}
                    />
                  </td>
                  <td style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 600, color: pending > 0 ? 'var(--warning-color)' : 'var(--success-color)' }}>
                    {pending}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: 'info', label: 'Info General' },
    { id: 'planificacion', label: 'Planificación' },
    { id: 'materials', label: 'Materiales Ferreteros' },
    { id: 'equipments', label: 'Equipos' },
    { id: 'labor', label: 'Mano de Obra' },
    { id: 'additionals', label: 'Adicionales' }
  ];

  if (user?.role === 'admin') {
    tabs.push(
      { id: 'purchasing_control', label: 'Control de Compras' },
      { id: 'expenses', label: 'Gastos Operativos' },
      { id: 'payments', label: 'Pagos y Adelantos' },
      { id: 'gallery', label: 'Galería de Imágenes' },
      { id: 'invoices', label: 'Facturas de Prov.' }
    );
  } else {
    tabs.push({ id: 'gallery', label: 'Galería de Imágenes' });
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '4rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <a href="/views/proyectos.html" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}>
          <ArrowLeft size={20} />
          Volver
        </a>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <InvoiceImporter onImport={handleImportedItems} />
          <button className="btn-secondary" onClick={() => window.location.href = `/views/factura.html?id=${project.id}`}>
            <FileText size={20} />
            Factura Detallada
          </button>
          <button className="btn-secondary" onClick={() => window.location.href = `/views/factura.html?id=${project.id}&type=resumida`}>
            <FileText size={20} />
            Factura Resumida
          </button>
          <button className="btn-primary" onClick={handleSave}>
            <Save size={20} />
            Guardar Cambios
          </button>
        </div>
      </div>
      
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--surface-hover)' }}>
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              style={{
                flex: 1, padding: '1rem', fontWeight: 600,
                color: activeTab === t.id ? 'var(--primary-color)' : 'var(--text-muted)',
                borderBottom: activeTab === t.id ? '2px solid var(--primary-color)' : '2px solid transparent',
                transition: 'all 0.2s'
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div style={{ padding: '2rem' }}>
          {activeTab === 'info' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '600px' }}>
              <div style={{ display: 'flex', gap: '1.5rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Nombre del Proyecto</label>
                  <input 
                    type="text" 
                    value={project.projectName} 
                    onChange={e => setProject({...project, projectName: e.target.value})}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)' }}
                  />
                </div>
                <div style={{ width: '150px' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Código (Auto)</label>
                  <input 
                    type="text" 
                    value={`PRJ-${String(project.projectCode || 0).padStart(3, '0')}`} 
                    readOnly
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-muted)', cursor: 'not-allowed' }}
                  />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Cliente</label>
                <select 
                  value={project.clientId || ''} 
                  onChange={e => {
                    const selectedClient = clients.find(c => c.id === e.target.value);
                    setProject({
                      ...project, 
                      clientId: selectedClient?.id || '',
                      clientName: selectedClient?.name || ''
                    });
                  }}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)' }}
                >
                  <option value="">-- Seleccionar Cliente --</option>
                  {clients.map(client => (
                    <option key={client.id} value={client.id}>{client.name}</option>
                  ))}
                </select>
                {/* Fallback para proyectos antiguos que no tienen clientId pero sí clientName */}
                {!project.clientId && project.clientName && (
                  <div style={{ marginTop: '0.5rem', padding: '0.75rem', backgroundColor: 'rgba(234, 179, 8, 0.1)', border: '1px solid var(--warning-color)', borderRadius: '4px' }}>
                    <p style={{ fontSize: '0.875rem', color: 'var(--warning-color)', marginBottom: '0.5rem' }}>
                      Cliente actual (sin enlazar): <strong>{project.clientName}</strong>
                    </p>
                    <button 
                      className="btn-secondary" 
                      onClick={handleLinkNewClient}
                      style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', width: 'auto' }}
                      type="button"
                    >
                      Enlazar / Crear en Directorio
                    </button>
                  </div>
                )}
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Fecha</label>
                <input 
                  type="date" 
                  value={project.date} 
                  onChange={e => setProject({...project, date: e.target.value})}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Estado</label>
                <select 
                  value={project.status || 'not_started'}
                  onChange={e => setProject({...project, status: e.target.value as 'not_started' | 'draft' | 'completed'})}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)' }}
                >
                  <option value="not_started">No Iniciado</option>
                  <option value="draft">Borrador / En Proceso</option>
                  <option value="completed">Completado</option>
                </select>
              </div>

              {user?.role === 'admin' && (
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Tasa de Cambio (NIO/USD)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={project.exchangeRate || 36.62} 
                    onChange={e => setProject({...project, exchangeRate: Number(e.target.value)})}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)' }}
                  />
                </div>
              )}
            </div>
          )}

          {(activeTab === 'materials' || activeTab === 'equipments' || activeTab === 'labor' || activeTab === 'additionals') && (
            <div>
              <form onSubmit={handleAddItem} style={{ display: 'grid', gridTemplateColumns: activeTab !== 'labor' ? (profitMargin === 'manual' ? '2fr 1fr 1fr 1fr 1fr auto' : '2fr 1fr 1fr 1fr auto') : '2fr 1fr 1fr auto', gap: '1rem', alignItems: 'end', marginBottom: '2rem', padding: '1.5rem', backgroundColor: 'var(--bg-color)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                {activeTab === 'additionals' && (
                  <div style={{ gridColumn: '1 / -1', marginBottom: '0.5rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Tipo de Adicional</label>
                    <select 
                      value={additionalType} 
                      onChange={e => setAdditionalType(e.target.value as 'materials'|'equipments')}
                      style={{ padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--surface-color)' }}
                    >
                      <option value="materials">Material Ferretero</option>
                      <option value="equipments">Equipo</option>
                    </select>
                  </div>
                )}
                <div style={{ position: 'relative' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Descripción</label>
                  <input 
                    type="text" 
                    required 
                    value={itemName} 
                    onChange={e => {
                      setItemName(e.target.value);
                      setShowSuggestions(true);
                    }} 
                    onFocus={() => setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--surface-color)' }} 
                    placeholder="Ej. Cable UTP Cat 6" 
                  />
                  {showSuggestions && itemName && inventory.length > 0 && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: '4px', marginTop: '4px', zIndex: 10, maxHeight: '200px', overflowY: 'auto', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                      {inventory
                        .filter(item => 
                          (activeTab === 'materials' ? item.category === 'materials' : item.category === 'equipments') &&
                          item.name.toLowerCase().includes(itemName.toLowerCase())
                        )
                        .map(item => (
                          <div 
                            key={item.id} 
                            style={{ padding: '0.75rem', cursor: 'pointer', borderBottom: '1px solid var(--border-color)' }}
                            onMouseDown={() => {
                              setItemName(item.name);
                              setUnitCost(item.unitCost);
                              setShowSuggestions(false);
                            }}
                          >
                            <div style={{ fontWeight: 500 }}>{item.name}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Costo: ${item.unitCost} | Stock: {item.stockQuantity}</div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Cantidad</label>
                  <input type="number" required min="1" step="0.01" value={quantity} onChange={e => setQuantity(e.target.value === '' ? '' : Number(e.target.value))} style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--surface-color)' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Costo U.</label>
                  <div style={{ display: 'flex', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--surface-color)', overflow: 'hidden' }}>
                    <input type="number" required min="0" step="0.01" value={unitCost} onChange={e => setUnitCost(e.target.value === '' ? '' : Number(e.target.value))} style={{ flex: 1, padding: '0.75rem', border: 'none', backgroundColor: 'transparent', outline: 'none', color: 'inherit', width: '100%' }} />
                    <select value={itemCurrency} onChange={e => setItemCurrency(e.target.value as 'USD'|'NIO')} style={{ padding: '0 0.5rem', border: 'none', borderLeft: '1px solid var(--border-color)', backgroundColor: 'var(--surface-hover)', color: 'inherit', outline: 'none', cursor: 'pointer' }}>
                      <option value="USD">USD</option>
                      <option value="NIO">NIO</option>
                    </select>
                  </div>
                </div>
                
                {activeTab !== 'labor' && (
                  <>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>% Ganancia</label>
                      <select 
                        value={profitMargin} 
                        onChange={e => setProfitMargin(e.target.value === 'manual' ? 'manual' : Number(e.target.value))} 
                        style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--surface-color)' }}
                      >
                        <option value={0}>0%</option>
                        <option value={10}>10%</option>
                        <option value={15}>15%</option>
                        <option value={20}>20%</option>
                        <option value={25}>25%</option>
                        <option value={30}>30%</option>
                        <option value={35}>35%</option>
                        <option value={40}>40%</option>
                        <option value={45}>45%</option>
                        <option value={50}>50%</option>
                        <option value={60}>60%</option>
                        <option value={70}>70%</option>
                        <option value={100}>100%</option>
                        <option value="manual">Manual (Precio Fijo)</option>
                      </select>
                    </div>
                    {profitMargin === 'manual' && (
                      <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Precio de Venta</label>
                        <div style={{ display: 'flex' }}>
                          <input 
                            type="number" 
                            step="0.01"
                            value={manualPrice} 
                            onChange={e => setManualPrice(Number(e.target.value))}
                            placeholder="Ej. 150.00"
                            style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--surface-color)' }}
                          />
                        </div>
                      </div>
                    )}
                  </>
                )}

                <button type="submit" className="btn-primary" style={{ padding: '0.75rem 1rem' }}>
                  <Plus size={20} />
                </button>
              </form>

              {activeTab === 'materials' && renderTable(project.materials.filter(i => !i.isAdditional), 'materials')}
              {activeTab === 'equipments' && renderTable(project.equipments.filter(i => !i.isAdditional), 'equipments')}
              {activeTab === 'labor' && renderTable(project.labor, 'labor')}
              
              {activeTab === 'additionals' && (
                <>
                  <h4 style={{ marginBottom: '1rem', marginTop: '2rem' }}>Materiales Adicionales</h4>
                  {renderTable(project.materials.filter(i => i.isAdditional), 'materials')}
                  
                  <h4 style={{ marginBottom: '1rem', marginTop: '2rem' }}>Equipos Adicionales</h4>
                  {renderTable(project.equipments.filter(i => i.isAdditional), 'equipments')}
                </>
              )}
            </div>
          )}

          {activeTab === 'purchasing_control' && (
            <div style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                  <h3 style={{ marginBottom: '0.5rem' }}>Control de Compras</h3>
                  <p style={{ color: 'var(--text-muted)' }}>Ingresa la cantidad que has ido comprando para descontarla del total requerido en el proyecto.</p>
                </div>
              </div>

              {project.materials.length === 0 && project.equipments.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>No hay materiales ni equipos registrados en el proyecto aún.</p>
              ) : (
                <>
                  {renderPurchasingTable(project.materials, 'materials', 'Materiales')}
                  {renderPurchasingTable(project.equipments, 'equipments', 'Equipos')}
                </>
              )}
            </div>
          )}

          {activeTab === 'payments' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3>Registro de Pagos y Adelantos</h3>
              </div>
              
              <form onSubmit={handleAddPayment} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr auto', gap: '1rem', alignItems: 'end', marginBottom: '2rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Fecha</label>
                  <input type="date" required value={paymentDate} onChange={e => setPaymentDate(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--surface-color)' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Monto</label>
                  <div style={{ display: 'flex', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--surface-color)', overflow: 'hidden' }}>
                    <input type="number" required min="0" step="0.01" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value === '' ? '' : Number(e.target.value))} style={{ flex: 1, padding: '0.75rem', border: 'none', backgroundColor: 'transparent', outline: 'none', color: 'inherit', width: '100%' }} />
                    <select value={paymentCurrency} onChange={e => setPaymentCurrency(e.target.value as 'USD'|'NIO')} style={{ padding: '0 0.5rem', border: 'none', borderLeft: '1px solid var(--border-color)', backgroundColor: 'var(--surface-hover)', color: 'inherit', outline: 'none', cursor: 'pointer' }}>
                      <option value="USD">USD</option>
                      <option value="NIO">NIO</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Descripción / Referencia</label>
                  <input type="text" required value={paymentDesc} onChange={e => setPaymentDesc(e.target.value)} placeholder="Ej. Anticipo 50%, Transferencia #123" style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--surface-color)' }} />
                </div>
                <button type="submit" className="btn-primary" style={{ padding: '0.75rem 1rem' }}>
                  <Plus size={20} /> Agregar
                </button>
              </form>

              {(!project.payments || project.payments.length === 0) ? (
                <p style={{ color: 'var(--text-muted)' }}>No hay pagos registrados.</p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                      <th style={{ padding: '0.75rem' }}>Fecha</th>
                      <th style={{ padding: '0.75rem' }}>Descripción</th>
                      <th style={{ padding: '0.75rem', textAlign: 'right' }}>Monto</th>
                      <th style={{ padding: '0.75rem' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {project.payments.map(payment => (
                      <tr key={payment.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '0.75rem' }}>{payment.date}</td>
                        <td style={{ padding: '0.75rem' }}>{payment.description}</td>
                        <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 600, color: 'var(--success-color)' }}>
                          {formatCurrency(payment.amount, payment.currency)}
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'right', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', alignItems: 'center' }}>
                          {payment.receiptImage && (
                            <button 
                              style={{ color: 'var(--primary-color)' }} 
                              onClick={() => handleViewFile(payment.receiptImage!)}
                              title="Ver Recibo"
                            >
                              <Eye size={16} />
                            </button>
                          )}
                          <label style={{ cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }} title="Subir Recibo">
                            <Upload size={16} />
                            <input 
                              type="file" 
                              accept="image/*,application/pdf"
                              style={{ display: 'none' }}
                              onChange={(e) => handleUploadPaymentReceipt(payment.id, e)}
                            />
                          </label>
                          <button style={{ color: 'var(--danger-color)' }} onClick={() => handleDeletePayment(payment.id)} title="Eliminar Pago">
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {/* Balance Summary */}
              <div style={{ marginTop: '3rem', padding: '1.5rem', backgroundColor: 'var(--surface-hover)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <h4 style={{ marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Resumen de Saldos (USD)</h4>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span>Costo Total del Proyecto:</span>
                  <strong style={{ fontSize: '1.1rem' }}>
                    {formatCurrency(calculateProjectTotalsDual(project).totalUSD, 'USD')}
                  </strong>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', color: 'var(--success-color)' }}>
                  <span>Total Pagado:</span>
                  <strong style={{ fontSize: '1.1rem' }}>
                    {(() => {
                      // Usamos la misma función de utilidades adaptando los pagos al formato
                      const simulatedItems = (project.payments || []).map(p => ({ quantity: 1, unitCost: p.amount, currency: p.currency }));
                      return formatCurrency(calculateItemsTotalsDual(simulatedItems, project.exchangeRate).totalUSD, 'USD');
                    })()}
                  </strong>
                </div>

                {(() => {
                  const totalCost = calculateProjectTotalsDual(project).totalUSD;
                  const simulatedItems = (project.payments || []).map(p => ({ quantity: 1, unitCost: p.amount, currency: p.currency }));
                  const totalPaid = calculateItemsTotalsDual(simulatedItems, project.exchangeRate).totalUSD;
                  const balance = totalCost - totalPaid;
                  
                  if (balance < 0) {
                    return (
                      <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '1rem', borderTop: '1px dashed var(--border-color)' }}>
                        <span style={{ fontSize: '1.25rem', fontWeight: 700 }}>Saldo a favor del Cliente:</span>
                        <strong style={{ fontSize: '1.5rem', color: 'var(--primary-color)' }}>
                          {formatCurrency(Math.abs(balance), 'USD')}
                        </strong>
                      </div>
                    );
                  }
                  
                  return (
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '1rem', borderTop: '1px dashed var(--border-color)' }}>
                      <span style={{ fontSize: '1.25rem', fontWeight: 700 }}>Saldo Pendiente:</span>
                      <strong style={{ fontSize: '1.5rem', color: 'var(--danger-color)' }}>
                        {formatCurrency(balance, 'USD')}
                      </strong>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {activeTab === 'expenses' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3>Registro de Gastos Operativos</h3>
              </div>
              
              <form onSubmit={handleAddExpense} style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 2fr auto', gap: '1rem', alignItems: 'end', marginBottom: '2rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Categoría</label>
                  <select value={expenseCategory} onChange={e => setExpenseCategory(e.target.value as any)} style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--surface-color)' }}>
                    <option value="Combustible">Combustible</option>
                    <option value="Viáticos">Viáticos</option>
                    <option value="Comida">Comida</option>
                    <option value="Transporte">Transporte</option>
                    <option value="Material Extra">Material Extra</option>
                    <option value="Otros">Otros</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Fecha</label>
                  <input type="date" required value={expenseDate} onChange={e => setExpenseDate(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--surface-color)' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Monto</label>
                  <div style={{ display: 'flex', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--surface-color)', overflow: 'hidden' }}>
                    <input type="number" required min="0" step="0.01" value={expenseAmount} onChange={e => setExpenseAmount(e.target.value === '' ? '' : Number(e.target.value))} style={{ flex: 1, padding: '0.75rem', border: 'none', backgroundColor: 'transparent', outline: 'none', color: 'inherit', width: '100%' }} />
                    <select value={expenseCurrency} onChange={e => setExpenseCurrency(e.target.value as 'USD'|'NIO')} style={{ padding: '0 0.5rem', border: 'none', borderLeft: '1px solid var(--border-color)', backgroundColor: 'var(--surface-hover)', color: 'inherit', outline: 'none', cursor: 'pointer' }}>
                      <option value="USD">USD</option>
                      <option value="NIO">NIO</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Descripción</label>
                  <input type="text" required value={expenseDesc} onChange={e => setExpenseDesc(e.target.value)} placeholder="Ej. Combustible placa M12345" style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--surface-color)' }} />
                </div>
                <button type="submit" className="btn-primary" style={{ padding: '0.75rem 1rem' }}>
                  <Plus size={20} /> Agregar
                </button>
              </form>

              {(!project.expenses || project.expenses.length === 0) ? (
                <p style={{ color: 'var(--text-muted)' }}>No hay gastos registrados en este proyecto.</p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left', backgroundColor: 'rgba(0,0,0,0.02)' }}>
                      <th style={{ padding: '0.75rem' }}>Fecha</th>
                      <th style={{ padding: '0.75rem' }}>Categoría</th>
                      <th style={{ padding: '0.75rem' }}>Descripción</th>
                      <th style={{ padding: '0.75rem' }}>Monto</th>
                      <th style={{ padding: '0.75rem', width: '80px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {project.expenses.map(exp => (
                      <tr key={exp.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '0.75rem' }}>{exp.date}</td>
                        <td style={{ padding: '0.75rem' }}><span style={{ backgroundColor: 'var(--surface-hover)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.875rem' }}>{exp.category}</span></td>
                        <td style={{ padding: '0.75rem' }}>{exp.description}</td>
                        <td style={{ padding: '0.75rem', fontWeight: 600 }}>{formatCurrency(exp.amount, exp.currency)}</td>
                        <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                          <button style={{ color: 'var(--danger-color)' }} onClick={() => handleDeleteExpense(exp.id)} title="Eliminar Gasto">
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {/* Expense Summary */}
              <div style={{ marginTop: '3rem', padding: '1.5rem', backgroundColor: 'var(--surface-hover)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <h4 style={{ marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Resumen de Gastos y Ganancia Libre (USD)</h4>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span>Ganancia Bruta (Total Ventas - Costo Base):</span>
                  <strong style={{ fontSize: '1.1rem', color: 'var(--success-color)' }}>
                    {(() => {
                      const totalSales = calculateProjectTotalsDual(project).totalUSD;
                      const totalCost = calculateProjectCostsDual(project).totalUSD;
                      return formatCurrency(totalSales - totalCost, 'USD');
                    })()}
                  </strong>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', color: 'var(--danger-color)' }}>
                  <span>Total Gastos Operativos:</span>
                  <strong style={{ fontSize: '1.1rem' }}>
                    {(() => {
                      return formatCurrency(calculateExpensesDual(project.expenses, project.exchangeRate).totalUSD, 'USD');
                    })()}
                  </strong>
                </div>

                {(() => {
                  const totalSales = calculateProjectTotalsDual(project).totalUSD;
                  const totalCost = calculateProjectCostsDual(project).totalUSD;
                  const grossProfit = totalSales - totalCost;
                  const totalExpenses = calculateExpensesDual(project.expenses, project.exchangeRate).totalUSD;
                  const netProfit = grossProfit - totalExpenses;
                  
                  return (
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '1rem', borderTop: '1px dashed var(--border-color)' }}>
                      <span style={{ fontSize: '1.25rem', fontWeight: 700 }}>Ganancia Libre (Neta):</span>
                      <strong style={{ fontSize: '1.5rem', color: netProfit >= 0 ? 'var(--success-color)' : 'var(--danger-color)' }}>
                        {formatCurrency(netProfit, 'USD')}
                      </strong>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}
          {activeTab === 'planificacion' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3>Planificación de Tareas (Cronograma)</h3>
              </div>
              
              <form onSubmit={handleAddTask} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '1rem', alignItems: 'end', marginBottom: '2rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Nueva Tarea</label>
                  <input type="text" required value={taskDesc} onChange={e => setTaskDesc(e.target.value)} placeholder="Ej. Instalar cámaras, Pasar cableado..." style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--surface-color)' }} />
                </div>
                <button type="submit" className="btn-primary" style={{ padding: '0.75rem 1rem' }}>
                  <Plus size={20} /> Agregar
                </button>
              </form>

              {(!project.tasks || project.tasks.length === 0) ? (
                <p style={{ color: 'var(--text-muted)' }}>No hay tareas registradas.</p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                      <th style={{ padding: '0.75rem' }}>Descripción de la Tarea</th>
                      <th style={{ padding: '0.75rem', width: '200px' }}>Estado</th>
                      <th style={{ padding: '0.75rem', width: '80px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {project.tasks.map(task => (
                      <tr key={task.id} style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: task.status === 'completed' ? 'rgba(34, 197, 94, 0.05)' : 'transparent' }}>
                        <td style={{ padding: '0.75rem', textDecoration: task.status === 'completed' ? 'line-through' : 'none', color: task.status === 'completed' ? 'var(--success-color)' : 'inherit' }}>
                          {task.description}
                        </td>
                        <td style={{ padding: '0.75rem' }}>
                          <select 
                            value={task.status} 
                            onChange={(e) => handleUpdateTaskStatus(task.id, e.target.value as any)}
                            style={{ 
                              width: '100%', padding: '0.5rem', borderRadius: '4px', 
                              border: `1px solid ${task.status === 'completed' ? 'var(--success-color)' : task.status === 'in_progress' ? 'var(--warning-color)' : 'var(--border-color)'}`,
                              backgroundColor: 'var(--surface-color)'
                            }}
                          >
                            <option value="pending">⏳ Pendiente</option>
                            <option value="in_progress">🔄 En Proceso</option>
                            <option value="completed">✅ Terminado</option>
                          </select>
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                          <button style={{ color: 'var(--danger-color)' }} onClick={() => handleDeleteTask(task.id)}>
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
          {activeTab === 'invoices' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3>Facturas y Documentos Adjuntos</h3>
                <input 
                  type="file" 
                  accept="application/pdf,image/*" 
                  style={{ display: 'none' }} 
                  ref={fileInputRef} 
                  onChange={handleDirectFileUpload} 
                />
                <button className="btn-primary" onClick={() => fileInputRef.current?.click()}>
                  <Upload size={20} /> Subir Documento
                </button>
              </div>
              
              {(!project.invoices || project.invoices.length === 0) ? (
                <div style={{ textAlign: 'center', padding: '3rem', border: '1px dashed var(--border-color)', borderRadius: '8px', color: 'var(--text-muted)' }}>
                  <FileText size={48} style={{ opacity: 0.2, margin: '0 auto 1rem' }} />
                  <p>Aún no has adjuntado ningún documento a este proyecto.</p>
                  <p style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>Sube proformas, cotizaciones o facturas (PDF o Imágenes).</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
                  {project.invoices.map((inv, idx) => (
                    <div key={idx} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <h4 style={{ marginBottom: '0.25rem' }}>{inv.fileName}</h4>
                        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Subido: {new Date(inv.dateAdded).toLocaleString()}</p>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button 
                          className="btn-secondary" 
                          onClick={() => handleViewFile(inv.dataUrl)}
                          style={{ padding: '0.5rem 1rem' }}
                        >
                          <Eye size={16} /> Ver
                        </button>
                        <a href={inv.dataUrl} download={inv.fileName} className="btn-secondary" style={{ padding: '0.5rem 1rem' }}>
                          <FileDown size={16} /> Descargar
                        </a>
                        <button 
                          className="btn-secondary" 
                          onClick={() => handleDeleteInvoice(idx)}
                          style={{ padding: '0.5rem', color: 'var(--danger-color)', borderColor: 'var(--danger-color)' }}
                          title="Eliminar Documento"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'gallery' && (
            <div style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                  <h3 style={{ marginBottom: '0.5rem' }}>Galería del Proyecto</h3>
                  <p style={{ color: 'var(--text-muted)' }}>Sube fotos del proyecto, avances o del trabajo finalizado.</p>
                </div>
                <div>
                  <label className="btn-primary" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Upload size={20} />
                    Subir Imágenes
                    <input 
                      type="file" 
                      accept="image/*" 
                      multiple 
                      style={{ display: 'none' }} 
                      onChange={handleProjectImageUpload} 
                    />
                  </label>
                </div>
              </div>

              {(!project.images || project.images.length === 0) ? (
                <div style={{ textAlign: 'center', padding: '3rem', border: '2px dashed var(--border-color)', borderRadius: '8px', color: 'var(--text-muted)' }}>
                  <p>Aún no hay imágenes en la galería de este proyecto.</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1.5rem' }}>
                  {project.images.map((img, idx) => (
                    <div key={idx} style={{ border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden', backgroundColor: 'var(--surface-color)', display: 'flex', flexDirection: 'column' }}>
                      <div 
                        style={{ height: '200px', backgroundImage: `url(${img.dataUrl})`, backgroundSize: 'cover', backgroundPosition: 'center', cursor: 'pointer' }}
                        onClick={() => window.open(img.dataUrl, '_blank')}
                      ></div>
                      <div style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '80%', fontSize: '0.875rem' }} title={img.fileName}>
                          {img.fileName}
                        </div>
                        <button 
                          onClick={() => handleDeleteImage(idx)} 
                          style={{ color: 'var(--danger-color)', padding: '0.5rem', background: 'transparent', border: 'none', cursor: 'pointer' }}
                          title="Eliminar imagen"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      {activeTab !== 'invoices' && activeTab !== 'gallery' && (
        <div style={{ marginTop: '2rem', textAlign: 'right' }}>
          <h3 style={{ color: 'var(--text-muted)' }}>
            {activeTab === 'materials' ? 'Total de Materiales:' : 
             activeTab === 'equipments' ? 'Total de Equipos:' : 
             activeTab === 'labor' ? 'Total de Mano de Obra:' : 
             'Total del Proyecto:'}
            <span style={{ color: 'var(--success-color)', fontSize: '2rem', display: 'block', marginTop: '0.5rem' }}>
              {(() => {
                const totals = (activeTab === 'materials' || activeTab === 'equipments' || activeTab === 'labor')
                  ? calculateItemsTotalsDual(project[activeTab], project.exchangeRate)
                  : calculateProjectTotalsDual(project);
                
                return (
                  <>{formatCurrency(totals.totalNIO, 'NIO')} | {formatCurrency(totals.totalUSD, 'USD')}</>
                );
              })()}
            </span>
          </h3>
        </div>
      )}
    </div>
  );
};

export default ProjectDetail;
