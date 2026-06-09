export const apiFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const authStr = localStorage.getItem('systemit_auth');
  let token = '';
  if (authStr) {
    try {
      const authObj = JSON.parse(authStr);
      if (authObj.token) {
        token = authObj.token;
      }
    } catch (e) {
      console.warn('Failed to parse auth token', e);
    }
  }

  const defaultHeaders: Record<string, string> = {};
  if (token) {
    defaultHeaders['Authorization'] = `Bearer ${token}`;
  }
  
  if (init && init.body && !(init.body instanceof FormData)) {
    defaultHeaders['Content-Type'] = 'application/json';
  }

  const finalInit: RequestInit = {
    ...init,
    credentials: 'same-origin',
    headers: {
      ...defaultHeaders,
      ...(init?.headers || {})
    }
  };

  return fetch(input, finalInit);
};
