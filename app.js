// === Supabase Config ===
const SUPABASE_URL =
  "https://ehfhcgzsirgebrfofaph.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVoZmhjZ3pzaXJnZWJyZm9mYXBoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ1OTg5MjMsImV4cCI6MjA3MDE3NDkyM30.OOnzt-mCdQNYU3b17O3vtDTrPA2AmJPij8OhfnvMAN0";
const PASSWORD = "000";

const db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// === State ===
let currentId = null;
let usedVisible = false;

// === Utils ===
function clampDays(n) {
  if (n < 0) return 0;
  if (n > 999) return 999;
  return n;
}
function daysBetweenDates(a, b) {
  const A = new Date(a);
  const B = new Date(b);
  const A0 = new Date(A.getFullYear(), A.getMonth(), A.getDate());
  const B0 = new Date(B.getFullYear(), B.getMonth(), B.getDate());
  return clampDays(Math.floor((B0 - A0) / (1000 * 60 * 60 * 24)));
}
function getDaysAgo(ts) {
  if (!ts) return 999;
  return daysBetweenDates(ts, new Date());
}

// === Auth / View switch ===
function checkPassword() {
  const val = document.getElementById("pwd").value;
  if (val === PASSWORD) {
    // 切视图
    const login = document.getElementById("loginCard");
    const app = document.getElementById("trackerSection");
    if (login) login.style.display = "none";
    if (app) app.style.display = "block";

    // 首次加载数据
    loadEmail();
  } else {
    alert("Wrong password");
  }
}
window.checkPassword = checkPassword; // for inline onclick

// === Data loads ===

// 推荐邮箱：优先 last_used IS NULL（未使用），其次 last_used 最早
async function loadEmail() {
  // ① 未使用优先
  let { data, error } = await db
    .from("emails")
    .select("id, email, last_used")
    .is("last_used", null)
    .order("email", { ascending: true }) // 若以后加了 created_at，可改为按 created_at
    .limit(1);

  // ② 没有未使用 → 取最久未使用
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
    document.getElementById("email").innerText = "(no email)";
    document.getElementById("lastUsed").innerText = "-";
    return;
  }

  const row = data[0];
  currentId = row.id;

  document.getElementById("email").innerText = row.email;
  const isNever = row.last_used == null;
  document.getElementById("lastUsed").innerText =
    isNever ? "Never used" : `${getDaysAgo(row.last_used)} day(s) ago`;
}

// 记录“我使用了这个邮箱”
async function markAsUsed() {
  if (!currentId) return;

  const nowIso = new Date().toISOString();
  const { error } = await db
    .from("emails")
    .update({ last_used: nowIso })
    .eq("id", currentId);

  if (error) {
    console.error("markAsUsed error:", error);
    alert("Failed to update usage.");
    return;
  }

  // 刷新当前推荐与已用列表（若可见）
  await loadEmail();
  if (usedVisible) {
    await loadUsedEmailsList();
  }

  alert("Usage recorded!");
}
window.markAsUsed = markAsUsed;

// 展开/收起“已使用”列表（最近 50 条）
async function toggleUsedEmails() {
  const list = document.getElementById("usedEmailsList");
  usedVisible = !usedVisible;
  if (!usedVisible) {
    list.style.display = "none";
    list.innerHTML = "";
    return;
  }
  await loadUsedEmailsList();
  list.style.display = "block";
}
window.toggleUsedEmails = toggleUsedEmails;

async function loadUsedEmailsList() {
  const container = document.getElementById("usedEmailsList");
  container.innerHTML = "Loading...";

  const { data, error } = await db
    .from("emails")
    .select("email, last_used")
    .not("last_used", "is", null)
    .order("last_used", { ascending: false })
    .limit(50);

  if (error) {
    console.error("used list error:", error);
    container.innerText = "Failed to load used emails.";
    return;
  }

  if (!data || data.length === 0) {
    container.innerText = "No used emails yet.";
    return;
  }

  // 渲染为列表
  const ul = document.createElement("ul");
  ul.style.listStyle = "none";
  ul.style.padding = "0";
  data.forEach((row) => {
    const li = document.createElement("li");
    li.style.margin = "6px 0";
    li.textContent = `📧 ${row.email} — ⏱️ ${getDaysAgo(row.last_used)} day(s) ago`;
    ul.appendChild(li);
  });
  container.innerHTML = "";
  container.appendChild(ul);
}
