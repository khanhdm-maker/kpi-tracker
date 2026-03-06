export async function handleProgress(request, { user, env, json, err }) {
  const url = new URL(request.url);

  if (request.method === 'GET') {
    const year = parseInt(url.searchParams.get('year') || '2026');
    const userId = url.searchParams.get('user_id');
    const targetId = userId && user.role === 'admin' ? userId : user.id;

    const rows = await env.DB.prepare(
      'SELECT * FROM progress WHERE user_id = ? AND year = ? ORDER BY month, day'
    ).bind(targetId, year).all();

    return json({ progress: rows.results });
  }

  if (request.method === 'POST') {
    const body = await request.json();
    const { year = 2026, month, day = null, revenue, cost, profit } = body;

    if (!month || month < 1 || month > 12) {
      return err('Invalid month');
    }

    const id = crypto.randomUUID();
    await env.DB.prepare(`
      INSERT INTO progress (id, user_id, year, month, day, revenue, cost, profit, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(user_id, year, month, day)
      DO UPDATE SET revenue=excluded.revenue, cost=excluded.cost,
                    profit=excluded.profit, updated_at=CURRENT_TIMESTAMP
    `).bind(id, user.id, year, month, day, revenue ?? null, cost ?? null, profit ?? null).run();

    return json({ success: true });
  }

  return err('Method not allowed', 405);
}