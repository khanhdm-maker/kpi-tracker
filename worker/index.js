import { handleProgress } from './routes/progress.js';
import { handleAdmin } from './routes/admin.js';
import { handleTeam } from './routes/team.js';

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

    try {
      const userEmail = request.headers.get('CF-Access-Authenticated-User-Email');
      const email = userEmail || url.searchParams.get('dev_email');

      if (!email) {
        return err('Unauthorized - please login via Cloudflare Access', 401);
      }

      let user = await env.DB.prepare(
        'SELECT * FROM users WHERE email = ?'
      ).bind(email).first();

      if (!user) {
        const id = crypto.randomUUID();
        await env.DB.prepare(
          'INSERT INTO users (id, email, name, role) VALUES (?, ?, ?, ?)'
        ).bind(id, email, email.split('@')[0], 'member').run();
        user = await env.DB.prepare(
          'SELECT * FROM users WHERE email = ?'
        ).bind(email).first();
      }

      const ctx = { user, env, json, err };

      if (path === '/api/me' && request.method === 'GET') {
        return json({ user });
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
        return handleTeam(request, ctx);
      }

      return err('Not found', 404);

    } catch (e) {
      console.error(e);
      return err('Internal server error: ' + e.message, 500);
    }
  },
};