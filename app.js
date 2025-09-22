/* ========= Supabase 初始化 ========= */
const SUPABASE_URL = "https://ehfhcgzsirgebrfofaph.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVoZmhjZ3pzaXJnZWJyZm9mYXBoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ1OTg5MjMsImV4cCI6MjA3MDE3NDkyM30.OOnzt-mCdQNYU3b17O3vtDTrPA2AmJPij8OhfnvMAN0";

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* ========= 登录逻辑 ========= */
const PASS = "110"; // 你设定的密码
function checkPassword() {
  const v = document.getElementById("pwd").value;
  if (v === PASS) {
    document.getElementById("login").style.display = "none";
    document.getElementById("app").style.display = "block";
    refreshAll();
  } else {
    alert("Wrong password");
  }
}
window.checkPassword = checkPassword;

/* ========= 全局变量 ========= */
let usedEmails = [];
let usedPage = 1;
const USED_PAGE_SIZE = 10;

/* ========= 推荐邮箱 ========= */
async function loadRecommendation() {
  const { data, error } = await sb
    .from("emails")
    .select("*")
    .order("last_used", { ascending: true, nullsFirst: true })
    .limit(1);
  if (error) {
    console.error(error);
    return;
  }
  if (data.length === 0) return;

  const rec = data[0];
  document.getElementById("emailDisplay").textContent = rec.email;
  document.getElementById("lastUsedDisplay").textContent = rec.last_used
    ? Math.floor((Date.now() - new Date(rec.last_used)) / 86400000) + " day(s) ago"
    : "Never";
}

/* ========= 标记使用 ========= */
async function confirmUsage() {
  const email = document.getElementById("emailDisplay").textContent.trim();
  if (!email) return;

  const { error } = await sb
    .from("emails")
    .update({ last_used: new Date().toISOString() })
    .eq("email", email);
  if (error) {
    console.error(error);
    return;
  }
  await refreshAll();
}
window.confirmUsage = confirmUsage;

/* ========= 最近使用 ========= */
async function refreshRecent() {
  const { data, error } = await sb
    .from("emails")
    .select("*")
    .order("last_used", { ascending: false })
    .limit(1);
  if (error) {
    console.error(error);
    return;
  }
  if (data.length === 0 || !data[0].last_used) {
    document.getElementById("recent").style.display = "none";
    return;
  }
  document.getElementById("recent").style.display = "block";
  document.getElementById("recentEmail").textContent = data[0].email;
  document.getElementById("recentDays").textContent = Math.floor(
    (Date.now() - new Date(data[0].last_used)) / 86400000
  );
}
window.refreshRecent = refreshRecent;

/* ========= 已使用列表 ========= */
async function loadUsedEmails() {
  const { data, error } = await sb
    .from("emails")
    .select("*")
    .not("last_used", "is", null)
    .order("last_used", { ascending: false });
  if (error) {
    console.error(error);
    return;
  }
  usedEmails = data;
  renderUsedEmails();
}

function renderUsedEmails() {
  const list = document.getElementById("usedList");
  list.innerHTML = "";

  const start = (usedPage - 1) * USED_PAGE_SIZE;
  const end = start + USED_PAGE_SIZE;
  const pageItems = usedEmails.slice(start, end);

  for (const row of pageItems) {
    const li = document.createElement("li");
    li.textContent = `${row.email} · ${Math.floor(
      (Date.now() - new Date(row.last_used)) / 86400000
    )} day(s) ago`;
    list.appendChild(li);
  }

  const totalPages = Math.max(1, Math.ceil(usedEmails.length / USED_PAGE_SIZE));
  document.getElementById(
    "usedPageInfo"
  ).textContent = `Page ${usedPage} / ${totalPages}`;
  document.getElementById("usedPrevBtn").disabled = usedPage <= 1;
  document.getElementById("usedNextBtn").disabled = usedPage >= totalPages;
}

function toggleUsedEmails() {
  const div = document.getElementById("usedEmails");
  div.style.display = div.style.display === "none" ? "block" : "none";
}
function prevUsedPage() {
  usedPage--;
  renderUsedEmails();
}
function nextUsedPage() {
  usedPage++;
  renderUsedEmails();
}
window.toggleUsedEmails = toggleUsedEmails;
window.prevUsedPage = prevUsedPage;
window.nextUsedPage = nextUsedPage;

/* ========= 统计卡片 ========= */
async function loadStats() {
  const { data, error } = await sb.from("emails").select("*");
  if (error) {
    console.error(error);
    return;
  }
  const total = data.length;
  const never = data.filter((r) => !r.last_used).length;
  const used7 = data.filter(
    (r) => r.last_used && Date.now() - new Date(r.last_used) <= 7 * 86400000
  ).length;
  const used30 = data.filter(
    (r) => r.last_used && Date.now() - new Date(r.last_used) <= 30 * 86400000
  ).length;

  const days = data
    .filter((r) => r.last_used)
    .map((r) => Math.floor((Date.now() - new Date(r.last_used)) / 86400000));
  const median = days.length
    ? days.sort((a, b) => a - b)[Math.floor(days.length / 2)]
    : "-";

  document.getElementById("statsCard").style.display = "block";
  document.getElementById("statTotal").textContent = total;
  document.getElementById("statNever").textContent = never;
  document.getElementById("statR7").textContent = used7;
  document.getElementById("statR30").textContent = used30;
  document.getElementById("statMedian").textContent = median;
}
window.loadStats = loadStats;

/* ========= 刷新 ========= */
async function refreshAll() {
  await Promise.all([loadRecommendation(), refreshRecent(), loadUsedEmails(), loadStats()]);
}
window.refreshAll = refreshAll;

/* ========= 删除当前推荐邮箱 ========= */
const EMAIL_TABLE = "emails";       // 表名
const EMAIL_FIELD_KEY = "email";    // 邮箱字段名

function _getCurrentEmailText() {
  return (document.getElementById("emailDisplay")?.textContent || "").trim();
}

async function _refreshAllSafe() {
  try {
    if (typeof loadStats === "function") await loadStats();
    if (typeof loadRecommendation === "function") await loadRecommendation();
    if (typeof loadUsedEmails === "function") await loadUsedEmails();
    if (typeof refreshRecent === "function") await refreshRecent();
  } catch (e) {
    console.warn("[refreshAll]", e);
  }
}

window.deleteCurrentEmail = async function () {
  try {
    const email = _getCurrentEmailText();
    if (!email) {
      alert("No email to delete.");
      return;
    }
    if (!confirm(`Delete "${email}" ? This cannot be undone.`)) return;

    const { error } = await sb.from(EMAIL_TABLE).delete().eq(EMAIL_FIELD_KEY, email);
    if (error) throw error;

    await _refreshAllSafe();
    alert("Deleted.");
  } catch (err) {
    console.error("[deleteCurrentEmail]", err);
    alert("Delete failed: " + (err?.message || String(err)));
  }
};
