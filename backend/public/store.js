const main = document.querySelector('#main');
const accountDialog = document.querySelector('#account-dialog');
const productDialog = document.querySelector('#product-dialog');
const money = value => new Intl.NumberFormat('en-EG', { style: 'currency', currency: 'EGP' }).format(value / 100);
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
let user = null, products = [], cart = null, quote = null, selectedProduct = null, currentView = 'shop', page = 1, category = '', orderKey = null, recoveryToken = null;
let noticeTimer;
function notify(message) { const box = document.querySelector('#notice'); box.textContent = message; box.hidden = false; clearTimeout(noticeTimer); noticeTimer = setTimeout(() => { box.hidden = true; }, 7000); }
async function api(path, { method = 'GET', body, headers = {} } = {}) {
  const response = await fetch(`/api${path}`, { method, credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'TripleSeven', ...headers }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
  const data = response.status === 204 ? {} : await response.json();
  if (!response.ok) throw new Error(data.error || 'Request failed. Please try again.');
  return data;
}
function header() { document.querySelector('#account-button').textContent = user ? user.name : 'Sign in'; document.querySelector('#admin-nav').hidden = user?.role !== 'admin'; }
async function refreshUser() { try { user = (await api('/users/me')).user; } catch { user = null; } header(); }
async function refreshBag() { if (!user) { document.querySelector('#bag-count').textContent = '0'; return; } try { cart = await api('/cart'); document.querySelector('#bag-count').textContent = cart.items.reduce((n, item) => n + item.quantity, 0); } catch { /* View shows request errors when opened. */ } }
const field = (name, label, type = 'text', extra = '') => `<label>${label}<input name="${name}" type="${type}" required ${extra}></label>`;
function image(product) { return product.images?.length ? `<img src="${escape(product.images[0])}" alt="${escape(product.name)}" loading="lazy">` : '<span class="no-image" aria-hidden="true">777</span><small>Product photo coming soon</small>'; }
async function showShop() {
  const data = await api(`/products?page=${page}&limit=12${category ? `&category=${encodeURIComponent(category)}` : ''}`);
  products = data.products;
  main.innerHTML = `<section class="hero"><div><span class="eyebrow">Triple-Seven / The collection</span><h1>YOUR CITY.<br>YOUR RULES.</h1><p>Oversized fits. Everyday staples. Streetwear for whatever comes next.</p><a class="lime primary" href="#collection">Explore the collection</a></div><div class="mark" aria-hidden="true">777</div></section><section id="collection"><div class="section-head"><h2>The collection</h2><label>Category<select id="category"><option value="">All clothing</option>${['t-shirts','hoodies','pants','accessories'].map(c => `<option value="${c}" ${c === category ? 'selected' : ''}>${c}</option>`).join('')}</select></label></div><div class="grid">${products.map(p => `<article class="product"><div class="product-image">${image(p)}</div><h3>${escape(p.name)}</h3><div class="meta"><span>${money(p.pricePiastres)}</span><span class="muted">${escape(p.category)}</span></div><button data-product="${escape(p._id)}">Choose size</button></article>`).join('') || '<p>No products in this category yet.</p>'}</div><div class="pagination"><button data-page="${page - 1}" ${page <= 1 ? 'disabled' : ''}>Previous</button><span>Page ${page} of ${Math.max(1,data.pagination.pages)}</span><button data-page="${page + 1}" ${page >= data.pagination.pages ? 'disabled' : ''}>Next</button></div></section>`;
}
function openProduct(id) {
  selectedProduct = products.find(p => p._id === id);
  if (!selectedProduct) return;
  const p = selectedProduct;
  document.querySelector('#product-content').innerHTML = `<h2 class="dialog-title">${escape(p.name)}</h2><p>${escape(p.description)}</p><p>${money(p.pricePiastres)}</p><form id="add-form" class="stack"><label>Size / colour<select name="variant" required><option value="">Choose your fit</option>${p.variants.map((v,i) => `<option value="${i}" ${v.stock < 1 ? 'disabled' : ''}>${escape(v.size)} / ${escape(v.color)}${v.stock < 1 ? ' — sold out' : ''}</option>`).join('')}</select></label><button class="primary">Add to bag</button></form>`;
  productDialog.showModal();
}
function account(mode = 'login') {
  let content;
  if (user && mode === 'login') content = `<h2 class="dialog-title">Hello, ${escape(user.name)}</h2><p>${escape(user.email)}</p><button id="logout" class="primary">Sign out</button>`;
  else if (mode === 'reset' || mode === 'verify-complete') content = `<h2 class="dialog-title">${mode === 'reset' ? 'New password' : 'Verify your account'}</h2><p>Choose your password to complete this step.</p><form id="reset-form" data-purpose="${mode}" class="stack">${field('newPassword','Your password','password','minlength="15" autocomplete="new-password"')}<button class="primary">${mode === 'reset' ? 'Save new password' : 'Verify email and save password'}</button></form>`;
  else content = `<h2 class="dialog-title">${mode === 'register' ? 'Join Triple-Seven' : mode === 'forgot' ? 'Reset your password' : mode === 'verify' ? 'Verify your email' : 'Welcome back'}</h2><form id="account-form" data-mode="${mode}" class="stack">${mode === 'register' ? field('name','Your name','text','maxlength="100" autocomplete="name"') : ''}${field('email','Email','email','autocomplete="email"')}${['login','register'].includes(mode) ? field('password','Password','password',`minlength="${mode === 'register' ? '15' : '1'}" autocomplete="${mode === 'register' ? 'new-password' : 'current-password'}"`) : ''}<button class="primary">${mode === 'register' ? 'Create account' : mode === 'forgot' || mode === 'verify' ? 'Send link' : 'Sign in'}</button></form><div class="stack"><button class="link-button" data-account="${mode === 'register' ? 'login' : 'register'}">${mode === 'register' ? 'Already have an account? Sign in' : 'Create an account'}</button><button class="link-button" data-account="forgot">Forgot password?</button><button class="link-button" data-account="verify">Resend verification email</button></div>`;
  document.querySelector('#account-content').innerHTML = content;
  if (!accountDialog.open) accountDialog.showModal();
}
async function showCart() {
  cart = await api('/cart');
  orderKey = null; quote = null;
  if (!cart.items.length) { main.innerHTML = '<h1>Your bag</h1><div class="empty"><p>Your bag is empty.</p><button data-view="shop">Explore the collection</button></div>'; return; }
  let quoteError = '';
  try { quote = await api('/orders/quote'); } catch (error) { quoteError = error.message; }
  main.innerHTML = `<h1>Your bag</h1><div class="split"><section class="panel">${cart.items.map((item,i) => `<article class="cart-item"><h3>${escape(item.name)}</h3><p class="muted">${escape(item.size)} / ${escape(item.color)}${!item.available ? ' — currently unavailable' : ''}</p><div class="row"><label>Quantity<input data-quantity="${i}" type="number" min="0" max="10" value="${item.quantity}" ${!item.productId ? 'disabled' : ''}></label><strong>${money(item.subtotalPiastres)}</strong></div></article>`).join('')}<button id="clear-cart">Empty bag</button></section><section class="panel"><h2>Delivery in Egypt</h2><p>Cash on delivery</p><p>Subtotal: ${money(cart.subtotalPiastres)}</p>${quote ? `<p>Delivery: ${money(quote.shippingPiastres)}</p><div class="total"><span>Total</span><span>${money(quote.totalPiastres)}</span></div>` : `<p class="danger">${escape(quoteError)}</p>`}<form id="checkout-form" class="stack">${field('name','Full name','text','autocomplete="name"')}${field('phone','Egyptian mobile number','tel','autocomplete="tel" placeholder="01012345678"')}${field('governorate','Governorate')}${field('city','City','text','autocomplete="address-level2"')}${field('street','Street, building, floor and apartment','text','autocomplete="street-address"')}<button class="primary" ${!quote?.canCheckout ? 'disabled' : ''}>Place order · Pay on delivery</button><p class="muted">Check the address and total before placing your order.</p></form></section></div>`;
}
async function showOrders() {
  const data = await api(`/orders?page=${page}`);
  main.innerHTML = `<h1>Your orders</h1>${data.orders.map(o => `<article class="panel order"><div class="row"><strong>Order ${escape(o._id.slice(-8))}</strong><span class="badge">${escape(o.status)}</span><span>${money(o.totalPiastres)}</span></div><p>${o.items.map(i => `${escape(i.name)} (${escape(i.size)} / ${escape(i.color)}) × ${i.quantity}`).join('<br>')}</p><p class="muted">${escape(o.address.street)}, ${escape(o.address.city)} · ${new Date(o.createdAt).toLocaleDateString()}</p>${o.status === 'pending' ? `<button data-cancel="${o._id}">Cancel order</button>` : ''}</article>`).join('') || '<div class="empty">No orders yet.</div>'}<div class="pagination"><button data-page="${page-1}" ${page <= 1 ? 'disabled' : ''}>Previous</button><span>Page ${page}</span><button data-page="${page+1}" ${page >= data.pagination.pages ? 'disabled' : ''}>Next</button></div>`;
}
async function showAdmin() {
  if (user?.role !== 'admin') throw new Error('Admin access required.');
  const [catalog, orders] = await Promise.all([api(`/admin/products?page=${page}`), api(`/admin/orders?page=${page}`)]);
  main.innerHTML = `<h1>Store management</h1><div class="split"><section class="panel"><h2>Products</h2>${catalog.products.map(p => `<article class="cart-item"><strong>${escape(p.name)}</strong><p>${money(p.pricePiastres)} · ${p.active ? 'Active' : 'Archived'}</p><button data-price="${p._id}">Edit price</button> <button data-archive="${p._id}">${p.active ? 'Archive' : 'Restore'}</button>${p.variants.map(v => `<form class="inventory-form row" data-id="${p._id}" data-size="${escape(v.size)}" data-color="${escape(v.color)}"><span>${escape(v.size)} / ${escape(v.color)}: ${v.stock}</span><label>Stock adjustment<input name="adjustment" type="number" required min="-1000000" max="1000000" placeholder="+5 or -2"></label><button>Apply</button></form>`).join('')}</article>`).join('')}</section><section class="panel"><h2>Add product</h2><form id="product-form" class="stack">${field('name','Product name')}${field('slug','URL slug','text','pattern="[a-z0-9]+(-[a-z0-9]+)*"')}${field('description','Description')}<label>Category<select name="category">${['t-shirts','hoodies','pants','accessories'].map(c => `<option>${c}</option>`).join('')}</select></label>${field('price','Price in EGP','number','min="0" step="0.01"')}<label>Photo URL (optional)<input name="image" type="url" placeholder="https://..."></label><label>Sizes, comma-separated<input name="sizes" value="S,M,L,XL" required></label>${field('color','Colour')}${field('stock','Initial stock per size','number','min="0" step="1"')}<button class="primary">Create product</button></form></section></div><h2>Orders</h2>${orders.orders.map(o => `<article class="panel order"><strong>${escape(o._id.slice(-8))} · ${money(o.totalPiastres)}</strong><p>${escape(o.address.name)} · ${escape(o.address.phone)}</p><p>${escape(o.address.street)}, ${escape(o.address.city)}, ${escape(o.address.governorate)}</p><p>${o.items.map(i => `${escape(i.name)} / ${escape(i.size)} / ${escape(i.color)} × ${i.quantity}`).join('<br>')}</p><span class="badge">${escape(o.status)}</span> ${({pending:['confirmed','cancelled'],confirmed:['shipped','cancelled'],shipped:['delivered']}[o.status] || []).map(s => `<button data-status="${s}" data-order="${o._id}">Mark ${s}</button>`).join(' ')}</article>`).join('') || '<p>No orders yet.</p>'}<div class="pagination"><button data-page="${page-1}" ${page<=1?'disabled':''}>Previous</button><span>Page ${page}</span><button data-page="${page+1}" ${page>=Math.max(catalog.pagination.pages,orders.pagination.pages)?'disabled':''}>Next</button></div>`;
  main.dataset.catalog = JSON.stringify(catalog.products.map(p => ({ id: p._id, active: p.active })));
}
async function view(name, resetPage = true) {
  if (name !== 'shop' && !user) { account(); return; }
  currentView = name; if (resetPage) page = 1;
  main.innerHTML = '<p>Loading…</p>';
  try { await ({shop:showShop,cart:showCart,orders:showOrders,admin:showAdmin}[name] || showShop)(); }
  catch (error) { main.innerHTML = `<div class="empty"><p>${escape(error.message)}</p><button data-view="${escape(name)}">Retry</button></div>`; }
}
document.addEventListener('click', async event => {
  const button = event.target.closest('button');
  if (!button) return;
  try {
    if (button.dataset.close) document.getElementById(button.dataset.close).close();
    else if (button.dataset.view) await view(button.dataset.view);
    else if (button.dataset.page) { page = Number(button.dataset.page); await view(currentView, false); }
    else if (button.dataset.product) openProduct(button.dataset.product);
    else if (button.id === 'account-button') account();
    else if (button.dataset.account) account(button.dataset.account);
    else if (button.id === 'logout') { await api('/users/logout', { method: 'POST', body: {} }); user = null; header(); accountDialog.close(); await refreshBag(); await view('shop'); }
    else if (button.id === 'clear-cart') { if (confirm('Empty your bag?')) { await api('/cart', { method: 'DELETE', body: {} }); await refreshBag(); await showCart(); } }
    else if (button.dataset.cancel) { if (confirm('Cancel this order?')) { await api(`/orders/${button.dataset.cancel}/cancel`, { method: 'POST', body: {} }); await showOrders(); } }
    else if (button.dataset.status) { if (confirm(`Mark this order ${button.dataset.status}?${button.dataset.status === 'delivered' ? ' Confirm payment has been collected.' : ''}`)) { await api(`/admin/orders/${button.dataset.order}/status`, { method: 'PATCH', body: { status: button.dataset.status } }); await showAdmin(); } }
    else if (button.dataset.price) { const price = prompt('New price in EGP'); if (price !== null && price.trim() && Number.isFinite(Number(price))) { await api(`/admin/products/${button.dataset.price}`, { method: 'PATCH', body: { pricePiastres: Math.round(Number(price)*100) } }); await showAdmin(); } }
    else if (button.dataset.archive) { const p = JSON.parse(main.dataset.catalog).find(p => p.id === button.dataset.archive); if (confirm(`${p.active ? 'Archive' : 'Restore'} this product?`)) { await api(`/admin/products/${p.id}`, { method: 'PATCH', body: { active: !p.active } }); await showAdmin(); } }
  } catch (error) { notify(error.message); }
});
document.addEventListener('change', async event => {
  try {
    if (event.target.id === 'category') { category = event.target.value; page = 1; await showShop(); }
    if (event.target.dataset.quantity !== undefined) { const item = cart.items[Number(event.target.dataset.quantity)]; await api('/cart/items', { method: 'PUT', body: { productId: item.productId, size: item.size, color: item.color, quantity: Number(event.target.value) } }); await refreshBag(); await showCart(); }
  } catch (error) { notify(error.message); }
});
document.addEventListener('submit', async event => {
  event.preventDefault();
  const form = event.target, data = Object.fromEntries(new FormData(form)), submit = form.querySelector('button[type="submit"],button:not([type])');
  if (submit) submit.disabled = true;
  try {
    if (form.id === 'account-form') {
      const mode = form.dataset.mode;
      if (mode === 'login') { user = (await api('/users/login', {method:'POST',body:data})).user; header(); accountDialog.close(); await refreshBag(); await view(currentView); }
      else if (mode === 'register') { await api('/users/register', {method:'POST',body:data}); account('verify'); document.querySelector('#account-form input[name="email"]').value = data.email; notify('Account request complete. Send a verification link before signing in.'); }
      else { const result = await api(`/users/${mode==='forgot'?'forgot-password':'request-verification'}`, {method:'POST',body:{email:data.email}}); notify(result.message); }
    } else if (form.id === 'add-form') {
      if (!user) { productDialog.close(); account(); notify('Sign in to save your bag.'); return; }
      const variant = selectedProduct.variants[Number(data.variant)];
      await refreshBag();
      const existing = cart?.items.find(i => i.productId === selectedProduct._id && i.size === variant.size && i.color === variant.color);
      await api('/cart/items', {method:'PUT',body:{productId:selectedProduct._id,size:variant.size,color:variant.color,quantity:(existing?.quantity||0)+1}});
      productDialog.close(); await refreshBag(); notify('Added to your bag.');
    } else if (form.id === 'checkout-form') {
      orderKey ||= crypto.randomUUID();
      const result = await api('/orders', {method:'POST',headers:{'Idempotency-Key':orderKey},body:{address:{...data,country:'EG'},paymentMethod:'cash_on_delivery',expectedSubtotalPiastres:quote.subtotalPiastres,expectedTotalPiastres:quote.totalPiastres}});
      orderKey = null; await refreshBag(); await view('orders'); notify(`Order ${result.order._id.slice(-8)} placed. Pay on delivery.`);
    } else if (form.id === 'reset-form') { const result = await api(form.dataset.purpose === 'verify-complete' ? '/users/verify-email' : '/users/reset-password',{method:'POST',body:{token:recoveryToken,newPassword:data.newPassword}}); recoveryToken = null; user = null; header(); account('login'); notify(result.message); }
    else if (form.id === 'product-form') {
      await api('/admin/products',{method:'POST',body:{name:data.name,slug:data.slug,description:data.description,category:data.category,pricePiastres:Math.round(Number(data.price)*100),images:data.image?[data.image]:[],variants:data.sizes.split(',').map(size=>({size:size.trim(),color:data.color,stock:Number(data.stock)}))}});
      await showAdmin(); notify('Product created.');
    } else if (form.classList.contains('inventory-form')) { await api(`/admin/products/${form.dataset.id}/inventory`,{method:'PATCH',body:{size:form.dataset.size,color:form.dataset.color,adjustment:Number(data.adjustment)}}); await showAdmin(); }
  } catch (error) { notify(error.message); }
  finally { if (submit) submit.disabled = false; }
});
async function start() {
  const fragment = location.hash.slice(1); history.replaceState(null, '', location.pathname);
  await refreshUser(); await refreshBag(); await view('shop');
  if (fragment.startsWith('reset-password=')) { recoveryToken = fragment.slice(15); account('reset'); }
  if (fragment.startsWith('verify-email=')) {
    recoveryToken = fragment.slice(13); account('verify-complete');
  }
}
start();
