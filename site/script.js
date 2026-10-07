/* ─────────────────────────────────────────
   CKA– script.js
   ───────────────────────────────────────── */

'use strict';

/* ══════════════════════════════════
   CUSTOM CURSOR
══════════════════════════════════ */
const cursor = document.getElementById('cursor');

document.addEventListener('mousemove', (e) => {
  cursor.style.left = e.clientX + 'px';
  cursor.style.top  = e.clientY + 'px';
});

document.querySelectorAll('a, button, .product-card, .coll-card').forEach(el => {
  el.addEventListener('mouseenter', () => cursor.classList.add('big'));
  el.addEventListener('mouseleave', () => cursor.classList.remove('big'));
});


/* ══════════════════════════════════
   TOAST NOTIFICATION
══════════════════════════════════ */
const toast = document.getElementById('toast');
let toastTimer = null;

function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 3000);
}


/* ══════════════════════════════════
   CART STATE
══════════════════════════════════ */
let cart = [];

function getCartSubtotal() {
  return cart.reduce((sum, item) => sum + item.price * item.qty, 0);
}

function getCartTotalItems() {
  return cart.reduce((s, i) => s + i.qty, 0);
}

function getCartTotal() {
  const subtotal = getCartSubtotal();
  const shipping = getShippingCost(subtotal, getCartTotalItems());
  return subtotal + shipping;
}

function updateCartCount() {
  const count = cart.reduce((s, i) => s + i.qty, 0);
  const badge = document.getElementById('cart-count');
  if (count > 0) {
    badge.textContent = count;
    badge.classList.remove('hidden');
  } else {
    badge.classList.add('hidden');
  }
}

function renderCart() {
  const list      = document.getElementById('cart-items');
  const subtotalEl= document.getElementById('cart-subtotal-price');
  const totalEl   = document.getElementById('cart-total-price');
  const shipLabel = document.getElementById('shipping-label');
  const shipPrice = document.getElementById('shipping-price');
  const shipBar   = document.getElementById('shipping-info-bar');

  list.innerHTML = '';

  if (cart.length === 0) {
    list.innerHTML = '<li class="cart-empty"><span>🕯️</span>Votre panier est vide</li>';
    subtotalEl.textContent = '0,00 €';
    totalEl.textContent    = '0,00 €';
    shipPrice.textContent  = '—';
    shipLabel.textContent  = 'Livraison';
    shipBar.textContent    = '';
    shipBar.className      = 'shipping-info-bar';
    return;
  }

  cart.forEach((item, idx) => {
    const li = document.createElement('li');
    li.className = 'cart-item';
    li.innerHTML = `
      <div class="cart-item-icon">CKA</div>
      <div class="cart-item-info">
        <p class="cart-item-name">${item.name}</p>
        <p class="cart-item-price">${item.price.toFixed(2).replace('.', ',')} €</p>
      </div>
      <div class="cart-item-qty">
        <button class="qty-btn" data-idx="${idx}" data-action="dec">−</button>
        <span class="qty-val">${item.qty}</span>
        <button class="qty-btn" data-idx="${idx}" data-action="inc">+</button>
      </div>
    `;
    list.appendChild(li);
  });

  const subtotal = getCartSubtotal();
  const shipping = getShippingCost(subtotal, getCartTotalItems());
  const total    = subtotal + shipping;
  const info     = getShippingLabel(shipping, subtotal);

  subtotalEl.textContent = subtotal.toFixed(2).replace('.', ',') + ' €';
  totalEl.textContent    = total.toFixed(2).replace('.', ',') + ' €';
  shipLabel.textContent  = info.label;
  shipPrice.textContent  = info.price;
  shipBar.textContent    = info.bar;
  shipBar.className      = 'shipping-info-bar ' + info.barClass;
}

function addToCart(name, price) {
  // Vérifier le stock disponible
  const inCart    = cart.find(i => i.name === name);
  const qtyInCart = inCart ? inCart.qty : 0;
  const available = getStock(name);

  if (available <= 0) {
    showToast(`"${name}" est en rupture de stock.`);
    return;
  }
  if (qtyInCart >= available) {
    showToast(`Stock insuffisant — il ne reste que ${available} exemplaire(s).`);
    return;
  }

  if (inCart) {
    inCart.qty++;
  } else {
    cart.push({ name, price: parseFloat(price), qty: 1 });
  }
  updateCartCount();
  renderCart();
  showToast(`✓ "${name}" ajouté au panier`);
}

