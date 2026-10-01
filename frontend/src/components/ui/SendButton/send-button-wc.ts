/**
 * Native Web Component: <send-button>
 * Strict visual reproduction of the reference paper airplane geometry:
 * IDLE → FOLDING → TRIANGLE → [EXACT REFERENCE AIRPLANE] → FLY UP-RIGHT → SENT
 */

export class SendButtonElement extends HTMLElement {
  static get observedAttributes() {
    return ['autoreset', 'label', 'sentlabel', 'disabled'];
  }

  private _button: HTMLButtonElement | null = null;
  private _state: 'idle' | 'folding' | 'sent' = 'idle';
  private _resetTimer: number | null = null;
  private _stageTimer: number | null = null;

  constructor() {
    super();
  }

  connectedCallback() {
    this.render();
    this.setupEvents();
  }

  disconnectedCallback() {
    this.clearTimers();
  }

  attributeChangedCallback(_name: string, oldValue: string | null, newValue: string | null) {
    if (oldValue !== newValue && this._button) {
      this.updateClasses();
    }
  }

  private get autoReset(): number {
    const attr = this.getAttribute('autoreset');
    return attr ? parseInt(attr, 10) : 2500;
  }

  private get label(): string {
    return this.getAttribute('label') || 'Send';
  }

  private get sentLabel(): string {
    return this.getAttribute('sentlabel') || 'Sent';
  }

  private get isDisabled(): boolean {
    return this.hasAttribute('disabled') || this.getAttribute('disabled') === 'true';
  }

  private clearTimers() {
    if (this._resetTimer !== null) {
      window.clearTimeout(this._resetTimer);
      this._resetTimer = null;
    }
    if (this._stageTimer !== null) {
      window.clearTimeout(this._stageTimer);
      this._stageTimer = null;
    }
  }

  private trigger() {
    if (this.isDisabled || this._state !== 'idle') return;

    this.clearTimers();
    this._state = 'folding';
    this.updateClasses();

    this.dispatchEvent(new CustomEvent('send', { bubbles: true, composed: true }));

    // Animation takes 1.9s: transition to sent state as plane departs
    this._stageTimer = window.setTimeout(() => {
      this._state = 'sent';
      this.updateClasses();

      if (this.autoReset > 0) {
        this._resetTimer = window.setTimeout(() => {
          this._state = 'idle';
          this.updateClasses();
          this.dispatchEvent(new CustomEvent('reset', { bubbles: true, composed: true }));
        }, this.autoReset);
      }
    }, 1850);
  }

  private updateClasses() {
    const wrap = this.querySelector('.sb-wrap');
    if (wrap) {
      wrap.className = [
        'sb-wrap',
        this._state === 'folding' ? 'sb-wrap--sending' : '',
        this._state === 'sent' ? 'sb-wrap--sent' : '',
      ]
        .filter(Boolean)
        .join(' ');
    }

    if (!this._button) return;

    this._button.className = [
      'sb-shape',
      this._state === 'folding' ? 'sb-shape--sending' : '',
      this._state === 'sent' ? 'sb-shape--sent' : '',
    ]
      .filter(Boolean)
      .join(' ');

    this._button.disabled = this.isDisabled || this._state !== 'idle';
    this._button.setAttribute('aria-busy', String(this._state === 'folding'));
    this._button.setAttribute('aria-disabled', String(this.isDisabled || this._state !== 'idle'));

    const labelSpan = this._button.querySelector('.sb-label span');
    if (labelSpan) {
      labelSpan.textContent = this.label;
    }

    const doneSpan = this.querySelector('.sb-done span');
    if (doneSpan) {
      doneSpan.textContent = this.sentLabel;
    }
  }

  private setupEvents() {
    this._button = this.querySelector('.sb-shape');
    if (!this._button) return;

    this._button.addEventListener('click', (e) => {
      e.preventDefault();
      this.trigger();
    });

    this._button.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.trigger();
      }
    });
  }

  private render() {
    this.innerHTML = `
      <div class="sb-wrap">
        <button type="button" class="sb-shape" aria-label="${this.label}">
          <span class="sb-label">
            <span>${this.label}</span>
          </span>
          <span class="sb-fold-crease" aria-hidden="true"></span>
          <span class="sb-facet sb-facet-upper" aria-hidden="true"></span>
          <span class="sb-facet sb-facet-keel" aria-hidden="true"></span>
          <span class="sb-facet sb-facet-lower" aria-hidden="true"></span>
        </button>
        <div class="sb-flight-trail" aria-hidden="true"></div>
        <div class="sb-done" aria-live="polite">
          <svg class="sb-done-check" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          <span>${this.sentLabel}</span>
        </div>
      </div>
    `;
    this._button = this.querySelector('.sb-shape');
    this.updateClasses();
  }
}

if (!customElements.get('send-button')) {
  customElements.define('send-button', SendButtonElement);
}
