// Modern Art & Press - Demo application logic
// এটি Firebase ছাড়া UI/Flow বোঝার জন্য। Production-এ এই logic নিরাপদ backend/Firebase দিয়ে বদলাতে হবে.

const $ = id => document.getElementById(id);
const getJSON = (k, fallback) => { try { return JSON.parse(localStorage.getItem(k)) ?? fallback; } catch(e){ return fallback; } };
const setJSON = (k,v) => localStorage.setItem(k, JSON.stringify(v));

function applyBranding(){
  document.querySelectorAll("#shopName").forEach(x=>x.textContent=SHOP_CONFIG.shopName);
  document.querySelectorAll("#welcomeTitle").forEach(x=>x.textContent=SHOP_CONFIG.shopName);
  const link=$("emergencyLink");
  if(link){ link.textContent=SHOP_CONFIG.emergencyNumber; link.href="tel:"+SHOP_CONFIG.emergencyNumber; }
}
document.addEventListener("DOMContentLoaded", applyBranding);

function customerLogin(){
  const phone=$("phone").value.trim(), receipt=$("receiptId").value.trim();
  if(!phone || !receipt) return alert("ফোন নম্বর এবং Receipt ID দিন।");
  const customers=getJSON("map_customers", {});
  if(!customers[phone]){
    location.href=`register.html?phone=${encodeURIComponent(phone)}&receipt=${encodeURIComponent(receipt)}`;
    return;
  }
  localStorage.setItem("currentCustomer", phone);
  location.href="customer.html";
}

function registerCustomer(){
  const name=$("name").value.trim(), phone=$("phone").value.trim(), receipt=$("receiptId").value.trim();
  if(!name||!phone||!receipt) return alert("সব তথ্য পূরণ করুন।");
  const customers=getJSON("map_customers",{});
  const now=Date.now();
  customers[phone]={name,phone,receiptId:receipt,vip:false,vipRequested:$("vipRequest").checked,createdAt:now,expiresAt:now+SHOP_CONFIG.nonVipHours*3600000};
  setJSON("map_customers",customers);
  localStorage.setItem("currentCustomer",phone);
  alert("Account তৈরি হয়েছে। VIP Request থাকলে Admin অনুমোদন করবেন।");
  location.href="customer.html";
}

function loadCustomerDashboard(){
  const phone=localStorage.getItem("currentCustomer"), customers=getJSON("map_customers",{});
  const c=customers[phone];
  if(!c){ location.href="index.html"; return; }
  $("customerName").textContent=c.name;
  $("customerPhone").textContent=c.phone;
  $("vipStatus").textContent=c.vip ? "⭐ VIP" : "NON-VIP";
  const notice=getJSON("site_notice",null);
  if(notice && $("noticeBox")) $("noticeBox").innerHTML=`<strong>${escapeHTML(notice.title)}</strong><br>${escapeHTML(notice.message)}`;
}

function renderDesigners(){
  const box=$("designerList"); if(!box)return;
  box.innerHTML=SHOP_CONFIG.designers.map(d=>`
    <div class="designer">
      <div class="designer-info">
        <div class="avatar">${escapeHTML(d.name[0]||"D")}</div>
        <div><strong>${escapeHTML(d.name)}</strong><br>
        <span class="muted">📱 ${escapeHTML(d.phone)}</span><br>
        <span class="muted">${escapeHTML(d.speciality)}</span><br>
        <span class="status ${d.status==="available"?"available":"busy"}">${d.status==="available"?"🟢 Available":"🔴 Busy"}</span></div>
      </div>
      <button class="btn primary" style="width:auto" onclick="openChat('${d.id}')">Chat</button>
    </div>`).join("");
}

function openChat(id){
  const d=SHOP_CONFIG.designers.find(x=>x.id===id);
  if(!d)return;
  localStorage.setItem("selectedDesigner",JSON.stringify(d));
  location.href="chat.html";
}

function loadChat(){
  const d=getJSON("selectedDesigner",null); if(!d)return;
  $("chatDesigner").textContent=d.name;
  const key="demo_messages_"+d.id;
  const msgs=getJSON(key,[
    {from:"designer",text:`আসসালামু আলাইকুম। আমি ${d.name}। কী ডিজাইন লাগবে?`}
  ]);
  renderMessages(msgs);
}

function renderMessages(msgs){
  $("chatMessages").innerHTML=msgs.map(m=>`<div class="message ${m.from==="customer"?"me":""}">${escapeHTML(m.text)}</div>`).join("");
  $("chatMessages").scrollTop=$("chatMessages").scrollHeight;
}

function sendDemoMessage(){
  const input=$("messageInput"), text=input.value.trim(); if(!text)return;
  const d=getJSON("selectedDesigner",null); if(!d)return;
  const key="demo_messages_"+d.id, msgs=getJSON(key,[]);
  msgs.push({from:"customer",text,at:Date.now()}); setJSON(key,msgs); input.value=""; renderMessages(msgs);
}

