import { api } from '../../../shared/services/api';

export async function login(username) {
  const res = await api.post('/auth/login', { username });
  return res.data;
}