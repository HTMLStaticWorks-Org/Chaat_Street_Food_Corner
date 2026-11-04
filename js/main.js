/**
 * CHAAT ADDA – MAIN JAVASCRIPT (ES6 + jQuery / GSAP / Swiper / AOS / Lucide)
 * Handles:
 * - Sticky header & responsive hamburger menu (360px, 768px, 1024px)
 * - Menu category filtering, search & interactive cart/order summary
 * - WhatsApp order & enquiry message generation
 * - Catering & Contact form frontend validation
 * - GSAP + ScrollTrigger, Swiper & AOS animations (respecting reduced-motion)
 */

const CHAAT_CONFIG = {
  brandName: 'Chaat Adda',
  tagline: 'Every Bite Has a Story!',
  whatsappNumber: '919876543210', // Editable sample WhatsApp number
  phoneDisplay: '+91 98765 43210',
  phoneHref: 'tel:+919876543210',
  emailDisplay: 'hello@chaatadda.com',
  emailHref: 'mailto:hello@chaatadda.com',
  addressDisplay: 'Shop 14, Spice Bazaar Promenade, Sample Food Street (Editable Sample Address)',
  hoursDisplay: 'Mon – Sun: 11:30 AM – 11:00 PM',
  storageKey: 'chaat_adda_order_cart_v1'
};

/* ==========================================================================
   CART & ORDER MANAGEMENT
   ========================================================================== */

let orderCart = [];

function loadCart() {
  try {
    const raw = localStorage.getItem(CHAAT_CONFIG.storageKey);
    orderCart = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(orderCart)) orderCart = [];
  } catch (e) {
    orderCart = [];
  }
  updateCartUI();
}

function saveCart() {
  try {
    localStorage.setItem(CHAAT_CONFIG.storageKey, JSON.stringify(orderCart));
  } catch (e) {
    // Ignore storage quota errors
  }
  updateCartUI();
}

function addToOrder(id, name, price, category = 'Signature Chaat') {
  const numericPrice = Number(price) || 0;
  const existing = orderCart.find((item) => item.id === id);
  if (existing) {
    existing.qty += 1;
  } else {
    orderCart.push({
      id,
      name,
      price: numericPrice,
      category,
      qty: 1
    });
  }
  saveCart();
  showToast(`Added "${name}" (₹${numericPrice}) to your order!`);
}

function changeItemQty(id, delta) {
  const idx = orderCart.findIndex((item) => item.id === id);
  if (idx === -1) return;
  orderCart[idx].qty += delta;
  if (orderCart[idx].qty <= 0) {
    orderCart.splice(idx, 1);
  }
  saveCart();
}

function clearOrderCart() {
  orderCart = [];
  saveCart();
  showToast('Order list cleared.');
}

function getCartTotals() {
  let count = 0;
  let total = 0;
  orderCart.forEach((item) => {
    count += item.qty;
    total += item.price * item.qty;
  });
  return { count, total };
}

function buildWhatsAppOrderUrl(customItemName = null, customItemPrice = null) {
  const lines = [
    `*Namaste ${CHAAT_CONFIG.brandName}!*`,
    `I would like to place an order:`
  ];

  if (customItemName) {
    lines.push(`• 1 x ${customItemName} — ₹${customItemPrice}`);
    lines.push(`\n*Estimated Total:* ₹${customItemPrice}`);
  } else if (orderCart.length > 0) {
    orderCart.forEach((item, index) => {
      lines.push(`${index + 1}. ${item.name} x ${item.qty} = ₹${item.price * item.qty}`);
    });
    const { total } = getCartTotals();
    lines.push(`\n*Total Order Value:* ₹${total} (Sample Pricing)`);
  } else {
    lines.push(`Please share today's special chaat menu and combos!`);
  }

  lines.push(`\nPlease confirm availability and delivery/pickup time.`);
  const encoded = encodeURIComponent(lines.join('\n'));
  return `https://wa.me/${CHAAT_CONFIG.whatsappNumber}?text=${encoded}`;
}

