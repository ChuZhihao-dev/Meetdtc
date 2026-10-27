import { prefersReducedMotion, yieldToMainThread } from '@theme/utilities';
import { Component } from '@theme/component';
import { getScrollContainer, getScrollTop } from '@theme/scroll-container';

/** Decorative text with a fixed theme font size and optional entrance effects. */
class JumboText extends Component {
  /** @type {IntersectionObserver | undefined} */
  #intersectionObserver;

  connectedCallback() {
    super.connectedCallback();
    this.#intersectionObserver = new IntersectionObserver(
      (entries) => {
        const entry = entries[entries.length - 1];
        if (!entry) return;

        if (entry.isIntersecting) {
          this.#updateTextTrim();
          this.classList.add('ready');
        }

        if (this.dataset.textEffect && this.dataset.textEffect !== 'none' && !prefersReducedMotion()) {
          if (entry.intersectionRatio >= 0.3) {
            if (this.dataset.animationRepeat === 'false') {
              this.#intersectionObserver?.unobserve(this);
            }
            yieldToMainThread().then(() => {
              if (this.isConnected && this.classList.contains('ready')) {
                this.classList.add('jumbo-text-visible');
              }
            });
          } else {
            this.classList.remove('ready', 'jumbo-text-visible');
          }
        }
      },
      { threshold: [0, 0.3] }
    );
    this.#intersectionObserver.observe(this);
  }

  disconnectedCallback() {
    this.#intersectionObserver?.disconnect();
    this.classList.remove('ready', 'jumbo-text-visible');
    super.disconnectedCallback();
  }

  #updateTextTrim() {
    if (this.dataset.capText === 'true') return;
    const lastSection = [...document.querySelectorAll('.shopify-section')].at(-1);
    if (lastSection && !lastSection.contains(this)) return;

    const bottom = this.getBoundingClientRect().bottom + getScrollTop();
    this.dataset.capText = (getScrollContainer().scrollHeight - bottom <= 100).toString();
  }
}

if (!customElements.get('jumbo-text')) {
  customElements.define('jumbo-text', JumboText);
}
