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

// Designers & Chat
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
      <div class="designer">
        <div class="designer-info">
          <div class="avatar">${escapeHTML(d.name[0]||"D")}</div>
          <div><strong>${escapeHTML(d.name)}</strong><br>
          <span class="muted">📱 ${escapeHTML(d.phone)}</span><br>
          <span class="muted">${escapeHTML(d.speciality||"")}</span></div>
        </div>
        <button class="btn primary" style="width:auto" onclick="openChat('${d.id}', '${escapeHTML(d.name)}')">Chat</button>
      </div>`).join("");
  } catch(e) { console.error(e); }
};

window.openChat = function(id, name){
  localStorage.setItem("selectedDesigner", JSON.stringify({id, name}));
  location.href="chat.html";
};

window.loadChat = function(){
  const d=JSON.parse(localStorage.getItem("selectedDesigner")||"null"); if(!d)return;
  if($("chatDesigner")) $("chatDesigner").textContent=d.name;
  const phone = localStorage.getItem("currentCustomer");
  
  const q = query(collection(db, "chats"), where("chatId", "==", `${phone}_${d.id}`), orderBy("at", "asc"));
  onSnapshot(q, (snapshot) => {
    const msgs = snapshot.docs.map(doc => doc.data());
    renderMessages(msgs);
  });
};

function renderMessages(msgs){
  if(!$("chatMessages")) return;
  $("chatMessages").innerHTML=msgs.map(m=>`<div class="message ${m.from==="customer"?"me":""}">${escapeHTML(m.text)}</div>`).join("");
  $("chatMessages").scrollTop=$("chatMessages").scrollHeight;
}

window.sendDemoMessage = async function(){
  const input=$("messageInput"), text=input.value.trim(); if(!text)return;
  const d=JSON.parse(localStorage.getItem("selectedDesigner")||"null"); if(!d)return;
  const phone = localStorage.getItem("currentCustomer");
  
  try {
    await addDoc(collection(db, "chats"), {
      chatId: `${phone}_${d.id}`,
      from: "customer",
      text: text,
      at: Date.now()
    });
    input.value="";
  } catch(e) { alert("Error: " + e.message); }
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
        <div class="file-row">
          <div>
            <strong>${escapeHTML(c.name)}</strong> (${escapeHTML(c.phone)})<br>
            <span class="muted">${c.vip ? "⭐ VIP" : "Non-VIP"} ${c.vipRequested ? "· (VIP Requested)" : ""}</span>
          </div>
          <div>
            <button class="btn" onclick="toggleVip('${escapeHTML(c.phone)}', ${!c.vip})">${c.vip ? "Remove VIP" : "Make VIP"}</button>
            <button class="btn danger" onclick="deleteCustomer('${escapeHTML(c.phone)}')">Delete</button>
          </div>
        </div>
      `).join("") || '<div class="notice">No customers found.</div>';
    }

    if($("adminDesigners")){
      $("adminDesigners").innerHTML = designers.map(d => `
        <div class="file-row">
          <div>
            <strong>${escapeHTML(d.name)}</strong> (${escapeHTML(d.phone)})<br>
            <span class="muted">${escapeHTML(d.speciality||"")}</span>
          </div>
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
    await addDoc(collection(db, "designers"), { name, phone, speciality, createdAt: Date.now() });
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

document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("addDesignerBtn");
  if (btn) {
    btn.addEventListener("click", () => window.addDesigner());
  }
});
function escapeHTML(str){return String(str??"").replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;","\"":"&quot;"}[c]));}
// এডমিন থেকে ডিজাইনার যুক্ত করার ফাংশন
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

// ডিজাইনার লগইন ফাংশন
window.designerLogin = async function(){
  const phone = $("designerPhone").value.trim();
  if(!phone) return alert("ফোন নম্বর দিন।");

  try {
    await ensureFirebaseUser();
    const q = query(collection(db, "designers"), where("phone", "==", phone));
    const snap = await getDocs(q);
    
    if(snap.empty){
      return alert("এই নম্বরে কোনো ডিজাইনার অ্যাকাউন্ট পাওয়া যায়নি। সঠিক নম্বর দিন।");
    }
    
    const docSnap = snap.docs[0];
    const designer = { id: docSnap.id, ...docSnap.data() };
    localStorage.setItem("currentDesigner", JSON.stringify(designer));
    alert("লগইন সফল হয়েছে!");
    location.href = "chat.html";
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
        <div class="file-row">
          <div>
            <strong>${escapeHTML(c.name)}</strong><br>
            <span class="muted">📱 ${escapeHTML(c.phone)}</span>
          </div>
          <button class="btn primary" style="width:auto" onclick="openChat('${designer.id}', '${escapeHTML(designer.name)}')">Chat</button>
        </div>
      `).join("") || '<div class="notice">কোনো কাস্টমার পাওয়া যায়নি।</div>';
    }
  } catch(e) { console.error(e); }
};
