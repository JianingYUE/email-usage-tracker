const SUPABASE_URL = "https://ehfhcgzsirgebrfofaph.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVoZmhjZ3pzaXJnZWJyZm9mYXBoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ1OTg5MjMsImV4cCI6MjA3MDE3NDkyM30.OOnzt-mCdQNYU3b17O3vtDTrPA2AmJPij8OhfnvMAN0";

const db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const password = "000";
let currentId = null;

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
    const last = new Date(emailData.last_used);
    const daysAgo = Math.floor((Date.now() - last.getTime()) / (1000 * 60 * 60 * 24));
    document.getElementById("lastUsedDisplay").innerText = `${daysAgo} day(s) ago`;
  } else {
    document.getElementById("lastUsedDisplay").innerText = "Never used";
  }
}

async function confirmUsage() {
  if (!currentId) return;

  const { error } = await db
    .from("emails")
    .update({ last_used: new Date().toISOString() })
    .eq("id", currentId);

  if (error) {
    alert("Failed to update usage.");
    return;
  }

  alert("Usage recorded!");
  location.reload();
}
