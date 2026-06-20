/**
 * STITCH & CO - Theme JavaScript
 * Minimal, performant, no jQuery dependency
 */

(function() {
  'use strict';

  // === UTILITY HELPERS ===
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

  function debounce(fn, delay = 250) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  }

  // === MOBILE MENU ===
  class MobileMenu {
    constructor() {
      this.menu = $('[data-mobile-nav]');
      this.openBtn = $('[data-menu-open]');
      this.closeBtn = $('[data-menu-close]');
      this.overlay = $('[data-overlay]');
      if (!this.menu) return;
      this.bind();
    }

    bind() {
      this.openBtn?.addEventListener('click', () => this.open());
      this.closeBtn?.addEventListener('click', () => this.close());
      this.overlay?.addEventListener('click', () => this.close());
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') this.close();
      });
    }

    open() {
      this.menu.classList.add('is-open');
      this.overlay?.classList.add('is-active');
      document.body.classList.add('no-scroll');
      this.menu.setAttribute('aria-hidden', 'false');
    }

    close() {
      this.menu.classList.remove('is-open');
      this.overlay?.classList.remove('is-active');
      document.body.classList.remove('no-scroll');
      this.menu.setAttribute('aria-hidden', 'true');
    }
  }


  // === HEADER SCROLL BEHAVIOR ===
  class StickyHeader {
    constructor() {
      this.header = $('[data-header]');
      if (!this.header) return;
      this.lastScroll = 0;
      this.bind();
    }

    bind() {
      window.addEventListener('scroll', debounce(() => this.onScroll(), 10));
    }

    onScroll() {
      const scroll = window.pageYOffset;
      if (scroll > 50) {
        this.header.classList.add('header--shadow');
      } else {
        this.header.classList.remove('header--shadow');
      }
      this.lastScroll = scroll;
    }
  }

  // === CART DRAWER ===
  class CartDrawer {
    constructor() {
      this.drawer = $('[data-cart-drawer]');
      this.overlay = $('[data-overlay]');
      if (!this.drawer) return;
      this.bind();
    }

    bind() {
      $$('[data-cart-drawer-open]').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          this.open();
        });
      });

      $$('[data-cart-drawer-close]').forEach(btn => {
        btn.addEventListener('click', () => this.close());
      });

      this.overlay?.addEventListener('click', () => this.close());

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && this.isOpen()) this.close();
      });

      // Quantity buttons
      $$('[data-qty-minus]', this.drawer).forEach(btn => {
        btn.addEventListener('click', () => this.updateQty(btn.dataset.key, -1));
      });

      $$('[data-qty-plus]', this.drawer).forEach(btn => {
        btn.addEventListener('click', () => this.updateQty(btn.dataset.key, 1));
      });

      // Remove buttons
      $$('[data-cart-remove]').forEach(btn => {
        btn.addEventListener('click', () => this.removeItem(btn.dataset.cartRemove));
      });
    }

    isOpen() {
      return this.drawer.classList.contains('is-open');
    }

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

    async updateQty(key, change) {
      const item = $(`[data-cart-item="${key}"]`, this.drawer);
      const valueEl = $('[data-qty-value]', item);
      let qty = parseInt(valueEl.textContent) + change;
      if (qty < 1) qty = 0;

      try {
        const res = await fetch('/cart/change.js', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: key, quantity: qty })
        });
        if (res.ok) location.reload();
      } catch (e) {
        console.error('Cart update failed:', e);
      }
    }

    async removeItem(key) {
      try {
        const res = await fetch('/cart/change.js', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: key, quantity: 0 })
        });
        if (res.ok) location.reload();
      } catch (e) {
        console.error('Cart remove failed:', e);
      }
    }
  }


  // === PRODUCT GALLERY ===
  class ProductGallery {
    constructor() {
      this.mainImage = $('[data-gallery-main] img');
      this.thumbs = $$('[data-gallery-thumb]');
      if (!this.mainImage || !this.thumbs.length) return;
      this.bind();
    }

    bind() {
      this.thumbs.forEach(thumb => {
        thumb.addEventListener('click', () => {
          const src = thumb.dataset.galleryThumb;
          const srcset = thumb.dataset.srcset || '';
          this.mainImage.src = src;
          if (srcset) this.mainImage.srcset = srcset;
          this.thumbs.forEach(t => t.classList.remove('is-active'));
          thumb.classList.add('is-active');
        });
      });
    }
  }

  // === PRODUCT VARIANT PICKER ===
  class VariantPicker {
    constructor() {
      this.form = $('[data-product-form]');
      this.options = $$('[data-variant-option]');
      this.variantInput = $('[data-selected-variant]');
      this.variantsJson = $('[data-product-variants]');
      if (!this.form || !this.variantsJson) return;

      this.variants = JSON.parse(this.variantsJson.textContent);
      this.bind();
    }

    bind() {
      this.options.forEach(option => {
        option.addEventListener('click', () => {
          const group = option.closest('[data-option-group]');
          $$('[data-variant-option]', group).forEach(o => o.classList.remove('is-active'));
          option.classList.add('is-active');
          this.updateVariant();
        });
      });
    }

    updateVariant() {
      const selected = $$('[data-variant-option].is-active').map(o => o.dataset.variantOption);
      const match = this.variants.find(v => {
        return v.options.every((opt, i) => opt === selected[i]);
      });

      if (match && this.variantInput) {
        this.variantInput.value = match.id;

        // Update price display
        const priceEl = $('[data-product-price]');
        if (priceEl) {
          priceEl.textContent = this.formatMoney(match.price);
        }

        const compareEl = $('[data-product-compare-price]');
        if (compareEl) {
          if (match.compare_at_price && match.compare_at_price > match.price) {
            compareEl.textContent = this.formatMoney(match.compare_at_price);
            compareEl.style.display = '';
          } else {
            compareEl.style.display = 'none';
          }
        }

        // Update add to cart button
        const submitBtn = $('[data-add-to-cart]');
        if (submitBtn) {
          if (match.available) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Add to Cart';
          } else {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Sold Out';
          }
        }

        // Update URL
        const url = new URL(window.location);
        url.searchParams.set('variant', match.id);
        window.history.replaceState({}, '', url);
      }
    }

    formatMoney(cents) {
      const format = window.theme?.moneyFormat || '${{amount}}';
      const amount = (cents / 100).toFixed(2);
      return format
        .replace('{{amount}}', amount)
        .replace('{{amount_no_decimals}}', Math.round(cents / 100))
        .replace('{{amount_with_comma_separator}}', amount.replace('.', ','));
    }
  }


  // === ADD TO CART (AJAX) ===
  class AddToCart {
    constructor() {
      this.forms = $$('[data-product-form]');
      if (!this.forms.length) return;
      this.bind();
    }

    bind() {
      this.forms.forEach(form => {
        form.addEventListener('submit', (e) => this.handleSubmit(e, form));
      });
    }

    async handleSubmit(e, form) {
      e.preventDefault();
      const btn = $('[data-add-to-cart]', form);
      if (btn.disabled) return;

      const originalText = btn.textContent;
      btn.textContent = 'Adding...';
      btn.disabled = true;

      const formData = new FormData(form);
      const data = {
        id: formData.get('id'),
        quantity: parseInt(formData.get('quantity') || 1)
      };

      try {
        const res = await fetch('/cart/add.js', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });

        if (res.ok) {
          btn.textContent = 'Added!';
          this.updateCartCount();
          // Open cart drawer
          setTimeout(() => {
            location.reload();
          }, 600);
        } else {
          const error = await res.json();
          btn.textContent = error.description || 'Error';
        }
      } catch (err) {
        btn.textContent = 'Error';
        console.error('Add to cart failed:', err);
      }

      setTimeout(() => {
        btn.textContent = originalText;
        btn.disabled = false;
      }, 2000);
    }

    async updateCartCount() {
      try {
        const res = await fetch('/cart.js');
        const cart = await res.json();
        $$('[data-cart-count]').forEach(el => {
          el.textContent = cart.item_count;
          el.style.display = cart.item_count > 0 ? 'flex' : 'none';
        });
      } catch (e) {
        console.error('Cart count update failed:', e);
      }
    }
  }

  // === QUANTITY SELECTOR ===
  class QuantitySelector {
    constructor() {
      this.selectors = $$('[data-quantity-selector]');
      if (!this.selectors.length) return;
      this.bind();
    }

    bind() {
      this.selectors.forEach(selector => {
        const minus = $('[data-qty-decrease]', selector);
        const plus = $('[data-qty-increase]', selector);
        const input = $('[data-qty-input]', selector);

        minus?.addEventListener('click', () => {
          const val = parseInt(input.value) - 1;
          if (val >= 1) input.value = val;
        });

        plus?.addEventListener('click', () => {
          const val = parseInt(input.value) + 1;
          input.value = val;
        });
      });
    }
  }

  // === SCROLL ANIMATIONS ===
  class ScrollAnimations {
    constructor() {
      this.elements = $$('.animate-in');
      if (!this.elements.length) return;

      if ('IntersectionObserver' in window) {
        this.observer = new IntersectionObserver((entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              entry.target.classList.add('is-visible');
              this.observer.unobserve(entry.target);
            }
          });
        }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

        this.elements.forEach(el => this.observer.observe(el));
      } else {
        this.elements.forEach(el => el.classList.add('is-visible'));
      }
    }
  }

  // === PRODUCT STICKY ADD TO CART (MOBILE) ===
  class StickyATC {
    constructor() {
      this.sticky = $('[data-sticky-atc]');
      this.trigger = $('[data-add-to-cart]');
      if (!this.sticky || !this.trigger) return;
      this.bind();
    }

    bind() {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            this.sticky.style.display = 'none';
          } else {
            this.sticky.style.display = 'block';
          }
        });
      }, { threshold: 0 });

      observer.observe(this.trigger);
    }
  }

  // === INITIALIZE ===
  document.addEventListener('DOMContentLoaded', () => {
    new MobileMenu();
    new StickyHeader();
    new CartDrawer();
    new ProductGallery();
    new VariantPicker();
    new AddToCart();
    new QuantitySelector();
    new ScrollAnimations();
    new StickyATC();
  });

})();
