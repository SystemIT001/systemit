import { apiFetch } from './api';

export const triggerWebhook = async (event: string, payload: any) => {
  try {
    const response = await apiFetch('/api/notify.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        event,
        payload
      })
    });
    return response.ok;
  } catch (err) {
    console.error('Failed to trigger webhook', err);
    return false;
  }
};