// Qty buttons in cart
document.getElementById('cart-items').addEventListener('click', (e) => {
  const btn = e.target.closest('.qty-btn');
  if (!btn) return;
  const idx    = parseInt(btn.dataset.idx);
  const action = btn.dataset.action;

  if (action === 'inc') {
    const available = getStock(cart[idx].name);
    if (cart[idx].qty >= available) {
      showToast(`Stock max atteint (${available} disponibles).`);
      return;
    }
    cart[idx].qty++;
  } else {
    cart[idx].qty--;
    if (cart[idx].qty <= 0) cart.splice(idx, 1);
  }
  updateCartCount();
  renderCart();
});

// Add to cart via overlay buttons
document.querySelectorAll('.btn-overlay').forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    addToCart(btn.dataset.name, btn.dataset.price);
  });
});

/* ══════════════════════════════════
   FRAIS DE LIVRAISON
   Colissimo / Mondial Relay selon poids estimé
   Tu peux modifier les tranches ci-dessous
══════════════════════════════════ */

// Poids moyen estimé par bougie (grammes) — ajuste selon tes produits
const WEIGHT_PER_CANDLE = 350; // g emballage inclus

// Seuil livraison gratuite
const FREE_SHIPPING_THRESHOLD = 50; // €

// Grille tarifaire Colissimo (à jour 2025)
function getShippingCost(subtotal, totalItems) {
  if (subtotal === 0) return 0;

  // Livraison gratuite dès 50€
  if (subtotal >= FREE_SHIPPING_THRESHOLD) return 0;

  const totalWeight = totalItems * WEIGHT_PER_CANDLE;

  // Tarifs Colissimo France indicatifs
  if (totalWeight <= 250)  return 4.95;
  if (totalWeight <= 500)  return 5.50;
  if (totalWeight <= 750)  return 5.95;
  if (totalWeight <= 1000) return 6.50;
  if (totalWeight <= 2000) return 7.50;
  if (totalWeight <= 5000) return 9.90;
  return 12.50; // > 5kg
}

function getShippingLabel(shippingCost, subtotal) {
  if (subtotal === 0) return { label: 'Livraison', price: '—', bar: '', barClass: '' };

  if (shippingCost === 0) {
    return {
      label: 'Livraison',
      price: 'Gratuite 🎉',
      bar: '✓ Vous bénéficiez de la livraison gratuite !',
      barClass: 'free'
    };
  }

  const remaining = (FREE_SHIPPING_THRESHOLD - subtotal).toFixed(2);
  return {
    label: 'Livraison (Colissimo)',
    price: shippingCost.toFixed(2).replace('.', ',') + ' €',
    bar: `Plus que ${remaining.replace('.', ',')} € d'achat pour la livraison gratuite !`,
    barClass: subtotal >= FREE_SHIPPING_THRESHOLD * 0.7 ? 'almost' : 'normal'
  };
}


/* ══════════════════════════════════
   GESTION DU STOCK
   Pour modifier les stocks : change les data-stock="X"
   dans index.html sur chaque article.product-card
══════════════════════════════════ */

// Initialise le stock depuis les data-attributes HTML
const stock = {};
document.querySelectorAll('.product-card[data-stock]').forEach(card => {
  const name = card.dataset.name;
  stock[name] = parseInt(card.dataset.stock) || 0;
});

function getStock(name) {
  return stock[name] !== undefined ? stock[name] : 99;
}

function decreaseStock(name, qty = 1) {
  if (stock[name] !== undefined) {
    stock[name] = Math.max(0, stock[name] - qty);
    updateStockUI(name);
  }
}

function increaseStock(name, qty = 1) {
  if (stock[name] !== undefined) {
    stock[name] += qty;
    updateStockUI(name);
  }
}

