import { useState, useEffect } from 'react';
import { apiFetch } from '../utils/api';

export const useSettings = () => {
  const [settings, setSettings] = useState({
    companyName: 'Mi Empresa IT',
    subtitle: 'Reporte de Servicios y Equipos',
    docType: 'COTIZACIÃ“N',
    footerText: 'Gracias por su preferencia. Este documento es vÃ¡lido como cotizaciÃ³n o nota de servicio.'
  });
  const [loading, setLoading] = useState(true);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const response = await apiFetch('/api/settings.php');
      if (response.ok) {
        const data = await response.json();
        setSettings({
          companyName: data.companyName || 'Mi Empresa IT',
          subtitle: data.subtitle || 'Reporte de Servicios y Equipos',
          docType: data.docType || 'COTIZACIÃ“N',
          footerText: data.footerText || 'Gracias por su preferencia. Este documento es vÃ¡lido como cotizaciÃ³n o nota de servicio.'
        });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const saveSettings = async (newSettings: typeof settings) => {
    try {
      const response = await apiFetch('/api/settings.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings)
      });
      if (response.ok) {
        setSettings(newSettings);
        return { success: true };
      }
      return { success: false };
    } catch (error) {
      console.error('Error saving settings:', error);
      return { success: false };
    }
  };

  return { settings, loading, saveSettings };
};
