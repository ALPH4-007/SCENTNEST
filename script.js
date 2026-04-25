 // SECURE HASHED PASSWORD (SHA-256 of "ScentNest2025")
  const ADMIN_PASSWORD_HASH = "1f858d461b32502ceaf9005733737175360bf6a729541dd111d00cc7c4a2fd2b";
  
  async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
  
  // DATA
  let products = [];
  let editingProductId = null;
  let cartItemsMap = new Map();
  let currentCountry = "GH";
  let isAdminAuthenticated = false;

  const CURRENCY_SETTINGS = {
    GH: { symbol: "₵", code: "GHS" },
    UK: { symbol: "£", code: "GBP" },
    US: { symbol: "$", code: "USD" },
    NG: { symbol: "₦", code: "NGN" }
  };

  const DEFAULT_PRODUCTS = [
    { id: 1, name: "Midnight Oud", description: "Smoky oud + saffron, deep sensual.", prices: { GH: 280, UK: 35, US: 42, NG: 38500 }, imageUrl: "https://images.unsplash.com/photo-1594035910388-f182f6a1bf6f?w=400&h=400&fit=crop" },
    { id: 2, name: "Golden Amber", description: "Warm amber resin & vanilla bean.", prices: { GH: 220, UK: 28, US: 34, NG: 31200 }, imageUrl: "https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=400&h=400&fit=crop" },
    { id: 3, name: "Sacred Rose", description: "Damascus rose, white musk, spice.", prices: { GH: 250, UK: 32, US: 38, NG: 34900 }, imageUrl: "https://images.unsplash.com/photo-1541643600912-7a3f3cb0c524?w=400&h=400&fit=crop" },
    { id: 4, name: "Santal Oasis", description: "Creamy sandalwood, fig & leather.", prices: { GH: 310, UK: 40, US: 48, NG: 44000 }, imageUrl: "https://images.unsplash.com/photo-1594035910388-f182f6a1bf6f?w=400&h=400&fit=crop" },
    { id: 5, name: "Neroli Breeze", description: "Fresh neroli, petitgrain & sea salt.", prices: { GH: 240, UK: 30, US: 36, NG: 33000 }, imageUrl: "" },
    { id: 6, name: "Vanilla Ember", description: "Smoked vanilla, tonka & bourbon.", prices: { GH: 260, UK: 33, US: 39, NG: 35800 }, imageUrl: "" }
  ];

  function loadProducts() {
    const stored = localStorage.getItem("scentnest_products");
    if (stored) products = JSON.parse(stored);
    else { products = JSON.parse(JSON.stringify(DEFAULT_PRODUCTS)); saveProducts(); }
  }
  function saveProducts() { localStorage.setItem("scentnest_products", JSON.stringify(products)); }
  function getNextId() { return products.length ? Math.max(...products.map(p => p.id)) + 1 : 7; }
  function getProductPrice(product) { return product.prices[currentCountry] || product.prices.GH; }
  function getFormattedPrice(priceVal) {
    const sym = CURRENCY_SETTINGS[currentCountry].symbol;
    if (currentCountry === "NG") return `${sym}${Math.round(priceVal).toLocaleString()}`;
    return `${sym}${priceVal.toFixed(2)}`;
  }
  function escapeHtml(str) { if(!str) return ''; return str.replace(/[&<>]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[m])); }

  function renderProducts() {
    const grid = document.getElementById("productsGrid");
    if (!grid) return;
    grid.innerHTML = "";
    products.forEach(prod => {
      const priceVal = getProductPrice(prod);
      const formattedPrice = getFormattedPrice(priceVal);
      const hasImage = prod.imageUrl && prod.imageUrl.trim();
      const imgHtml = hasImage ? `<img src="${prod.imageUrl}" alt="${prod.name}">` : `<i class="fas fa-flask"></i>`;
      const card = document.createElement("div");
      card.className = "product-card";
      card.innerHTML = `
        <div class="product-img" data-prodid="${prod.id}">${imgHtml}</div>
        <div class="product-info">
          <div class="product-title">${escapeHtml(prod.name)}</div>
          <div class="product-desc">${escapeHtml(prod.description)}</div>
          <div class="price-row"><span class="price">${formattedPrice}</span></div>
          <button class="add-btn" data-id="${prod.id}"><i class="fas fa-plus-circle"></i> Add to Nest</button>
        </div>
      `;
      grid.appendChild(card);
    });
    document.querySelectorAll(".product-img").forEach(imgDiv => {
      imgDiv.addEventListener("click", (e) => {
        e.stopPropagation();
        const prodId = parseInt(imgDiv.dataset.prodid);
        const prod = products.find(p => p.id === prodId);
        if (prod?.imageUrl?.trim()) {
          const modal = document.createElement("div");
          modal.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.85);display:flex;align-items:center;justify-content:center;z-index:1000;";
          modal.innerHTML = `<img src="${prod.imageUrl}" style="max-width:90%;max-height:90%;border-radius:20px;"><button style="position:absolute;top:20px;right:25px;background:white;border:none;font-size:1.8rem;padding:6px 18px;border-radius:40px;cursor:pointer;">✖</button>`;
          document.body.appendChild(modal);
          modal.querySelector("button").onclick = () => modal.remove();
        } else if(prod) alert(`✨ ${prod.name}\n${prod.description}`);
      });
    });
    document.querySelectorAll(".add-btn").forEach(btn => btn.addEventListener("click", () => addToCart(parseInt(btn.dataset.id))));
  }

  function addToCart(pid) {
    const product = products.find(p => p.id === pid);
    if (!product) return;
    if (cartItemsMap.has(pid)) cartItemsMap.get(pid).quantity++;
    else cartItemsMap.set(pid, { product, quantity: 1 });
    updateCartUI();
    animateCart();
  }
  function removeFromCart(pid) {
    if (cartItemsMap.has(pid)) {
      let entry = cartItemsMap.get(pid);
      if (entry.quantity > 1) entry.quantity--;
      else cartItemsMap.delete(pid);
      updateCartUI();
    }
  }
  function deleteItem(pid) { cartItemsMap.delete(pid); updateCartUI(); }
  function getCartTotal() { let total = 0; for(let [_, entry] of cartItemsMap) total += getProductPrice(entry.product) * entry.quantity; return total; }
  function animateCart() { const icon = document.querySelector(".cart-icon"); icon.style.transform = "scale(1.1)"; setTimeout(() => icon.style.transform = "scale(1)", 150); }
  
  function updateCartUI() {
    let count = 0; for(let [_, e] of cartItemsMap) count += e.quantity;
    document.getElementById("cartCount").innerText = count;
    const container = document.getElementById("cartItemsList");
    if (!container) return;
    if (cartItemsMap.size === 0) { container.innerHTML = `<div style="padding:20px;text-align:center;">✨ Empty nest</div>`; document.getElementById("cartTotalPrice").innerHTML = getFormattedPrice(0); return; }
    let html = "";
    for(let [id, entry] of cartItemsMap) {
      const prod = entry.product, priceEach = getProductPrice(prod), itemTotal = priceEach * entry.quantity;
      html += `<div style="display:flex;justify-content:space-between;margin-bottom:12px;border-bottom:1px solid #f0e0d0;padding-bottom:10px;">
        <div><strong>${escapeHtml(prod.name)}</strong> x${entry.quantity}<br><small>${getFormattedPrice(priceEach)}</small></div>
        <div style="text-align:right;">${getFormattedPrice(itemTotal)}<br>
          <button class="remove-item" data-id="${id}" data-action="decr" style="background:none;border:none;color:#b97f55;"><i class="fas fa-minus-circle"></i></button>
          <button class="remove-item" data-id="${id}" data-action="del" style="background:none;border:none;"><i class="fas fa-trash-alt"></i></button>
        </div>
      </div>`;
    }
    container.innerHTML = html;
    document.querySelectorAll(".remove-item").forEach(btn => {
      btn.addEventListener("click", () => {
        const pid = parseInt(btn.dataset.id);
        if (btn.dataset.action === "decr") removeFromCart(pid);
        else deleteItem(pid);
      });
    });
    document.getElementById("cartTotalPrice").innerHTML = getFormattedPrice(getCartTotal());
  }

  function generateWhatsAppMsg() {
    if (cartItemsMap.size === 0) { alert("Cart empty"); return null; }
    let lines = [];
    for(let [_, entry] of cartItemsMap) {
      const prod = entry.product, priceEach = getProductPrice(prod);
      lines.push(`• ${prod.name} x${entry.quantity} = ${getFormattedPrice(priceEach * entry.quantity)}`);
    }
    const total = getCartTotal(), countryName = {GH:"Ghana",UK:"UK",US:"USA",NG:"Nigeria"}[currentCountry];
    return `🛍️ *ScentNest Order*%0A🌍 ${countryName}%0A${lines.join("%0A")}%0A📦 Total: ${getFormattedPrice(total)}%0A📍 Please share delivery address.`;
  }
  function proceedWhatsApp() { const msg = generateWhatsAppMsg(); if(msg) window.open(`https://wa.me/447418350123?text=${msg}`, "_blank"); }

  // Admin Image Upload
  function setupUpload() {
    const fileInput = document.getElementById("productImageFile");
    document.querySelector(".file-input-label")?.addEventListener("click", () => fileInput.click());
    fileInput.addEventListener("change", e => {
      const file = e.target.files[0];
      if(file && file.type.startsWith("image/") && file.size <= 2e6) {
        const reader = new FileReader();
        reader.onload = ev => { document.getElementById("productImageData").value = ev.target.result; document.getElementById("imagePreview").src = ev.target.result; document.getElementById("imagePreview").style.display = "block"; };
        reader.readAsDataURL(file);
      } else if(file) alert("Max 2MB");
    });
  }
  function clearPreview() { document.getElementById("productImageData").value = ""; document.getElementById("imagePreview").style.display = "none"; document.getElementById("imagePreview").src = ""; document.getElementById("productImageFile").value = ""; }

  function renderAdminList() {
    if(!isAdminAuthenticated) return;
    const container = document.getElementById("adminProductList");
    container.innerHTML = "";
    products.forEach(prod => {
      const div = document.createElement("div"); div.className = "product-admin-row";
      div.innerHTML = `<span><strong>${escapeHtml(prod.name)}</strong> (₵${prod.prices.GH}/£${prod.prices.UK}/$${prod.prices.US}/₦${prod.prices.NG})</span>
        <div><button class="btn-icon edit-product" data-id="${prod.id}"><i class="fas fa-edit"></i></button>
        <button class="btn-icon delete-product" data-id="${prod.id}"><i class="fas fa-trash-alt"></i></button></div>`;
      container.appendChild(div);
    });
    document.querySelectorAll(".edit-product").forEach(btn => btn.addEventListener("click", () => openEdit(parseInt(btn.dataset.id))));
    document.querySelectorAll(".delete-product").forEach(btn => btn.addEventListener("click", () => { if(confirm("Delete?")) deleteProd(parseInt(btn.dataset.id)); }));
  }
  function openEdit(id) {
    const prod = products.find(p=>p.id===id);
    if(!prod) return;
    editingProductId = id;
    document.getElementById("productName").value = prod.name;
    document.getElementById("productDesc").value = prod.description;
    document.getElementById("priceGH").value = prod.prices.GH;
    document.getElementById("priceUK").value = prod.prices.UK;
    document.getElementById("priceUS").value = prod.prices.US;
    document.getElementById("priceNG").value = prod.prices.NG;
    document.getElementById("productImageData").value = prod.imageUrl || "";
    if(prod.imageUrl) { document.getElementById("imagePreview").src = prod.imageUrl; document.getElementById("imagePreview").style.display = "block"; }
    else clearPreview();
    document.getElementById("saveProductBtn").innerHTML = '<i class="fas fa-edit"></i> Update Product';
  }
  function saveProduct() {
    if(!isAdminAuthenticated) return;
    const name = document.getElementById("productName").value.trim();
    const desc = document.getElementById("productDesc").value.trim();
    const gh = parseFloat(document.getElementById("priceGH").value), uk = parseFloat(document.getElementById("priceUK").value), us = parseFloat(document.getElementById("priceUS").value), ng = parseFloat(document.getElementById("priceNG").value);
    const img = document.getElementById("productImageData").value;
    if(!name || isNaN(gh)||isNaN(uk)||isNaN(us)||isNaN(ng)) { alert("Fill all fields"); return; }
    const prices = { GH:gh, UK:uk, US:us, NG:ng };
    if(editingProductId) {
      const idx = products.findIndex(p=>p.id===editingProductId);
      if(idx!==-1) products[idx] = {...products[idx], name, description:desc, prices, imageUrl:img||""};
      editingProductId=null;
    } else products.push({ id:getNextId(), name, description:desc, prices, imageUrl:img||"" });
    saveProducts(); resetForm(); renderProducts(); renderAdminList(); updateCartUI(); alert("Saved!");
  }
  function deleteProd(id) { products = products.filter(p=>p.id!==id); saveProducts(); if(cartItemsMap.has(id)) cartItemsMap.delete(id); renderProducts(); renderAdminList(); updateCartUI(); alert("Deleted"); }
  function resetForm() {
    document.getElementById("productName").value = ""; document.getElementById("productDesc").value = "";
    document.getElementById("priceGH").value = ""; document.getElementById("priceUK").value = ""; document.getElementById("priceUS").value = ""; document.getElementById("priceNG").value = "";
    clearPreview(); editingProductId=null; document.getElementById("saveProductBtn").innerHTML = '<i class="fas fa-save"></i> Add / Update Product';
  }

  async function verifyAdmin() {
    const pwd = document.getElementById("adminPassword").value;
    if(!pwd) { document.getElementById("passwordError").innerText = "Enter password"; return; }
    if(await hashPassword(pwd) === ADMIN_PASSWORD_HASH) {
      isAdminAuthenticated = true; closePasswordModal(); document.getElementById("adminModal").classList.add("active"); renderAdminList(); resetForm();
    } else document.getElementById("passwordError").innerText = "Wrong password";
  }
  function showPassword() { document.getElementById("passwordModal").classList.add("active"); }
  function closePasswordModal() { document.getElementById("passwordModal").classList.remove("active"); document.getElementById("passwordError").innerText = ""; document.getElementById("adminPassword").value = ""; }
  function closeAdmin() { document.getElementById("adminModal").classList.remove("active"); isAdminAuthenticated = false; resetForm(); }
  function backToSite() { closeAdmin(); window.scrollTo({top:0, behavior:'smooth'}); }
  function onCountryChange() { currentCountry = document.getElementById("countrySelect").value; renderProducts(); updateCartUI(); }
  function openCart() { document.getElementById("cartSidebar").classList.add("open"); document.getElementById("cartOverlay").classList.add("active"); updateCartUI(); }
  function closeCart() { document.getElementById("cartSidebar").classList.remove("open"); document.getElementById("cartOverlay").classList.remove("active"); }

  document.addEventListener("DOMContentLoaded", () => {
    loadProducts(); renderProducts(); updateCartUI(); setupUpload();
    document.getElementById("countrySelect").addEventListener("change", onCountryChange);
    document.getElementById("cartIcon").addEventListener("click", openCart);
    document.getElementById("closeCartBtn").addEventListener("click", closeCart);
    document.getElementById("cartOverlay").addEventListener("click", closeCart);
    document.getElementById("proceedWhatsAppBtn").addEventListener("click", () => { proceedWhatsApp(); closeCart(); });
    document.getElementById("adminPanelBtn").addEventListener("click", showPassword);
    document.getElementById("verifyPasswordBtn").addEventListener("click", verifyAdmin);
    document.getElementById("closePasswordModalBtn").addEventListener("click", closePasswordModal);
    document.getElementById("closeAdminBtn").addEventListener("click", closeAdmin);
    document.getElementById("backToSiteBtn").addEventListener("click", backToSite);
    document.getElementById("saveProductBtn").addEventListener("click", saveProduct);
    currentCountry = "GH"; document.getElementById("countrySelect").value = "GH";
  });