function updateCartUI() {
  const { count, total } = getCartTotals();

  document.querySelectorAll('.cart-count-badge').forEach((el) => {
    el.textContent = String(count);
  });

  // Update WhatsApp Order links that dynamically use cart
  document.querySelectorAll('.js-whatsapp-cart-link').forEach((link) => {
    link.setAttribute('href', buildWhatsAppOrderUrl());
  });

  // Render Order Summary panel on Menu page if present
  const summaryList = document.getElementById('orderSummaryList');
  const summaryTotal = document.getElementById('orderSummaryTotal');
  const summaryCount = document.getElementById('orderSummaryCount');
  const emptyMsg = document.getElementById('orderEmptyMessage');
  const clearBtn = document.getElementById('clearOrderBtn');

  if (summaryTotal) summaryTotal.textContent = `₹${total}`;
  if (summaryCount) summaryCount.textContent = `${count} ${count === 1 ? 'Item' : 'Items'}`;

  if (summaryList) {
    summaryList.innerHTML = '';
    if (orderCart.length === 0) {
      if (emptyMsg) emptyMsg.style.display = 'block';
      if (clearBtn) clearBtn.style.display = 'none';
    } else {
      if (emptyMsg) emptyMsg.style.display = 'none';
      if (clearBtn) clearBtn.style.display = 'inline-flex';

      orderCart.forEach((item) => {
        const li = document.createElement('li');
        li.className = 'order-item-row';
        li.innerHTML = `
          <div>
            <strong class="d-block">${escapeHtml(item.name)}</strong>
            <span class="text-muted small">₹${item.price} each · Subtotal: <strong class="text-danger">₹${item.price * item.qty}</strong></span>
          </div>
          <div class="qty-controls">
            <button type="button" class="qty-btn" data-action="dec" data-id="${escapeHtml(item.id)}" aria-label="Decrease quantity of ${escapeHtml(item.name)}">−</button>
            <span class="fw-bold px-2">${item.qty}</span>
            <button type="button" class="qty-btn" data-action="inc" data-id="${escapeHtml(item.id)}" aria-label="Increase quantity of ${escapeHtml(item.name)}">+</button>
          </div>
        `;
        summaryList.appendChild(li);
      });
    }
  }
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/* ==========================================================================
   TOAST NOTIFICATION
   ========================================================================== */

let toastTimer = null;
function showToast(message) {
  let toast = document.getElementById('chaatToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'chaatToast';
    toast.className = 'chaat-toast';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add('show');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove('show');
  }, 2800);
}

/* ==========================================================================
   STICKY HEADER & HAMBURGER NAVIGATION
   ========================================================================== */

function initHeaderAndNav() {
  const header = document.querySelector('.site-header');
  const hamburgerBtn = document.getElementById('hamburgerBtn');
  const mobileDrawer = document.getElementById('mobileMenuDrawer');

  const handleScroll = () => {
    if (!header) return;
    if (window.scrollY > 30) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  };

  window.addEventListener('scroll', handleScroll, { passive: true });
  handleScroll();

  if (hamburgerBtn && mobileDrawer) {
    const closeMenu = () => {
      hamburgerBtn.setAttribute('aria-expanded', 'false');
      mobileDrawer.classList.remove('is-open');
      mobileDrawer.setAttribute('aria-hidden', 'true');
    };

    const toggleMenu = () => {
      const isExpanded = hamburgerBtn.getAttribute('aria-expanded') === 'true';
      if (isExpanded) {
        closeMenu();
      } else {
        hamburgerBtn.setAttribute('aria-expanded', 'true');
        mobileDrawer.classList.add('is-open');
        mobileDrawer.setAttribute('aria-hidden', 'false');
      }
    };

    hamburgerBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleMenu();
    });

    // Close when clicking a link inside mobile drawer
    mobileDrawer.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        closeMenu();
      });
    });

    // Close when clicking outside
    document.addEventListener('click', (e) => {
      if (
        mobileDrawer.classList.contains('is-open') &&
        !mobileDrawer.contains(e.target) &&
        !hamburgerBtn.contains(e.target)
      ) {
        closeMenu();
      }
    });

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && mobileDrawer.classList.contains('is-open')) {
        closeMenu();
        hamburgerBtn.focus();
      }
    });

    // Close if resized above 1024px
    window.addEventListener('resize', () => {
      if (window.innerWidth >= 1025 && mobileDrawer.classList.contains('is-open')) {
        closeMenu();
      }
    });
  }
}

/* ==========================================================================
   MENU FILTERING & LIVE SEARCH
   ========================================================================== */

