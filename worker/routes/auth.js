const encoder = new TextEncoder();

async function hashPassword(password) {
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function generateToken(userId, email, role, secret) {
  const payload = {
    sub: userId,
    email,
    role,
    exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60), // 7 days
  };
  const data = encoder.encode(JSON.stringify(payload));
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, data);
  const sigArray = Array.from(new Uint8Array(signature));
  const sig = sigArray.map(b => b.toString(16).padStart(2, '0')).join('');
  const payloadB64 = btoa(JSON.stringify(payload));
  return `${payloadB64}.${sig}`;
}

export async function verifyToken(token, secret) {
  try {
    const [payloadB64] = token.split('.');
    const payload = JSON.parse(atob(payloadB64));
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function handleAuth(request, { env, json, err }) {
  const url = new URL(request.url);
  const path = url.pathname;
  const SECRET = env.JWT_SECRET || 'kpi-tracker-secret-2026';

  // POST /api/auth/register
  if (path === '/api/auth/register' && request.method === 'POST') {
    const body = await request.json();
    const { email, password, name } = body;

    if (!email || !password) return err('Email and password are required');
    if (password.length < 6) return err('Password must be at least 6 characters');

    const existing = await env.DB.prepare(
      'SELECT id FROM users WHERE email = ?'
    ).bind(email).first();
    if (existing) return err('Email already registered');

    const id = crypto.randomUUID();
    const hashed = await hashPassword(password);

    await env.DB.prepare(
      'INSERT INTO users (id, email, name, role, password) VALUES (?, ?, ?, ?, ?)'
    ).bind(id, email, name || email.split('@')[0], 'member', hashed).run();

    const token = await generateToken(id, email, 'member', SECRET);
    return json({ success: true, token, role: 'member', name: name || email.split('@')[0] });
  }

  // POST /api/auth/login
  if (path === '/api/auth/login' && request.method === 'POST') {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) return err('Email and password are required');

    const user = await env.DB.prepare(
      'SELECT * FROM users WHERE email = ?'
    ).bind(email).first();

    if (!user) return err('Invalid email or password');

    const hashed = await hashPassword(password);
    if (hashed !== user.password) return err('Invalid email or password');

    const token = await generateToken(user.id, user.email, user.role, SECRET);
    return json({ success: true, token, role: user.role, name: user.name });
  }

  // POST /api/auth/logout
  if (path === '/api/auth/logout' && request.method === 'POST') {
    return json({ success: true });
  }

  return err('Not found', 404);
}