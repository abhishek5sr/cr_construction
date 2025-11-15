// script.js - Shared JavaScript for C&R Building Solutions

// --------------------------------------------------------------
// 0. UTILITY FUNCTIONS
// --------------------------------------------------------------
function showNotification(message, type = 'success') {
  const notif = document.createElement('div');
  notif.className = `notification ${type}`;
  notif.textContent = message;
  document.body.appendChild(notif);
  setTimeout(() => notif.remove(), 3000);
}

function getPageName() {
  return window.location.pathname.split('/').pop() || 'index.html';
}

// --------------------------------------------------------------
// 1. AUTHENTICATION HANDLING
// --------------------------------------------------------------
const loggedInUser = JSON.parse(localStorage.getItem('loggedInUser')) || null;

function updateAuthUI() {
  const loginBtn = document.getElementById('loginBtn');
  const signupBtn = document.getElementById('signupBtn');
  const profileLink = document.getElementById('profileLink');
  const profileName = document.getElementById('profileName');

  if (loggedInUser) {
    if (loginBtn) loginBtn.classList.add('hidden');
    if (signupBtn) signupBtn.classList.add('hidden');
    if (profileLink) {
      profileLink.classList.remove('hidden');
      if (profileName) profileName.textContent = loggedInUser.name || 'Profile';
    }
  } else {
    if (loginBtn) loginBtn.classList.remove('hidden');
    if (signupBtn) signupBtn.classList.remove('hidden');
    if (profileLink) profileLink.classList.add('hidden');
  }
}

// Handle logout (used in profile.html)
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
  logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('loggedInUser');
    localStorage.removeItem('cart');
    showNotification('Logged out successfully');
    window.location.href = 'index.html';
  });
}

// --------------------------------------------------------------
// 2. CART STATE (localStorage)
// --------------------------------------------------------------
const CART_KEY = 'cr_cart';

function loadCart() {
  const raw = localStorage.getItem(CART_KEY);
  return raw ? JSON.parse(raw) : [];  // [{productId: string, quantity: number}]
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  updateCartBadge();
  updateDropdownCart();
}

function addToCart(productId, quantity = 1) {
  const cart = loadCart();
  const existing = cart.find(item => item.productId === productId);
  if (existing) {
    existing.quantity += quantity;
  } else {
    cart.push({ productId, quantity });
  }
  saveCart(cart);
  showNotification('Item added to cart');
}

function removeFromCart(productId) {
  let cart = loadCart();
  const index = cart.findIndex(item => item.productId === productId);
  if (index !== -1) {
    cart.splice(index, 1);
    saveCart(cart);
    showNotification('Item removed from cart');
  }
}

function updateCartItemQuantity(productId, newQuantity) {
  const cart = loadCart();
  const item = cart.find(i => i.productId === productId);
  if (item) {
    item.quantity = Math.max(1, newQuantity);  // Minimum 1
    saveCart(cart);
  }
}

function getCartTotal() {
  return loadCart().reduce((total, item) => total + item.quantity, 0);
}

function updateCartBadge() {
  const cartCount = document.getElementById('cartCount');
  if (cartCount) cartCount.textContent = getCartTotal();
}

// --------------------------------------------------------------
// 3. CART DROPDOWN
// --------------------------------------------------------------
const cartIcon = document.getElementById('cartIcon');
const cartDropdown = document.getElementById('cartDropdown');

if (cartIcon && cartDropdown) {
  cartIcon.addEventListener('click', () => {
    cartDropdown.classList.toggle('show');
    updateDropdownCart();
  });

  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (!cartIcon.contains(e.target) && !cartDropdown.contains(e.target)) {
      cartDropdown.classList.remove('show');
    }
  });
}

async function updateDropdownCart() {
  const dropdownItems = document.getElementById('dropdownCartItems');
  const dropdownTotal = document.getElementById('dropdownCartTotal');
  if (!dropdownItems || !dropdownTotal) return;

  const cart = loadCart();
  if (cart.length === 0) {
    dropdownItems.innerHTML = '<p>Your cart is empty</p>';
    dropdownTotal.textContent = '0';
    return;
  }

  try {
    const res = await fetch('/api/products');
    const products = await res.json();

    let totalAmount = 0;
    dropdownItems.innerHTML = cart.map(cartItem => {
      const product = products.find(p => p.id === cartItem.productId);
      if (!product) return '';

      const itemTotal = product.price * cartItem.quantity;
      totalAmount += itemTotal;

      return `
        <div class="dropdown-cart-item">
          <img src="${product.image}" alt="${product.name}">
          <div>
            <h4>${product.name}</h4>
            <p>₹${product.price} × ${cartItem.quantity} = ₹${itemTotal}</p>
          </div>
          <button onclick="removeFromCart('${cartItem.productId}')">×</button>
        </div>
      `;
    }).join('');

    dropdownTotal.textContent = totalAmount.toLocaleString();
  } catch (err) {
    console.error('Failed to load products for cart:', err);
    dropdownItems.innerHTML = '<p>Error loading cart</p>';
  }
}