function initMenuPageInteractions() {
  const filterBtns = document.querySelectorAll('.category-tab-btn');
  const searchInput = document.getElementById('menuSearchInput');
  const menuItems = document.querySelectorAll('.menu-item-col');
  const noResultsBox = document.getElementById('menuNoResults');

  if (menuItems.length === 0) return;

  let activeCategory = 'all';
  let searchQuery = '';

  const filterMenu = () => {
    let visibleCount = 0;

    menuItems.forEach((col) => {
      const itemCat = col.getAttribute('data-category') || '';
      const itemTitle = (col.getAttribute('data-name') || '').toLowerCase();
      const itemDesc = (col.getAttribute('data-desc') || '').toLowerCase();

      const matchesCategory = activeCategory === 'all' || itemCat === activeCategory;
      const matchesSearch =
        !searchQuery ||
        itemTitle.includes(searchQuery) ||
        itemDesc.includes(searchQuery) ||
        itemCat.replace(/-/g, ' ').includes(searchQuery);

      if (matchesCategory && matchesSearch) {
        col.style.display = '';
        visibleCount += 1;
      } else {
        col.style.display = 'none';
      }
    });

    if (noResultsBox) {
      noResultsBox.style.display = visibleCount === 0 ? 'block' : 'none';
    }
  };

  filterBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      filterBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      activeCategory = btn.getAttribute('data-filter') || 'all';
      filterMenu();
    });
  });

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = (e.target.value || '').trim().toLowerCase();
      document.querySelectorAll('.header-search-input').forEach((inp) => {
        if (inp !== e.target) inp.value = e.target.value;
      });
      filterMenu();
    });
  }

  // Also wire the global header search input for live filtering when on menu.html
  document.querySelectorAll('.header-search-form').forEach((form) => {
    const headerInput = form.querySelector('.header-search-input');
    if (headerInput) {
      headerInput.addEventListener('input', (e) => {
        searchQuery = (e.target.value || '').trim().toLowerCase();
        if (searchInput) searchInput.value = e.target.value;
        filterMenu();
      });
    }
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (headerInput) {
        searchQuery = (headerInput.value || '').trim().toLowerCase();
        if (searchInput) searchInput.value = headerInput.value;
        filterMenu();
        const gridEl = document.getElementById('menuItemsGrid');
        if (gridEl) gridEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  // Check URL hash or query param for category or search pre-selection
  const params = new URLSearchParams(window.location.search);
  const catParam = params.get('cat');
  if (catParam) {
    const targetBtn = document.querySelector(`.category-tab-btn[data-filter="${catParam}"]`);
    if (targetBtn) targetBtn.click();
  }
  const qParam = params.get('q');
  if (qParam) {
    searchQuery = qParam.trim().toLowerCase();
    if (searchInput) searchInput.value = qParam.trim();
    document.querySelectorAll('.header-search-input').forEach((inp) => {
      inp.value = qParam.trim();
    });
    filterMenu();
  }
}

/* ==========================================================================
   DELEGATED ADD-TO-ORDER & QUANTITY CLICKS
   ========================================================================== */

function initOrderButtons() {
  document.addEventListener('click', (e) => {
    const addBtn = e.target.closest('.js-add-to-order');
    if (addBtn) {
      e.preventDefault();
      const id = addBtn.getAttribute('data-id') || addBtn.getAttribute('data-name');
      const name = addBtn.getAttribute('data-name') || 'Special Chaat';
      const price = Number(addBtn.getAttribute('data-price') || 80);
      const category = addBtn.getAttribute('data-category') || 'Chaat';
      addToOrder(id, name, price, category);

      const summaryEl = document.getElementById('orderSummaryBox');
      if (summaryEl && addBtn.classList.contains('js-scroll-to-order')) {
        summaryEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    const qtyBtn = e.target.closest('.qty-btn');
    if (qtyBtn) {
      const id = qtyBtn.getAttribute('data-id');
      const action = qtyBtn.getAttribute('data-action');
      changeItemQty(id, action === 'inc' ? 1 : -1);
      return;
    }

    const clearBtn = e.target.closest('#clearOrderBtn');
    if (clearBtn) {
      e.preventDefault();
      clearOrderCart();
      return;
    }

    const pkgSelectBtn = e.target.closest('.js-select-package');
    if (pkgSelectBtn) {
      const pkgName = pkgSelectBtn.getAttribute('data-package');
      const reqField = document.getElementById('cateringRequirements');
      const formSection = document.getElementById('cateringEnquirySection');
      if (reqField && pkgName) {
        reqField.value = `Interested Package: ${pkgName}. `;
      }
      if (formSection) {
        formSection.scrollIntoView({ behavior: 'smooth' });
      }
      showToast(`Selected "${pkgName}" package!`);
    }
  });
}

/* ==========================================================================
   FORM VALIDATION (CATERING ENQUIRY & CONTACT FORMS)
   ========================================================================== */

function validateField(input, condition, errorId) {
  const errEl = document.getElementById(errorId);
  if (!condition) {
    input.classList.add('is-invalid');
    if (errEl) errEl.classList.add('visible');
    return false;
  }
  input.classList.remove('is-invalid');
  if (errEl) errEl.classList.remove('visible');
  return true;
}

function initForms() {
  // 1. Catering Enquiry Form
  const cateringForm = document.getElementById('cateringEnquiryForm');
  const cateringWhatsappBtn = document.getElementById('cateringWhatsappBtn');

  if (cateringForm) {
    const collectAndValidateCatering = () => {
      const fullName = document.getElementById('cateringName');
      const phone = document.getElementById('cateringPhone');
      const email = document.getElementById('cateringEmail');
      const eventType = document.getElementById('cateringEventType');
      const eventDate = document.getElementById('cateringEventDate');
      const guests = document.getElementById('cateringGuests');
      const location = document.getElementById('cateringLocation');
      const foodPref = document.getElementById('cateringPreference');
      const requirements = document.getElementById('cateringRequirements');

      const phoneRegex = /^[+\d][\d\s-]{7,15}$/;
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      const v1 = validateField(fullName, fullName.value.trim().length >= 2, 'errCateringName');
      const v2 = validateField(phone, phoneRegex.test(phone.value.trim()), 'errCateringPhone');
      const v3 = validateField(email, emailRegex.test(email.value.trim()), 'errCateringEmail');
      const v4 = validateField(eventType, eventType.value.trim() !== '', 'errCateringEventType');
      const v5 = validateField(eventDate, eventDate.value.trim() !== '', 'errCateringEventDate');
      const v6 = validateField(guests, Number(guests.value) >= 10, 'errCateringGuests');
      const v7 = validateField(location, location.value.trim().length >= 3, 'errCateringLocation');
      const v8 = validateField(foodPref, foodPref.value.trim() !== '', 'errCateringPreference');

      const isValid = v1 && v2 && v3 && v4 && v5 && v6 && v7 && v8;
      return {
        isValid,
        data: {
          fullName: fullName.value.trim(),
          phone: phone.value.trim(),
          email: email.value.trim(),
          eventType: eventType.value.trim(),
          eventDate: eventDate.value.trim(),
          guests: guests.value.trim(),
          location: location.value.trim(),
          foodPref: foodPref.value.trim(),
          requirements: requirements ? requirements.value.trim() : ''
        }
      };
    };

    cateringForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const { isValid, data } = collectAndValidateCatering();
      const statusBox = document.getElementById('cateringFormStatus');
      if (!isValid) {
        showToast('Please complete all highlighted catering enquiry fields.');
        return;
      }

      if (statusBox) {
        statusBox.className = 'form-status-box success';
        statusBox.innerHTML = `
          <strong>Thank you, ${escapeHtml(data.fullName)}!</strong> Your catering enquiry for
          <strong>${escapeHtml(data.eventType)}</strong> (${escapeHtml(data.guests)} guests on ${escapeHtml(data.eventDate)})
          has been validated and recorded (Frontend Demo Mode). Click "Send Enquiry on WhatsApp" below for instant confirmation!
        `;
      }
      showToast('Catering enquiry submitted successfully!');
      cateringForm.reset();
    });

    if (cateringWhatsappBtn) {
      cateringWhatsappBtn.addEventListener('click', () => {
        const { isValid, data } = collectAndValidateCatering();
        if (!isValid) {
          showToast('Please fill in the required event details before sending to WhatsApp.');
          return;
        }
        const msg = [
          `*Catering Enquiry – ${CHAAT_CONFIG.brandName}*`,
          `• *Name:* ${data.fullName}`,
          `• *Phone:* ${data.phone}`,
          `• *Email:* ${data.email}`,
          `• *Event Type:* ${data.eventType}`,
          `• *Event Date:* ${data.eventDate}`,
          `• *Guests:* ${data.guests}`,
          `• *Location:* ${data.location}`,
          `• *Food Preference:* ${data.foodPref}`,
          `• *Additional Notes:* ${data.requirements || 'None'}`
        ].join('\n');
        window.open(
          `https://wa.me/${CHAAT_CONFIG.whatsappNumber}?text=${encodeURIComponent(msg)}`,
          '_blank',
          'noopener'
        );
      });
    }
  }

  // 2. Contact Form
  const contactForm = document.getElementById('contactPageForm');
  if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('contactName');
      const email = document.getElementById('contactEmail');
      const phone = document.getElementById('contactPhone');
      const subject = document.getElementById('contactSubject');
      const message = document.getElementById('contactMessage');

      const phoneRegex = /^[+\d][\d\s-]{7,15}$/;
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      const v1 = validateField(name, name.value.trim().length >= 2, 'errContactName');
      const v2 = validateField(email, emailRegex.test(email.value.trim()), 'errContactEmail');
      const v3 = validateField(phone, phoneRegex.test(phone.value.trim()), 'errContactPhone');
      const v4 = validateField(subject, subject.value.trim().length >= 2, 'errContactSubject');
      const v5 = validateField(message, message.value.trim().length >= 5, 'errContactMessage');

      if (!(v1 && v2 && v3 && v4 && v5)) {
        showToast('Please check the highlighted fields in the contact form.');
        return;
      }

      const statusBox = document.getElementById('contactFormStatus');
      if (statusBox) {
        statusBox.className = 'form-status-box success';
        statusBox.innerHTML = `
          <strong>Dhanyawad, ${escapeHtml(name.value.trim())}!</strong> Your message regarding
          "<em>${escapeHtml(subject.value.trim())}</em>" has been received (Frontend-Only Submission Mode).
          For immediate assistance, connect with us on WhatsApp or call ${CHAAT_CONFIG.phoneDisplay}.
        `;
      }
      showToast('Message sent successfully!');
      contactForm.reset();
    });
  }
}

