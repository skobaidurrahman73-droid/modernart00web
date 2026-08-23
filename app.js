import { db, auth, storage, ensureFirebaseUser } from "firebase-config.js";
import { doc, getDoc, setDoc, collection, addDoc, query, where, onSnapshot, orderBy } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
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

window.customerLogin = async function(){
  const phone=$("phone").value.trim(), receipt=$("receiptId").value.trim();
  if(!phone || !receipt) return alert("ফোন নম্বর এবং Receipt ID দিন।");
  
  const snap = await getDoc(doc(db, "customers", phone));
  if(!snap.exists()){
    location.href=`register.html?phone=${encodeURIComponent(phone)}&receipt=${encodeURIComponent(receipt)}`;
    return;
  }
  localStorage.setItem("currentCustomer", phone);
  location.href="customer.html";
};

window.registerCustomer = async function(){
  const name=$("name").value.trim(), phone=$("phone").value.trim(), receipt=$("receiptId").value.trim();
  if(!name||!phone||!receipt) return alert("সব তথ্য পূরণ করুন।");
  
  await ensureFirebaseUser();
  await setDoc(doc(db, "customers", phone), {
    name, phone, receiptId: receipt, vip: false,
    vipRequested: $("vipRequest").checked, createdAt: Date.now()
  });
  localStorage.setItem("currentCustomer", phone);
  alert("Account তৈরি হয়েছে।");
  location.href="customer.html";
};

window.loadCustomerDashboard = async function(){
  const phone = localStorage.getItem("currentCustomer");
  if(!phone){ location.href="index.html"; return; }
  
  const snap = await getDoc(doc(db, "customers", phone));
  if(!snap.exists()){ location.href="index.html"; return; }
  const c = snap.data();
  
  if($("customerName")) $("customerName").textContent=c.name;
  if($("customerPhone")) $("customerPhone").textContent=c.phone;
  if($("vipStatus")) $("vipStatus").textContent=c.vip ? "⭐ VIP" : "NON-VIP";
};

window.renderDesigners = function(){
  const box=$("designerList"); if(!box || typeof SHOP_CONFIG === "undefined") return;
  box.innerHTML=SHOP_CONFIG.designers.map(d=>`
    <div class="designer">
      <div class="designer-info">
        <div class="avatar">${escapeHTML(d.name[0]||"D")}</div>
        <div><strong>${escapeHTML(d.name)}</strong><br>
        <span class="muted">📱 ${escapeHTML(d.phone)}</span><br>
        <span class="muted">${escapeHTML(d.speciality)}</span></div>
      </div>
      <button class="btn primary" style="width:auto" onclick="openChat('${d.id}')">Chat</button>
    </div>`).join("");
};

window.openChat = function(id){
  const d=SHOP_CONFIG.designers.find(x=>x.id===id);
  if(!d)return;
  localStorage.setItem("selectedDesigner",JSON.stringify(d));
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
  
  await addDoc(collection(db, "chats"), {
    chatId: `${phone}_${d.id}`,
    from: "customer",
    text: text,
    at: Date.now()
  });
  input.value="";
};

window.sendDemoFile = async function(){
  const file=$("demoFile").files[0]; if(!file)return alert("একটি File নির্বাচন করুন।");
  const seconds=Number($("fileDuration").value);
  const phone = localStorage.getItem("currentCustomer");
  
  const storageRef = ref(storage, `files/${Date.now()}_${file.name}`);
  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);
  
  await addDoc(collection(db, "files"), {
    name: file.name,
    url: url,
    customerPhone: phone,
    expiresAt: Date.now() + seconds*1000
  });
  alert("File Upload সফল হয়েছে।");
  $("demoFile").value="";
};

window.renderFiles = function(){
  const phone = localStorage.getItem("currentCustomer");
  const q = query(collection(db, "files"), where("customerPhone", "==", phone));
  onSnapshot(q, (snapshot) => {
    const files = snapshot.docs.map(doc => doc.data()).filter(f => f.expiresAt > Date.now());
    const box=$("fileList"); if(!box)return;
    if(!files.length){box.innerHTML='<div class="notice">এখন কোনো Active File নেই।</div>';return;}
    box.innerHTML=files.map(f=>`<div class="file-row"><div><strong>📄 ${escapeHTML(f.name)}</strong><br><span class="muted">Expires: ${new Date(f.expiresAt).toLocaleString()}</span></div><a class="btn" href="${f.url}" target="_blank" download>Download</a></div>`).join("");
  });
};

window.logout = function(){
  localStorage.clear();
  location.href="index.html";
};

function escapeHTML(str){return String(str??"").replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;","\"":"&quot;"}[c]));}
