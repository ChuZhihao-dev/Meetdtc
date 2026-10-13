import { Component } from '@theme/component';

/**
 * Enhances native Hero background videos with scoped playback controls.
 * @typedef {object} Refs
 * @property {HTMLElement} media
 * @property {HTMLButtonElement} [toggle]
 * @property {HTMLElement} [icon]
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
  #userPaused = false;
  #userStarted = false;
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
      video.addEventListener('playing', () => {
        video.setAttribute('data-playing', '');
        this.#updateControl();
      }, { signal });
      video.addEventListener('pause', this.#updateControl, { signal });
      video.addEventListener('error', () => {
        video.removeAttribute('data-playing');
        this.#updateControl();
      }, { signal });
    }
    this.setAttribute('data-enhanced', '');
    this.#motion.addEventListener('change', () => {
      this.#userStarted = false;
      this.#sync();
    }, { signal });
    this.#viewport.addEventListener('change', this.#sync, { signal });
    document.addEventListener('visibilitychange', this.#sync, { signal });
    this.#observer = new IntersectionObserver((entries) => {
      this.#visible = entries.some((entry) => entry.isIntersecting);
      this.#sync();
    });
    this.#observer.observe(this);
    this.#updateControl();
  }

  /** Public declarative click handler. @param {MouseEvent} event */
  togglePlayback(event) {
    if (!(event.currentTarget instanceof Element) && !(event.target instanceof Element)) return;
    const playing = this.#videos.some((video) => !video.paused);
    this.#userPaused = playing;
    this.#userStarted = !playing;
    this.#sync();
  }

  #sync = async () => {
    const revision = ++this.#revision;
    const shouldPlay = this.#visible && !document.hidden && !this.#userPaused && (!this.#motion.matches || this.#userStarted);
    for (const video of this.#videos) {
      if (!shouldPlay || video.getBoundingClientRect().width === 0 || video.error) {
        video.pause();
        continue;
      }
      try {
        await video.play();
        if (revision !== this.#revision || !this.isConnected) return;
      } catch {
        // Autoplay denial retains the poster and offers explicit user playback.
        video.removeAttribute('data-playing');
      }
    }
    if (revision === this.#revision) this.#updateControl();
  };

  #updateControl = () => {
    const button = this.refs.toggle;
    if (!button) return;
    const active = this.#videos.filter((video) => video.getBoundingClientRect().width > 0 && !video.error);
    const playing = active.some((video) => !video.paused);
    button.hidden = active.length === 0;
    button.setAttribute('aria-label', (playing ? button.dataset.pauseLabel : button.dataset.playLabel) || '');
    if (this.refs.icon) this.refs.icon.textContent = playing ? 'Ⅱ' : '▶';
  };

  #cleanup() {
    ++this.#revision;
    this.#controller?.abort();
    this.#observer?.disconnect();
    for (const video of this.#videos) {
      video.pause();
      video.controls = true;
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