function updateStockUI(name) {
  const card = document.querySelector(`.product-card[data-name="${name}"]`);
  if (!card) return;
  const qty   = stock[name];
  const badge = card.querySelector('.stock-badge');

  if (badge) {
    if (qty <= 0) {
      badge.textContent = 'Rupture de stock';
      badge.className = 'stock-badge stock-out';
      card.classList.add('out-of-stock');
    } else if (qty <= 3) {
      badge.textContent = `Plus que ${qty} en stock !`;
      badge.className = 'stock-badge stock-low';
      card.classList.remove('out-of-stock');
    } else {
      badge.textContent = `En stock (${qty})`;
      badge.className = 'stock-badge stock-ok';
      card.classList.remove('out-of-stock');
    }
  }
}

// Injecte le badge stock dans chaque fiche produit au chargement
function initStockBadges() {
  document.querySelectorAll('.product-card[data-stock]').forEach(card => {
    const name  = card.dataset.name;
    const qty   = stock[name];
    const info  = card.querySelector('.product-info');
    if (!info) return;

    const badge = document.createElement('span');
    badge.className = 'stock-badge';
    info.insertBefore(badge, info.firstChild);
    updateStockUI(name);
  });
}

initStockBadges();


/* ══════════════════════════════════
   EMAILJS — remplace les 3 valeurs ci-dessous
   après inscription sur emailjs.com
══════════════════════════════════ */
const EMAILJS_PUBLIC_KEY  = 'YOUR_PUBLIC_KEY';
const EMAILJS_SERVICE_ID  = 'YOUR_SERVICE_ID';
const EMAILJS_TEMPLATE_ID = 'YOUR_TEMPLATE_ID';

if (EMAILJS_PUBLIC_KEY !== 'YOUR_PUBLIC_KEY') {
  emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });
}

function getFormData() {
  return {
    nom:     document.getElementById('f-nom').value.trim(),
    email:   document.getElementById('f-email').value.trim(),
    tel:     document.getElementById('f-tel').value.trim(),
    adresse: document.getElementById('f-adresse').value.trim(),
    cp:      document.getElementById('f-cp').value.trim(),
    ville:   document.getElementById('f-ville').value.trim(),
    pays:    document.getElementById('f-pays').value.trim() || 'France',
  };
}

function validateForm() {
  const f = getFormData();
  const required = ['nom','email','tel','adresse','cp','ville'];
  let valid = true;

  required.forEach(id => {
    const el = document.getElementById('f-' + id);
    if (!f[id]) {
      el.classList.add('error');
      valid = false;
    } else {
      el.classList.remove('error');
    }
  });

  if (!f.email.includes('@')) {
    document.getElementById('f-email').classList.add('error');
    valid = false;
  }

  return valid;
}

function sendOrderEmail(paypalDetails) {
  if (EMAILJS_PUBLIC_KEY === 'YOUR_PUBLIC_KEY') return; // pas encore configuré

  const f      = getFormData();
  const items  = cart.map(i => `${i.name} x${i.qty} — ${(i.price * i.qty).toFixed(2)}€`).join('\n');
  const sub    = getCartSubtotal();
  const ship   = getShippingCost(sub, getCartTotalItems());

  emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
    client_nom:     f.nom,
    client_email:   f.email,
    client_tel:     f.tel,
    client_adresse: `${f.adresse}, ${f.cp} ${f.ville}, ${f.pays}`,
    commande:       items,
    sous_total:     sub.toFixed(2) + ' €',
    livraison:      ship === 0 ? 'Gratuite' : ship.toFixed(2) + ' €',
    total:          (sub + ship).toFixed(2) + ' €',
    paypal_id:      paypalDetails?.id || 'N/A',
  });
}

// Enlever l'erreur dès que le client tape
document.querySelectorAll('.form-input').forEach(input => {
  input.addEventListener('input', () => input.classList.remove('error'));
});


