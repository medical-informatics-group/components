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
    return (this.positivePredictors || []).map(p => p.label);
  }

  get #positiveValues() {
    return (this.positivePredictors || []).map(p => p.value);
  }

  get #positiveDescriptions() {
    return (this.positivePredictors || []).map(p => p.description);
  }

  get #negativeLabels() {
    return (this.negativePredictors || []).map(p => p.label);
  }

  get #negativeValues() {
    return (this.negativePredictors || []).map(p => Math.abs(p.value));
  }

  get #negativeDescriptions() {
    return (this.negativePredictors || []).map(p => p.description);
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

        this.negativePredictors = data.negative;
        this.positivePredictors = data.positive;
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

  #renderBody() {
    return html`
      <c-card>
        <c-section>
          ${this.#renderExplanation()}

          <cds-barchart
            heading="Ökar sannolikheten"
            color="#ffcdd2"
            .values="${this.#positiveValues}"
            .labels="${this.#positiveLabels}"
            .descriptions="${this.#positiveDescriptions}"
          ></cds-barchart>
          <cds-barchart
            heading="Minskar sannolikheten"
            color="#bbdefb"
            .values="${this.#negativeValues}"
            .labels="${this.#negativeLabels}"
            .descriptions="${this.#negativeDescriptions}"
          ></cds-barchart>

          ${this.#renderOfTotal()}
        </c-section>
      </c-card>
    `;
  }

  #renderNoData() {
    return html`
      <c-card>
        <p>Ladda patientdata</p>
      </c-card>
    `;
  }

  render() {
    if (this.prediction !== undefined) {
      return this.#renderBody();
    }

    return this.#renderNoData();
  }
}

class CDSBarchart extends CElement {
  static get styles() {
    return [
      ...super.styles,
      css`
        :host {
          --cds-barchart-width: 170px;
        }

        .chart-container {
          display: flex;
          flex-direction: column;
          gap: 4px;
          position: relative;
          height: fit-content;
          padding: 2px 0;
        }

        .chart-row {
          display: flex;
          flex-direction: row;
          gap: 4px;
        }

        .chart-label {
          width: var(--cds-barchart-width);
          max-width: var(--cds-barchart-width);
          word-wrap: break-word;
        }

        .x-axis {
          width: 1px;
          height: 100%;
          border-left: 2px solid gainsboro;
          position: absolute;
          left: calc(var(--cds-barchart-width) + 2px);
          margin: -2px 0;
        }

        .empty {
          border: 1px solid gainsboro;
        }

        h1 {
          font-size: medium;
          margin: 0 0 4px 0;
        }
      `
    ];
  }

  static get properties() {
    return {
      ...super.properties,
      id: { type: String, reflect: true },
      heading: { type: String },
      width: { type: Number, default: 200 },
      ymax: { type: Number },
      labels: { type: Array, default: [] },
      values: { type: Array, default: [] },
      descriptions: { type: Array, default: [] },
      color: { type: String, default: 'lightskyblue' },
      src: { type: String }
    };
  }

  updated(props) {
    if (props.has('src')) {
      this.#fetch();
    }
  }

  async #fetch() {
    if (this.src) {
      const response = await fetch(this.src);

      if (response.ok) {
        const data = await response.json();

        this.labels = data.labels;
        this.values = data.values;
      }
    }
  }

  // eslint-disable-next-line class-methods-use-this
  renderChartRow(value, label, description) {
    return html`
      <div class="chart-row">
        <c-label
          class="chart-label"
          information="${description}"
          text="${label}"
        ></c-label>
        ${this.renderBar(value)}
      </div>
    `;
  }

  renderBar(value) {
    let ymax = 0;
    if (this.ymax) {
      ymax = this.ymax;
    } else if (this.values.length > 0) {
      ymax = Math.max(...this.values);
    }

    const pixels = (value / ymax) * this.width;

    return html`
      <div
        style="width: ${pixels}px; height: 20px; background: ${this.color};"
      ></div>
    `;
  }

  // eslint-disable-next-line class-methods-use-this
  renderEmpty() {
    return html` <div class="empty">No data</div> `;
  }

  renderHeading() {
    if (this.heading) {
      return html` <h1>${this.heading}</h1> `;
    }
    return '';
  }

  render() {
    if (this.values.length === 0) {
      return this.renderEmpty();
    }

    return html`
      ${this.renderHeading()}

      <div class="chart-container">
        ${this.values.map((value, index) => {
          const label = this.labels[index];
          const description = this.descriptions[index];
          return this.renderChartRow(value, label, description);
        })}

        <div class="x-axis"></div>
      </div>
    `;
  }
}

customElements.define('cds-barchart', CDSBarchart);
customElements.define('cds-model-dashboard', CdsModelDashboard);
