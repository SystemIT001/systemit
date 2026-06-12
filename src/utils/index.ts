export const generateId = () => {
  return Math.random().toString(36).substring(2, 9);
};

export const formatCurrency = (value: number, currency: 'NIO' | 'USD' | 'MXN' = 'USD') => {
  if (currency === 'NIO') {
    return `C$ ${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(value);
};

export const calculateItemTotal = (item: any) => {
  if (item.clientProvides) return 0;
  if (item.profitMargin === 'manual' && item.manualPrice !== undefined) {
    return item.quantity * item.manualPrice;
  }
  let total = item.quantity * item.unitCost;
  if (item.profitMargin && item.profitMargin !== 'manual') {
    total = total * (1 + item.profitMargin / 100);
  }
  return total;
};

export const calculateItemCost = (item: any) => {
  if (item.clientProvides) return 0;
  return item.quantity * item.unitCost;
};

export const calculateProjectTotal = (project: any) => {
  if (!project) return 0;
  const materialsTotal = project.materials.reduce((acc: number, curr: any) => acc + calculateItemTotal(curr), 0);
  const equipmentsTotal = project.equipments.reduce((acc: number, curr: any) => acc + calculateItemTotal(curr), 0);
  const laborTotal = project.labor.reduce((acc: number, curr: any) => acc + calculateItemTotal(curr), 0);
  return materialsTotal + equipmentsTotal + laborTotal;
};

export const calculateItemsTotalsDual = (items: any[], exchangeRate: number = 36.62) => {
  let totalUSD = 0;
  let totalNIO = 0;

  items.forEach(item => {
    const itemTotal = calculateItemTotal(item);
    if (item.currency === 'NIO') {
      totalNIO += itemTotal;
      totalUSD += itemTotal / exchangeRate;
    } else {
      totalUSD += itemTotal;
      totalNIO += itemTotal * exchangeRate;
    }
  });

  return { totalUSD, totalNIO };
};

export const calculateProjectTotalsDual = (project: any) => {
  if (!project) return { totalUSD: 0, totalNIO: 0 };
  const exchangeRate = project.exchangeRate || 36.62;

  const items = [
    ...(project.materials || []),
    ...(project.equipments || []),
    ...(project.labor || [])
  ];

  const itemsTotals = calculateItemsTotalsDual(items, exchangeRate);
  const expensesTotals = calculateExpensesDual(project.expenses || [], exchangeRate);

  return {
    totalUSD: itemsTotals.totalUSD + expensesTotals.totalUSD,
    totalNIO: itemsTotals.totalNIO + expensesTotals.totalNIO
  };
};

export const calculateProjectRealRevenueDual = (project: any) => {
  if (!project) return { totalUSD: 0, totalNIO: 0 };
  const exchangeRate = project.exchangeRate || 36.62;

  let totalUSD = 0;
  let totalNIO = 0;

  const goods = [
    ...(project.materials || []),
    ...(project.equipments || [])
  ];

  goods.forEach(item => {
    const itemTotal = calculateItemTotal(item);
    const itemCost = calculateItemCost(item);
    const profit = itemTotal - itemCost;
    
    if (item.currency === 'NIO') {
      totalNIO += profit;
      totalUSD += profit / exchangeRate;
    } else {
      totalUSD += profit;
      totalNIO += profit * exchangeRate;
    }
  });

  const labor = project.labor || [];
  labor.forEach((item: any) => {
    const itemTotal = calculateItemTotal(item);
    if (item.currency === 'NIO') {
      totalNIO += itemTotal;
      totalUSD += itemTotal / exchangeRate;
    } else {
      totalUSD += itemTotal;
      totalNIO += itemTotal * exchangeRate;
    }
  });

  return { totalUSD, totalNIO };
};

export const calculateProjectCostsDual = (project: any) => {
  if (!project) return { totalUSD: 0, totalNIO: 0 };
  const exchangeRate = project.exchangeRate || 36.62;

  const items = [
    ...(project.materials || []),
    ...(project.equipments || []),
    ...(project.labor || [])
  ];

  let totalUSD = 0;
  let totalNIO = 0;

  items.forEach(item => {
    const itemCost = calculateItemCost(item);
    if (item.currency === 'NIO') {
      totalNIO += itemCost;
      totalUSD += itemCost / exchangeRate;
    } else {
      totalUSD += itemCost;
      totalNIO += itemCost * exchangeRate;
    }
  });

  return { totalUSD, totalNIO };
};

export const calculateExpensesDual = (expenses: any[] = [], exchangeRate: number = 36.62) => {
  let totalUSD = 0;
  let totalNIO = 0;
  expenses.forEach(exp => {
    if (exp.currency === 'NIO') {
      totalNIO += Number(exp.amount);
      totalUSD += Number(exp.amount) / exchangeRate;
    } else {
      totalUSD += Number(exp.amount);
      totalNIO += Number(exp.amount) * exchangeRate;
    }
  });
  return { totalUSD, totalNIO };
};
  
export const downloadFileFromUrl = async (url: string, defaultFileName: string) => {  
  try {  
    const res = await fetch(url);  
    if (!res.ok) throw new Error('Network response failed');  
    const blob = await res.blob();  
    const objectUrl = window.URL.createObjectURL(blob);  
    const a = document.createElement('a');  
    a.href = objectUrl;  
    a.download = defaultFileName;  
    document.body.appendChild(a);  
    a.click();  
    document.body.removeChild(a);  
    setTimeout(() => window.URL.revokeObjectURL(objectUrl), 10000);  
  } catch (error) {  
    console.error('Download failed, falling back to new tab', error);  
    window.open(url, '_blank');  
  }  
}; 
