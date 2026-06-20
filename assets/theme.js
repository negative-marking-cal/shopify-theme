/**
 * STITCH & CO — Premium Theme JavaScript
 * Zero dependencies, performant, accessible
 */

(function() {
  'use strict';

  // === UTILITIES ===
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

  function debounce(fn, delay = 150) {
    let timer;
    return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), delay); };
  }

  function throttle(fn, limit = 100) {
    let last = 0;
    return (...args) => {
      const now = Date.now();
      if (now - last >= limit) { last = now; fn(...args); }
    };
  }

  function formatMoney(cents) {
    const format = window.theme?.moneyFormat || '₹{{amount}}';
    const amount = (cents / 100).toFixed(2);
    return format
      .replace('{{amount}}', amount)
      .replace('{{amount_no_decimals}}', Math.round(cents / 100))
      .replace('{{amount_with_comma_separator}}', amount.replace('.', ','))
      .replace('{{amount_with_apostrophe_separator}}', amount.replace('.', "'"));
  }

  // === SCROLL REVEAL ANIMATIONS ===
  class RevealOnScroll {
    constructor() {
      this.elements = $$('.reveal, .img-reveal');
      if (!this.elements.length || !('IntersectionObserver' in window)) {
        this.elements.forEach(el => { el.classList.add('is-visible'); });
        return;
      }
      this.init();
    }

    init() {
      this.observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            this.observer.unobserve(entry.target);
          }
        });
      }, {
        threshold: 0.08,
        rootMargin: '0px 0px -60px 0px'
      });

      this.elements.forEach(el => this.observer.observe(el));
    }
  }

  // === STICKY HEADER ===
  class StickyHeader {
    constructor() {
      this.header = $('[data-header]');
      if (!this.header) return;
      this.scrolled = false;
      this.init();
    }

    init() {
      const check = () => {
        const scrolled = window.scrollY > 50;
        if (scrolled !== this.scrolled) {
          this.scrolled = scrolled;
          this.header.classList.toggle('is-scrolled', scrolled);
        }
      };
      window.addEventListener('scroll', throttle(check, 50), { passive: true });
      check();
    }
  }

  // === MOBILE MENU ===
  class MobileMenu {
    constructor() {
      this.nav = $('[data-mobile-nav]');
      this.overlay = $('[data-overlay]');
      if (!this.nav) return;
      this.init();
    }

    init() {
      $$('[data-menu-open]').forEach(btn => btn.addEventListener('click', () => this.open()));
      $$('[data-menu-close]').forEach(btn => btn.addEventListener('click', () => this.close()));
      this.overlay?.addEventListener('click', () => this.close());
      document.addEventListener('keydown', (e) => { if (e.key === 'Escape') this.close(); });
    }

    open() {
      this.nav.classList.add('is-open');
      this.overlay?.classList.add('is-active');
      document.body.classList.add('no-scroll');
      this.nav.setAttribute('aria-hidden', 'false');
      // Focus first link
      const firstLink = $('a', this.nav);
      if (firstLink) setTimeout(() => firstLink.focus(), 100);
    }

    close() {
      this.nav.classList.remove('is-open');
      this.overlay?.classList.remove('is-active');
      document.body.classList.remove('no-scroll');
      this.nav.setAttribute('aria-hidden', 'true');
    }
  }

  // === CART DRAWER ===
  class CartDrawer {
    constructor() {
      this.drawer = $('[data-cart-drawer]');
      this.overlay = $('[data-overlay]');
      if (!this.drawer) return;
      this.init();
    }

    init() {
      $$('[data-cart-drawer-open]').forEach(btn => {
        btn.addEventListener('click', (e) => { e.preventDefault(); this.open(); });
      });
      $$('[data-cart-drawer-close]').forEach(btn => {
        btn.addEventListener('click', () => this.close());
      });
      this.overlay?.addEventListener('click', () => this.close());
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && this.isOpen()) this.close();
      });

      // Quantity & remove
      $$('[data-qty-minus]', this.drawer).forEach(btn => {
        btn.addEventListener('click', () => this.changeQty(btn.dataset.key, -1));
      });
      $$('[data-qty-plus]', this.drawer).forEach(btn => {
        btn.addEventListener('click', () => this.changeQty(btn.dataset.key, 1));
      });
      $$('[data-cart-remove]', this.drawer).forEach(btn => {
        btn.addEventListener('click', () => this.removeItem(btn.dataset.cartRemove));
      });
    }

    isOpen() { return this.drawer.classList.contains('is-open'); }

    open() {
      this.drawer.classList.add('is-open');
      this.overlay?.classList.add('is-active');
      document.body.classList.add('no-scroll');
      this.drawer.setAttribute('aria-hidden', 'false');
    }

    close() {
      this.drawer.classList.remove('is-open');
      this.overlay?.classList.remove('is-active');
      document.body.classList.remove('no-scroll');
      this.drawer.setAttribute('aria-hidden', 'true');
    }

    async changeQty(key, delta) {
      const item = $(`[data-cart-item="${key}"]`, this.drawer);
      if (!item) return;
      const valEl = $('[data-qty-value]', item);
      let qty = parseInt(valEl.textContent) + delta;
      if (qty < 0) qty = 0;

      item.style.opacity = '0.5';
      try {
        const res = await fetch('/cart/change.js', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: key, quantity: qty })
        });
        if (res.ok) window.location.reload();
      } catch (e) { console.error(e); item.style.opacity = '1'; }
    }

    async removeItem(key) {
      const item = $(`[data-cart-item="${key}"]`, this.drawer);
      if (item) {
        item.style.transform = 'translateX(100%)';
        item.style.opacity = '0';
      }
      try {
        const res = await fetch('/cart/change.js', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: key, quantity: 0 })
        });
        if (res.ok) setTimeout(() => window.location.reload(), 300);
      } catch (e) { console.error(e); }
    }
  }

  // === PRODUCT GALLERY ===
  class ProductGallery {
    constructor() {
      this.main = $('[data-gallery-main]');
      this.mainImg = this.main ? $('img', this.main) : null;
      this.thumbs = $$('[data-gallery-thumb]');
      if (!this.mainImg || !this.thumbs.length) return;
      this.init();
    }

    init() {
      this.thumbs.forEach(thumb => {
        thumb.addEventListener('click', () => {
          const src = thumb.dataset.galleryThumb;
          const srcset = thumb.dataset.srcset || '';
          this.mainImg.src = src;
          if (srcset) this.mainImg.srcset = srcset;
          this.thumbs.forEach(t => t.classList.remove('is-active'));
          thumb.classList.add('is-active');
        });
      });

      // Swipe support for mobile
      this.initSwipe();
    }

    initSwipe() {
      if (!this.main) return;
      let startX = 0;
      let diff = 0;

      this.main.addEventListener('touchstart', (e) => {
        startX = e.touches[0].clientX;
      }, { passive: true });

      this.main.addEventListener('touchmove', (e) => {
        diff = e.touches[0].clientX - startX;
      }, { passive: true });

      this.main.addEventListener('touchend', () => {
        if (Math.abs(diff) > 50) {
          const current = this.thumbs.findIndex(t => t.classList.contains('is-active'));
          let next = diff > 0 ? current - 1 : current + 1;
          next = Math.max(0, Math.min(next, this.thumbs.length - 1));
          if (this.thumbs[next]) this.thumbs[next].click();
        }
        diff = 0;
      }, { passive: true });
    }
  }

  // === VARIANT PICKER ===
  class VariantPicker {
    constructor() {
      this.form = $('[data-product-form]');
      this.variantsJson = $('[data-product-variants]');
      if (!this.form || !this.variantsJson) return;

      this.variants = JSON.parse(this.variantsJson.textContent);
      this.options = $$('[data-variant-option]');
      this.variantInput = $('[data-selected-variant]', this.form);
      this.init();
    }

    init() {
      this.options.forEach(option => {
        option.addEventListener('click', () => {
          const group = option.closest('[data-option-group]');
          $$('[data-variant-option]', group).forEach(o => o.classList.remove('is-active'));
          option.classList.add('is-active');

          // Update selected label
          const label = $('[data-option-selected]', group);
          if (label) label.textContent = option.dataset.variantOption;

          this.updateVariant();
        });
      });
    }

    updateVariant() {
      const selected = $$('[data-variant-option].is-active').map(o => o.dataset.variantOption);
      const match = this.variants.find(v => v.options.every((opt, i) => opt === selected[i]));

      if (!match) return;

      if (this.variantInput) this.variantInput.value = match.id;

      // Price
      const priceEl = $('[data-product-price]');
      if (priceEl) priceEl.textContent = formatMoney(match.price);

      const compareEl = $('[data-product-compare-price]');
      if (compareEl) {
        if (match.compare_at_price && match.compare_at_price > match.price) {
          compareEl.textContent = formatMoney(match.compare_at_price);
          compareEl.style.display = '';
        } else {
          compareEl.style.display = 'none';
        }
      }

      // Button state
      const btn = $('[data-add-to-cart]');
      if (btn) {
        btn.disabled = !match.available;
        btn.querySelector('[data-btn-text]').textContent = match.available ? 'Add to Cart' : 'Sold Out';
      }

      // Update gallery if variant has image
      if (match.featured_image) {
        const mainImg = $('[data-gallery-main] img');
        if (mainImg) mainImg.src = match.featured_image.src;
      }

      // URL
      const url = new URL(window.location);
      url.searchParams.set('variant', match.id);
      window.history.replaceState({}, '', url);
    }
  }

  // === ADD TO CART (AJAX) ===
  class AddToCart {
    constructor() {
      this.forms = $$('[data-product-form]');
      if (!this.forms.length) return;
      this.init();
    }

    init() {
      this.forms.forEach(form => {
        form.addEventListener('submit', (e) => this.handle(e, form));
      });

      // Quick add forms
      $$('[data-quick-add-form]').forEach(form => {
        form.addEventListener('submit', (e) => this.handle(e, form));
      });
    }

    async handle(e, form) {
      e.preventDefault();
      const btn = $('[data-add-to-cart]', form) || form.querySelector('button[type="submit"]');
      if (!btn || btn.disabled) return;

      const btnText = $('[data-btn-text]', btn) || btn;
      const originalText = btnText.textContent;
      btnText.textContent = 'Adding...';
      btn.disabled = true;

      const formData = new FormData(form);

      try {
        const res = await fetch('/cart/add.js', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: formData.get('id'),
            quantity: parseInt(formData.get('quantity') || 1)
          })
        });

        if (res.ok) {
          btnText.textContent = 'Added ✓';
          this.updateCartCount();

          // Open cart drawer after short delay
          setTimeout(() => {
            const drawer = $('[data-cart-drawer]');
            if (drawer) window.location.reload();
          }, 800);
        } else {
          const err = await res.json();
          btnText.textContent = err.description || 'Error';
        }
      } catch (err) {
        btnText.textContent = 'Error';
        console.error(err);
      }

      setTimeout(() => {
        btnText.textContent = originalText;
        btn.disabled = false;
      }, 2500);
    }

    async updateCartCount() {
      try {
        const res = await fetch('/cart.js');
        const cart = await res.json();
        $$('[data-cart-count]').forEach(el => {
          el.textContent = cart.item_count;
          el.style.display = cart.item_count > 0 ? 'flex' : 'none';
        });
      } catch (e) { /* silent */ }
    }
  }

  // === QUANTITY SELECTOR ===
  class QuantitySelector {
    constructor() {
      $$('[data-quantity-selector]').forEach(sel => {
        const minus = $('[data-qty-decrease]', sel);
        const plus = $('[data-qty-increase]', sel);
        const input = $('[data-qty-input]', sel);

        minus?.addEventListener('click', () => {
          const val = parseInt(input.value) - 1;
          if (val >= 1) input.value = val;
        });

        plus?.addEventListener('click', () => {
          input.value = parseInt(input.value) + 1;
        });
      });
    }
  }

  // === PRODUCT TABS ===
  class ProductTabs {
    constructor() {
      this.tabs = $$('[data-tab-trigger]');
      this.panels = $$('[data-tab-panel]');
      if (!this.tabs.length) return;
      this.init();
    }

    init() {
      this.tabs.forEach(tab => {
        tab.addEventListener('click', () => {
          const target = tab.dataset.tabTrigger;
          this.tabs.forEach(t => t.classList.remove('is-active'));
          this.panels.forEach(p => p.classList.remove('is-active'));
          tab.classList.add('is-active');
          const panel = $(`[data-tab-panel="${target}"]`);
          if (panel) panel.classList.add('is-active');
        });
      });
    }
  }

  // === STICKY ADD TO CART (MOBILE) ===
  class StickyATC {
    constructor() {
      this.sticky = $('[data-sticky-atc]');
      this.trigger = $('[data-add-to-cart]');
      if (!this.sticky || !this.trigger) return;

      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          this.sticky.style.display = entry.isIntersecting ? 'none' : 'block';
        });
      }, { threshold: 0 });

      observer.observe(this.trigger);
    }
  }

  // === PARALLAX HERO ===
  class ParallaxHero {
    constructor() {
      this.heroes = $$('[data-parallax]');
      if (!this.heroes.length || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      this.init();
    }

    init() {
      const onScroll = throttle(() => {
        const scrollY = window.scrollY;
        this.heroes.forEach(hero => {
          const img = $('img', hero);
          if (img && scrollY < window.innerHeight * 1.5) {
            img.style.transform = `translateY(${scrollY * 0.3}px)`;
          }
        });
      }, 16);

      window.addEventListener('scroll', onScroll, { passive: true });
    }
  }

  // === LAZY LOADING IMAGES ===
  class LazyImages {
    constructor() {
      if ('loading' in HTMLImageElement.prototype) return; // Native lazy load supported
      const images = $$('img[loading="lazy"]');
      if (!images.length || !('IntersectionObserver' in window)) return;

      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target;
            if (img.dataset.src) img.src = img.dataset.src;
            if (img.dataset.srcset) img.srcset = img.dataset.srcset;
            observer.unobserve(img);
          }
        });
      }, { rootMargin: '200px' });

      images.forEach(img => observer.observe(img));
    }
  }

  // === MARQUEE PAUSE ON HOVER ===
  class MarqueePause {
    constructor() {
      $$('[data-marquee]').forEach(marquee => {
        const track = $('[data-marquee-track]', marquee);
        if (!track) return;
        marquee.addEventListener('mouseenter', () => { track.style.animationPlayState = 'paused'; });
        marquee.addEventListener('mouseleave', () => { track.style.animationPlayState = 'running'; });
      });
    }
  }

  // === ANNOUNCEMENT BAR MARQUEE ===
  class AnnouncementMarquee {
    constructor() {
      const slider = $('.announcement-bar__slider');
      if (!slider || slider.children.length < 2) return;
      // Duplicate content for seamless loop
      const clone = slider.innerHTML;
      slider.innerHTML += clone;
    }
  }

  // === INITIALIZE EVERYTHING ===
  function init() {
    // Remove loading class
    document.body.classList.remove('is-loading');

    new RevealOnScroll();
    new StickyHeader();
    new MobileMenu();
    new CartDrawer();
    new ProductGallery();
    new VariantPicker();
    new AddToCart();
    new QuantitySelector();
    new ProductTabs();
    new StickyATC();
    new ParallaxHero();
    new LazyImages();
    new MarqueePause();
    new AnnouncementMarquee();
  }

  // === FAQ ACCORDION ===
  class FaqAccordion {
    constructor() {
      const items = $$('[data-faq-item]');
      items.forEach(item => {
        const btn = $('[data-faq-toggle]', item);
        btn?.addEventListener('click', () => {
          const isOpen = item.classList.contains('is-open');
          // Close all
          items.forEach(i => i.classList.remove('is-open'));
          // Open clicked (if was closed)
          if (!isOpen) item.classList.add('is-open');
        });
      });
    }
  }

  // === SCROLLY PROCESS ===
  class ScrollyProcess {
    constructor() {
      this.section = $('[data-scrolly]');
      if (!this.section) return;
      this.triggers = $$('[data-scrolly-trigger]', this.section);
      this.steps = $$('[data-scrolly-step]', this.section);
      this.bgs = $$('[data-scrolly-bg]', this.section);
      if (!this.triggers.length) return;
      this.init();
    }

    init() {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const idx = parseInt(entry.target.dataset.scrollyTrigger);
            this.activate(idx);
          }
        });
      }, { threshold: 0.5 });

      this.triggers.forEach(t => observer.observe(t));
    }

    activate(idx) {
      this.steps.forEach((s, i) => s.classList.toggle('is-active', i === idx));
      this.bgs.forEach((b, i) => b.classList.toggle('is-active', i === idx));
    }
  }

  // === HIGHLIGHT REVIEWS ON SCROLL ===
  class HighlightReviews {
    constructor() {
      this.items = $$('[data-highlight-item]');
      if (!this.items.length) return;

      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          entry.target.classList.toggle('is-highlighted', entry.isIntersecting);
        });
      }, { threshold: 0.6, rootMargin: '-10% 0px -30% 0px' });

      this.items.forEach(item => observer.observe(item));
    }
  }

  // === INITIALIZE EVERYTHING ===
  function initAll() {
    init();
    new HeroSlider();
    new FaqAccordion();
    new ScrollyProcess();
    new HighlightReviews();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }

})();