function initPayPal() {
  // Si le SDK PayPal n'est pas encore chargé (Client ID non configuré), on arrête
  if (typeof paypal === 'undefined') {
    console.warn('PayPal SDK non chargé — remplace YOUR_CLIENT_ID dans index.html');
    return;
  }

  paypal.Buttons({

    // Style du bouton
    style: {
      layout: 'vertical',   // bouton PayPal + bouton carte séparés
      color:  'black',
      shape:  'rect',
      label:  'pay'
    },

    // Création de la commande côté PayPal
    createOrder: function(data, actions) {
      if (cart.length === 0) {
        showToast('Votre panier est vide.');
        return;
      }

      // Validation du formulaire avant de lancer le paiement
      if (!validateForm()) {
        showToast('Veuillez remplir tous les champs obligatoires.');
        return;
      }

      const subtotal = getCartSubtotal();
      const shipping = getShippingCost(subtotal, getCartTotalItems());
      const total    = (subtotal + shipping).toFixed(2);

      // Construction des items pour PayPal
      const items = cart.map(item => ({
        name:     item.name,
        quantity: String(item.qty),
        unit_amount: {
          currency_code: 'EUR',
          value: item.price.toFixed(2)
        }
      }));

      return actions.order.create({
        purchase_units: [{
          description: 'Commande CKA – Bougies Artisanales',
          amount: {
            currency_code: 'EUR',
            value: total,
            breakdown: {
              item_total: {
                currency_code: 'EUR',
                value: subtotal.toFixed(2)
              },
              shipping: {
                currency_code: 'EUR',
                value: shipping.toFixed(2)
              }
            }
          },
          items: items
        }]
      });
    },

    // Paiement approuvé → on capture le montant
    onApprove: function(data, actions) {
      return actions.order.capture().then(function(details) {
        const name = details.payer.name.given_name;
        // Envoyer l'email de commande
        sendOrderEmail(details);
        // Décrémenter le stock pour chaque article acheté
        cart.forEach(item => decreaseStock(item.name, item.qty));
        // Vider le panier
        cart = [];
        updateCartCount();
        renderCart();
        closeCart();
        showToast(`✓ Merci ${name} ! Votre commande est confirmée.`);
      });
    },

    // Paiement annulé par l'utilisateur
    onCancel: function() {
      showToast('Paiement annulé.');
    },

    // Erreur PayPal
    onError: function(err) {
      console.error('Erreur PayPal :', err);
      showToast('Une erreur est survenue. Réessayez.');
    }

  }).render('#paypal-button-container');
}

// On initialise PayPal après le chargement complet de la page
window.addEventListener('load', initPayPal);


/* ══════════════════════════════════
   CART SIDEBAR OPEN / CLOSE
══════════════════════════════════ */
const cartSidebar  = document.getElementById('cart-sidebar');
const cartOverlay  = document.getElementById('cart-overlay');

function openCart() {
  cartSidebar.classList.add('open');
  cartOverlay.classList.add('open');
  renderCart();
}
function closeCart() {
  cartSidebar.classList.remove('open');
  cartOverlay.classList.remove('open');
}

document.getElementById('cart-btn').addEventListener('click', openCart);
document.getElementById('cart-close').addEventListener('click', closeCart);
cartOverlay.addEventListener('click', closeCart);


/* ══════════════════════════════════
   MOBILE MENU
══════════════════════════════════ */
const mobileMenu = document.getElementById('mobile-menu');

document.getElementById('menu-btn').addEventListener('click', () => {
  mobileMenu.classList.add('open');
  document.body.style.overflow = 'hidden';
});
document.getElementById('mobile-close').addEventListener('click', () => {
  mobileMenu.classList.remove('open');
  document.body.style.overflow = '';
});
mobileMenu.querySelectorAll('a').forEach(a => {
  a.addEventListener('click', () => {
    mobileMenu.classList.remove('open');
    document.body.style.overflow = '';
  });
});


/* ══════════════════════════════════
   SEARCH BAR
══════════════════════════════════ */
const searchBar   = document.getElementById('search-bar');
const searchInput = document.getElementById('search-input');

document.getElementById('search-btn').addEventListener('click', () => {
  searchBar.classList.remove('hidden');
  searchInput.focus();
});
document.getElementById('search-close-btn').addEventListener('click', () => {
  searchBar.classList.add('hidden');
  searchInput.value = '';
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    searchBar.classList.add('hidden');
    searchInput.value = '';
    mobileMenu.classList.remove('open');
    document.body.style.overflow = '';
  }
});

