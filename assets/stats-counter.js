import { Component } from '@theme/component';

/** @extends {Component<{values: HTMLElement[]}>} */
class StatsCounter extends Component {
  #observer;
  #controller;
  #frame = 0;
  #motion = matchMedia('(prefers-reduced-motion: reduce)');

  connectedCallback() {
    super.connectedCallback();
    this.#initialize();
  }

  updatedCallback() {
    super.updatedCallback();
    this.#cleanup();
    this.#initialize();
  }

  disconnectedCallback() {
    this.#cleanup();
    super.disconnectedCallback();
  }

  #initialize() {
    if (!this.hasAttribute('data-animate') || this.#motion.matches) return;
    this.#controller = new AbortController();
    this.#motion.addEventListener('change', this.#finish, { signal: this.#controller.signal });
    if (window.Shopify?.designMode) {
      this.addEventListener('shopify:block:select', this.#finish, { signal: this.#controller.signal });
    }
    this.#observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      this.#observer?.disconnect();
      this.#roll();
    }, { threshold: 0.1 });
    this.#observer.observe(this);
  }

  #roll() {
    const counters = [];
    for (const value of this.refs.values ?? []) {
      const text = value.dataset.value ?? '';
      if (value.dataset.completed === text) continue;
      value.dataset.completed = text;
      // Keep unsupported merchant text unchanged instead of rendering NaN.
      if (!/^-?\d+(?:,\d{3})*(?:\.\d+)?$/.test(text.trim())) continue;
      const target = Number(text.replaceAll(',', '').trim());
      if (!Number.isFinite(target) || Math.abs(target) > Number.MAX_SAFE_INTEGER) continue;
      const decimals = text.trim().split('.')[1]?.length ?? 0;
      if (decimals > 20) continue;
      const formatter = new Intl.NumberFormat('en-US', {
        useGrouping: text.includes(','),
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });
      value.textContent = formatter.format(0);
      counters.push({ value, target, decimals, formatter });
    }
    if (!counters.length) return;
    let start;
    const tick = (time) => {
      start ??= time;
      const progress = Math.min((time - start) / 1600, 1);
      const eased = 1 - (1 - progress) ** 3;
      for (const { value, target, decimals, formatter } of counters) {
        const scale = 10 ** decimals;
        const current = Math.trunc(target * eased * scale) / scale;
        value.textContent = formatter.format(current);
      }
      if (progress < 1) this.#frame = requestAnimationFrame(tick);
      else this.#finish();
    };
    this.#frame = requestAnimationFrame(tick);
  }

  #finish = () => {
    this.#observer?.disconnect();
    cancelAnimationFrame(this.#frame);
    this.#frame = 0;
    for (const value of this.refs.values ?? []) {
      value.textContent = value.dataset.value ?? '';
    }
  };

  #cleanup() {
    this.#controller?.abort();
    this.#finish();
  }
}

if (!customElements.get('stats-counter-component')) {
  customElements.define('stats-counter-component', StatsCounter);
}
