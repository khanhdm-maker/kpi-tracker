import { handleProgress } from './routes/progress.js';
import { handleAdmin } from './routes/admin.js';
import { handleTeam } from './routes/team.js';
import { handleAuth, verifyToken } from './routes/auth.js';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}

function err(msg, status = 400) {
  return json({ error: msg }, status);
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS });
    }

    const url = new URL(request.url);
    const path = url.pathname;
    const SECRET = env.JWT_SECRET || 'kpi-tracker-secret-2026';

    try {
      // Auth routes không cần token
      if (path.startsWith('/api/auth')) {
        return handleAuth(request, { env, json, err });
      }

      // Tất cả routes khác cần token
      const authHeader = request.headers.get('Authorization');
      const token = authHeader?.replace('Bearer ', '');

      if (!token) return err('Unauthorized - please login', 401);

      const payload = await verifyToken(token, SECRET);
      if (!payload) return err('Invalid or expired token', 401);

      // Lấy user từ DB
      let user = await env.DB.prepare(
        'SELECT * FROM users WHERE id = ?'
      ).bind(payload.sub).first();

      if (!user) return err('User not found', 401);

      const ctx = { user, env, json, err };

      if (path === '/api/me' && request.method === 'GET') {
        return json({ user: { id: user.id, email: user.email, name: user.name, role: user.role, team_id: user.team_id } });
      }

      if (path.startsWith('/api/progress')) {
        return handleProgress(request, ctx);
      }

      if (path.startsWith('/api/admin')) {
        if (user.role !== 'admin') return err('Forbidden', 403);
        return handleAdmin(request, ctx);
      }

      if (path.startsWith('/api/team')) {
        if (user.role !== 'admin' && user.role !== 'team_leader') {
          return err('Forbidden', 403);
        }
        return handleTeam(r