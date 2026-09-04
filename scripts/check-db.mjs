import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const url = process.env.VITE_SUPABASE_URL;
const anon = process.env.VITE_SUPABASE_ANON_KEY;
const email = process.env.SMOKE_EMAIL;
const password = process.env.SMOKE_PASSWORD;

if (!url || !anon) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env');
  process.exit(1);
}

const headers = (token) => ({
  apikey: anon,
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/json',
});

async function countTable(token, table) {
  const res = await fetch(`${url}/rest/v1/${table}?select=id`, {
    headers: { ...headers(token), Prefer: 'count=exact' },
  });
  const range = res.headers.get('content-range');
  const count = range ? range.split('/')[1] : '?';
  if (!res.ok) return { table, error: await res.text() };
  return { table, count };
}

async function fetchJson(token, path) {
  const res = await fetch(`${url}/rest/v1/${path}`, { headers: headers(token) });
  if (!res.ok) throw new Error(`${path}: ${await res.text()}`);
  return res.json();
}

async function main() {
  const login = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: headers(anon),
    body: JSON.stringify({ email, password }),
  });
  const auth = await login.json();
  if (!auth.access_token) {
    console.error('Auth failed:', auth.error_description || auth.msg || JSON.stringify(auth));
    process.exit(1);
  }
  const token = auth.access_token;
  const projectRef = new URL(url).hostname.split('.')[0];

  console.log('Auth: OK');
  console.log('Supabase project:', projectRef);
  console.log('User id:', auth.user?.id);
  console.log('Email:', auth.user?.email);

  const tables = [
    'projects',
    'files',
    'compilations',
    'deployments',
    'gas_profiles',
    'user_settings',
    'snapshots',
  ];
  console.log('\n--- Row counts (RLS-scoped to this user) ---');
  for (const t of tables) {
    const r = await countTable(token, t);
    console.log(r.error ? `${t}: ERROR ${r.error.slice(0, 80)}` : `${t}: ${r.count}`);
  }

  const projects = await fetchJson(
    token,
    'projects?select=id,name,created_at,compiler_version,github_repo&order=created_at.desc&limit=20'
  );
  console.log(`\n--- Projects (${projects.length} most recent) ---`);
  for (const p of projects) {
    console.log(`  ${p.name} | ${(p.created_at || '').slice(0, 10)} | compiler ${p.compiler_version || '-'} | gh ${p.github_repo || '-'}`);
  }

  const smokeProjects = projects.filter((p) => /^Smoke_/i.test(p.name));
  console.log(`\n  Smoke test workspaces: ${smokeProjects.length} / ${projects.length}`);

  const files = await fetchJson(
    token,
    'files?select=id,name,workspace_id,updated_at&order=updated_at.desc&limit=12'
  );
  console.log('\n--- Recent files ---');
  for (const f of files) {
    console.log(`  ${f.name} | updated ${(f.updated_at || '').slice(0, 19)}`);
  }

  const comps = await fetchJson(
    token,
    'compilations?select=id,compiled_at,content_hash,project_id&order=compiled_at.desc&limit=5'
  );
  console.log('\n--- Recent compilations ---');
  for (const c of comps) {
    console.log(`  ${(c.compiled_at || '').slice(0, 19)} | hash ${(c.content_hash || 'none').slice(0, 16)}`);
  }

  const deps = await fetchJson(
    token,
    'deployments?select=network,deployment_kind,status,contract_address,timestamp&order=timestamp.desc&limit=10'
  );
  console.log('\n--- Recent deployments ---');
  for (const d of deps) {
    console.log(
      `  ${d.deployment_kind} | ${d.network} | ${d.status} | ${(d.contract_address || '').slice(0, 18)} | ${(d.timestamp || '').slice(0, 19)}`
    );
  }

  const kinds = {};
  for (const d of deps) kinds[d.deployment_kind] = (kinds[d.deployment_kind] || 0) + 1;
  console.log('\n--- Deployment kinds (in last 10 rows) ---', kinds);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
