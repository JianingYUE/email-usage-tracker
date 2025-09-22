// ===== 基础配置（保持与你项目一致） =====
const SUPABASE_URL  = 'https://ehfhcgzsirgebrfofaph.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVoZmhjZ3pzaXJnZWJyZm9mYXBoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ1OTg5MjMsImV4cCI6MjA3MDE3NDkyM30.OOnzt-mCdQNYU3b17O3vtDTrPA2AmJPij8OhfnvMAN0';

// 如果 app-2.js 里已经创建了 sb，这里就不重复创建；否则兜底创建一个。
window.sb = window.sb || supabase.createClient(SUPABASE_URL, SUPABASE_ANON);

// === 按你的数据库实际表结构改这两个常量 ===
const EMAIL_TABLE     = 'emails'; // 你的 email 表名
const EMAIL_FIELD_KEY = 'email';  // 存邮箱地址的字段名，例如 'email' 或 'address'

// 取“当前推荐”的邮箱文本（来自 index-8.html 里的 #emailDisplay）
function getCurrentEmail() {
  return (document.getElementById('emailDisplay')?.textContent || '').trim();
}

// 统一刷新（如果你的 app-2.js 有这些函数就调用；没有则跳过）
async function refreshAll() {
  try {
    if (typeof loadStats === 'function')            await loadStats();
    if (typeof loadRecommendation === 'function')   await loadRecommendation();
    if (typeof loadUsedEmails === 'function')       await loadUsedEmails();
  } catch (e) {
    console.warn('[refreshAll]', e);
  }
}

// 点击“Delete Email”调用
async function deleteCurrentEmail() {
  try {
    const email = getCurrentEmail();
    if (!email) {
      alert('No email to delete.');
      return;
    }
    if (!confirm(`Delete "${email}" ? This cannot be undone.`)) return;

    // 根据字段名生成过滤条件
    const filter = {};
    filter[EMAIL_FIELD_KEY] = email;

    const { error } = await sb.from(EMAIL_TABLE).delete().match(filter);
    if (error) throw error;

    // 刷新 UI
    await refreshAll();
    alert('Deleted.');
  } catch (err) {
    console.error(err);
    alert('Delete failed: ' + (err?.message || String(err)));
  }
}
