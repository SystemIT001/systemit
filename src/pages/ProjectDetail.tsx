import React, { useState, useEffect, useRef } from 'react';

import { ArrowLeft, Save, Plus, Trash2, FileText, FileDown, Upload, Eye, QrCode, Pencil } from 'lucide-react';
import { useProjects } from '../hooks/useProjects';
import { useQuotes } from '../hooks/useQuotes';
import { useInventory } from '../hooks/useInventory';
import { useClients } from '../hooks/useClients';
import { useAuth } from '../hooks/useAuth';
import { useUsers } from '../hooks/useUsers';
import type { Project, MaterialItem, EquipmentItem, LaborItem, InvoiceFile, AdvanceItem } from '../types';
import { generateId, formatCurrency, calculateItemTotal, calculateProjectTotalsDual, calculateItemsTotalsDual, calculateExpensesDual, calculateProjectRealRevenueDual, downloadFileFromUrl } from '../utils';
import { InvoiceImporter } from '../components/InvoiceImporter';
import QRScanner from '../components/QRScanner';

type Tab = 'info' | 'materials' | 'equipments' | 'additionals' | 'purchasing_control' | 'labor' | 'planificacion' | 'payments' | 'invoices' | 'expenses' | 'gallery' | 'profit';

const ProjectDetail: React.FC = () => {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  
  const { projects, loading: projectsLoading, getProject, updateProject } = useProjects();
  const { quotes, loading: quotesLoading, getQuote, updateQuote } = useQuotes();
  
  const loading = projectsLoading || quotesLoading;
  
  const { inventory, addInventoryItem, updateInventoryItem } = useInventory();
  const { clients, addClient } = useClients();
  const { user } = useAuth();
  const { users } = useUsers();
  const [project, setProject] = useState<Project | null>(null);

  const isQuoteUrl = window.location.search.includes('type=quote');
  const targetUpdateProject = isQuoteUrl ? updateQuote : updateProject;

  const [activeTab, setActiveTab] = useState<Tab>('info');

  // Form states
  const [itemName, setItemName] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [quantity, setQuantity] = useState<number | ''>(1);
  const [unitCost, setUnitCost] = useState<number | ''>('');
  const [itemCurrency, setItemCurrency] = useState<'USD' | 'NIO'>('USD');
  const [profitMargin, setProfitMargin] = useState<number | 'manual'>(0);
  const [manualPrice, setManualPrice] = useState<number>(0);
  const [serialNumber, setSerialNumber] = useState<string>('');
  const [isScanningSerial, setIsScanningSerial] = useState(false);
  const [clientProvides, setClientProvides] = useState<boolean>(false);
  const [isPureProfit, setIsPureProfit] = useState<boolean>(false);
  
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
  
  // Advance states
  const [advanceUserId, setAdvanceUserId] = useState('');
  const [advanceAmount, setAdvanceAmount] = useState<number | ''>('');
  const [advanceCurrency, setAdvanceCurrency] = useState<'USD' | 'NIO'>('USD');
  const [advanceDate, setAdvanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [advanceDesc, setAdvanceDesc] = useState('');

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    setItemName('');
    setQuantity(1);
    setUnitCost('');
    setItemCurrency('USD');
    setProfitMargin(0);
    setManualPrice(0);
    setSerialNumber('');
    setClientProvides(false);
    setIsPureProfit(false);
    setPaymentAmount('');
    setPaymentDesc('');
    setExpenseAmount('');
    setExpenseDesc('');
    setTaskDesc('');
    setAdvanceAmount('');
    setAdvanceDesc('');
    setAdvanceUserId('');
  };
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (id && !loading) {
      const p = getProject(id) || getQuote(id);
      if (p) setProject(p);
    }
  }, [id, projects, quotes, loading]);

  if (loading) return <div style={{ padding: '2rem' }}>Cargando proyecto...</div>;
  if (!project) return <div style={{ padding: '2rem' }}>Proyecto no encontrado.</div>;

  const handleSave = () => {
    targetUpdateProject(project);
    alert('Proyecto guardado exitosamente');
  };

  const isQuote = isQuoteUrl;

  const handleOpenPDF = async (type: 'detallada' | 'resumida') => {
    await targetUpdateProject(project); // Auto-save before opening PDF
    window.location.href = `/views/factura.html?id=${project.id}${type === 'resumida' ? '&type=resumida' : ''}${isQuote ? '&isQuote=true' : ''}`;
  };

  const handleCopyPortalLink = async () => {
    if (!project) return;
    
    // Auto-save first to ensure clientToken is saved
    const response = await targetUpdateProject(project);
    const updatedToken = response?.project?.clientToken || project.clientToken;

    // Get the base URL
    const baseUrl = window.location.origin;

    if (!updatedToken) {
      alert("Error: No se encontró el token de cliente. Guarde el proyecto e intente nuevamente.");
      return;
    }

    const portalUrl = `${baseUrl}/views/portal.html?token=${updatedToken}`;
    
    try {
      await navigator.clipboard.writeText(portalUrl);
      alert('¡Enlace del Portal copiado al portapapeles!');
    } catch (err) {
      alert('Error al copiar el enlace: ' + portalUrl);
    }
  };

  const handleLinkNewClient = () => {
    if (!project || !project.clientName) return;
    
    // Check if a client with that exact name exists first
    const existing = clients.find(c => c.name.toLowerCase() === project.clientName.toLowerCase());
    if (existing) {
      const updatedProject = { ...project, clientId: existing.id };
      setProject(updatedProject);
      targetUpdateProject(updatedProject);
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
    targetUpdateProject(updatedProject);
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
      currency: itemCurrency,
      serialNumber: activeTab === 'equipments' ? serialNumber : undefined,
      isPureProfit
    };

    const updatedProject = { ...project };

    let targetTab = activeTab as string;
    if (activeTab === 'additionals') {
      targetTab = additionalType;
    }

    if (targetTab === 'materials') {
      updatedProject.materials = [...updatedProject.materials, { 
        ...newItem, 
        profitMargin, 
        manualPrice: profitMargin === 'manual' ? Number(manualPrice) : undefined,
        isAdditional: activeTab === 'additionals',
        clientProvides
      } as MaterialItem];
    } else if (targetTab === 'equipments') {
      updatedProject.equipments = [...updatedProject.equipments, { 
        ...newItem, 
        profitMargin, 
        manualPrice: profitMargin === 'manual' ? Number(manualPrice) : undefined,
        isAdditional: activeTab === 'additionals',
        clientProvides
      } as EquipmentItem];
    } else if (targetTab === 'labor') {
      updatedProject.labor = [...updatedProject.labor, {
        ...newItem,
        isAdditional: activeTab === 'additionals',
        clientProvides
      } as LaborItem];
    }

    setProject(updatedProject);
    targetUpdateProject(updatedProject);
    
    // Reset form
    setItemName('');
    setQuantity(1);
    setUnitCost('');
    setProfitMargin(0);
    setManualPrice(0);
    setSerialNumber('');
    setClientProvides(false);
    setIsPureProfit(false);
    setAdditionalType('materials');
  };

  const handleImportedItems = (items: any[], invoiceData: InvoiceFile) => {
    const updatedProject = { ...project };
    
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
      targetUpdateProject(updatedProject);
      setProject(updatedProject);
    }
  };

  const handleDeleteItem = (tab: 'materials'|'equipments'|'labor', itemId: string) => {
    const updatedProject = { ...project };
    updatedProject[tab] = updatedProject[tab].filter((item: any) => item.id !== itemId) as any;
    setProject(updatedProject);
    targetUpdateProject(updatedProject);
  };

  const handleTogglePureProfit = (tab: 'materials'|'equipments', itemId: string, newValue: boolean) => {
    if (!project) return;
    const updatedProject = { ...project };
    const items = updatedProject[tab] as any[];
    const idx = items.findIndex(i => i.id === itemId);
    if (idx !== -1) {
      items[idx] = { ...items[idx], isPureProfit: newValue };
      setProject(updatedProject);
      targetUpdateProject(updatedProject);
    }
  };

  const handleSaveEdit = () => {
    if (!editingItem || !project) return;
    const updatedProject = { ...project };
    const items = updatedProject[editingItem.type] as any[];
    const idx = items.findIndex(i => i.id === editingItem.id);
    if (idx !== -1) {
      items[idx] = editingItem.data;
    }
    setProject(updatedProject);
    targetUpdateProject(updatedProject);
    setEditingItem(null);
  };



  const handleDeleteInvoice = (index: number) => {
    if (window.confirm('¿Estás seguro de eliminar este documento adjunto?')) {
      const updatedProject = { ...project };
      updatedProject.invoices = updatedProject.invoices?.filter((_, i) => i !== index);
      setProject(updatedProject);
      targetUpdateProject(updatedProject);
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

    const updatedProject = { ...project! };
    updatedProject.payments = [...(updatedProject.payments || []), newPayment];
    setProject(updatedProject);
    targetUpdateProject(updatedProject);
    
    setPaymentAmount('');
    setPaymentDesc('');
  };

  const handleDeletePayment = (id: string) => {
    const updatedProject = { ...project! };
    updatedProject.payments = updatedProject.payments?.filter(p => p.id !== id);
    setProject(updatedProject);
    targetUpdateProject(updatedProject);
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

    const updatedProject = { ...project! };
    updatedProject.expenses = [...(updatedProject.expenses || []), newExpense as any];
    setProject(updatedProject);
    targetUpdateProject(updatedProject);
    
    setExpenseAmount('');
    setExpenseDesc('');
  };

  const handleDeleteExpense = (id: string) => {
    const updatedProject = { ...project! };
    updatedProject.expenses = updatedProject.expenses?.filter(e => e.id !== id);
    setProject(updatedProject);
    targetUpdateProject(updatedProject);
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
      const response = await fetch('/api/upload.php', {
        method: 'POST',
        body: formData
      });
      const data = await response.json();
      
      const updatedProject = { ...project! };
      const payment = updatedProject.payments?.find(p => p.id === paymentId);
      if (payment) {
        // Guardamos la URL estática del backend
        payment.receiptImage = data.url;
        targetUpdateProject(updatedProject);
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

    const updatedProject = { ...project! };
    updatedProject.tasks = [...(updatedProject.tasks || []), newTask];
    setProject(updatedProject);
    targetUpdateProject(updatedProject);
    
    setTaskDesc('');
  };

  const handleUpdateTaskStatus = (id: string, status: 'pending' | 'in_progress' | 'completed') => {
    const updatedProject = { ...project! };
    const task = updatedProject.tasks?.find(t => t.id === id);
    if (task) {
      task.status = status;
      setProject(updatedProject);
      targetUpdateProject(updatedProject);
    }
  };

  const handleDeleteTask = (id: string) => {
    const updatedProject = { ...project! };
    updatedProject.tasks = updatedProject.tasks?.filter(t => t.id !== id);
    setProject(updatedProject);
    targetUpdateProject(updatedProject);
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
      const response = await fetch('/api/upload.php', {
        method: 'POST',
        body: formData
      });
      const data = await response.json();

      const invoiceData = {
        fileName: data.fileName,
        dataUrl: data.url,
        dateAdded: new Date().toISOString()
      };
      
      const updatedProject = { ...project! };
      const currentInvoices = updatedProject.invoices || [];
      updatedProject.invoices = [...currentInvoices, invoiceData];
      
      await targetUpdateProject(updatedProject);
      setProject(updatedProject);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      alert("Error al subir el archivo PDF al servidor.");
    }
  };

  const handleProjectImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const updatedProject = { ...project! };
    const currentImages = updatedProject.images || [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const formData = new FormData();
      
      // Carpeta basada en el nombre del proyecto
      const safeProjectName = project!.projectName.replace(/[^a-zA-Z0-9_-]/g, '_');
      formData.append('type', `proyectos/${safeProjectName}/galeria`);
      formData.append('file', file);

      try {
        const response = await fetch('/api/upload.php', {
          method: 'POST',
          body: formData
        });
        const data = await response.json();
        
        currentImages.push({
          fileName: data.fileName,
          dataUrl: data.url,
          dateAdded: new Date().toISOString()
        });
      } catch (err) {
        alert(`Error al subir la imagen ${file.name}.`);
      }
    }
    
    updatedProject.images = currentImages;
    targetUpdateProject(updatedProject);
    setProject(updatedProject);
  };

  const handleDeleteImage = (index: number) => {
    if (!window.confirm("¿Seguro que deseas eliminar esta imagen?")) return;
    const updatedProject = { ...project! };
    const currentImages = updatedProject.images || [];
    currentImages.splice(index, 1);
    updatedProject.images = currentImages;
    targetUpdateProject(updatedProject);
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
      <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', margin: '1rem -1.5rem 0', padding: '0 1.5rem' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
              <th style={{ padding: '0.75rem' }}>Descripción</th>
              <th style={{ padding: '0.75rem' }}>Cantidad</th>
              <th style={{ padding: '0.75rem' }}>Costo Unitario</th>
              {(type === 'equipments' || type === 'materials') && <th style={{ padding: '0.75rem' }}>Ganancia</th>}
              {type === 'equipments' && <th style={{ padding: '0.75rem' }}>Nº Serie (Opcional)</th>}
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
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
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
                    {type === 'equipments' && (
                      <td style={{ padding: '0.75rem' }}>
                        <input type="text" placeholder="Ej. SN-12345" value={editingItem.data.serialNumber || ''} onChange={e => setEditingItem({...editingItem, data: {...editingItem.data, serialNumber: e.target.value}})} style={{ width: '120px', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--primary-color)', backgroundColor: 'var(--bg-color)' }} />
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
                  <td style={{ padding: '0.75rem' }}>
                    {item.name}
                    {item.clientProvides && (
                      <span style={{ marginLeft: '0.5rem', fontSize: '0.7rem', padding: '0.1rem 0.3rem', backgroundColor: 'var(--surface-color)', border: '1px solid var(--primary-color)', color: 'var(--primary-color)', borderRadius: '4px', whiteSpace: 'nowrap' }}>
                        Cliente compra
                      </span>
                    )}
                    {item.isPureProfit && (
                      <span style={{ marginLeft: '0.5rem', fontSize: '0.7rem', padding: '0.1rem 0.3rem', backgroundColor: 'rgba(34, 197, 94, 0.1)', border: '1px solid var(--success-color)', color: 'var(--success-color)', borderRadius: '4px', whiteSpace: 'nowrap' }}>
                        100% Ganancia
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '0.75rem' }}>{item.quantity}</td>
                  <td style={{ padding: '0.75rem' }}>
                    {item.clientProvides ? <span style={{ color: 'var(--text-muted)' }}>-</span> : formatCurrency(item.unitCost, item.currency)}
                  </td>
                  {(type === 'equipments' || type === 'materials') && (
                    <td style={{ padding: '0.75rem' }}>
                      {item.profitMargin === 'manual' ? 'Manual' : (item.profitMargin ? `${item.profitMargin}%` : '0%')}
                    </td>
                  )}
                  {type === 'equipments' && (
                    <td style={{ padding: '0.75rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      {item.serialNumber || '-'}
                    </td>
                  )}
                  <td style={{ padding: '0.75rem', fontWeight: 600 }}>
                    {item.clientProvides ? (
                      <span style={{ color: 'var(--text-muted)' }}>-</span>
                    ) : (
                      formatCurrency(calculateItemTotal(item), item.currency)
                    )}
                  </td>
                  <td style={{ padding: '0.75rem', textAlign: 'right', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.75rem' }}>
                    <button style={{ color: 'var(--primary-color)' }} onClick={() => setEditingItem({ id: item.id, type, data: { ...item } })} title="Editar">
                      <Pencil size={16} />
                    </button>
                    <button style={{ color: 'var(--danger-color)' }} onClick={() => handleDeleteItem(type, item.id)} title="Eliminar">
                      <Trash2 size={16} />
                    </button>
                    {(type === 'materials' || type === 'equipments') && (
                      <label title="100% Ganancia" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                        <input 
                          type="checkbox" 
                          title="100% Ganancia"
                          checked={item.isPureProfit || false} 
                          onChange={(e) => handleTogglePureProfit(type, item.id, e.target.checked)} 
                          style={{ accentColor: 'var(--success-color)', width: '1.2rem', height: '1.2rem' }}
                        />
                      </label>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  const handleUpdatePurchasedQuantity = (tab: 'materials'|'equipments', itemId: string, quantity: number) => {
    const updatedProject = { ...project };
    const items = updatedProject[tab] as any[];
    const item = items.find((i: any) => i.id === itemId);
    if (item) {
      item.purchasedQuantity = quantity;
      setProject(updatedProject);
      targetUpdateProject(updatedProject);
    }
  };

  const handleToggleProfitUser = (userId: string) => {
    if (!project) return;
    const currentUsers = project.profitUsers || [];
    const newUsers = currentUsers.includes(userId) 
      ? currentUsers.filter(id => id !== userId)
      : [...currentUsers, userId];
    
    const updatedProject = { ...project, profitUsers: newUsers };
    setProject(updatedProject);
    targetUpdateProject(updatedProject);
  };

  const handleAddAdvance = (e: React.FormEvent) => {
    e.preventDefault();
    if (!project || advanceAmount === '' || !advanceUserId) return;

    const newAdvance: AdvanceItem = {
      id: generateId(),
      userId: advanceUserId,
      amount: Number(advanceAmount),
      date: advanceDate,
      description: advanceDesc,
      currency: advanceCurrency
    };

    const updatedProject = {
      ...project,
      advances: [...(project.advances || []), newAdvance]
    };

    setProject(updatedProject);
    targetUpdateProject(updatedProject);
    
    setAdvanceAmount('');
    setAdvanceDesc('');
  };

  const handleDeleteAdvance = (advanceId: string) => {
    if (!project || !window.confirm('¿Eliminar este adelanto?')) return;
    const updatedProject = {
      ...project,
      advances: (project.advances || []).filter(a => a.id !== advanceId)
    };
    setProject(updatedProject);
    targetUpdateProject(updatedProject);
  };

  const renderPurchasingTable = (items: any[], type: 'materials'|'equipments', title: string) => {
    if (items.length === 0) return null;
    
    return (
      <div style={{ marginBottom: '2rem' }}>
        <h4 style={{ marginBottom: '1rem' }}>{title}</h4>
        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', margin: '0 -1.5rem', padding: '0 1.5rem' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '500px' }}>
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
      </div>
    );
  };

  const allTabs: { id: Tab; label: string; show: boolean }[] = [
    { id: 'info', label: 'Info General', show: true },
    { id: 'gallery', label: 'Galería de Imágenes', show: !isQuote },
    { id: 'equipments', label: 'Equipos', show: true },
    { id: 'materials', label: 'Materiales Ferreteros', show: true },
    { id: 'labor', label: 'Mano de Obra', show: true },
    { id: 'additionals', label: 'Adicionales', show: !isQuote },
    { id: 'planificacion', label: 'Planificación', show: true },
    { id: 'purchasing_control', label: 'Control de Compras', show: !isQuote && user?.role === 'admin' },
    { id: 'expenses', label: 'Gastos Operativos', show: isQuote || user?.role === 'admin' },
    { id: 'payments', label: 'Pagos y Adelantos', show: !isQuote && user?.role === 'admin' },
    { id: 'invoices', label: 'Facturas de Prov.', show: !isQuote && user?.role === 'admin' },
    { id: 'profit', label: 'Ganancias', show: isQuote || user?.role === 'admin' },
  ];

  const tabs = allTabs.filter(t => t.show).map(({ id, label }) => ({ id, label }));

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '4rem' }}>
      <div className="action-header">
        <a href={window.location.search.includes('type=quote') ? "/views/cotizaciones.html" : "/views/proyectos.html"} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}>
          <ArrowLeft size={20} />
          Volver
        </a>
        <div className="action-buttons">
          <button className="btn-secondary" onClick={() => handleOpenPDF('detallada')}>
            <FileText size={20} />
            {isQuote ? 'Cotización Detallada' : 'Factura Detallada'}
          </button>
          <button className="btn-secondary" onClick={() => handleOpenPDF('resumida')}>
            <FileText size={20} />
            {isQuote ? 'Cotización Resumida' : 'Factura Resumida'}
          </button>
          <button className="btn-secondary" onClick={handleCopyPortalLink} style={{ backgroundColor: 'var(--primary-color)', color: 'white', border: 'none' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
            Enlace de Cliente
          </button>
          <button className="btn-primary" onClick={handleSave}>
            <Save size={20} />
            Guardar Cambios
          </button>
        </div>
      </div>
      
      <div className="card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: '80vh' }}>
        {/* Mobile Tabs Dropdown */}
        <div className="mobile-only" style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--surface-hover)' }}>
          <select 
            value={activeTab}
            onChange={e => handleTabChange(e.target.value as any)}
            style={{ 
              width: '100%', 
              padding: '0.875rem', 
              borderRadius: '8px', 
              border: '1px solid var(--border-color)', 
              backgroundColor: 'var(--bg-color)', 
              color: 'var(--text-main)', 
              fontSize: '1rem', 
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            {tabs.map(t => (
              <option key={t.id} value={t.id}>{t.label}</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', flex: 1, flexDirection: 'row', overflow: 'hidden' }}>
          {/* Desktop Sidebar Menu */}
          <div className="desktop-only" style={{ 
            width: '260px', 
            borderRight: '1px solid var(--border-color)', 
            backgroundColor: 'var(--surface-color)', 
            display: 'flex',
            flexDirection: 'column',
            flexShrink: 0,
            overflowY: 'auto'
          }}>
            <div style={{ padding: '1.5rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.85rem', letterSpacing: '0.5px' }}>
              Módulos del Proyecto
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', padding: '0 0.75rem 1rem 0.75rem' }}>
              {tabs.map(t => (
                <button
                  key={t.id}
                  onClick={() => handleTabChange(t.id as any)}
                  style={{
                    textAlign: 'left',
                    padding: '0.875rem 1rem',
                    margin: '0.25rem 0',
                    borderRadius: '8px',
                    fontWeight: activeTab === t.id ? 600 : 500,
                    color: activeTab === t.id ? 'var(--primary-color)' : 'var(--text-main)',
                    backgroundColor: activeTab === t.id ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                    border: '1px solid ' + (activeTab === t.id ? 'rgba(99, 102, 241, 0.2)' : 'transparent'),
                    transition: 'all 0.2s ease',
                    cursor: 'pointer'
                  }}
                  onMouseOver={(e) => { if(activeTab !== t.id) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)' }}
                  onMouseOut={(e) => { if(activeTab !== t.id) e.currentTarget.style.backgroundColor = 'transparent' }}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ flex: 1, padding: '2rem', overflowY: 'auto', backgroundColor: 'transparent' }}>
          {activeTab === 'info' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '600px' }}>
              <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 250px' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Nombre del Proyecto</label>
                  <input 
                    type="text" 
                    value={project.projectName} 
                    onChange={e => setProject({...project, projectName: e.target.value})}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)' }}
                  />
                </div>
                <div style={{ flex: '1 1 150px', maxWidth: '200px' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Código (Auto)</label>
                  <input 
                    type="text" 
                    value={`${isQuote ? 'CTZ-' : 'PRJ-'}${String(project.projectCode || 0).padStart(3, '0')}`} 
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
              <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Fecha</label>
                  <input 
                    type="date" 
                    value={project.date} 
                    onChange={e => setProject({...project, date: e.target.value})}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)' }}
                  />
                </div>
                {isQuote && (
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Válida Hasta</label>
                    <input 
                      type="date" 
                      value={project.validUntil || ''} 
                      onChange={e => setProject({...project, validUntil: e.target.value})}
                      style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)' }}
                    />
                  </div>
                )}
              </div>
              {!isQuote && (
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
              )}

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
              <form onSubmit={handleAddItem} className="responsive-form-grid" style={{ display: 'grid', gridTemplateColumns: activeTab !== 'labor' ? (profitMargin === 'manual' ? '2fr 1fr 1fr 1fr 1fr auto auto' : '2fr 1fr 1fr 1fr auto auto') : '2fr 1fr 1fr auto auto', gap: '1rem', alignItems: 'end', marginBottom: '2rem', padding: '1.5rem', backgroundColor: 'var(--bg-color)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
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
                              setItemCurrency(item.currency || 'USD');
                              setShowSuggestions(false);
                            }}
                          >
                            <div style={{ fontWeight: 500 }}>{item.name}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Costo: {formatCurrency(item.unitCost, item.currency || 'USD')} | Stock: {item.stockQuantity}</div>
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

                {activeTab === 'equipments' && (
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Nº Serie (Opcional)</label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <input 
                        type="text" 
                        value={serialNumber} 
                        onChange={e => setSerialNumber(e.target.value)}
                        placeholder="Ej. SN-123"
                        style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--surface-color)' }}
                      />
                      <button 
                        type="button" 
                        className="btn-secondary" 
                        style={{ padding: '0.75rem' }} 
                        onClick={() => setIsScanningSerial(true)} 
                        title="Escanear Serie con QR"
                      >
                        <QrCode size={20} />
                      </button>
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', height: '100%', paddingBottom: '0.75rem', gap: '1rem', flexWrap: 'wrap' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem', color: 'var(--text-color)' }}>
                    <input type="checkbox" checked={clientProvides} onChange={e => setClientProvides(e.target.checked)} style={{ width: '1rem', height: '1rem', accentColor: 'var(--primary-color)' }} />
                    El cliente comprará
                  </label>
                </div>

                <button type="submit" className="btn-primary" style={{ padding: '0.75rem 1rem' }}>
                  <Plus size={20} />
                </button>
              </form>

              {activeTab === 'materials' && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <div>
                      {!isQuote && <InvoiceImporter onImport={handleImportedItems} />}
                    </div>
                    {project.materials.filter(i => !i.isAdditional).length > 0 && (
                      <button 
                        type="button"
                        className="btn-secondary" 
                        onClick={() => {
                          const allClient = project.materials.filter(i => !i.isAdditional).every(m => m.clientProvides);
                          const updated = { ...project };
                          updated.materials = updated.materials.map(m => (!m.isAdditional ? { ...m, clientProvides: !allClient } : m));
                          setProject(updated);
                          targetUpdateProject(updated);
                        }}
                        style={{ fontSize: '0.875rem', padding: '0.5rem 1rem' }}
                      >
                        {project.materials.filter(i => !i.isAdditional).every(m => m.clientProvides) ? 'Desmarcar Todos (Cliente Compra)' : 'Marcar Todos (Cliente Compra)'}
                      </button>
                    )}
                  </div>
                  {renderTable(project.materials.filter(i => !i.isAdditional), 'materials')}
                </>
              )}
              {activeTab === 'equipments' && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <div>
                      {!isQuote && <InvoiceImporter onImport={handleImportedItems} />}
                    </div>
                    {project.equipments.filter(i => !i.isAdditional).length > 0 && (
                      <button 
                        type="button"
                        className="btn-secondary" 
                        onClick={() => {
                          const allClient = project.equipments.filter(i => !i.isAdditional).every(m => m.clientProvides);
                          const updated = { ...project };
                          updated.equipments = updated.equipments.map(m => (!m.isAdditional ? { ...m, clientProvides: !allClient } : m));
                          setProject(updated);
                          targetUpdateProject(updated);
                        }}
                        style={{ fontSize: '0.875rem', padding: '0.5rem 1rem' }}
                      >
                        {project.equipments.filter(i => !i.isAdditional).every(m => m.clientProvides) ? 'Desmarcar Todos (Cliente Compra)' : 'Marcar Todos (Cliente Compra)'}
                      </button>
                    )}
                  </div>
                  {renderTable(project.equipments.filter(i => !i.isAdditional), 'equipments')}
                </>
              )}
              {activeTab === 'labor' && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <div>
                      {!isQuote && <InvoiceImporter onImport={handleImportedItems} />}
                    </div>
                    {project.labor.length > 0 && (
                      <button 
                        type="button"
                        className="btn-secondary" 
                        onClick={() => {
                          const allClient = project.labor.every(m => m.clientProvides);
                          const updated = { ...project };
                          updated.labor = updated.labor.map(m => ({ ...m, clientProvides: !allClient }));
                          setProject(updated);
                          targetUpdateProject(updated);
                        }}
                        style={{ fontSize: '0.875rem', padding: '0.5rem 1rem' }}
                      >
                        {project.labor.every(m => m.clientProvides) ? 'Desmarcar Todos (Cliente Compra)' : 'Marcar Todos (Cliente Compra)'}
                      </button>
                    )}
                  </div>
                  {renderTable(project.labor, 'labor')}
                </>
              )}
              
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
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
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
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
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
                        <td style={{ padding: '0.75rem', textAlign: 'right', display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'flex-end', alignItems: 'center' }}>
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
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
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
                <h4 style={{ marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Resumen de Gastos</h4>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '1.25rem', fontWeight: 700 }}>Total Gastos Operativos:</span>
                  <strong style={{ fontSize: '1.5rem', color: 'var(--danger-color)' }}>
                    {(() => {
                      return formatCurrency(calculateExpensesDual(project.expenses, project.exchangeRate).totalUSD, 'USD');
                    })()}
                  </strong>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'profit' && (
            <div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3>Desglose de Ganancias del Proyecto</h3>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                {(() => {
                  let materialsProfitUSD = 0;
                  let equipmentsProfitUSD = 0;
                  let laborProfitUSD = 0;
                  const exchangeRate = project.exchangeRate || 36.62;

                  (project.materials || []).forEach((item: any) => {
                    const itemTotal = calculateItemTotal(item);
                    const itemCost = item.isPureProfit ? 0 : (item.unitCost * item.quantity);
                    const profit = itemTotal - itemCost;
                    materialsProfitUSD += (item.currency === 'NIO' ? profit / exchangeRate : profit);
                  });

                  (project.equipments || []).forEach((item: any) => {
                    const itemTotal = calculateItemTotal(item);
                    const itemCost = item.isPureProfit ? 0 : (item.unitCost * item.quantity);
                    const profit = itemTotal - itemCost;
                    equipmentsProfitUSD += (item.currency === 'NIO' ? profit / exchangeRate : profit);
                  });

                  (project.labor || []).forEach((item: any) => {
                    const itemTotal = calculateItemTotal(item);
                    laborProfitUSD += (item.currency === 'NIO' ? itemTotal / exchangeRate : itemTotal);
                  });

                  const totalProfitUSD = materialsProfitUSD + equipmentsProfitUSD + laborProfitUSD;

                  return (
                    <>
                      <div className="card" style={{ padding: '1.5rem', borderLeft: '4px solid var(--primary-color)' }}>
                        <h4 style={{ color: 'var(--text-muted)', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Ganancia en Materiales</h4>
                        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-color)' }}>
                          {formatCurrency(materialsProfitUSD, 'USD')}
                        </div>
                      </div>
                      <div className="card" style={{ padding: '1.5rem', borderLeft: '4px solid var(--secondary-color)' }}>
                        <h4 style={{ color: 'var(--text-muted)', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Ganancia en Equipos</h4>
                        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-color)' }}>
                          {formatCurrency(equipmentsProfitUSD, 'USD')}
                        </div>
                      </div>
                      <div className="card" style={{ padding: '1.5rem', borderLeft: '4px solid var(--warning-color)' }}>
                        <h4 style={{ color: 'var(--text-muted)', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Ingreso por Mano de Obra</h4>
                        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-color)' }}>
                          {formatCurrency(laborProfitUSD, 'USD')}
                        </div>
                      </div>
                      
                      <div className="card" style={{ padding: '1.5rem', backgroundColor: 'var(--surface-hover)', gridColumn: '1 / -1', marginTop: '1rem', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '1.25rem', fontWeight: 700 }}>Ganancia Total del Proyecto:</span>
                        <strong style={{ fontSize: '2rem', color: 'var(--success-color)' }}>
                          {formatCurrency(totalProfitUSD, 'USD')}
                        </strong>
                      </div>

                      {/* Distribution Section */}
                      <div style={{ gridColumn: '1 / -1', marginTop: '2rem' }}>
                        <h3 style={{ marginBottom: '1.5rem' }}>Distribución de Ganancias a Usuarios</h3>
                        
                        <div className="card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
                          <h4 style={{ marginBottom: '1rem' }}>Seleccionar Participantes</h4>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
                            {users.map(u => (
                              <label key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', padding: '0.5rem 1rem', backgroundColor: 'var(--surface-color)', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                                <input 
                                  type="checkbox" 
                                  checked={(project.profitUsers || []).includes(u.id)} 
                                  onChange={() => handleToggleProfitUser(u.id)}
                                  style={{ accentColor: 'var(--primary-color)' }}
                                />
                                {u.name || u.username}
                              </label>
                            ))}
                          </div>
                        </div>

                        <div className="card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
                          <h4 style={{ marginBottom: '1rem' }}>Registrar Adelanto de Ganancia</h4>
                          <form onSubmit={handleAddAdvance} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', alignItems: 'end' }}>
                            <div>
                              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Usuario</label>
                              <select 
                                value={advanceUserId} 
                                onChange={e => setAdvanceUserId(e.target.value)} 
                                required
                                style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--surface-color)' }}
                              >
                                <option value="">Seleccionar...</option>
                                {(project.profitUsers || []).map(uid => {
                                  const u = users.find(x => x.id === uid);
                                  return u ? <option key={u.id} value={u.id}>{u.name || u.username}</option> : null;
                                })}
                              </select>
                            </div>
                            <div>
                              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Fecha</label>
                              <input type="date" required value={advanceDate} onChange={e => setAdvanceDate(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--surface-color)' }} />
                            </div>
                            <div>
                              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Monto</label>
                              <div style={{ display: 'flex', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--surface-color)', overflow: 'hidden' }}>
                                <input type="number" required min="0" step="0.01" value={advanceAmount} onChange={e => setAdvanceAmount(e.target.value === '' ? '' : Number(e.target.value))} style={{ flex: 1, padding: '0.75rem', border: 'none', backgroundColor: 'transparent', outline: 'none', color: 'inherit', width: '100%' }} />
                                <select value={advanceCurrency} onChange={e => setAdvanceCurrency(e.target.value as 'USD'|'NIO')} style={{ padding: '0 0.5rem', border: 'none', borderLeft: '1px solid var(--border-color)', backgroundColor: 'var(--surface-hover)', color: 'inherit', outline: 'none', cursor: 'pointer' }}>
                                  <option value="USD">USD</option>
                                  <option value="NIO">NIO</option>
                                </select>
                              </div>
                            </div>
                            <div>
                              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Descripción</label>
                              <input type="text" required value={advanceDesc} onChange={e => setAdvanceDesc(e.target.value)} placeholder="Ej. Adelanto en efectivo" style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--surface-color)' }} />
                            </div>
                            <button type="submit" className="btn-primary" style={{ padding: '0.75rem 1rem' }}>
                              <Plus size={20} /> Agregar
                            </button>
                          </form>
                        </div>

                        {/* Distribution Table */}
                        {(() => {
                          const profitUsers = project.profitUsers || [];
                          if (profitUsers.length === 0) {
                            return <p style={{ color: 'var(--text-muted)' }}>Selecciona participantes para calcular la distribución de la ganancia.</p>;
                          }
                          
                          const baseProfitPerUser = totalProfitUSD / profitUsers.length;

                          return (
                            <div className="card" style={{ padding: '1.5rem', overflowX: 'auto' }}>
                              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                <thead>
                                  <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                                    <th style={{ padding: '0.75rem' }}>Usuario</th>
                                    <th style={{ padding: '0.75rem', textAlign: 'right' }}>% Ganancia Base</th>
                                    <th style={{ padding: '0.75rem', textAlign: 'right' }}>Adelantos Registrados</th>
                                    <th style={{ padding: '0.75rem', textAlign: 'right' }}>Neto a Recibir (USD)</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {profitUsers.map(uid => {
                                    const u = users.find(x => x.id === uid);
                                    if (!u) return null;

                                    const userAdvances = (project.advances || []).filter(a => a.userId === uid);
                                    let totalAdvanceUSD = 0;
                                    userAdvances.forEach(adv => {
                                      totalAdvanceUSD += adv.currency === 'NIO' ? adv.amount / exchangeRate : adv.amount;
                                    });

                                    const netProfit = baseProfitPerUser - totalAdvanceUSD;

                                    return (
                                      <React.Fragment key={u.id}>
                                        <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                                          <td style={{ padding: '0.75rem', fontWeight: 600 }}>{u.name || u.username}</td>
                                          <td style={{ padding: '0.75rem', textAlign: 'right', color: 'var(--success-color)' }}>
                                            {formatCurrency(baseProfitPerUser, 'USD')}
                                          </td>
                                          <td style={{ padding: '0.75rem', textAlign: 'right', color: 'var(--danger-color)' }}>
                                            {formatCurrency(totalAdvanceUSD, 'USD')}
                                          </td>
                                          <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 700, fontSize: '1.1rem', color: netProfit < 0 ? 'var(--danger-color)' : 'var(--text-color)' }}>
                                            {formatCurrency(netProfit, 'USD')}
                                          </td>
                                        </tr>
                                        {userAdvances.length > 0 && (
                                          <tr>
                                            <td colSpan={4} style={{ padding: '0 0.75rem 1rem 0.75rem', borderBottom: '1px solid var(--border-color)' }}>
                                              <div style={{ backgroundColor: 'var(--surface-hover)', padding: '1rem', borderRadius: '4px', fontSize: '0.875rem' }}>
                                                <div style={{ fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Detalle de Adelantos:</div>
                                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                                  <tbody>
                                                    {userAdvances.map(adv => (
                                                      <tr key={adv.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                                                        <td style={{ padding: '0.25rem 0' }}>{adv.date}</td>
                                                        <td style={{ padding: '0.25rem 0' }}>{adv.description}</td>
                                                        <td style={{ padding: '0.25rem 0', textAlign: 'right', color: 'var(--danger-color)' }}>{formatCurrency(adv.amount, adv.currency)}</td>
                                                        <td style={{ padding: '0.25rem 0', textAlign: 'right', width: '40px' }}>
                                                          <button onClick={() => handleDeleteAdvance(adv.id)} style={{ color: 'var(--danger-color)', padding: '0.2rem' }} title="Eliminar Adelanto">
                                                            <Trash2 size={14} />
                                                          </button>
                                                        </td>
                                                      </tr>
                                                    ))}
                                                  </tbody>
                                                </table>
                                              </div>
                                            </td>
                                          </tr>
                                        )}
                                      </React.Fragment>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          );
                        })()}
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          )}

          {activeTab === 'planificacion' && (
            <div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
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
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
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
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <button 
                          className="btn-secondary" 
                          onClick={() => handleViewFile(inv.dataUrl)}
                          style={{ padding: '0.5rem 1rem' }}
                        >
                          <Eye size={16} /> Ver
                        </button>
                        <button onClick={() => downloadFileFromUrl(inv.dataUrl, inv.fileName)} className="btn-secondary" style={{ padding: '0.5rem 1rem' }}>
                          <FileDown size={16} /> Descargar
                        </button>
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
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
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

          {/* Ganancia Real del Proyecto, visible solo cuando no se está en una pestaña individual */}
          {(activeTab !== 'materials' && activeTab !== 'equipments' && activeTab !== 'labor') && (
            <h3 style={{ color: 'var(--text-muted)', marginTop: '1rem', fontSize: '1rem' }}>
              Ganancia Real (Mano de Obra + Margen en Insumos):
              <span style={{ color: 'var(--primary-color)', fontSize: '1.5rem', display: 'block', marginTop: '0.25rem' }}>
                {(() => {
                  const profit = calculateProjectRealRevenueDual(project);
                  return (
                    <>{formatCurrency(profit.totalNIO, 'NIO')} | {formatCurrency(profit.totalUSD, 'USD')}</>
                  );
                })()}
              </span>
            </h3>
          )}
        </div>
      )}
      {isScanningSerial && (
        <QRScanner 
          onScan={(text) => {
            setSerialNumber(text);
            setIsScanningSerial(false);
          }}
          onClose={() => setIsScanningSerial(false)}
        />
      )}
    </div>
  );
};

export default ProjectDetail;
