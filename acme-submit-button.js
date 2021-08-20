/**
  * An example of a custom web component submit button extending
  * the native HTMLElement. When clicked it will find and run the
  * submit method on the closest parent form element.
  */
export class AcmeSubmitButton extends HTMLElement {
  constructor() {
    super();

    const shadowRoot = this.attachShadow({ mode: 'open' });

    const button = document.createElement('button');
    shadowRoot.appendChild(button);

    const slot = document.createElement('slot');
    button.appendChild(slot);

    const style = document.createElement('style');
    style.innerText = `
      button {
        apperance: none;
        border: none;
        background: green;
        color: #fff;
        border-radius: 0.5em;
        font-size: 2rem;
        padding: 0.5em 1em;
      }
    `;
    shadowRoot.appendChild(style);

    button.addEventListener('click', () => {
      const form = this.closest('c-form, form');
      form.submit();
    });
   
    setTimeout(() => {
      this.innerHTML = 'Submit';
    });
  }
}

customElements.define('acme-submit-button', AcmeSubmitButton);
