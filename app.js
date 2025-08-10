// === Supabase & App Config ===
const SUPABASE_URL = "https://ehfhcgzsirgebrfofaph.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVoZmhjZ3pzaXJnZWJyZm9mYXBoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ1OTg5MjMsImV4cCI6MjA3MDE3NDkyM30.OOnzt-mCdQNYU3b17O3vtDTrPA2AmJPij8OhfnvMAN0";
const password = "000";

const db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ==== State ====
let currentId = null;
let usedEmailsVisible = false;

// Pagination
const USED_PAGE_SIZE = 10;
let usedPage = 1;
let usedTotalPages = 1;

// ==== Utils ====
function clampDays(n) {
  if (n < 0) return 0;
  if (n > 999) return 999;
  return n;
}

/** 自然日差（跨午夜+1） */
function daysBetweenDates(a, b) {
  const A = new Date(a);
  const B = new Date(b);
  const A0 = new Date(A.getFullYear(), A.getMonth(), A.getDate());
  const B0 = new Date(B.getFullYear(), B.getMonth(), B.getDate());
  return clampDays(Math.floor((B0 - A0) / (1000 * 60 * 60 * 24)));
}

/** last_used -> 几天前；null 视为 999（仅用于显示） */
function getDaysAgo(lastDate) {
  if (!lastDate) return 999;
  return daysBetweenDates(lastDate, new Date());
}

/** 刷新“Recently Used”（从 localStorage 读取时间戳并实时计算天数） */
function refreshRecent() {
  const recentEmail = localStorage.getItem("recentEmail");
  const recentTs = localStorage.getItem("recentTs"); // ISO string
  const recentEl = document.getElementById("recent");

  if (recentEmail && recentTs) {
    const d = getDaysAgo(recentTs);
    document.getElementById("recentEmail").innerText = recentEmail;
    document.getElementById("recentDays").innerText = String(d);
    recentEl.style.display = "block";
  } else {
    recentEl.style.display = "none";
  }
}

// ==== Stats Card ====
async function loadStats() {
  try {
    const { data, error } = await db.rpc('email_stats');
    if (error) throw error;

    // rpc 返回的是数组（table 返回多行）；我们只取第一行
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) throw new Error('No stats row');

    const total = row.total ?? 0;
    const never = row.never_used ?? 0;
    const r7 = row.recent7 ?? 0;
    const r30 = row.recent30 ?? 0;
    const median = row.median_days != null ? Number(row.median_days) : null;

    document.getElementById('statTotal').innerText = String(total);
    document.getElementById('statNever').innerText = String(never);
    document.getElementById('statR7').innerText = String(r7);
    document.getElementById('statR30').innerText = String(r30);
    document.getElementById('statMedian').innerText = median == null ? '-' : `${median.toFixed(1)}`;

    document.getElementById('statsCard').style.display = 'block';
  } catch (e) {
    console.error('loadStats error:', e);
    // 失败就隐藏卡片，避免占位
    const card = document.getElementById('statsCard');
    if (card) card.style.display = 'none';
  }
}

// ==== Auth ====
function checkPassword() {
  const input = document.getElementById("pwd").value;
  if (input === password) {
    document.getElementById("login").style.display = "none";
    document.getElementById("app").style.display = "block";
    init();
  } else {
    alert("Wrong password");
  }
}
window.checkPassword = checkPassword; // expose for inline onclick

// ==== Init ====
async function init() {
  await Promise.all([
    loadEmail(),
    loadStats(),
  ]);
  refreshRecent();
  // 每 60 秒刷新一次“Recently Used”的天数显示
  setInterval(refreshRecent, 60 * 1000);
}

// ==== Data Loads ====

/**
 * 加载推荐邮箱：
 * ① 优先选择从未使用（last_used IS NULL），按 email 字母序最早的一条；
 * ② 如果没有未使用，再选择 last_used 最早的一条（最久未使用）。
 */
async function loadEmail() {
  // ① 未使用（NULL）优先
  let { data, error } = await db
    .from("emails")
    .select("id, email, last_used")
    .is("last_used", null)
    .order("email", { ascending: true }) // 如果你加了 created_at，可换成 created_at
    .limit(1);

  // ② 如果没有未使用，再退到“最久未使用”
  if (!error && data && data.length === 0) {
    const res2 = await db
      .from("emails")
      .select("id, email, last_used")
      .not("last_used", "is", null)
      .order("last_used", { ascending: true })
      .limit(1);
    data = res2.data;
    error = res2.error;
  }

  if (error || !data || data.length === 0) {
    console.error("loadEmail error:", error);
    alert("No email found.");
    return;
  }

  const emailData = data[0];
  currentId = emailData.id;
  document.getElementById("emailDisplay").innerText = emailData.email;

  const isNever = emailData.last_used == null;
  document.getElementById("lastUsedDisplay").innerText =
    isNever ? "Never used" : `${getDaysAgo(emailData.last_used)} day(s) ago`;
}

