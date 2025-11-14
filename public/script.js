// public/script.js
let cart = JSON.parse(localStorage.getItem('cart')) || [];

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

document.addEventListener('DOMContentLoaded', () => {
  const user = localStorage.getItem('loggedInUser');
  if (user) {
    const u = JSON.parse(user);
    const loginBtn = document.getElementById('loginBtn');
    const signupBtn = document.getElementById('signupBtn');
    if (loginBtn) loginBtn.classList.add('hidden');
    if (signupBtn) signupBtn.classList.add('hidden');

    const profileLink = document.getElementById('profileLink');
    const profileName = document.getElementById('profileName');
    if (profileLink) profileLink.classList.remove('hidden');
    if (profileName) profileName.textContent = u.name;
  }

  loadProducts();
  updateCartBadge();
  setupDropdownCart();
});

function logout() {
  localStorage.removeItem('loggedInUser');
  localStorage.removeItem('cart');
  location.href = 'index.html';
}

async function loadProducts() {
  try {
    const res = await fetch('/api/products');
    if (!res.ok) throw new Error('Failed to fetch products');
    const products = await res.json();

    const container = document.getElementById('productContainer');
    if (!container) return;

    container.innerHTML = products
      .map(
        p => `
        <div class="product-card">
          <img src="${p.image}" alt="${p.name}" loading="lazy">
          <h2>${p.name}</h2>
          <p>${p.description || ''}</p>
          <p class="price">₹${p.price.toLocaleString()}</p>
          <div class="quantity-controls">
            <button onclick="updateQuantity('${p._id}', -1)">−</button>
            <span id="qty-${p._id}">0</span>
            <button onclick="updateQuantity('${p._id}', 1)">+</button>
          </div>
          <button class="add-cart-btn" onclick="addToCart('${p._id}')">
            Add to Cart
          </button>
          <button class="buy-now-btn" onclick="buyNow('${p._id}')">
            Buy Now
          </button>
        </div>
      `
      )
      .join('');

    cart.forEach(item => {
      const el = document.getElementById(`qty-${item.id}`);
      if (el) el.textContent = item.quantity;
    });
  } catch (err) {
    console.error(err);
    showNotification('Could not load products', true);
  }
}

function addToCart(id) {
  const existing = cart.find(i => i.id === id);
  if (existing) existing.quantity += 1;
  else cart.push({ id, quantity: 1 });
  localStorage.setItem('cart', JSON.stringify(cart));
  updateCartBadge();
  showNotification('Added to cart!');
  loadDropdownCartItems();
}

function updateQuantity(id, change) {
  let item = cart.find(i => i.id === id);
  if (!item && change > 0) {
    item = { id, quantity: 0 };
    cart.push(item);
  }
  if (item) {
    item.quantity = Math.max(0, item.quantity + change);
    if (item.quantity === 0) cart = cart.filter(i => i.id !== id);
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartBadge();
    const el = document.getElementById(`qty-${id}`);
    if (el) el.textContent = item.quantity;
    loadDropdownCartItems();
  }
}

function removeFromCart(id) {
  cart = cart.filter(i => i.id !== id);
  localStorage.setItem('cart', JSON.stringify(cart));
  updateCartBadge();
  loadDropdownCartItems();
  loadProducts();
}

async function buyNow(productId) {
  const user = JSON.parse(localStorage.getItem('loggedInUser'));
  if (!user) {
    showNotification('Please log in first', true);
    setTimeout(() => (location.href = 'login.html'), 1500);
    return;
  }

  await checkout([{ productId, quantity: 1 }], user);
}

async function proceedToCheckout() {
  const user = JSON.parse(localStorage.getItem('loggedInUser'));
  if (!user) {
    showNotification('Please log in to checkout', true);
    setTimeout(() => (location.href = 'login.html'), 1500);
    return;
  }
  if (cart.length === 0) {
    showNotification('Cart is empty', true);
    return;
  }

  await checkout(cart.map(item => ({ productId: item.id, quantity: item.quantity })), user);
}

async function checkout(items, user) {
  try {
    const res = await fetch('/api/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items })
    });
    const order = await res.json();
    if (!res.ok) throw new Error(order.error || 'Order creation failed');

    const options = {
      key: 'rzp_test_RfiZOVuyueJdix', // Replace with your Razorpay test key
      amount: order.amount,
      currency: order.currency,
      name: 'C&R Building Solutions',
      description: `Purchase of ${order.products.length} items`,
      order_id: order.id,
      handler: async function (response) {
        const verifyRes = await fetch('/api/verify-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
            userId: user._id,
            items,
            amount: order.amount
          })
        });
        const verifyData = await verifyRes.json();
        if (verifyRes.ok) {
          showNotification('Payment successful! Order placed.');
          cart = [];
          localStorage.setItem('cart', JSON.stringify(cart));
          updateCartBadge();
          loadDropdownCartItems();
          setTimeout(() => (location.href = 'profile.html'), 1500);
        } else {
          showNotification(verifyData.error || 'Payment verification failed', true);
        }
      },
      prefill: { name: user.name, email: user.email },
      theme: { color: '#EFB400' }
    };

    const rzp = new Razorpay(options);
    rzp.open();
  } catch (err) {
    console.error(err);
    showNotification('Checkout failed – try again', true);
  }
}

function setupDropdownCart() {
  const cartIcon = document.getElementById('cartIcon');
  const dropdown = document.getElementById('cartDropdown');

  if (!dropdown) return;

  cartIcon.addEventListener('click', () => {
    dropdown.classList.toggle('show');
    loadDropdownCartItems();
  });

  document.addEventListener('click', (e) => {
    if (!cartIcon.contains(e.target) && !dropdown.contains(e.target)) {
      dropdown.classList.remove('show');
    }
  });
}

async function loadDropdownCartItems() {
  const itemsDiv = document.getElementById('dropdownCartItems');
  const totalSpan = document.getElementById('dropdownCartTotal');
  if (!itemsDiv) return;

  if (cart.length === 0) {
    itemsDiv.innerHTML = '<p>Your cart is empty</p>';
    totalSpan.textContent = '0';
    return;
  }

  const res = await fetch('/api/products');
  const products = await res.json();

  let total = 0;
  const html = cart
    .map(item => {
      const p = products.find(pr => pr._id === item.id);
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
    .join('');

  itemsDiv.innerHTML = html;
  totalSpan.textContent = total.toLocaleString();
}

function openMap() {
  alert('Store Locator\n\nDelhi – Plot 12, Sector 5\nMumbai – Andheri East\nBangalore – Koramangala');
}

window.updateQuantity = updateQuantity;
window.addToCart = addToCart;
window.buyNow = buyNow;
window.removeFromCart = removeFromCart;
window.openMap = openMap;
window.proceedToCheckout = proceedToCheckout;