function sendDemoFile(){
  const file=$("demoFile").files[0]; if(!file)return alert("একটি File নির্বাচন করুন।");
  const seconds=Number($("fileDuration").value);
  const files=getJSON("demo_files",[]);
  files.push({name:file.name,size:file.size,expiresAt:Date.now()+seconds*1000,designer:getJSON("selectedDesigner",{}).name||"Designer"});
  setJSON("demo_files",files);
  alert("Demo-তে File record করা হয়েছে। আসল ভার্সনে Firebase Storage-এ Upload হবে।");
  $("demoFile").value="";
}

function renderFiles(){
  const box=$("fileList"); if(!box)return;
  const files=getJSON("demo_files",[]).filter(f=>f.expiresAt>Date.now());
  if(!files.length){box.innerHTML='<div class="notice">এখন কোনো Active File নেই।</div>';return;}
  box.innerHTML=files.map(f=>`<div class="file-row"><div><strong>📄 ${escapeHTML(f.name)}</strong><br><span class="muted">Designer: ${escapeHTML(f.designer)} · Expires: ${new Date(f.expiresAt).toLocaleString()}</span></div><button class="btn" onclick="alert('Demo download: Firebase যুক্ত হলে আসল File download হবে.')">Download</button></div>`).join("");
}

function designerLogin(){
  const phone=$("designerPhone").value.trim();
  const d=SHOP_CONFIG.designers.find(x=>x.phone===phone);
  if(!d)return alert("Designer পাওয়া যায়নি। config.js-এ Designer-এর phone ঠিক করুন।");
  localStorage.setItem("currentDesigner",JSON.stringify(d)); location.href="designer.html";
}

function loadDesignerDashboard(){
  const d=getJSON("currentDesigner",null); if(!d){location.href="designer-login.html";return;}
  $("designerName").textContent=d.name; $("designerPhoneView").textContent=d.phone;
  $("designerCustomers").innerHTML='<div class="notice">Demo Customer List: Production version-এ Firestore থেকে Customers আসবে।</div>';
}

function adminLogin(){
  const id=$("adminId").value.trim(), pass=$("adminPassword").value;
  if(id===SHOP_CONFIG.demoAdmin.id && pass===SHOP_CONFIG.demoAdmin.password){
    localStorage.setItem("adminLoggedIn","true"); location.href="admin.html";
  }else alert("Admin ID বা Password ভুল।");
}

function loadAdminDashboard(){
  if(localStorage.getItem("adminLoggedIn")!=="true"){location.href="admin-login.html";return;}
  const customers=getJSON("map_customers",{});
  $("customerCount").textContent=Object.keys(customers).length;
  $("designerCount").textContent=SHOP_CONFIG.designers.length;
  let chatCount=0; SHOP_CONFIG.designers.forEach(d=>chatCount+=getJSON("demo_messages_"+d.id,[]).length);
  $("chatCount").textContent=chatCount;
  $("fileCount").textContent=getJSON("demo_files",[]).length;
  $("adminCustomers").innerHTML=Object.values(customers).map(c=>`<div class="file-row"><div><strong>${escapeHTML(c.name)}</strong><br><span class="muted">${escapeHTML(c.phone)} · ${c.vip?"⭐ VIP":"Non-VIP"} · ${c.vipRequested?"VIP Requested":""}</span></div><button class="btn" onclick="toggleVip('${escapeHTML(c.phone)}')">${c.vip?"Remove VIP":"Make VIP"}</button></div>`).join("")||'<div class="notice">No customers yet.</div>';
  $("adminDesigners").innerHTML=SHOP_CONFIG.designers.map(d=>`<div class="file-row"><div><strong>${escapeHTML(d.name)}</strong><br><span class="muted">${escapeHTML(d.phone)} · ${escapeHTML(d.status)}</span></div></div>`).join("");
  const s=getJSON("admin_settings",{autoChatDelete:true,chatRetention:24,fileDelivery:true});
  $("autoChatDelete").checked=s.autoChatDelete;$("chatRetention").value=s.chatRetention;$("fileDelivery").checked=s.fileDelivery;
}

function toggleVip(phone){
  const customers=getJSON("map_customers",{}); if(!customers[phone])return;
  customers[phone].vip=!customers[phone].vip;
  if(customers[phone].vip) customers[phone].vipExpiresAt=null;
  setJSON("map_customers",customers); loadAdminDashboard();
}

function saveAdminSettings(){
  setJSON("admin_settings",{autoChatDelete:$("autoChatDelete").checked,chatRetention:Number($("chatRetention").value),fileDelivery:$("fileDelivery").checked});
  alert("Demo settings saved.");
}

function publishNotice(){
  const message=$("noticeText").value.trim(); if(!message)return;
  setJSON("site_notice",{title:"Modern Art & Press Notice",message,createdAt:Date.now()});
  $("noticeText").value=""; alert("Notice published."); 
}

function showDemoNotice(){ alert("Production version-এ এই জায়গায় Recent Chats দেখানো হবে।"); }

function logout(){
  ["currentCustomer","currentDesigner","adminLoggedIn","selectedDesigner"].forEach(k=>localStorage.removeItem(k));
  location.href="index.html";
}

function escapeHTML(str){return String(str??"").replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;","\"":"&quot;"}[c]));}
