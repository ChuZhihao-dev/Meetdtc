import { Component } from '@theme/component';

/**
 * Plays visible Hero background videos, optionally once per video element.
 * @typedef {object} Refs
 * @property {HTMLElement} media
 * @extends Component<Refs>
 */
class GrowthHero extends Component {
  requiredRefs = ['media'];
  /** @type {HTMLVideoElement[]} */
  #videos = [];
  /** @type {AbortController | undefined} */
  #controller;
  /** @type {IntersectionObserver | undefined} */
  #observer;
  #motion = matchMedia('(prefers-reduced-motion: reduce)');
  #viewport = matchMedia('(max-width: 749px)');
  #visible = false;
  #revision = 0;

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
    this.#videos = [...this.refs.media.querySelectorAll('video')];
    for (const video of this.#videos) {
      video.controls = false;
      video.muted = true;
      video.autoplay = false;
      video.loop = this.dataset.playOnce !== 'true';
      video.addEventListener('playing', () => {
        video.setAttribute('data-playing', '');
      }, { signal });
      // Preserve the last frame when the same completed video is reconnected.
      if (this.dataset.playOnce === 'true' && video.ended) video.setAttribute('data-playing', '');
      video.addEventListener('error', () => {
        video.removeAttribute('data-playing');
      }, { signal });
    }
    this.setAttribute('data-enhanced', '');
    this.#motion.addEventListener('change', this.#sync, { signal });
    this.#viewport.addEventListener('change', this.#sync, { signal });
    document.addEventListener('visibilitychange', this.#sync, { signal });
    this.#observer = new IntersectionObserver((entries) => {
      this.#visible = entries.some((entry) => entry.isIntersecting);
      this.#sync();
    });
    this.#observer.observe(this);
  }

  #sync = async () => {
    const revision = ++this.#revision;
    const shouldPlay = this.#visible && !document.hidden && !this.#motion.matches;
    const visible = this.#videos.map((video) => video.getBoundingClientRect().width > 0);
    for (const [index, video] of this.#videos.entries()) {
      if (!shouldPlay || !visible[index] || video.error || (this.dataset.playOnce === 'true' && video.ended)) {
        video.pause();
        continue;
      }
      try {
        await video.play();
        if (revision !== this.#revision || !this.isConnected) {
          if (!this.isConnected || !this.#visible || document.hidden) video.pause();
          return;
        }
      } catch {
        // Autoplay denial retains the static poster.
        video.removeAttribute('data-playing');
      }
    }
  };

  #cleanup() {
    ++this.#revision;
    this.#controller?.abort();
    this.#observer?.disconnect();
    for (const video of this.#videos) {
      video.pause();
      video.controls = false;
      video.removeAttribute('data-playing');
    }
    this.#videos = [];
    this.#visible = false;
    this.removeAttribute('data-enhanced');
  }
}

if (!customElements.get('growth-hero-component')) {
  customElements.define('growth-hero-component', GrowthHero);
}
