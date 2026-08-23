import { db, auth, storage, ensureFirebaseUser } from "./firebase-config.js";
import { doc, getDoc, setDoc, collection, addDoc, query, where, onSnapshot, orderBy, getDocs, deleteDoc } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-storage.js";

const $ = id => document.getElementById(id);

function applyBranding(){
  if(typeof SHOP_CONFIG !== "undefined"){
    document.querySelectorAll("#shopName").forEach(x=>x.textContent=SHOP_CONFIG.shopName);
    const link=$("emergencyLink");
    if(link){ link.textContent=SHOP_CONFIG.emergencyNumber; link.href="tel:"+SHOP_CONFIG.emergencyNumber; }
  }
}
document.addEventListener("DOMContentLoaded", applyBranding);

// Customer Auth
window.customerLogin = async function(){
  const phone=$("phone").value.trim(), receipt=$("receiptId")?$("receiptId").value.trim():"";
  if(!phone) return alert("ফোন নম্বর দিন।");
  
  try {
    const snap = await getDoc(doc(db, "customers", phone));
    if(!snap.exists()){
      location.href=`register.html?phone=${encodeURIComponent(phone)}&receipt=${encodeURIComponent(receipt)}`;
      return;
    }
    localStorage.setItem("currentCustomer", phone);
    location.href="customer.html";
  } catch(e) { alert("Error: " + e.message); }
};

window.registerCustomer = async function(){
  const name=$("name").value.trim(), phone=$("phone").value.trim(), receipt=$("receiptId")?$("receiptId").value.trim():"";
  if(!name||!phone) return alert("সব তথ্য পূরণ করুন।");
  
  try {
    await ensureFirebaseUser();
    await setDoc(doc(db, "customers", phone), {
      name, phone, receiptId: receipt, vip: false,
      vipRequested: $("vipRequest")?$("vipRequest").checked:false, createdAt: Date.now()
    });
    localStorage.setItem("currentCustomer", phone);
    alert("Account তৈরি হয়েছে।");
    location.href="customer.html";
  } catch(e) { alert("Error: " + e.message); }
};

window.loadCustomerDashboard = async function(){
  const phone = localStorage.getItem("currentCustomer");
  if(!phone){ location.href="index.html"; return; }
  
  try {
    const snap = await getDoc(doc(db, "customers", phone));
    if(!snap.exists()){ location.href="index.html"; return; }
    const c = snap.data();
    if($("customerName")) $("customerName").textContent=c.name;
    if($("customerPhone")) $("customerPhone").textContent=c.phone;
    if($("vipStatus")) $("vipStatus").textContent=c.vip ? "⭐ VIP" : "NON-VIP";
  } catch(e) { console.error(e); }
};

// Designers List for Customer
window.renderDesigners = async function(){
  const box=$("designerList"); if(!box) return;
  try {
    const snap = await getDocs(collection(db, "designers"));
    const designers = snap.docs.map(doc => ({id: doc.id, ...doc.data()}));
    
    if(!designers.length){
      box.innerHTML = '<div class="notice">কোনো ডিজাইনার পাওয়া যায়নি।</div>';
      return;
    }

    box.innerHTML=designers.map(d=>`
      <div class="designer" style="display:flex; justify-content:space-between; align-items:center; padding:10px; border-bottom:1px solid #ddd;">
        <div><strong>${escapeHTML(d.name)}</strong><br><span class="muted">📱 ${escapeHTML(d.phone)}</span><br><span class="muted">${escapeHTML(d.speciality||"")}</span></div>
        <button class="btn primary" style="width:auto" onclick="openChatAsCustomer('${d.id}', '${escapeHTML(d.name)}')">Chat</button>
      </div>`).join("");
  } catch(e) { console.error(e); }
};

window.openChatAsCustomer = function(id, name){
  localStorage.setItem("selectedDesigner", JSON.stringify({id, name}));
  localStorage.removeItem("activeChatCustomer");
  location.href="chat.html";
};

// Designer Auth & Dashboard
window.designerLogin = async function(){
  const phone = $("designerPhone").value.trim();
  if(!phone) return alert("ফোন নম্বর দিন।");

  try {
    await ensureFirebaseUser();
    const q = query(collection(db, "designers"), where("phone", "==", phone));
    const snap = await getDocs(q);
    
    if(snap.empty){
      return alert("এই নম্বরে কোনো ডিজাইনার অ্যাকাউন্ট পাওয়া যায়নি।");
    }
    
    const docSnap = snap.docs[0];
    const designer = { id: docSnap.id, ...docSnap.data() };
    localStorage.setItem("currentDesigner", JSON.stringify(designer));
    localStorage.removeItem("currentCustomer");
    alert("লগইন সফল হয়েছে!");
    location.href = "designer.html";
  } catch(e) { 
    alert("Error: " + e.message); 
  }
};

