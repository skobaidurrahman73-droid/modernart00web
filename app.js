import { db, auth, storage, ensureFirebaseUser } from "./firebase-config.js";
import { 
  doc, getDoc, setDoc, collection, addDoc, query, where, onSnapshot, getDocs, deleteDoc 
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { 
  ref, uploadBytes, getDownloadURL 
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-storage.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

const $ = id => document.getElementById(id);
const escapeHTML = str => String(str ?? "").replace(/[&<>'"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[c]));

// Branding & Theme Initialization
function applyBranding() {
  if (typeof SHOP_CONFIG !== "undefined") {
    document.querySelectorAll("#shopName").forEach(x => x.textContent = SHOP_CONFIG.shopName);
    const link = $("emergencyLink");
    if (link) { link.textContent = SHOP_CONFIG.emergencyNumber; link.href = "tel:" + SHOP_CONFIG.emergencyNumber; }
  }
  const savedColor = localStorage.getItem("themeColor");
  if (savedColor) {
    document.documentElement.style.setProperty('--primary-color', savedColor);
    document.documentElement.style.setProperty('--main-bg', savedColor);
    document.documentElement.style.setProperty('--theme-color', savedColor);
  }
}
document.addEventListener("DOMContentLoaded", applyBranding);

// Customer Auth & Dashboard
export async function customerLogin() {
  const phone = $("phone").value.trim(), receipt = $("receiptId") ? $("receiptId").value.trim() : "";
  if (!phone) return alert("ফোন নম্বর দিন।");
  try {
    const snap = await getDoc(doc(db, "customers", phone));
    if (!snap.exists()) {
      location.href = `register.html?phone=${encodeURIComponent(phone)}&receipt=${encodeURIComponent(receipt)}`;
      return;
    }
    localStorage.setItem("currentCustomer", phone);
    location.href = "customer.html";
  } catch (e) { alert("Error: " + e.message); }
}

export async function registerCustomer() {
  const name = $("name").value.trim(), phone = $("phone").value.trim(), receipt = $("receiptId") ? $("receiptId").value.trim() : "";
  if (!name || !phone) return alert("সব তথ্য পূরণ করুন।");
  try {
    await ensureFirebaseUser();
    await setDoc(doc(db, "customers", phone), {
      name, phone, receiptId: receipt, vip: false,
      vipRequested: $("vipRequest") ? $("vipRequest").checked : false, createdAt: Date.now()
    });
    localStorage.setItem("currentCustomer", phone);
    alert("Account তৈরি হয়েছে।");
    location.href = "customer.html";
  } catch (e) { alert("Error: " + e.message); }
}

export async function loadCustomerDashboard() {
  const phone = localStorage.getItem("currentCustomer");
  if (!phone) { location.href = "index.html"; return; }
  try {
    const snap = await getDoc(doc(db, "customers", phone));
    if (!snap.exists()) { location.href = "index.html"; return; }
    const c = snap.data();
    if ($("customerName")) $("customerName").textContent = c.name;
    if ($("customerPhone")) $("customerPhone").textContent = c.phone;
    if ($("vipStatus")) $("vipStatus").textContent = c.vip ? "⭐ VIP" : "NON-VIP";

    loadNoticesForUser("customer");
  } catch (e) { console.error(e); }
}

// Notice Loader
async function loadNoticesForUser(userType) {
  const noticeBox = $("noticeBoard") || $("userNotice");
  if (!noticeBox) return;
  try {
    const snap = await getDocs(collection(db, "notices"));
    const notices = snap.docs
      .map(d => d.data())
      .filter(n => n.target === "all" || n.target === userType || n.target === userType + "s")
      .sort((a, b) => (b.at || 0) - (a.at || 0));

    if (notices.length > 0) {
      noticeBox.innerHTML = notices.map(n => `
        <div style="background:#fff3cd; color:#856404; padding:10px; border-radius:6px; margin-bottom:8px; border:1px solid #ffeeba;">
          📢 <strong>নোটিশ:</strong> ${escapeHTML(n.text)}
        </div>
      `).join("");
    } else {
      noticeBox.innerHTML = "";
    }
  } catch (e) { console.error("Notice error:", e); }
}

// Customer Chat & Designer List
export async function renderDesigners() {
  const box = $("designerList"); if (!box) return;
  try {
    const snap = await getDocs(collection(db, "designers"));
    const designers = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    if (!designers.length) {
      box.innerHTML = '<div class="notice">কোনো ডিজাইনার পাওয়া যায়নি।</div>';
      return;
    }
    box.innerHTML = designers.map(d => `
      <div class="designer" style="display:flex; justify-content:space-between; align-items:center; padding:10px; border-bottom:1px solid #ddd;">
        <div><strong>${escapeHTML(d.name)}</strong><br><span class="muted">📱 ${escapeHTML(d.phone)}</span><br><span class="muted">${escapeHTML(d.speciality || "")}</span></div>
        <button class="btn primary" style="width:auto" onclick="openChatAsCustomer('${d.id}', '${escapeHTML(d.name)}')">Chat</button>
      </div>`).join("");
  } catch (e) { console.error(e); }
}

export function openChatAsCustomer(id, name) {
  localStorage.setItem("selectedDesigner", JSON.stringify({ id, name }));
  localStorage.removeItem("activeChatCustomer");
  location.href = "chat.html";
}

// Designer Auth & Dashboard
export async function designerLogin() {
  const phone = $("designerPhone").value.trim();
  const pass = $("designerPassword") ? $("designerPassword").value.trim() : "";
  const driveUrl = $("designerDriveUrl") ? $("designerDriveUrl").value.trim() : "";
  
  if (!phone || !pass) return alert("ফোন নম্বর এবং পাসওয়ার্ড দিন।");
  
  try {
    await ensureFirebaseUser();
    const q = query(collection(db, "designers"), where("phone", "==", phone), where("pass", "==", pass));
    const snap = await getDocs(q);
    if (snap.empty) return alert("ফোন নম্বর অথবা পাসওয়ার্ড ভুল!");

    const docSnap = snap.docs[0];
    if (driveUrl) {
      await setDoc(doc(db, "designers", docSnap.id), { driveUrl }, { merge: true });
    }
    
    const updatedSnap = await getDoc(doc(db, "designers", docSnap.id));
    const designer = { id: docSnap.id, ...updatedSnap.data() };
    localStorage.setItem("currentDesigner", JSON.stringify(designer));
    location.href = "designer.html";
  } catch (e) { alert("Error: " + e.message); }
}

export function togglePinCustomer(phone) {
  const designer = JSON.parse(localStorage.getItem("currentDesigner") || "null");
  if (!designer) return;
  const key = `pinned_cust_${designer.id}`;
  let pinned = JSON.parse(localStorage.getItem(key) || "[]");
  if (pinned.includes(phone)) {
    pinned = pinned.filter(p => p !== phone);
  } else {
    pinned.push(phone);
  }
  localStorage.setItem(key, JSON.stringify(pinned));
  loadDesignerDashboard();
}

let designerChatUnsub = null;
let lastKnownMessageCount = {};

export async function loadDesignerDashboard() {
  const designer = JSON.parse(localStorage.getItem("currentDesigner") || "null");
  if (!designer) { location.href = "designer-login.html"; return; }
  if ($("designerName")) $("designerName").textContent = designer.name;
  if ($("designerPhoneView")) $("designerPhoneView").textContent = designer.phone;

  // Notification Permission Request
  if ("Notification" in window && Notification.permission !== "granted" && Notification.permission !== "denied") {
    Notification.requestPermission();
  }

  try {
    loadNoticesForUser("designer");

    const custSnap = await getDocs(collection(db, "customers"));
    const customers = custSnap.docs.map(doc => doc.data());
    const pinnedKey = `pinned_cust_${designer.id}`;
    const pinnedPhones = JSON.parse(localStorage.getItem(pinnedKey) || "[]");

    if (designerChatUnsub) designerChatUnsub();
    
    designerChatUnsub = onSnapshot(collection(db, "chats"), (snapshot) => {
      const activeMessages = {};
      
      snapshot.docs.forEach(d => {
        const data = d.data();
        if (data.chatId && data.chatId.endsWith(`_${designer.id}`) && data.from === "customer") {
          const cPhone = data.chatId.split("_")[0];
          if (!activeMessages[cPhone]) activeMessages[cPhone] = [];
          activeMessages[cPhone].push(data);
        }
      });

      // Show Notification logic
      Object.keys(activeMessages).forEach(cPhone => {
        const msgs = activeMessages[cPhone];
        const prevCount = lastKnownMessageCount[cPhone];
        
        if (prevCount !== undefined && msgs.length > prevCount) {
          const lastMsg = msgs[msgs.length - 1];
          const custObj = customers.find(c => c.phone === cPhone);
          const senderName = custObj ? custObj.name : cPhone;

          if ("Notification" in window && Notification.permission === "granted") {
            try {
              const notif = new Notification(`নতুন বার্তা: ${senderName}`, {
                body: lastMsg.text || "একটি ফাইল পাঠিয়েছেন।",
                icon: "https://cdn-icons-png.flaticon.com/512/732/732200.png"
              });
              notif.onclick = () => { window.focus(); };
            } catch(e) { console.error(e); }
          }
        }
        lastKnownMessageCount[cPhone] = msgs.length;
      });

      // Render Customer List with Unread Badge check
      if ($("designerCustomers")) {
        const renderCard = (c, isPinned) => {
          const lastReadTime = Number(localStorage.getItem(`lastRead_${designer.id}_${c.phone}`) || 0);
          const custMsgs = activeMessages[c.phone] || [];
          const hasUnread = custMsgs.some(m => (m.at || 0) > lastReadTime);

          return `
            <div class="file-row" style="display:flex; justify-content:space-between; align-items:center; padding:10px; border-bottom:1px solid #ddd; ${isPinned ? 'background:#eef6ff;' : ''}">
              <div>
                <strong>${escapeHTML(c.name)}</strong> 
                ${c.vip ? '<span style="color:#d97706;font-weight:bold;">⭐ VIP</span>' : '<span class="muted">(NON-VIP)</span>'}
                ${hasUnread ? '<span style="background:#ef4444; color:#fff; padding:2px 6px; border-radius:10px; font-size:11px; margin-left:5px; font-weight:bold;">🔴 নতুন বার্তা</span>' : ''}
                ${isPinned ? '<span style="color:#2563eb;font-weight:bold;margin-left:5px;">📌 Pinned</span>' : ''}<br>
                <span class="muted">📱 ${escapeHTML(c.phone)}</span>
                ${c.receiptId ? `<br><span class="muted">🧾 Receipt: ${escapeHTML(c.receiptId)}</span>` : ''}
              </div>
              <div style="display:flex; gap:5px; align-items:center;">
                <button class="btn small" onclick="togglePinCustomer('${escapeHTML(c.phone)}')">${isPinned ? "📌 Unpin" : "📌 Pin"}</button>
                <button class="btn small" onclick="toggleVip('${escapeHTML(c.phone)}', ${!c.vip})">${c.vip ? "Remove VIP" : "Make VIP"}</button>
                <button class="btn primary" style="width:auto" onclick="openChatAsDesigner('${escapeHTML(c.phone)}', '${escapeHTML(c.name)}')">Chat</button>
              </div>
            </div>
          `;
        };

        const pinnedList = customers.filter(c => pinnedPhones.includes(c.phone));
        const unpinnedList = customers.filter(c => !pinnedPhones.includes(c.phone));

        let html = "";
        if (pinnedList.length > 0) {
          html += `<div style="margin-bottom:15px; border:2px solid #2563eb; border-radius:8px; padding:10px; background:#fafcff;">
            <h4 style="margin:0 0 10px 0; color:#2563eb;">📌 পিন করা কাস্টমার</h4>
            ${pinnedList.map(c => renderCard(c, true)).join("")}
          </div>`;
        }

        html += `<div>
          <h4 style="margin:10px 0;">সব কাস্টমার</h4>
          ${unpinnedList.map(c => renderCard(c, false)).join("") || '<div class="notice">কোনো কাস্টমার পাওয়া যায়নি।</div>'}
        </div>`;

        $("designerCustomers").innerHTML = html;
      }
    });

  } catch (e) { console.error(e); }
}

export function openChatAsDesigner(phone, name) {
  const designer = JSON.parse(localStorage.getItem("currentDesigner") || "null");
  if (designer) {
    localStorage.setItem(`lastRead_${designer.id}_${phone}`, Date.now());
  }
  localStorage.setItem("activeChatCustomer", JSON.stringify({ phone, name }));
  localStorage.removeItem("selectedDesigner");
  location.href = "chat.html";
}

// Single Unified Load Chat
export async function loadChat() {
  const customerPhone = localStorage.getItem("currentCustomer");
  const selectedDesigner = JSON.parse(localStorage.getItem("selectedDesigner") || "null");
  const currentDesigner = JSON.parse(localStorage.getItem("currentDesigner") || "null");
  const activeCustomer = JSON.parse(localStorage.getItem("activeChatCustomer") || "null");

  let chatId, displayName, driveUrl = "";

  if (customerPhone && selectedDesigner) {
    chatId = `${customerPhone}_${selectedDesigner.id}`;
    displayName = selectedDesigner.name;
    const desSnap = await getDoc(doc(db, "designers", selectedDesigner.id));
    if (desSnap.exists()) driveUrl = desSnap.data().driveUrl || "";
  } else if (currentDesigner && activeCustomer) {
    chatId = `${activeCustomer.phone}_${currentDesigner.id}`;
    displayName = activeCustomer.name;
    driveUrl = currentDesigner.driveUrl || "";
    localStorage.setItem(`lastRead_${currentDesigner.id}_${activeCustomer.phone}`, Date.now());
  } else {
    alert("চ্যাট তথ্য পাওয়া যায়নি।");
    location.href = "index.html";
    return;
  }

  if ($("chatDesigner")) $("chatDesigner").textContent = displayName;

  const driveBtn = $("driveBtn");
  if (driveBtn) {
    if (driveUrl) {
      driveBtn.href = driveUrl;
      driveBtn.target = "_blank";
      driveBtn.onclick = null;
    } else {
      driveBtn.href = "javascript:void(0)";
      driveBtn.onclick = () => alert("কোনো ড্রাইভ লিংক যুক্ত করা নেই!");
    }
  }

  const q = query(collection(db, "chats"), where("chatId", "==", chatId));
  onSnapshot(q, (snapshot) => {
    const msgs = snapshot.docs.map(doc => doc.data()).sort((a, b) => (a.at || 0) - (b.at || 0));
    renderMessages(msgs);
  }, (error) => { console.error("Firestore Error:", error); });
}

function renderMessages(msgs) {
  const box = $("chatMessages");
  if (!box) return;
  const isCustomerLoggedIn = !!localStorage.getItem("currentCustomer");

  box.innerHTML = msgs.map(m => {
    const isMe = isCustomerLoggedIn ? (m.from === "customer") : (m.from === "designer");
    let content = escapeHTML(m.text || "");

    if (m.fileUrl) {
      const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(m.fileName || m.fileUrl);
      if (isImage) {
        content = `<img src="${m.fileUrl}" alt="Image" style="max-width: 100%; max-height: 220px; border-radius: 10px; display: block; margin-top: 5px; cursor: pointer;" onclick="window.open('${m.fileUrl}', '_blank')">`;
      } else {
        content = `📄 ${escapeHTML(m.fileName || 'File')}<br><a href="${m.fileUrl}" target="_blank" download style="color: #0084ff; font-weight: bold; display: inline-block; margin-top: 5px; text-decoration: underline;">📥 ডাউনলোড করুন</a>`;
      }
    }
    return `<div class="message ${isMe ? "me" : ""}">${content}</div>`;
  }).join("");
  box.scrollTop = box.scrollHeight;
}

// Messaging Functions
export async function sendMessage() {
  const input = $("messageInput"), text = input ? input.value.trim() : "";
  if (!text) return;

  const customerPhone = localStorage.getItem("currentCustomer");
  const selectedDesigner = JSON.parse(localStorage.getItem("selectedDesigner") || "null");
  const currentDesigner = JSON.parse(localStorage.getItem("currentDesigner") || "null");
  const activeCustomer = JSON.parse(localStorage.getItem("activeChatCustomer") || "null");

  let chatId, sender;
  if (customerPhone && selectedDesigner) {
    chatId = `${customerPhone}_${selectedDesigner.id}`;
    sender = "customer";
  } else if (currentDesigner && activeCustomer) {
    chatId = `${activeCustomer.phone}_${currentDesigner.id}`;
    sender = "designer";
  } else {
    return alert("লগইন তথ্য পাওয়া যায়নি।");
  }

  try {
    await addDoc(collection(db, "chats"), { chatId, from: sender, text, at: Date.now() });
    if (input) input.value = "";
  } catch (e) { alert("Error: " + e.message); }
}

export async function sendFile() {
  const fileInput = $("chatFile") || $("demoFile");
  if (!fileInput || !fileInput.files[0]) return alert("দয়া করে একটি ফাইল সিলেক্ট করুন।");
  const file = fileInput.files[0];

  const customerPhone = localStorage.getItem("currentCustomer");
  const selectedDesigner = JSON.parse(localStorage.getItem("selectedDesigner") || "null");
  const currentDesigner = JSON.parse(localStorage.getItem("currentDesigner") || "null");
  const activeCustomer = JSON.parse(localStorage.getItem("activeChatCustomer") || "null");

  let chatId, sender;
  if (customerPhone && selectedDesigner) {
    chatId = `${customerPhone}_${selectedDesigner.id}`;
    sender = "customer";
  } else if (currentDesigner && activeCustomer) {
    chatId = `${activeCustomer.phone}_${currentDesigner.id}`;
    sender = "designer";
  } else {
    return alert("লগইন তথ্য পাওয়া যায়নি।");
  }

  try {
    alert("ফাইল আপলোড হচ্ছে, অপেক্ষা করুন...");
    const storageRef = ref(storage, `uploads/${Date.now()}_${file.name}`);
    await uploadBytes(storageRef, file);
    const fileUrl = await getDownloadURL(storageRef);

    await addDoc(collection(db, "chats"), {
      chatId, from: sender, text: `📁 ফাইল প্রেরিত হয়েছে: ${file.name}`, fileUrl, fileName: file.name, at: Date.now()
    });

    fileInput.value = "";
    alert("ফাইল সফলভাবে পাঠানো হয়েছে!");
  } catch (e) { alert("ফাইল আপলোড ব্যর্থ হয়েছে: " + e.message); }
}

// Admin Auth & Management
export function adminLogin() {
  const id = $("adminId").value.trim();
  const pass = $("adminPassword").value;
  if (typeof SHOP_CONFIG !== "undefined" && id === SHOP_CONFIG.demoAdmin.id && pass === SHOP_CONFIG.demoAdmin.password) {
    localStorage.setItem("adminLoggedIn", "true");
    location.href = "admin.html";
  } else {
    alert("Admin ID বা Password ভুল।");
  }
}

export async function loadAdminDashboard() {
  if (localStorage.getItem("adminLoggedIn") !== "true") {
    location.href = "admin-login.html";
    return;
  }

  try {
    const custSnap = await getDocs(collection(db, "customers"));
    const customers = custSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    if ($("customerCount")) $("customerCount").textContent = customers.length;

    if ($("adminCustomers")) {
      $("adminCustomers").innerHTML = customers.map(c => `
        <div class="file-row" style="display:flex; justify-content:space-between; align-items:center; padding:8px; border-bottom:1px solid #eee;">
          <div>
            <strong>${escapeHTML(c.name)}</strong> (${escapeHTML(c.phone)})
            ${c.receiptId ? `<br><small class="muted">🧾 Receipt: ${escapeHTML(c.receiptId)}</small>` : ''}
            ${c.banned ? '<span style="color:red;font-weight:bold;"> [BANNED]</span>' : ''}
          </div>
          <div>
            <button class="btn small" onclick="toggleVip('${escapeHTML(c.phone)}', ${!c.vip})">${c.vip ? "Remove VIP" : "Make VIP"}</button>
            <button class="btn small" onclick="editUser('customers', '${c.id}')">✏️ Edit</button>
            <button class="btn small ${c.banned ? '' : 'danger'}" onclick="toggleBanUser('customers', '${c.id}', ${!!c.banned})">${c.banned ? 'Unban' : 'Ban'}</button>
            <button class="btn danger small" onclick="deleteCustomer('${c.id}')">Delete</button>
          </div>
        </div>
      `).join("") || '<div class="notice">No customers found.</div>';
    }

    const desSnap = await getDocs(collection(db, "designers"));
    const designers = desSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    if ($("designerCount")) $("designerCount").textContent = designers.length;

    if ($("adminDesigners")) {
      $("adminDesigners").innerHTML = designers.map(d => `
        <div class="file-row" style="display:flex; justify-content:space-between; align-items:center; padding:8px; border-bottom:1px solid #eee;">
          <div style="display:flex;align-items:center;gap:10px;">
            ${d.image ? `<img src="${d.image}" style="width:35px;height:35px;border-radius:50%;object-fit:cover;">` : ''}
            <div>
              <strong>${escapeHTML(d.name)}</strong> (${escapeHTML(d.phone)})<br>
              <span class="muted">${escapeHTML(d.speciality || '')}</span>
              ${d.banned ? '<span style="color:red;font-weight:bold;"> [BANNED]</span>' : ''}
            </div>
          </div>
          <div>
            <button class="btn small" onclick="editUser('designers', '${d.id}')">✏️ Edit</button>
            <button class="btn small ${d.banned ? '' : 'danger'}" onclick="toggleBanUser('designers', '${d.id}', ${!!d.banned})">${d.banned ? 'Unban' : 'Ban'}</button>
            <button class="btn danger small" onclick="deleteDesigner('${d.id}')">Delete</button>
          </div>
        </div>
      `).join("") || '<div class="notice">No designers found.</div>';
    }

    const chatSnap = await getDocs(collection(db, "chats"));
    if ($("totalChatsCount")) $("totalChatsCount").textContent = chatSnap.size;

    const chatIds = [...new Set(chatSnap.docs.map(doc => doc.data().chatId).filter(Boolean))];
    if ($("chatSelector")) {
      $("chatSelector").innerHTML = '<option value="">-- চ্যাট বেছে নিন --</option>' +
        chatIds.map(id => `<option value="${id}">Chat ID: ${id}</option>`).join("");
    }

  } catch (e) { console.error("Admin Load Error:", e); }
}

let currentAdminChatUnsub = null;
export function loadSelectedChatHistory() {
  const chatId = $("chatSelector").value;
  const box = $("adminChatMessages");
  if (!chatId || !box) return;

  if (currentAdminChatUnsub) currentAdminChatUnsub();

  const q = query(collection(db, "chats"), where("chatId", "==", chatId));
  currentAdminChatUnsub = onSnapshot(q, (snapshot) => {
    const msgs = snapshot.docs.map(doc => doc.data()).sort((a, b) => (a.at || 0) - (b.at || 0));
    box.innerHTML = msgs.map(m => `
      <div class="message ${m.from === 'admin' ? 'me' : ''}" style="margin:4px 0;padding:6px 10px;border-radius:6px;background:${m.from==='admin'?'#0084ff':(m.from==='designer'?'#e4e6eb':'#dcf8c6')};color:${m.from==='admin'?'#fff':'#000'};width:fit-content;max-width:80%;${m.from==='admin'?'margin-left:auto;':''}">
        <small style="display:block;font-size:10px;opacity:0.8;">[${m.from.toUpperCase()}]</small>
        ${m.fileUrl ? `<a href="${m.fileUrl}" target="_blank" style="color:inherit;font-weight:bold;">📎 ${escapeHTML(m.fileName || 'File')}</a><br>` : ''}
        ${escapeHTML(m.text || '')}
      </div>
    `).join("");
    box.scrollTop = box.scrollHeight;
  });
}

export async function sendAdminReply() {
  const chatId = $("chatSelector").value;
  const input = $("adminReplyInput");
  const text = input ? input.value.trim() : "";

  if (!chatId) return alert("দয়া করে একটি চ্যাট সিলেক্ট করুন।");
  if (!text) return;

  try {
    await addDoc(collection(db, "chats"), { chatId, from: "admin", text, at: Date.now() });
    input.value = "";
  } catch (e) { alert("Error: " + e.message); }
}

export async function sendAdminFile() {
  const chatId = $("chatSelector").value;
  const fileInput = $("adminFile");
  const file = fileInput ? fileInput.files[0] : null;

  if (!chatId) return alert("দয়া করে একটি চ্যাট সিলেক্ট করুন।");
  if (!file) return;

  try {
    alert("ফাইল আপলোড হচ্ছে, অপেক্ষা করুন...");
    const storageRef = ref(storage, `chats/${Date.now()}_${file.name}`);
    await uploadBytes(storageRef, file);
    const fileUrl = await getDownloadURL(storageRef);

    await addDoc(collection(db, "chats"), {
      chatId, from: "admin", text: `📁 ফাইল: ${file.name}`, fileUrl, fileName: file.name, at: Date.now()
    });

    fileInput.value = "";
    alert("ফাইল সফলভাবে পাঠানো হয়েছে!");
  } catch (e) { alert("Error: " + e.message); }
}

export async function deleteSelectedChatHistory() {
  const chatId = $("chatSelector").value;
  if (!chatId) return alert("চ্যাট সিলেক্ট করুন।");
  if (!confirm("এই চ্যাট হিস্ট্রি সম্পূর্ণ মুছে ফেলতে চান?")) return;

  try {
    const q = query(collection(db, "chats"), where("chatId", "==", chatId));
    const snap = await getDocs(q);
    const promises = snap.docs.map(d => deleteDoc(doc(db, "chats", d.id)));
    await Promise.all(promises);
    alert("চ্যাট মুছে ফেলা হয়েছে!");
    loadAdminDashboard();
  } catch (e) { alert("Error: " + e.message); }
}

export async function addDesigner() {
  const name = $("desName").value.trim();
  const phone = $("desPhone").value.trim();
  const pass = $("desPass") ? $("desPass").value.trim() : "";
  const speciality = $("desSpec") ? $("desSpec").value.trim() : "";
  const image = $("desImage") ? $("desImage").value.trim() : "";
  const driveUrl = $("desDriveUrl") ? $("desDriveUrl").value.trim() : "";

  if (!name || !phone || !pass) return alert("নাম, ফোন নম্বর এবং পাসওয়ার্ড প্রদান করুন।");

  try {
    await ensureFirebaseUser();
    await addDoc(collection(db, "designers"), { 
      name, phone, pass, speciality, image, driveUrl, createdAt: Date.now() 
    });
    alert("ডিজাইনার যুক্ত করা হয়েছে!");
    if ($("desName")) $("desName").value = "";
    if ($("desPhone")) $("desPhone").value = "";
    if ($("desPass")) $("desPass").value = "";
    if ($("desSpec")) $("desSpec").value = "";
    if ($("desImage")) $("desImage").value = "";
    if ($("desDriveUrl")) $("desDriveUrl").value = "";
    loadAdminDashboard();
  } catch (e) { alert("Error: " + e.message); }
}

export async function deleteDesigner(id) {
  if (!confirm("ডিজাইনারটি মুছতে চান?")) return;
  try {
    await deleteDoc(doc(db, "designers", id));
    loadAdminDashboard();
  } catch (e) { alert("Error: " + e.message); }
}

export async function deleteCustomer(id) {
  if (!confirm("কাস্টমারটি মুছতে চান?")) return;
  try {
    await deleteDoc(doc(db, "customers", id));
    loadAdminDashboard();
  } catch (e) { alert("Error: " + e.message); }
}

export async function toggleVip(phone, makeVip) {
  try {
    await setDoc(doc(db, "customers", phone), { vip: makeVip }, { merge: true });
    if ($("adminCustomers")) {
      loadAdminDashboard();
    } else if ($("designerCustomers")) {
      loadDesignerDashboard();
    }
  } catch (e) { alert("Error: " + e.message); }
}

export async function toggleBanUser(coll, id, currentBanState) {
  try {
    await setDoc(doc(db, coll, id), { banned: !currentBanState }, { merge: true });
    alert(currentBanState ? "Unbanned!" : "Banned!");
    loadAdminDashboard();
  } catch (e) { alert("Error: " + e.message); }
}

export async function editUser(coll, id) {
  const newName = prompt("নতুন নাম দিন:");
  const newPhone = prompt("নতুন ফোন নম্বর দিন:");
  if (!newName || !newPhone) return;

  try {
    await setDoc(doc(db, coll, id), { name: newName, phone: newPhone }, { merge: true });
    alert("তথ্য পরিবর্তন হয়েছে!");
    loadAdminDashboard();
  } catch (e) { alert("Error: " + e.message); }
}

export async function sendNotice() {
  const target = $("noticeTarget") ? $("noticeTarget").value : "all";
  const textInput = $("noticeText");
  const text = textInput ? textInput.value.trim() : "";
  if (!text) return alert("নোটিশ লিখুন।");

  try {
    await addDoc(collection(db, "notices"), { target, text, at: Date.now() });
    alert("নোটিশ সফলভাবে পাঠানো হয়েছে!");
    if (textInput) textInput.value = "";
  } catch (e) { alert("Error: " + e.message); }
}

export async function updateThemeColor() {
  const colorInput = $("themeColor");
  const color = colorInput ? colorInput.value : "";
  if (!color) return;

  document.documentElement.style.setProperty('--primary-color', color);
  document.documentElement.style.setProperty('--main-bg', color);
  document.documentElement.style.setProperty('--theme-color', color);
  localStorage.setItem("themeColor", color);
  alert("থিম কালার সফলভাবে পরিবর্তন করা হয়েছে!");
}

export async function clearOldData() {
  if (!confirm("৩০ দিনের বেশি পুরনো সব চ্যাট মুছে ফেলতে চান?")) return;
  try {
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    const q = query(collection(db, "chats"), where("at", "<", thirtyDaysAgo));
    const snap = await getDocs(q);
    const deletePromises = snap.docs.map(d => deleteDoc(d.ref));
    await Promise.all(deletePromises);
    alert("পুরানো ডাটা সফলভাবে মুছে ফেলা হয়েছে!");
  } catch (e) { alert("Error: " + e.message); }
}

export function logout() {
  localStorage.clear();
  location.href = "index.html";
}

// Global Aliases
export const sendDemoMessage = sendMessage;
export const sendDemoFile = sendFile;

// WINDOW BINDINGS
window.customerLogin = customerLogin;
window.registerCustomer = registerCustomer;
window.loadCustomerDashboard = loadCustomerDashboard;
window.renderDesigners = renderDesigners;
window.openChatAsCustomer = openChatAsCustomer;
window.designerLogin = designerLogin;
window.togglePinCustomer = togglePinCustomer;
window.loadDesignerDashboard = loadDesignerDashboard;
window.openChatAsDesigner = openChatAsDesigner;
window.loadChat = loadChat;
window.sendMessage = sendMessage;
window.sendFile = sendFile;
window.sendDemoMessage = sendDemoMessage;
window.sendDemoFile = sendDemoFile;
window.adminLogin = adminLogin;
window.loadAdminDashboard = loadAdminDashboard;
window.loadSelectedChatHistory = loadSelectedChatHistory;
window.sendAdminReply = sendAdminReply;
window.sendAdminFile = sendAdminFile;
window.deleteSelectedChatHistory = deleteSelectedChatHistory;
window.addDesigner = addDesigner;
window.deleteDesigner = deleteDesigner;
window.deleteCustomer = deleteCustomer;
window.toggleVip = toggleVip;
window.toggleBanUser = toggleBanUser;
window.editUser = editUser;
window.sendNotice = sendNotice;
window.updateThemeColor = updateThemeColor;
window.clearOldData = clearOldData;
window.logout = logout;

// Auth Observer
onAuthStateChanged(auth, (user) => {
  if (user && user.phoneNumber) {
    localStorage.setItem("currentCustomer", user.phoneNumber.replace("+88", ""));
  }
});