// Live search filter
searchInput.addEventListener('input', () => {
  const query = searchInput.value.toLowerCase().trim();
  document.querySelectorAll('.product-card').forEach(card => {
    const name = card.dataset.name.toLowerCase();
    if (!query || name.includes(query)) {
      card.classList.remove('hidden-card');
    } else {
      card.classList.add('hidden-card');
    }
  });
  if (query) {
    const section = document.getElementById('nouveautes');
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
});


/* ══════════════════════════════════
   PRODUCT FILTERS
══════════════════════════════════ */
document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    const filter = btn.dataset.filter;
    document.querySelectorAll('.product-card').forEach(card => {
      if (filter === 'all' || card.dataset.cat === filter) {
        card.classList.remove('hidden-card');
      } else {
        card.classList.add('hidden-card');
      }
    });
  });
});


/* ══════════════════════════════════
   WISHLIST
══════════════════════════════════ */
let wishlist = [];

document.querySelectorAll('.wishlist-icon').forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const name = btn.dataset.name;
    if (wishlist.includes(name)) {
      wishlist = wishlist.filter(n => n !== name);
      btn.classList.remove('active');
      btn.textContent = '♡';
      showToast(`"${name}" retiré des favoris`);
    } else {
      wishlist.push(name);
      btn.classList.add('active');
      btn.textContent = '♥';
      showToast(`♥ "${name}" ajouté aux favoris`);
    }
  });
});


/* ══════════════════════════════════
   SCROLL ANIMATIONS (Intersection Observer)
══════════════════════════════════ */
const animObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry, i) => {
    if (entry.isIntersecting) {
      // Stagger delay for grid children
      const siblings = entry.target.parentElement.querySelectorAll('[data-animate]');
      let delay = 0;
      siblings.forEach((el, idx) => {
        if (el === entry.target) delay = idx * 80;
      });
      setTimeout(() => entry.target.classList.add('visible'), delay);
      animObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });

document.querySelectorAll('[data-animate]').forEach(el => animObserver.observe(el));


/* ══════════════════════════════════
   STICKY NAV SHADOW
══════════════════════════════════ */
window.addEventListener('scroll', () => {
  const nav = document.getElementById('main-nav');
  nav.classList.toggle('scrolled', window.scrollY > 60);
});


/* ══════════════════════════════════
   TESTIMONIALS SLIDER
══════════════════════════════════ */
let currentTesti = 0;
const testiCards = document.querySelectorAll('.testi-card');
const dots       = document.querySelectorAll('.dot');

function goToTesti(idx) {
  testiCards[currentTesti].classList.remove('active');
  dots[currentTesti].classList.remove('active');
  currentTesti = idx;
  testiCards[currentTesti].classList.add('active');
  dots[currentTesti].classList.add('active');
}

dots.forEach(dot => {
  dot.addEventListener('click', () => goToTesti(parseInt(dot.dataset.idx)));
});

// Auto-advance every 5s
setInterval(() => {
  goToTesti((currentTesti + 1) % testiCards.length);
}, 5000);

// Init first card visible
testiCards[0].classList.add('active');


/* ══════════════════════════════════
   NEWSLETTER FORM
══════════════════════════════════ */
document.getElementById('nl-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const email = document.getElementById('nl-email').value.trim();
  const msg   = document.getElementById('nl-msg');

  if (!email || !email.includes('@')) {
    msg.textContent = 'Veuillez entrer une adresse email valide.';
    msg.style.color = '#E8A8A8';
    msg.classList.remove('hidden');
    return;
  }

  msg.textContent = '✓ Merci ! Votre code –10% arrive dans votre boîte mail.';
  msg.style.color = '';
  msg.classList.remove('hidden');
  document.getElementById('nl-email').value = '';

  setTimeout(() => msg.classList.add('hidden'), 5000);
});


/* ══════════════════════════════════
   SMOOTH SCROLL for anchor links
══════════════════════════════════ */
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', (e) => {
    const target = document.querySelector(a.getAttribute('href'));
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});