window.loadDesignerDashboard = async function(){
  const designer = JSON.parse(localStorage.getItem("currentDesigner") || "null");
  if(!designer){ 
    location.href = "designer-login.html"; 
    return; 
  }

  if($("designerName")) $("designerName").textContent = designer.name;
  if($("designerPhoneView")) $("designerPhoneView").textContent = designer.phone;

  try {
    const custSnap = await getDocs(collection(db, "customers"));
    const customers = custSnap.docs.map(doc => doc.data());

    if($("designerCustomers")){
      $("designerCustomers").innerHTML = customers.map(c => `
        <div class="file-row" style="display:flex; justify-content:space-between; align-items:center; padding:10px; border-bottom:1px solid #ddd;">
          <div>
            <strong>${escapeHTML(c.name)}</strong><br>
            <span class="muted">📱 ${escapeHTML(c.phone)}</span>
          </div>
          <button class="btn primary" style="width:auto" onclick="openChatAsDesigner('${escapeHTML(c.phone)}', '${escapeHTML(c.name)}')">Chat</button>
        </div>
      `).join("") || '<div class="notice">কোনো কাস্টমার পাওয়া যায়নি।</div>';
    }
  } catch(e) { console.error(e); }
};

window.openChatAsDesigner = function(phone, name){
  localStorage.setItem("activeChatCustomer", JSON.stringify({ phone, name }));
  localStorage.removeItem("selectedDesigner");
  location.href = "chat.html";
};

// Chat & File Handling
window.loadChat = function(){
  const customerPhone = localStorage.getItem("currentCustomer");
  const selectedDesigner = JSON.parse(localStorage.getItem("selectedDesigner") || "null");
  const currentDesigner = JSON.parse(localStorage.getItem("currentDesigner") || "null");
  const activeCustomer = JSON.parse(localStorage.getItem("activeChatCustomer") || "null");

  let chatId, displayName;

  if (customerPhone && selectedDesigner) {
    chatId = `${customerPhone}_${selectedDesigner.id}`;
    displayName = selectedDesigner.name;
  } else if (currentDesigner && activeCustomer) {
    chatId = `${activeCustomer.phone}_${currentDesigner.id}`;
    displayName = activeCustomer.name;
  } else {
    alert("চ্যাট তথ্য পাওয়া যায়নি।");
    location.href = "index.html";
    return;
  }

  if($("chatDesigner")) $("chatDesigner").textContent = displayName;

  const q = query(collection(db, "chats"), where("chatId", "==", chatId), orderBy("at", "asc"));
  onSnapshot(q, (snapshot) => {
    const msgs = snapshot.docs.map(doc => doc.data());
    renderMessages(msgs);
  });
};

function renderMessages(msgs){
  const box = $("chatMessages");
  if(!box) return;
  const isCustomerLoggedIn = !!localStorage.getItem("currentCustomer");
  
  box.innerHTML = msgs.map(m => {
    const isMe = isCustomerLoggedIn ? (m.from === "customer") : (m.from === "designer");
    let content = escapeHTML(m.text);
    
    if(m.fileUrl){
      content += `<br><a href="${m.fileUrl}" target="_blank" download style="color: #007bff; text-decoration: underline; font-weight: bold; display:inline-block; margin-top:5px;">📥 ডাউনলোড করুন: ${escapeHTML(m.fileName || 'File')}</a>`;
    }
    
    return `<div class="message ${isMe ? "me" : ""}" style="margin: 5px 0; padding: 8px 12px; border-radius: 8px; background: ${isMe ? '#dcf8c6' : '#fff'}; width: fit-content; max-width: 70%; ${isMe ? 'margin-left: auto;' : ''}">${content}</div>`;
  }).join("");
  box.scrollTop = box.scrollHeight;
}

window.sendDemoMessage = async function(){
  const input = $("messageInput"), text = input.value.trim(); 
  if(!text) return;

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
    await addDoc(collection(db, "chats"), {
      chatId: chatId,
      from: sender,
      text: text,
      at: Date.now()
    });
    input.value = "";
  } catch(e) { alert("Error: " + e.message); }
};

