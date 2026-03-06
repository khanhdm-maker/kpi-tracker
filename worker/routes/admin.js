export async function handleAdmin(request, { user, env, json, err }) {
  const url = new URL(request.url);
  const path = url.pathname;

  if (path === '/api/admin/users' && request.method === 'GET') {
    const users = await env.DB.prepare(
      'SELECT id, email, name, role, team_id, created_at FROM users ORDER BY created_at DESC'
    ).all();

    const enriched = await Promise.all(users.results.map(async (u) => {
      const count = await env.DB.prepare(
        'SELECT COUNT(DISTINCT month) as cnt FROM progress WHERE user_id = ? AND year = 2026 AND day IS NULL'
      ).bind(u.id).first();
      return { ...u, months_filed: count?.cnt ?? 0 };
    }));

    return json({ users: enriched });
  }

  const progressMatch = path.match(/^\/api\/admin\/users\/([^/]+)\/progress$/);
  if (progressMatch && request.method === 'GET') {
    const targetId = progressMatch[1];
    const year = parseInt(url.searchParams.get('year') || '2026');

    const targetUser = await env.DB.prepare(
      'SELECT id, email, name, role FROM users WHERE id = ?'
    ).bind(targetId).first();

    if (!targetUser) return err('User not found', 404);

    const progress = await env.DB.prepare(
      'SELECT * FROM progress WHERE user_id = ? AND year = ? ORDER BY month, day'
    ).bind(targetId, year).all();

    return json({ user: targetUser, progress: progress.results });
  }

  const roleMatch = path.match(/^\/api\/admin\/users\/([^/]+)\/role$/);
  if (roleMatch && request.method === 'PUT') {
    const targetId = roleMatch[1];
    const body = await request.json();
    const { role } = body;

    const validRoles = ['admin', 'team_leader', 'member'];
    if (!validRoles.includes(role)) {
      return err('Invalid role. Must be: admin, team_leader, or member');
    }

    if (targetId === user.id && role !== 'admin') {
      return err('Cannot change your own admin role');
    }

    await env.DB.prepare(
      'UPDATE users SET role = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).bind(role, targetId).run();

    return json({ success: true, role });
  }

  if (path === '/api/admin/stats' && request.method === 'GET') {
    const totalUsers = await env.DB.prepare('SELECT COUNT(*) as cnt FROM users').first();
    const totalTeams = await env.DB.prepare('SELECT COUNT(*) as cnt FROM teams').first();
    const activeUsers = await env.DB.prepare(
      'SELECT COUNT(DISTINCT user_id) as cnt FROM progress WHERE year = 2026'
    ).first();

    return json({
      total_users: totalUsers.cnt,
      total_teams: totalTeams.cnt,
      active_users: activeUsers.cnt,
    });
  }

  return err('Not found', 404);
}