// --------------------------------------------------------------
// 4. PRODUCT LOADING & RENDERING (for shop.html)
// --------------------------------------------------------------
async function loadProducts() {
  const productsGrid = document.getElementById('productsGrid');
  if (!productsGrid) return;  // Not on shop.html

  try {
    const res = await fetch('/api/products');
    if (!res.ok) throw new Error('Failed to fetch products');
    const products = await res.json();

    productsGrid.innerHTML = products.map(product => `
      <div class="product-card">
        <img src="${product.image}" alt="${product.name}">
        <h3>${product.name}</h3>
        <p>₹${product.price.toLocaleString()}</p>
        <div class="qty-controls">
          <button onclick="updateQuantity('${product.id}', -1)">-</button>
          <span id="qty-${product.id}">${getItemQuantity(product.id)}</span>
          <button onclick="updateQuantity('${product.id}', 1)">+</button>
        </div>
        <button onclick="addToCart('${product.id}')">Add to Cart</button>
      </div>
    `).join('');

    // Update quantities if already in cart
    products.forEach(p => updateQuantityDisplay(p.id));
  } catch (err) {
    console.error(err);
    productsGrid.innerHTML = '<p>Failed to load products. Please try again.</p>';
  }
}

function getItemQuantity(productId) {
  const cart = loadCart();
  return cart.find(item => item.productId === productId)?.quantity || 0;
}

function updateQuantity(productId, delta) {
  const currentQty = getItemQuantity(productId);
  const newQty = Math.max(0, currentQty + delta);
  if (newQty === 0) {
    removeFromCart(productId);
  } else {
    updateCartItemQuantity(productId, newQty);
  }
  updateQuantityDisplay(productId);
}

function updateQuantityDisplay(productId) {
  const qtySpan = document.getElementById(`qty-${productId}`);
  if (qtySpan) qtySpan.textContent = getItemQuantity(productId);
}

// --------------------------------------------------------------
// 5. CHECKOUT & PAYMENT
// --------------------------------------------------------------
const checkoutBtn = document.getElementById('checkoutBtn');
if (checkoutBtn) {
  checkoutBtn.addEventListener('click', async () => {
    if (!loggedInUser) {
      showNotification('Please log in to checkout', 'error');
      window.location.href = 'login.html';
      return;
    }

    const cart = loadCart();
    if (cart.length === 0) {
      showNotification('Your cart is empty', 'error');
      return;
    }

    try {
      const res = await fetch('/api/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: cart, userId: loggedInUser._id })
      });

      if (!res.ok) throw new Error('Failed to create order');
      const { id: orderId, amount, currency, products } = await res.json();

      const options = {
        key: process.env.RAZORPAY_KEY || 'your_razorpay_key_id',  // Replace with env or actual key
        amount,
        currency,
        name: 'C&R Building Solutions',
        description: 'Purchase of building materials',
        order_id: orderId,
        handler: async (response) => {
          try {
            const verifyRes = await fetch('/api/verify-payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                userId: loggedInUser._id,
                items: products,
                amount
              })
            });

            if (!verifyRes.ok) throw new Error('Payment verification failed');
            const { success } = await verifyRes.json();
            if (success) {
              localStorage.removeItem('cart');  // Clear cart after success
              showNotification('Payment successful! Order placed.');
              window.location.href = 'profile.html';  // Redirect to orders
            }
          } catch (err) {
            console.error(err);
            showNotification('Payment verification failed. Please contact support.', 'error');
          }
        },
        theme: { color: '#EFB400' }
      };

      const rzp = new Razorpay(options);
      rzp.open();
    } catch (err) {
      console.error(err);
      showNotification('Failed to initiate checkout. Try again.', 'error');
    }
  });
}

// --------------------------------------------------------------
// 6. PROFILE PAGE SPECIFIC (profile.html)
// --------------------------------------------------------------
if (getPageName() === 'profile.html') {
  if (!loggedInUser) {
    showNotification('Please log in to view profile', 'error');
    window.location.href = 'login.html';
  } else {
    const profileUserName = document.getElementById('profileUserName');
    const profileUserEmail = document.getElementById('profileUserEmail');
    const profileUserID = document.getElementById('profileUserID');
    if (profileUserName) profileUserName.textContent = loggedInUser.name;
    if (profileUserEmail) profileUserEmail.textContent = loggedInUser.email;
    if (profileUserID) profileUserID.textContent = loggedInUser._id;

    // Load orders (already in inline script, but can move here if needed)
  }
}

// --------------------------------------------------------------
// 7. INITIALIZATION
// --------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  updateAuthUI();
  updateCartBadge();
  if (getPageName() === 'shop.html') loadProducts();
  if (cartDropdown) updateDropdownCart();
});