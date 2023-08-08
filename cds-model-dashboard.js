const { html, CElement, css, httpRequest } = window.CComponents;

export class CdsModelDashboard extends CElement {
  static get styles() {
    return [
      ...super.styles,
      css`
        :host {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        h1 {
          font-size: x-large;
        }

        c-card:first-child {
          gap: 4px;
        }

        c-indicator {
          padding-top: 4px;
          padding-bottom: 8px;
        }
      `
    ];
  }

  static get properties() {
    return {
      ...super.properties,
      id: { type: String, reflect: true },
      data: { type: Object, state: true },
      negativePredictors: { type: Object, state: true },
      positivePredictors: { type: Object, state: true },
      prediction: { type: Number, state: true },
      limit: { type: Number },
      src: { type: String },
      ehrId: { type: String },
      topPositive: { type: Number },
      topNegative: { type: Number }
    };
  }

  updated(props) {
    if (
      props.has('src') ||
      props.has('ehrId') ||
      props.has('topPositive') ||
      props.has('topNegative')
    ) {
      this.#fetch();
    }
  }

  get #positiveLabels() {
    return (this.positivePredictors || []).map(p => Object.keys(p)[0]);
  }

  get #positiveValues() {
    return (this.positivePredictors || []).map(p => Object.values(p)[0]);
  }

  get #negativeLabels() {
    return (this.negativePredictors || []).map(p => Object.keys(p)[0]);
  }

  get #negativeValues() {
    return (this.negativePredictors || []).map(p =>
      Math.abs(Object.values(p)[0])
    );
  }

  async #fetch() {
    if (this.src && this.ehrId !== undefined) {
      let url = `${this.src}?id=${this.ehrId}`;
      if (this.topPositive) {
        url += `&topPositive=${this.topPositive}`;
      }
      if (this.topNegative) {
        url += `&topNegative=${this.topNegative}`;
      }

      try {
        const data = await httpRequest({ url });

        this.positivePredictors = data.positive;
        this.negativePredictors = data.negative;
        this.prediction = data.prediction;
        this.modelLabel = data.modelLabel;
      } catch (error) {
        this.positivePredictors = undefined;
        this.negativePredictors = undefined;
        this.prediction = undefined;
        this.modelLabel = undefined;
      }
    }
  }

  #renderOfTotal() {
    const shown = this.#negativeValues.length + this.#positiveValues.length;

    if (!shown) {
      return '';
    }

    const text = `${shown} av 40 faktorer visas`;

    return html` <c-label size="s" text="${text}"></c-label> `;
  }

  #renderExplanation() {
    const indicatorVariant = this.modelLabel === 1 ? 'error' : 'success';
    const labelText =
      this.modelLabel === 1
        ? 'Hög risk för återinskrivning'
        : 'Ej hög risk för återinskrivning';
    return html`
      <c-label
        text="Predicerad risk för återinskrivning inom 30 dagar"
      ></c-label>
      <c-indicator
        variant="${indicatorVariant}"
        heading="${labelText}"
      ></c-indicator>

      <p>
        Nedan visas de faktorer som påverkat modellens analys av den aktuella
        patienten mest, uppdelat efter om faktorn har bedömts öka eller minska
        sannolikheten för återinskrivning inom 30 dagar. Klicka på en faktor för
        mer information.
      </p>
    `;
  }

  render() {
    return html`
      <c-card>
        <c-section>
          ${this.#renderExplanation()}

          <c-barchart
            heading="Ökar sannolikheten"
            color="#ffcdd2"
            .values="${this.#positiveValues}"
            .labels="${this.#positiveLabels}"
          ></c-barchart>
          <c-barchart
            heading="Minskar sannolikheten"
            color="#bbdefb"
            .values="${this.#negativeValues}"
            .labels="${this.#negativeLabels}"
          ></c-barchart>

          ${this.#renderOfTotal()}
        </c-section>
      </c-card>
    `;
  }
}

customElements.define('cds-model-dashboard', CdsModelDashboard);
