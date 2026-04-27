const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'navaltecnica_jwt_secret_2026';

function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token mancante' });
  }

  try {
    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token non valido' });
  }
}

module.exports = { authMiddleware, JWT_SECRET };
