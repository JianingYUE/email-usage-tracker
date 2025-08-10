const SUPABASE_URL = "https://ehfhcgzsirgebrfofaph.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVoZmhjZ3pzaXJnZWJyZm9mYXBoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ1OTg5MjMsImV4cCI6MjA3MDE3NDkyM30.OOnzt-mCdQNYU3b17O3vtDTrPA2AmJPij8OhfnvMAN0";

const db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const password = "000";
let currentId = null;
let usedEmailsVisible = false;

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

  if (emailData.last_used) {
    const daysAgo = getDaysAgo(emailData.last_used);
    document.getElementById("lastUsedDisplay").innerText =
      daysAgo === 999 ? "Never used" : `${daysAgo} day(s) ago`;
  } else {
    document.getElementById("lastUsedDisplay").innerText = "Never used";
  }

  const recentEmail = localStorage.getItem("recentEmail");
  const recentDays = localStorage.getItem("recentDays");

  if (recentEmail && recentDays !== null) {
    document.getElementById("recentEmail").innerText = recentEmail;
    document.getElementById("recentDays").innerText = recentDays;
    document.getElementById("recent").style.display = "block";
  }
}

async function confirmUsage() {
  if (!currentId) return;

  const now = new Date().toISOString();

  const { error } = await db
    .from("emails")
    .update({ last_used: now })
    .eq("id", currentId);

  if (error) {
    alert("Failed to update usage.");
    return;
  }

  const email = document.getElementById("emailDisplay").innerText;
  localStorage.setItem("recentEmail", email);
  localStorage.setItem("recentDays", "0");  // 使用=0天（跨午夜后自动+1）

  alert("Usage recorded!");
  location.reload();
}

async function toggleUsedEmails() {
  const section = document.getElementById("usedEmails");

  if (usedEmailsVisible) {
    section.style.display = "none";
    usedEmailsVisible = false;
    return;
  }

  const { data, error } = await db
    .from("emails")
    .select("email, last_used")
    .order("last_used", { ascending: false });

  if (error) {
    alert("Failed to load used emails.");
    return;
  }

  const list = document.getElementById("usedList");
  list.innerHTML = "";

  data.forEach(entry => {
    if (!entry.last_used) return; // 未使用不进列表

    const daysAgo = getDaysAgo(entry.last_used);
    if (daysAgo >= 999) return;   // 999=未使用的占位，也不进列表

    const li = document.createElement("li");
    li.textContent = `📧 ${entry.email} — ⏱️ ${daysAgo} day(s) ago`;
    list.appendChild(li);
  });

  section.style.display = "block";
  usedEmailsVisible = true;
}
