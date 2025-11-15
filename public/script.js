// public/script.js
let cart = JSON.parse(localStorage.getItem('cart')) || [];

function saveCart() {
  localStorage.setItem('cart', JSON.stringify(cart));
  updateCartBadge();
  loadDropdownCartItems();
}

function updateCartBadge() {
  const total = cart.reduce((sum, i) => sum + i.quantity, 0);
  const badge = document.getElementById('cartCount');
  if (badge) badge.textContent = total;
}

function showNotification(msg, isError = false) {
  const el = document.createElement('div');
  el.className = 'notification';
  el.style.background = isError ? '#ff4d4d' : '#EFB400';
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

function updateQuantity(id, delta) {
  const el = document.getElementById(`qty-${id}`);
  if (!el) return;
  let qty = parseInt(el.textContent) || 0;
  qty = Math.max(0, qty + delta);
  el.textContent = qty;

  const existing = cart.find(i => i.id === id);
  if (existing) {
    if (qty === 0) cart = cart.filter(i => i.id !== id);
    else existing.quantity = qty;
  } else if (qty > 0) {
    cart.push({ id, quantity: qty });
  }
  saveCart();
}

function addToCart(id) {
  updateQuantity(id, 1);
}

function buyNow(id) {
  cart = cart.filter(i => i.id !== id);
  cart.push({ id, quantity: 1 });
  saveCart();
  proceedToCheckout();
}

function removeFromCart(id) {
  cart = cart.filter(i => i.id !== id);
  saveCart();
}

async function loadProducts() {
  try {
    const res = await fetch('/api/products');
    if (!res.ok) throw new Error('Failed to fetch products');
    const products = await res.json();

    const container = document.getElementById('productContainer') || document.getElementById('productsGrid');
    if (!container) return;

    container.innerHTML = products
      .map(p => `
        <div class="product-card">
          <img src="${p.image}" alt="${p.name}" loading="lazy">
          <h2>${p.name}</h2>
          <p>${p.description || ''}</p>
          <p class="price">₹${p.price.toLocaleString()}</p>
          <div class="quantity-controls">
            <button onclick="updateQuantity('${p.id}', -1)">−</button>
            <span id="qty-${p.id}">0</span>
            <button onclick="updateQuantity('${p.id}', 1)">+</button>
          </div>
          <button class="add-cart-btn" onclick="addToCart('${p.id}')">
            Add to Cart
          </button>
          <button class="buy-now-btn" onclick="buyNow('${p.id}')">
            Buy Now
          </button>
        </div>
      `)
      .join('');

    cart.forEach(item => {
      const el = document.getElementById(`qty-${item.id}`);
      if (el) el.textContent = item.quantity;
    });
  } catch (err) {
    console.error(err);
    showNotification('Failed to load products', true);
  }
}

async function loadDropdownCartItems() {
  const itemsDiv = document.getElementById('dropdownCartItems');
  const totalSpan = document.getElementById('dropdownCartTotal');
  if (!itemsDiv || !totalSpan) return;

  if (cart.length === 0) {
    itemsDiv.innerHTML = '<p>Your cart is empty</p>';
    totalSpan.textContent = '0';
    return;
  }

  try {
    const res = await fetch('/api/products');
    const products = await res.json();

    let total = 0;
    const html = cart
      .map(item => {
        const p = products.find(pr => pr.id === item.id);
        if (!p) return '';
        total += p.price * item.quantity;
        return `
          <div class="dropdown-cart-item">
            <img src="${p.image}" alt="${p.name}">
            <div>
              <h4>${p.name}</h4>
              <p>₹${p.price.toLocaleString()} × ${item.quantity}</p>
            </div>
            <button onclick="removeFromCart('${item.id}')">×</button>
          </div>
        `;
      })
      .filter(Boolean)
      .join('');

    itemsDiv.innerHTML = html || '<p>Your cart is empty</p>';
    totalSpan.textContent = total.toLocaleString();
  } catch (err) {
    itemsDiv.innerHTML = '<p>Failed to load cart</p>';
  }
}

function setupDropdownCart() {
  const cartIcon = document.getElementById('cartIcon');
  const dropdown = document.getElementById('cartDropdown');
  if (!cartIcon || !dropdown) return;

  cartIcon.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdown.classList.toggle('show');
    loadDropdownCartItems();
  });

  document.addEventListener('click', (e) => {
    if (!cartIcon.contains(e.target) && !dropdown.contains(e.target)) {
      dropdown.classList.remove('show');
    }
  });
}

async function proceedToCheckout() {
  const user = localStorage.getItem('loggedInUser');
  if (!user) {
    alert('Please login to checkout');
    window.location.href = 'login.html';
    return;
  }

  const userObj = JSON.parse(user);
  const items = cart.map(i => ({ productId: i.id, quantity: i.quantity }));

  try {
    const res = await fetch('/api/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items, userId: userObj._id })
    });
    const order = await res.json();
    if (!res.ok) throw new Error(order.error || 'Order failed');

    const options = {
      key: 'rzp_test_RfiZOVuyueJdix', // Use test key
      amount: order.amount,
      currency: order.currency,
      name: 'C&R Building Solutions',
      order_id: order.id,
      handler: async (response) => {
        const v = await fetch('/api/verify-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
            userId: order.userId,
            items: order.products,
            amount: order.amount
          })
        });
        const result = await v.json();
        if (result.success) {
          showNotification('Payment successful! Order placed.');
          cart = [];
          localStorage.removeItem('cart');
          updateCartBadge();
          setTimeout(() => (location.href = 'profile.html'), 1500);
        } else {
          showNotification('Payment failed', true);
        }
      },
      prefill: { name: userObj.name, email: userObj.email || '' },
      theme: { color: '#EFB400' }
    };
    new Razorpay(options).open();
  } catch (e) {
    showNotification('Checkout error: ' + e.message, true);
  }
}

function openMap() {
  alert('Store Locator\n\nDelhi – Plot 12, Sector 5\nMumbai – Andheri East\nBangalore – Koramangala');
}

document.addEventListener('DOMContentLoaded', () => {
  const user = localStorage.getItem('loggedInUser');
  if (user) {
    const u = JSON.parse(user);
    document.querySelectorAll('#loginBtn, #signupBtn').forEach(el => el?.classList.add('hidden'));
    const profileLink = document.getElementById('profileLink');
    const profileName = document.getElementById('profileName');
    if (profileLink) profileLink.classList.remove('hidden');
    if (profileName) profileName.textContent = u.name;
  }

  loadProducts();
  updateCartBadge();
  setupDropdownCart();
});

// Global functions
window.updateQuantity = updateQuantity;
window.addToCart = addToCart;
window.buyNow = buyNow;
window.removeFromCart = removeFromCart;
window.proceedToCheckout = proceedToCheckout;
window.openMap = openMap;