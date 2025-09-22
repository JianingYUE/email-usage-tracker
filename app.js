/* ===== Supabase config (保持你现有项目，不需更改) ===== */
const SUPABASE_URL  = "https://ehfhcgzsirgebrfofaph.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVoZmhjZ3pzaXJnZWJyZm9mYXBoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ1OTg5MjMsImV4cCI6MjA3MDE3NDkyM30.OOnzt-mCdQNYU3b17O3vtDTrPA2AmJPij8OhfnvMAN0";

/* 只创建一次 client */
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON);

/* ===== 业务表配置（按你实际情况修改） ===== */
const EMAIL_TABLE     = 'emails';   // 表名
const EMAIL_FIELD_KEY = 'email';    // 存邮箱地址的字段名
const LAST_USED_KEY   = 'last_used_at'; // 最近使用时间的字段名（如果没有，可忽略）

/* ===== DOM helpers ===== */
const $ = (sel) => document.querySelector(sel);
function setText(id, value){ const el=document.getElementById(id); if(el) el.textContent=value ?? ''; }

/* ===== 登录 gating（简易本地密码门；你也可改回自己原来的验证） ===== */
const _ids = { login: 'login', app: 'app' };
function _showLogin(){ const a=$(`#${_ids.app}`), l=$(`#${_ids.login}`); if(a) a.style.display='none'; if(l) l.style.display='block'; }
function _showApp(){   const a=$(`#${_ids.app}`), l=$(`#${_ids.login}`); if(a) a.style.display='block'; if(l) l.style.display='none'; }

/* 你可以改成自己的校验方式；这里是最小可用本地门（明文仅作演示） */
const LOCAL_PASS = '1234'; // ← 改成你自己的密码
window.checkPassword = function(){
  const v = ($('#pwd')?.value || '').trim();
  if (!v) return alert('Enter password');
  if (v !== LOCAL_PASS) return alert('Wrong password');
  localStorage.setItem('pass_ok', '1');
  boot(); // 登录通过后初始化
};

/* ===== 推荐/列表逻辑（示例实现；字段名可按你表结构调整） ===== */
async function loadRecommendation(){
  // 简单逻辑：挑 last_used_at 最早的一条作为“推荐”
  const { data, error } = await sb.from(EMAIL_TABLE)
    .select(`${EMAIL_FIELD_KEY}, ${LAST_USED_KEY}`)
    .order(LAST_USED_KEY, { ascending: true, nullsFirst: true })
    .limit(1);
  if (error) { console.error(error); return; }

  const row = data?.[0];
  const email = row?.[EMAIL_FIELD_KEY] || '';
  const lu    = row?.[LAST_USED_KEY] ? new Date(row[LAST_USED_KEY]) : null;

  setText('emailDisplay', email);
  setText('lastUsedDisplay', lu ? lu.toDateString() : 'Never');
}

async function loadUsedEmails(){
  const list = $('#usedList');
  if (!list) return;

  const { data, error } = await sb.from(EMAIL_TABLE)
    .select(`${EMAIL_FIELD_KEY}, ${LAST_USED_KEY}`)
    .order(LAST_USED_KEY, { ascending: false, nullsLast: true })
    .limit(50);
  if (error) { console.error(error); list.innerHTML = '<li class="muted">Failed to load.</li>'; return; }

  list.innerHTML = '';
  if (!data?.length) {
    list.innerHTML = '<li class="muted">No used emails.</li>';
    return;
  }

  data.forEach(row=>{
    const email = row[EMAIL_FIELD_KEY];
    const lu    = row[LAST_USED_KEY] ? new Date(row[LAST_USED_KEY]).toDateString() : 'Never';
    const li = document.createElement('li');
    li.innerHTML = `<strong>${email}</strong> <span class="muted"> · Last: ${lu}</span>`;
    list.appendChild(li);
  });
}

async function loadStats(){
  // 简单统计（可按需完善）
  // 这里不渲染统计卡片，只是保证函数存在以便调用不报错
  return;
}

/* “我用了这个邮箱” —— 把 last_used_at 写成现在（可按你表字段调整） */
window.confirmUsage = async function(){
  const email = ($('#emailDisplay')?.textContent || '').trim();
  if (!email) return alert('No email.');

  const { error } = await sb.from(EMAIL_TABLE)
    .update({ [LAST_USED_KEY]: new Date().toISOString() })
    .eq(EMAIL_FIELD_KEY, email);

  if (error) { alert(error.message || String(error)); return; }
  await Promise.all([loadRecommendation(), loadUsedEmails()]);
  alert('Marked as used.');
};

/* 删除“当前推荐”的邮箱（你需要 RLS 允许 delete，否则会报权限不足） */
window.deleteCurrentEmail = async function(){
  try{
    const email = ($('#emailDisplay')?.textContent || '').trim();
    if (!email) { alert('No email to delete.'); return; }
    if (!confirm(`Delete "${email}" ? This cannot be undone.`)) return;

    const { error } = await sb.from(EMAIL_TABLE).delete().eq(EMAIL_FIELD_KEY, email);
    if (error) throw error;

    await Promise.all([loadRecommendation(), loadUsedEmails()]);
    alert('Deleted.');
  }catch(err){
    console.error(err);
    alert('Delete failed: ' + (err?.message || String(err)));
  }
};

/* ===== 启动流程 ===== */
async function boot(){
  // 本地“已通过门禁”才显示主界面
  if (localStorage.getItem('pass_ok') !== '1') { _showLogin(); return; }
  _showApp();
  await Promise.all([loadRecommendation(), loadUsedEmails(), loadStats()]);
}

/* 页面就绪后启动 */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}
