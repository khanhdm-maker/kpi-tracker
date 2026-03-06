export async function handleTeam(request, { user, env, json, err }) {
  const url = new URL(request.url);
  const path = url.pathname;

  if (path === '/api/team' && request.method === 'GET') {
    let team = null;

    if (user.role === 'team_leader') {
      team = await env.DB.prepare(
        'SELECT * FROM teams WHERE leader_id = ?'
      ).bind(user.id).first();
    } else if (user.team_id) {
      team = await env.DB.prepare(
        'SELECT * FROM teams WHERE id = ?'
      ).bind(user.team_id).first();
    }

    if (!team) return json({ team: null, members: [] });

    const members = await env.DB.prepare(`
      SELECT u.id, u.email, u.name, u.role, tm.added_at
      FROM team_members tm
      JOIN users u ON u.id = tm.user_id
      WHERE tm.team_id = ?
    `).bind(team.id).all();

    return json({ team, members: members.results });
  }

  if (path === '/api/team' && request.method === 'POST') {
    if (user.role !== 'team_leader' && user.role !== 'admin') {
      return err('Only team leaders can create teams', 403);
    }

    const body = await request.json();
    const { name } = body;
    if (!name) return err('Team name is required');

    const existing = await env.DB.prepare(
      'SELECT id FROM teams WHERE leader_id = ?'
    ).bind(user.id).first();
    if (existing) return err('You already have a team');

    const id = crypto.randomUUID();
    await env.DB.prepare(
      'INSERT INTO teams (id, name, leader_id) VALUES (?, ?, ?)'
    ).bind(id, name, user.id).run();

    await env.DB.prepare(
      'INSERT OR IGNORE INTO team_members (team_id, user_id) VALUES (?, ?)'
    ).bind(id, user.id).run();

    await env.DB.prepare(
      'UPDATE users SET team_id = ? WHERE id = ?'
    ).bind(id, user.id).run();

    return json({ success: true, team_id: id });
  }

  if (path === '/api/team/members' && request.method === 'POST') {
    const body = await request.json();
    const { email } = body;
    if (!email) return err('Email is required');

    const team = await env.DB.prepare(
      'SELECT id FROM teams WHERE leader_id = ?'
    ).bind(user.id).first();
    if (!team) return err('You do not have a team yet');

    const targetUser = await env.DB.prepare(
      'SELECT id FROM users WHERE email = ?'
    ).bind(email).first();
    if (!targetUser) return err('User not found. They must login at least once.');

    await env.DB.prepare(
      'INSERT OR IGNORE INTO team_members (team_id, user_id) VALUES (?, ?)'
    ).bind(team.id, targetUser.id).run();

    await env.DB.prepare(
      'UPDATE users SET team_id = ? WHERE id = ?'
    ).bind(team.id, targetUser.id).run();

    return json({ success: true });
  }

  if (path === '/api/team/members' && request.method === 'DELETE') {
    const body = await request.json();
    const { user_id } = body;
    if (!user_id) return err('user_id is required');

    const team = await env.DB.prepare(
      'SELECT id FROM teams WHERE leader_id = ?'
    ).bind(user.id).first();
    if (!team) return err('You do not have a team');

    await env.DB.prepare(
      'DELETE FROM team_members WHERE team_id = ? AND user_id = ?'
    ).bind(team.id, user_id).run();

    await env.DB.prepare(
      'UPDATE users SET team_id = NULL WHERE id = ? AND team_id = ?'
    ).bind(user_id, team.id).run();

    return json({ success: true });
  }

  if (path === '/api/team/report' && request.method === 'GET') {
    const year = parseInt(url.searchParams.get('year') || '2026');

    const team = await env.DB.prepare(
      'SELECT * FROM teams WHERE leader_id = ?'
    ).bind(user.id).first();
    if (!team) return err('You do not have a team');

    const members = await env.DB.prepare(`
      SELECT u.id, u.email, u.name
      FROM team_members tm
      JOIN users u ON u.id = tm.user_id
      WHERE tm.team_id = ?
    `).bind(team.id).all();

    const report = await Promise.all(members.results.map(async (m) => {
      const progress = await env.DB.prepare(
        'SELECT * FROM progress WHERE user_id = ? AND year = ? AND day IS NULL ORDER BY month'
      ).bind(m.id, year).all();

      const totalRev = progress.results.reduce((s, p) => s + (p.revenue || 0), 0);
      const totalCost = progress.results.reduce((s, p) => s + (p.cost || 0), 0);
      const totalProfit = progress.results.reduce((s, p) => s + (p.profit || 0), 0);

      return {
        user: m,
        months_filed: progress.results.length,
        total_revenue: totalRev,
        total_cost: totalCost,
        total_profit: totalProfit,
        monthly: progress.results,
      };
    }));

    return json({ team, report });
  }

  return err('Not found', 404);
}