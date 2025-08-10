const SUPABASE_URL = "https://ehfhcgzsirgebrfofaph.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVoZmhjZ3pzaXJnZWJyZm9mYXBoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ1OTg5MjMsImV4cCI6MjA3MDE3NDkyM30.OOnzt-mCdQNYU3b17O3vtDTrPA2AmJPij8OhfnvMAN0";

const db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const password = "000";

let currentId = null;
let usedEmailsVisible = false;

// ===== 分页状态 =====
const USED_PAGE_SIZE = 10;
let usedPage = 1;
let usedTotalPages = 1;

/** 登录校验 */
function checkPassword() {
  const input = document.getElementById("pwd").value;
  if (input === password) {
    document.getElementById("login").style.display = "none";
    document.getElementById("app").style.display = "block";
    loadEmail();
  } else {
    alert("Wrong password");
  }
}

/** 以“跨过午夜+1天”的方式计算天数（比较日期，不按小时差） */
function getDaysAgo(lastDate) {
  if (!lastDate) return 999; // 没有时间=未使用
  const last = new Date(lastDate);
  const now = new Date();

  const lastMidnight = new Date(last.getFullYear(), last.getMonth(), last.getDate());
  const nowMidnight  = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  let daysAgo = Math.floor((nowMidnight - lastMidnight) / (1000 * 60 * 60 * 24));
  if (daysAgo < 0) daysAgo = 0;
  if (daysAgo > 999) daysAgo = 999;
  return daysAgo;
}

/** 加载最久未使用（或未使用）的邮箱 */
async function loadEmail() {
  const { data, error } = await db
    .from("emails")
    .select("*")
    .order("last_used", { ascending: true })
    .limit(1);

  if (error || !data || data.length === 0) {
    alert("No email found.");
    return;
  }

  const emailData = data[0];
  currentId = emailData.id;

  document.getElementById("emailDisplay").innerText = emailData.email;

  const daysAgo = getDaysAgo(emailData.last_used);
  document.getElementById("lastUsedDisplay").innerText =
    daysAgo === 999 ? "Never used" : `${daysAgo} day(s) ago`;

  // 最近一次（本地缓存）
  const recentEmail = localStorage.getItem("recentEmail");
  const recentDays  = localStorage.getItem("recentDays");
  if (recentEmail && recentDays !== null) {
    document.getElementById("recentEmail").innerText = recentEmail;
    document.getElementById("recentDays").innerText  = recentDays;
    document.getElementById("recent").style.display  = "block";
  }
}

/** 点击“我使用了这个邮箱” */
async function confirmUsage() {
  if (!currentId) return;

  const nowIso = new Date().toISOString();
  const { error } = await db
    .from("emails")
    .update({ last_used: nowIso })
    .eq("id", currentId);

  if (error) {
    alert("Failed to update usage.");
    return;
  }

  // 立刻把“最近使用”记成当前邮箱，天数设为0（跨午夜后自动+1）
  const email = document.getElementById("emailDisplay").innerText;
  localStorage.setItem("recentEmail", email);
  localStorage.setItem("recentDays", "0");

  alert("Usage recorded!");
  location.reload();
}

/** 打开/关闭 Used Emails（分页） */
async function toggleUsedEmails() {
  const section = document.getElementById("usedEmails");

  if (usedEmailsVisible) {
    section.style.display = "none";
    usedEmailsVisible = false;
    return;
  }

  usedPage = 1; // 每次打开从第1页开始
  await loadUsedEmailsPage(usedPage);

  section.style.display = "block";
  usedEmailsVisible = true;
}

/** 加载某一页 Used Emails（last_used != null） */
async function loadUsedEmailsPage(page) {
  const offset = (page - 1) * USED_PAGE_SIZE;
  const to = offset + USED_PAGE_SIZE - 1;

  const { data, error, count } = await db
    .from("emails")
    .select("email, last_used", { count: "exact" })
    .neq("last_used", null) // 只显示使用过的
    .order("last_used", { ascending: false })
    .range(offset, to);

  if (error) {
    alert("Failed to load used emails.");
    console.error(error);
    return;
  }

  // 计算总页数
  usedTotalPages = Math.max(1, Math.ceil((count || 0) / USED_PAGE_SIZE));

  // 渲染列表（并屏蔽 999 的情况，按理 last_used != null 就不会是 999）
  const list = document.getElementById("usedList");
  list.innerHTML = "";

  if (!data || data.length === 0) {
    const li = document.createElement("li");
    li.textContent = "No used emails yet.";
    list.appendChild(li);
  } else {
    data.forEach(entry => {
      const daysAgo = getDaysAgo(entry.last_used);
      if (daysAgo >= 999) return; // 保险：不展示“未使用”的
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

/** 下一页 */
async function nextUsedPage() {
  if (usedPage >= usedTotalPages) return;
  usedPage += 1;
  await loadUsedEmailsPage(usedPage);
}

/** 更新页脚显示与按钮可用状态 */
function updateUsedPagerUI() {
  const info = document.getElementById("usedPageInfo");
  const prev = document.getElementById("usedPrevBtn");
  const next = document.getElementById("usedNextBtn");

  info.textContent = `Page ${usedPage} / ${usedTotalPages}`;
  prev.disabled = usedPage <= 1;
  next.disabled = usedPage >= usedTotalPages;
}

