// ----------------------------------------------------------
//  public/script.js  –  All client‑side logic (cart, auth, shop)
// ----------------------------------------------------------

// ---------- 1. CART (localStorage) ----------
let cart = JSON.parse(localStorage.getItem('cart')) || [];

/** Update badge on the cart icon */
function updateCartBadge() {
  const total = cart.reduce((sum, i) => sum + i.quantity, 0);
  const badge = document.getElementById('cartCount');
  if (badge) badge.textContent = total;
}

/** Show temporary toast */
function showNotification(msg) {
  const el = document.createElement('div');
  el.className = 'notification';
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

// ---------- 2. USER STATE (login / profile) ----------
document.addEventListener('DOMContentLoaded', () => {
  const user = localStorage.getItem('loggedInUser');
  if (user) {
    const u = JSON.parse(user);
    // hide login/signup
    const loginBtn = document.getElementById('loginBtn');
    const signupBtn = document.getElementById('signupBtn');
    if (loginBtn) loginBtn.classList.add('hidden');
    if (signupBtn) signupBtn.classList.add('hidden');

    // show profile link
    const profileLink = document.getElementById('profileLink');
    const profileName = document.getElementById('profileName');
    if (profileLink) profileLink.classList.remove('hidden');
    if (profileName) profileName.textContent = u.name;
  }

  // initialise everything else
  loadProducts();
  updateCartBadge();
  setupCartModal();
});

/** Logout – clear localStorage & reload */
function logout() {
  localStorage.removeItem('loggedInUser');
  localStorage.removeItem('cart');
  location.href = 'index.html';
}

// ---------- 3. LOAD PRODUCTS FROM MongoDB ----------
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

    // restore quantities from cart
    cart.forEach(item => {
      const el = document.getElementById(`qty-${item.id}`);
      if (el) el.textContent = item.quantity;
    });
  } catch (err) {
    console.error(err);
    showNotification('Could not load products');
  }
}

/** Add / increase item in cart */
function addToCart(id) {
  const existing = cart.find(i => i.id === id);
  if (existing) existing.quantity += 1;
  else cart.push({ id, quantity: 1 });
  localStorage.setItem('cart', JSON.stringify(cart));
  updateCartBadge();
  showNotification('Added to cart!');
}

/** Update quantity (‑ / +) */
function updateQuantity(id, change) {
  const item = cart.find(i => i.id === id);
  if (!item) return;
  item.quantity = Math.max(0, item.quantity + change);
  if (item.quantity === 0) cart = cart.filter(i => i.id !== id);
  localStorage.setItem('cart', JSON.stringify(cart));
  updateCartBadge();
  loadProducts(); // refresh qty display
}

// ---------- 4. BUY NOW – Razorpay ----------
async function buyNow(productId) {
  const user = localStorage.getItem('loggedInUser');
  if (!user) {
    alert('Please log in first');
    location.href = 'login.html';
    return;
  }

  try {
    const res = await fetch('/api/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId })
    });

    const order = await res.json();
    if (!res.ok) throw new Error(order.error || 'Order creation failed');

    const options = {
      key: process.env.RAZORPAY_KEY?.includes('test')
        ? process.env.RAZORPAY_KEY
        : 'rzp_test_YOUR_KEY', // fallback – replace in Vercel env
      amount: order.amount,
      currency: order.currency,
      name: 'C&R Building Solutions',
      description: `Purchase of ${order.product.name}`,
      order_id: order.id,
      handler: async function (response) {
        // optional: verify on backend
        alert('Payment successful! Order placed.');
        // clear cart for this product (optional)
        cart = cart.filter(i => i.id !== productId);
        localStorage.setItem('cart', JSON.stringify(cart));
        updateCartBadge();
        location.href = 'profile.html';
      },
      prefill: {
        name: JSON.parse(user).name,
        email: JSON.parse(user).email
      },
      theme: { color: '#EFB400' }
    };

    const rzp = new Razorpay(options);
    rzp.open();
  } catch (err) {
    console.error(err);
    alert('Payment failed – try again');
  }
}

// ---------- 5. CART MODAL ----------
function setupCartModal() {
  const modal = document.getElementById('cartModal');
  const closeBtn = document.querySelector('.close');
  const cartIcon = document.getElementById('cartIcon');
  const checkoutBtn = document.getElementById('checkoutBtn');

  cartIcon.onclick = () => {
    loadCartItems();
    modal.classList.remove('hidden');
  };
  closeBtn.onclick = () => modal.classList.add('hidden');
  window.onclick = e => {
    if (e.target === modal) modal.classList.add('hidden');
  };

  checkoutBtn.onclick = () => {
    const user = localStorage.getItem('loggedInUser');
    if (!user) {
      alert('Login required for checkout');
      location.href = 'login.html';
    } else {
      alert('Checkout feature coming soon!');
    }
  };
}

async function loadCartItems() {
  const itemsDiv = document.getElementById('cartItems');
  const totalSpan = document.getElementById('cartTotal');

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
        <div class="cart-item">
          <img src="${p.image}" alt="${p.name}">
          <div>
            <h4>${p.name}</h4>
            <p>₹${p.price} × ${item.quantity}</p>
          </div>
          <button onclick="removeFromCart('${item.id}')">×</button>
        </div>
      `;
    })
    .join('');

  itemsDiv.innerHTML = html;
  totalSpan.textContent = total.toLocaleString();
}

/** Remove whole item from cart */
function removeFromCart(id) {
  cart = cart.filter(i => i.id !== id);
  localStorage.setItem('cart', JSON.stringify(cart));
  updateCartBadge();
  loadCartItems();
  loadProducts();
}

// ---------- 6. STORE LOCATOR (simple alert – replace with map later) ----------
function openMap() {
  alert(
    'Store Locator\n\nDelhi – Plot 12, Sector 5\nMumbai – Andheri East\nBangalore – Koramangala'
  );
}

/* ----------------------------------------------------------
   OPTIONAL: expose some functions globally for inline onclick
   (used in product card quantity buttons)
---------------------------------------------------------- */
window.updateQuantity = updateQuantity;
window.addToCart = addToCart;
window.buyNow = buyNow;
window.removeFromCart = removeFromCart;
window.openMap = openMap;