/* ==========================================================================
   ANIMATIONS (LUCIDE, AOS, SWIPER, GSAP + SCROLLTRIGGER)
   ========================================================================== */

function initAnimationsAndPlugins() {
  // 1. Lucide Icons + Built-in SVG Fallback for offline/blocked CDNs or brand icons
  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    window.lucide.createIcons();
  }

  const fallbackIcons = {
    instagram: '<rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>',
    facebook: '<path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>',
    youtube: '<path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17"/><path d="m10 15 5-3-5-3z"/>',
    clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
    flame: '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>'
  };

  document.querySelectorAll('i[data-lucide]').forEach((el) => {
    const name = (el.getAttribute('data-lucide') || '').toLowerCase();
    if (fallbackIcons[name] && !el.querySelector('svg')) {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('viewBox', '0 0 24 24');
      svg.setAttribute('fill', 'none');
      svg.setAttribute('stroke', 'currentColor');
      svg.setAttribute('stroke-width', '2');
      svg.setAttribute('stroke-linecap', 'round');
      svg.setAttribute('stroke-linejoin', 'round');
      svg.setAttribute('style', el.getAttribute('style') || 'width:20px;height:20px;');
      svg.innerHTML = fallbackIcons[name];
      el.replaceWith(svg);
    }
  });

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // 2. AOS
  if (window.AOS && typeof window.AOS.init === 'function') {
    window.AOS.init({
      duration: prefersReducedMotion ? 0 : 700,
      once: true,
      offset: 60,
      disable: prefersReducedMotion
    });
  }

  // 3. Swiper Carousels
  if (window.Swiper && document.querySelectorAll('.chaat-swiper').length > 0) {
    document.querySelectorAll('.chaat-swiper').forEach((swiperEl) => {
      new window.Swiper(swiperEl, {
        slidesPerView: 1,
        spaceBetween: 24,
        loop: true,
        autoplay: prefersReducedMotion
          ? false
          : {
              delay: 4200,
              disableOnInteraction: false
            },
        pagination: {
          el: swiperEl.querySelector('.swiper-pagination'),
          clickable: true
        },
        breakpoints: {
          640: { slidesPerView: 1 },
          768: { slidesPerView: 2 },
          1024: { slidesPerView: 3 }
        }
      });
    });
  }

  // 4. GSAP + ScrollTrigger
  if (!prefersReducedMotion && window.gsap) {
    const gsap = window.gsap;
    if (window.ScrollTrigger) {
      gsap.registerPlugin(window.ScrollTrigger);
    }

    // Hero entrance animation
    const heroTitle = document.querySelector('.hero-title');
    if (heroTitle) {
      gsap.from('.hero-animate-item', {
        y: 28,
        opacity: 0,
        duration: 0.75,
        stagger: 0.12,
        ease: 'power2.out'
      });
    }

    // Subtle floating spice pills
    if (document.querySelectorAll('.floating-spice-pill').length > 0) {
      gsap.to('.floating-spice-pill', {
        y: -6,
        duration: 2.2,
        repeat: -1,
        yoyo: true,
        stagger: 0.3,
        ease: 'sine.inOut'
      });
    }
  }
}

