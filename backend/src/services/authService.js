import { findUserByUsername, createUser } from '../repositories/userRepository.js';
import { generateToken } from '../utils/jwt.js';

export async function loginService(username) {
  if (!username) {
    throw new Error('Username é obrigatório');
  }

  let user = await findUserByUsername(username);

  if (!user) {
    user = await createUser(username);
  }

  const token = generateToken(user);

  return { user, token };
}