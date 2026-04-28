import { api } from './api';

function okResponse(config) {
  return Promise.resolve({
    data: { ok: true },
    status: 200,
    statusText: 'OK',
    headers: {},
    config
  });
}

describe('api client', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('adds bearer token when token exists in localStorage', async () => {
    localStorage.setItem('token', 'abc123');

    let requestConfig;
    api.defaults.adapter = config => {
      requestConfig = config;
      return okResponse(config);
    };

    await api.get('/orders');

    expect(requestConfig.headers.Authorization).toBe('Bearer abc123');
  });

  test('clears session data on unauthorized responses', async () => {
    localStorage.setItem('token', 'abc123');
    localStorage.setItem('user', JSON.stringify({ username: 'alice' }));

    api.defaults.adapter = config => Promise.reject({
      config,
      response: { status: 401 }
    });

    await expect(api.get('/orders')).rejects.toMatchObject({
      response: { status: 401 }
    });

    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
  });
});
