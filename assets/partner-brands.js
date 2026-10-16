import { Component } from '@theme/component';

/** @extends {Component<{rows: HTMLElement[]}>} */
class PartnerBrands extends Component {
  #controller;
  #resize;
  #frame = 0;
  #animations = [];
  #hovered = false;
  #focused = false;
  #selected = false;
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
    this.#controller = new AbortController();
    const { signal } = this.#controller;
    this.#motion.addEventListener('change', this.#restart, { signal });
    if (this.#motion.matches) return;
    this.addEventListener('pointerenter', this.#enter, { signal });
    this.addEventListener('pointerleave', this.#leave, { signal });
    this.addEventListener('focusin', this.#focus, { signal });
    this.addEventListener('focusout', this.#blur, { signal });
    this.addEventListener('load', this.#schedule, { capture: true, signal });
    if (window.Shopify?.designMode) {
      this.addEventListener('shopify:block:select', this.#select, { signal });
      this.addEventListener('shopify:block:deselect', this.#deselect, { signal });
    }
    this.#resize = new ResizeObserver(this.#schedule);
    for (const row of this.refs.rows ?? []) {
      this.#resize.observe(row);
      const group = row.querySelector('.brand-row__items');
      if (group) this.#resize.observe(group);
    }
    this.#schedule();
  }

  #restart = () => { this.#cleanup(); this.#initialize(); };
  #schedule = (event) => {
    if (event?.target instanceof Element && event.target.closest('[data-brand-clone]')) return;
    cancelAnimationFrame(this.#frame);
    this.#frame = requestAnimationFrame(this.#build);
  };

  #resetRows() {
    for (const animation of this.#animations) animation.cancel();
    this.#animations = [];
    for (const row of this.refs.rows ?? []) {
      for (const clone of row.querySelectorAll('[data-brand-clone]')) clone.remove();
      row.classList.remove('brand-row--scrolling');
    }
  }

  #build = () => {
    if (this.#selected || this.#focused) return;
    this.#resetRows();
    for (const row of this.refs.rows ?? []) {
      if (!['left', 'right'].includes(row.dataset.motion)) continue;
      const group = row.querySelector('.brand-row__items');
      const track = row.querySelector('.brand-row__track');
      if (!group || !track || !group.querySelector('.brand-logo')) continue;
      row.classList.add('brand-row--scrolling');
      const distance = group.getBoundingClientRect().width;
      const viewport = row.getBoundingClientRect().width;
      if (distance <= 0 || viewport <= 0) { row.classList.remove('brand-row--scrolling'); continue; }
      const copies = Math.ceil(viewport / distance) + 1;
      for (let index = 0; index < copies; index++) {
        const clone = group.cloneNode(true);
        clone.setAttribute('data-brand-clone', '');
        clone.setAttribute('aria-hidden', 'true');
        clone.setAttribute('inert', '');
        // Repeated visuals must never duplicate editor identities, refs or focus targets.
        for (const node of [clone, ...clone.querySelectorAll('*')]) {
          node.removeAttribute('id');
          node.removeAttribute('ref');
          node.removeAttribute('data-shopify-editor-block');
          if (node.matches('a, button, input, select, textarea, [tabindex]')) node.setAttribute('tabindex', '-1');
        }
        track.append(clone);
      }
      const frames = [{ transform: 'translateX(0)' }, { transform: `translateX(-${distance}px)` }];
      if (row.dataset.motion === 'right') frames.reverse();
      this.#animations.push(track.animate(frames, { duration: distance / 30 * 1000, iterations: Infinity, easing: 'linear' }));
    }
    this.#sync();
  };

  #enter = () => { this.#hovered = true; this.#sync(); };
  #leave = () => { this.#hovered = false; this.#sync(); };
  #focus = (event) => {
    this.#focused = true;
    // Restore wrapped originals while navigating links, so none stay clipped offscreen.
    if (event.target instanceof Element && event.target.closest('.brand-logo')) this.#resetRows();
    this.#sync();
  };
  #blur = (event) => {
    this.#focused = event.relatedTarget instanceof Node && this.contains(event.relatedTarget);
    if (!this.#focused) this.#schedule();
    this.#sync();
  };
  #select = () => { this.#selected = true; this.#resetRows(); };
  #deselect = () => { this.#selected = false; this.#schedule(); };

  #sync() {
    const paused = this.#hovered || this.#focused;
    for (const animation of this.#animations) paused ? animation.pause() : animation.play();
  }

  #cleanup() {
    this.#controller?.abort();
    this.#resize?.disconnect();
    cancelAnimationFrame(this.#frame);
    this.#resetRows();
    this.#hovered = false;
    this.#focused = false;
    this.#selected = false;
  }
}

if (!customElements.get('partner-brands-component')) {
  customElements.define('partner-brands-component', PartnerBrands);
}
