// 使用 app-2.js 里已经创建好的 sb 实例
// 假设表名是 "emails"，字段名是 "email"；如果不同，请修改下面常量
const EMAIL_TABLE     = 'emails';
const EMAIL_FIELD_KEY = 'email';

// 取“当前推荐”的邮箱
function getCurrentEmail() {
  return (document.getElementById('emailDisplay')?.textContent || '').trim();
}

// 删除当前推荐邮箱
async function deleteCurrentEmail() {
  try {
    const email = getCurrentEmail();
    if (!email) {
      alert('No email to delete.');
      return;
    }
    if (!confirm(`Delete "${email}" ? This cannot be undone.`)) return;

    const filter = {};
    filter[EMAIL_FIELD_KEY] = email;

    const { error } = await sb.from(EMAIL_TABLE).delete().match(filter);
    if (error) throw error;

    // 刷新 UI（调用 app-2.js 里的刷新函数）
    if (typeof refreshAll === 'function') {
      await refreshAll();
    }

    alert('Deleted.');
  } catch (err) {
    console.error(err);
    alert('Delete failed: ' + (err?.message || String(err)));
  }
}
