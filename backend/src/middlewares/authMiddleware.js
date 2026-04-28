import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET;

export function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ error: 'Token não fornecido' });
    }

    // formato: Bearer TOKEN
    const [, token] = authHeader.split(' ');

    if (!token) {
      return res.status(401).json({ error: 'Token inválido' });
    }

    const decoded = jwt.verify(token, SECRET);

    // injeta user na request
    req.user = decoded;

    return next();

  } catch (error) {
    return res.status(401).json({ error: 'Token inválido ou expirado' });
  }
}