/** 记录“我使用了这个邮箱” */
async function confirmUsage() {
  if (!currentId) return;

  const nowIso = new Date().toISOString();
  const { error } = await db
    .from("emails")
    .update({ last_used: nowIso })
    .eq("id", currentId);

  if (error) {
    console.error("confirmUsage error:", error);
    alert("Failed to update usage.");
    return;
  }

  // 更新本地“最近使用”
  const email = document.getElementById("emailDisplay").innerText;
  localStorage.setItem("recentEmail", email);
  localStorage.setItem("recentTs", nowIso);

  // 刷新 UI（包括统计卡）
  await Promise.all([
    loadEmail(),
    loadStats(),
  ]);
  refreshRecent();
  if (usedEmailsVisible) {
    await loadUsedEmailsPage(usedPage);
  }

  alert("Usage recorded!");
}
window.confirmUsage = confirmUsage;

/** 展开/收起 Used Emails（分页） */
async function toggleUsedEmails() {
  const section = document.getElementById("usedEmails");

  if (usedEmailsVisible) {
    section.style.display = "none";
    usedEmailsVisible = false;
    return;
  }

  usedPage = 1; // 每次打开从第一页
  await loadUsedEmailsPage(usedPage);

  section.style.display = "block";
  usedEmailsVisible = true;
}
window.toggleUsedEmails = toggleUsedEmails;

/** 分页加载 Used Emails：先 count 再取数据；仅拿 last_used 非 NULL 的 */
async function loadUsedEmailsPage(page) {
  const offset = (page - 1) * USED_PAGE_SIZE;
  const to = offset + USED_PAGE_SIZE - 1;

  // 1) 只取数量（count-only）
  const { count, error: countError } = await db
    .from("emails")
    .select("id", { count: "exact", head: true })
    .not("last_used", "is", null);

  if (countError) {
    console.error("Count error:", countError);
    alert("Failed to load used emails.");
    return;
  }

  usedTotalPages = Math.max(1, Math.ceil((count || 0) / USED_PAGE_SIZE));

  // 2) 分页取数据（最近使用在前）
  const { data, error } = await db
    .from("emails")
    .select("email, last_used")
    .not("last_used", "is", null)
    .order("last_used", { ascending: false })
    .range(offset, to);

  if (error) {
    console.error("Page data error:", error);
    alert("Failed to load used emails.");
    return;
  }

  const list = document.getElementById("usedList");
  list.innerHTML = "";

  if (!data || data.length === 0) {
    const li = document.createElement("li");
    li.textContent = "No used emails yet.";
    list.appendChild(li);
  } else {
    data.forEach(entry => {
      const daysAgo = getDaysAgo(entry.last_used);
      const li = document.createElement("li");
      li.textContent = `📧 ${entry.email} — ⏱️ ${daysAgo} day(s) ago`;
      list.appendChild(li);
    });
  }

  updateUsedPagerUI();
}

/** 上一页 */
async function prevUsedPage() {
  if (usedPage <= 1) return;
  usedPage -= 1;
  await loadUsedEmailsPage(usedPage);
}
window.prevUsedPage = prevUsedPage;

/** 下一页 */
async function nextUsedPage() {
  if (usedPage >= usedTotalPages) return;
  usedPage += 1;
  await loadUsedEmailsPage(usedPage);
}
window.nextUsedPage = nextUsedPage;

/** 更新分页 UI */
function updateUsedPagerUI() {
  const info = document.getElementById("usedPageInfo");
  const prev = document.getElementById("usedPrevBtn");
  const next = document.getElementById("usedNextBtn");

  info.textContent = `Page ${usedPage} / ${usedTotalPages}`;
  prev.disabled = usedPage <= 1;
  next.disabled = usedPage >= usedTotalPages;
}

// 暴露给 inline onclick
window.loadEmail = loadEmail;
window.refreshRecent = refreshRecent;
window.loadStats = loadStats;