window.sendDemoFile = async function(){
  const fileInput = $("demoFile");
  if(!fileInput || !fileInput.files[0]) return alert("দয়া করে একটি ফাইল সিলেক্ট করুন।");
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
      chatId: chatId,
      from: sender,
      text: `📁 ফাইল প্রেরিত হয়েছে: ${file.name}`,
      fileUrl: fileUrl,
      fileName: file.name,
      at: Date.now()
    });

    fileInput.value = "";
    alert("ফাইল সফলভাবে পাঠানো হয়েছে!");
  } catch(e) { 
    alert("ফাইল আপলোড ব্যর্থ হয়েছে: " + e.message); 
  }
};

// Admin Section
window.adminLogin = function(){
  const id = $("adminId").value.trim();
  const pass = $("adminPassword").value;
  if(typeof SHOP_CONFIG !== "undefined" && id === SHOP_CONFIG.demoAdmin.id && pass === SHOP_CONFIG.demoAdmin.password){
    localStorage.setItem("adminLoggedIn","true");
    location.href = "admin.html";
  } else {
    alert("Admin ID বা Password ভুল।");
  }
};

window.loadAdminDashboard = async function(){
  if(localStorage.getItem("adminLoggedIn") !== "true"){
    location.href = "admin-login.html";
    return;
  }
  try {
    const custSnap = await getDocs(collection(db, "customers"));
    const customers = custSnap.docs.map(doc => doc.data());
    
    const desSnap = await getDocs(collection(db, "designers"));
    const designers = desSnap.docs.map(doc => ({id: doc.id, ...doc.data()}));

    if($("customerCount")) $("customerCount").textContent = customers.length;
    if($("designerCount")) $("designerCount").textContent = designers.length;

    if($("adminCustomers")){
      $("adminCustomers").innerHTML = customers.map(c => `
        <div class="file-row" style="display:flex; justify-content:space-between; align-items:center; padding:8px; border-bottom:1px solid #eee;">
          <div><strong>${escapeHTML(c.name)}</strong> (${escapeHTML(c.phone)})</div>
          <div>
            <button class="btn" onclick="toggleVip('${escapeHTML(c.phone)}', ${!c.vip})">${c.vip ? "Remove VIP" : "Make VIP"}</button>
            <button class="btn danger" onclick="deleteCustomer('${escapeHTML(c.phone)}')">Delete</button>
          </div>
        </div>
      `).join("") || '<div class="notice">No customers found.</div>';
    }

    if($("adminDesigners")){
      $("adminDesigners").innerHTML = designers.map(d => `
        <div class="file-row" style="display:flex; justify-content:space-between; align-items:center; padding:8px; border-bottom:1px solid #eee;">
          <div><strong>${escapeHTML(d.name)}</strong> (${escapeHTML(d.phone)})<br><span class="muted">${escapeHTML(d.speciality||"")}</span></div>
          <button class="btn danger" onclick="deleteDesigner('${d.id}')">Delete</button>
        </div>
      `).join("") || '<div class="notice">No designers added yet.</div>';
    }
  } catch(e) { console.error(e); }
};

window.addDesigner = async function(){
  const name = $("desName").value.trim();
  const phone = $("desPhone").value.trim();
  const speciality = $("desSpec").value.trim();

  if(!name || !phone) return alert("নাম এবং ফোন নম্বর দিন।");

  try {
    await ensureFirebaseUser();
    await addDoc(collection(db, "designers"), { 
      name, 
      phone, 
      speciality, 
      createdAt: Date.now() 
    });
    alert("ডিজাইনার যুক্ত করা হয়েছে!");
    $("desName").value = ""; $("desPhone").value = ""; $("desSpec").value = "";
    window.loadAdminDashboard();
  } catch(e) { alert("Error: " + e.message); }
};

window.deleteDesigner = async function(id){
  if(!confirm("ডিজাইনারটি মুছতে চান?")) return;
  try {
    await deleteDoc(doc(db, "designers", id));
    window.loadAdminDashboard();
  } catch(e) { alert("Error: " + e.message); }
};

window.deleteCustomer = async function(phone){
  if(!confirm("কাস্টমারটি মুছতে চান?")) return;
  try {
    await deleteDoc(doc(db, "customers", phone));
    window.loadAdminDashboard();
  } catch(e) { alert("Error: " + e.message); }
};

window.toggleVip = async function(phone, makeVip){
  try {
    await setDoc(doc(db, "customers", phone), { vip: makeVip }, { merge: true });
    window.loadAdminDashboard();
  } catch(e) { alert("Error: " + e.message); }
};

window.logout = function(){
  localStorage.clear();
  location.href="index.html";
};

function escapeHTML(str){return String(str??"").replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;","\"":"&quot;"}[c]));}
