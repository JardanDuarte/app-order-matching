import { loginService } from '../services/authService.js';

export async function login(req, res) {
  try {
    const { username } = req.body;

    const result = await loginService(username);

    return res.json(result);

  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
}