// === HERO SLIDER ===
class HeroSlider {
  constructor() {
    this.slider = document.querySelector('[data-hero-slider]');
    if (!this.slider) return;
    this.track = this.slider.querySelector('[data-slider-track]');
    this.slides = [...this.track.children];
    this.dots = [...this.slider.querySelectorAll('[data-slider-dot]')];
    this.prevBtn = this.slider.querySelector('[data-slider-prev]');
    this.nextBtn = this.slider.querySelector('[data-slider-next]');
    this.current = 0;
    this.total = this.slides.length;
    this.autoplayDelay = 5000;
    this.timer = null;

    if (this.total < 2) return;
    this.init();
  }

  init() {
    this.prevBtn?.addEventListener('click', () => { this.prev(); this.resetAutoplay(); });
    this.nextBtn?.addEventListener('click', () => { this.next(); this.resetAutoplay(); });
    this.dots.forEach(dot => {
      dot.addEventListener('click', () => { this.goTo(parseInt(dot.dataset.sliderDot)); this.resetAutoplay(); });
    });

    // Touch/swipe
    let startX = 0, diff = 0;
    this.track.addEventListener('touchstart', e => { startX = e.touches[0].clientX; }, { passive: true });
    this.track.addEventListener('touchmove', e => { diff = e.touches[0].clientX - startX; }, { passive: true });
    this.track.addEventListener('touchend', () => {
      if (Math.abs(diff) > 60) { diff > 0 ? this.prev() : this.next(); this.resetAutoplay(); }
      diff = 0;
    }, { passive: true });

    this.startAutoplay();
  }

  goTo(index) {
    this.current = ((index % this.total) + this.total) % this.total;
    this.track.style.transform = `translateX(-${this.current * 100}%)`;
    this.dots.forEach((d, i) => d.classList.toggle('is-active', i === this.current));
  }

  next() { this.goTo(this.current + 1); }
  prev() { this.goTo(this.current - 1); }

  startAutoplay() { this.timer = setInterval(() => this.next(), this.autoplayDelay); }
  resetAutoplay() { clearInterval(this.timer); this.startAutoplay(); }
}
