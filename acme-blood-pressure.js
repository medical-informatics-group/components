/**
 * Minimal example of a multi-field component for blood pressure input.
 * One container component and within two input components
 * Uses provided helper functions and inheritable classes
 */

const { html, Input, CElement } = window.CComponents;

/**
 * Internal component to handle user input
 * Extend Input class to hook into form value update cycle
 */
class AcmeInput extends Input {
  static get properties() {
    return {
      ...super.properties,
      name: { type: String, reflect: true },
      placeholder: { type: String },
    };
  }

  #value;

  get value() {
    return this.#value;
  }

  set value(val) {
    this.#value = val;
    const input = this.shadowRoot.querySelector('input');

    input.value = val;
  }

  get validity() {
    return super.validity;
  }

  onInput(event) {
    // Signal element has been touched by user
    this._removePristine();

    const oldValue = this.#value;
    const magnitude = Number(event.target.value);

    if (Number.isFinite(magnitude)) {
      this.#value = {
        magnitude,
        unit: 'mm[Hg]',
      };
    } else {
      this.#value = undefined;
    }

    // Signal value has been updated
    this.requestUpdate('value', oldValue);
  }

  render() {
    return html`
      <input
        placeholder="${this.placeholder}"
        type="number"
        @input="${this.onInput}"
      />
    `;
  }
}

customElements.define('acme-input', AcmeInput);

/**
 * Exported multi field container component
 * Extend CElement to hook into property editing
 */
export class AcmeBloodPressure extends CElement {
  // Provide form model bindings for input name-properties
  static get properties() {
    return {
      systolicBinding: {
        type: String,
      },
      diastolicBinding: {
        type: String,
      },
    };
  }

  // Open shadow root to expose inner input component form values
  createRenderRoot() {
    return this;
  }

  render() {
    return html`
      <acme-input
        name="${this.systolicBinding}"
        placeholder="Systolic"
      ></acme-input>

      <acme-input
        name="${this.diastolicBinding}"
        placeholder="Diastolic"
      ></acme-input>
    `;
  }
}

customElements.define('acme-blood-pressure', AcmeBloodPressure);