/* ==========================================================================
   THEME (LIGHT / DARK) & RTL / LTR DIRECTION TOGGLE
   ========================================================================== */

const THEME_STORAGE_KEY = 'chaat_adda_theme_v1';
const DIR_STORAGE_KEY = 'chaat_adda_dir_v1';

const SUN_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>';
const MOON_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>';
const RTL_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m16 3 4 4-4 4"/><path d="M20 7H4"/><path d="m8 21-4-4 4-4"/><path d="M4 17h16"/></svg>';

function applyTheme(theme) {
  const validTheme = theme === 'dark' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', validTheme);
  document.querySelectorAll('.js-theme-toggle').forEach((btn) => {
    const isDark = validTheme === 'dark';
    btn.classList.toggle('is-active', isDark);
    btn.setAttribute('aria-pressed', String(isDark));
    btn.setAttribute('aria-label', isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme');
    btn.innerHTML = `${isDark ? SUN_SVG : MOON_SVG}<span>${isDark ? 'Light' : 'Dark'}</span>`;
  });
}

function applyDirection(dir) {
  const validDir = dir === 'rtl' ? 'rtl' : 'ltr';
  document.documentElement.setAttribute('dir', validDir);
  document.querySelectorAll('.js-rtl-toggle').forEach((btn) => {
    const isRtl = validDir === 'rtl';
    btn.classList.toggle('is-active', isRtl);
    btn.setAttribute('aria-pressed', String(isRtl));
    btn.setAttribute('aria-label', isRtl ? 'Switch to LTR Layout' : 'Switch to RTL Layout');
    if (btn.closest('.desktop-header-actions')) {
      btn.innerHTML = `<span>${isRtl ? 'LTR' : 'RTL'}</span>`;
    } else {
      btn.innerHTML = `${RTL_SVG}<span>${isRtl ? 'LTR' : 'RTL'}</span>`;
    }
  });
}

function initThemeAndRtl() {
  let savedTheme = 'light';
  let savedDir = 'ltr';
  try {
    savedTheme = localStorage.getItem(THEME_STORAGE_KEY) || 'light';
    savedDir = localStorage.getItem(DIR_STORAGE_KEY) || 'ltr';
  } catch (e) {
    // Ignore storage errors
  }

  applyTheme(savedTheme);
  applyDirection(savedDir);

  document.addEventListener('click', (e) => {
    const themeBtn = e.target.closest('.js-theme-toggle');
    if (themeBtn) {
      e.preventDefault();
      const current = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
      const next = current === 'dark' ? 'light' : 'dark';
      try {
        localStorage.setItem(THEME_STORAGE_KEY, next);
      } catch (err) {}
      applyTheme(next);
      showToast(next === 'dark' ? 'Dark Theme Activated' : 'Light Theme Activated');
      return;
    }

    const rtlBtn = e.target.closest('.js-rtl-toggle');
    if (rtlBtn) {
      e.preventDefault();
      const currentDir = document.documentElement.getAttribute('dir') === 'rtl' ? 'rtl' : 'ltr';
      const nextDir = currentDir === 'rtl' ? 'ltr' : 'rtl';
      try {
        localStorage.setItem(DIR_STORAGE_KEY, nextDir);
      } catch (err) {}
      applyDirection(nextDir);
      showToast(nextDir === 'rtl' ? 'RTL (Right-to-Left) Mode Enabled' : 'LTR (Left-to-Right) Mode Enabled');
    }
  });
}

/* ==========================================================================
   INITIALIZE ON DOM READY
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  initThemeAndRtl();
  loadCart();
  initHeaderAndNav();
  initOrderButtons();
  initMenuPageInteractions();
  initForms();
  initAnimationsAndPlugins();
});

