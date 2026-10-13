import { Component } from '@theme/component';

/**
 * Decorative, viewport-gated globe. The Liquid image remains available without WebGL.
 * @typedef {object} Refs
 * @property {HTMLCanvasElement} canvas
 * @property {HTMLElement} host
 * @property {HTMLImageElement} fallback
 * @extends Component<Refs>
 */
class ServicesGlobe extends Component {
  requiredRefs = ['canvas', 'host', 'fallback'];
  /** @type {{ update: (state: object) => void, destroy: () => void } | undefined} */
  #globe;
  /** @type {AbortController | undefined} */
  #controller;
  /** @type {IntersectionObserver | undefined} */
  #intersection;
  /** @type {ResizeObserver | undefined} */
  #resize;
  #motion = matchMedia('(prefers-reduced-motion: reduce)');
  #visible = false;
  #pending = false;
  #frame = 0;
  #lastTime = 0;
  #phi = 0.8;

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
    this.#motion.addEventListener('change', this.#sync, { signal });
    document.addEventListener('visibilitychange', this.#sync, { signal });
    this.refs.canvas.addEventListener('webglcontextlost', this.#contextLost, { signal });
    this.#intersection = new IntersectionObserver((entries) => {
      this.#visible = entries.some((entry) => entry.isIntersecting);
      this.#sync();
    });
    this.#intersection.observe(this);
    this.#resize = new ResizeObserver(() => {
      const size = this.refs.host.clientWidth;
      if (size > 0) this.#globe?.update({ width: size, height: size });
    });
    this.#resize.observe(this.refs.host);
  }

  #sync = () => {
    cancelAnimationFrame(this.#frame);
    this.#frame = 0;
    this.#lastTime = 0;
    if (!this.#visible || document.hidden) return;
    if (!this.#globe) {
      void this.#create();
      return;
    }
    if (this.dataset.rotate === 'true' && !this.#motion.matches) {
      this.#frame = requestAnimationFrame(this.#animate);
    }
  };

  async #create() {
    if (this.#pending) return;
    const controller = this.#controller;
    this.#pending = true;
    try {
      const { default: createGlobe } = await import('./cobe.js');
      if (controller?.signal.aborted || !this.isConnected) return;
      const { canvas, host } = this.refs;
      const context = { alpha: true, antialias: true, depth: false, stencil: false, preserveDrawingBuffer: this.dataset.rotate !== 'true' || this.#motion.matches };
      const gl = canvas.getContext('webgl2', context) || canvas.getContext('webgl', context);
      if (!gl) return;
      const size = host.clientWidth;
      if (size <= 0) return;
      this.#globe = createGlobe(canvas, {
        width: size,
        height: size,
        devicePixelRatio: Math.min(devicePixelRatio || 1, 1.5),
        phi: this.#phi,
        theta: 0.35,
        dark: 0,
        diffuse: 0.9,
        mapSamples: 40000,
        mapBrightness: 1.25,
        mapBaseBrightness: 0,
        baseColor: [1, 1, 1],
        markerColor: [0, 0.16, 1],
        glowColor: [1, 1, 1],
        scale: 1.12,
        markers: [],
        context,
      });
      if (gl.isContextLost() || gl.getError() !== gl.NO_ERROR) {
        this.#globe.destroy();
        this.#globe = undefined;
        return;
      }
      this.setAttribute('data-ready', '');
      this.#sync();
    } catch (error) {
      console.warn('[services-globe] Static globe retained:', error);
    } finally {
      if (this.#controller === controller) this.#pending = false;
    }
  }

  /** @param {number} time */
  #animate = (time) => {
    if (this.#lastTime) this.#phi += Math.min(time - this.#lastTime, 100) * 0.00006;
    this.#lastTime = time;
    this.#globe?.update({ phi: this.#phi });
    this.#frame = requestAnimationFrame(this.#animate);
  };

  /** @param {Event} event */
  #contextLost = (event) => {
    event.preventDefault();
    this.#cleanup();
  };

  #cleanup() {
    this.#controller?.abort();
    this.#intersection?.disconnect();
    this.#resize?.disconnect();
    cancelAnimationFrame(this.#frame);
    this.#frame = 0;
    this.#lastTime = 0;
    this.#visible = false;
    this.#pending = false;
    this.#globe?.destroy();
    this.#globe = undefined;
    // COBE v2 adds an anchor wrapper. Restore the original tree before a reconnect.
    const { canvas, host } = this.refs;
    if (canvas && host && canvas.parentElement !== host && host.contains(canvas)) {
      const wrapper = canvas.parentElement;
      host.append(canvas);
      wrapper?.remove();
    }
    this.removeAttribute('data-ready');
  }
}

if (!customElements.get('services-globe-component')) {
  customElements.define('services-globe-component', ServicesGlobe);
}
