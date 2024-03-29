const { html, CElement, css, httpRequest } = window.CComponents;

export class CdsModelDashboard extends CElement {
  static get styles() {
    return [
      ...super.styles,
      css`
        :host {
          user-select: none;
        }

        h1 {
          font-size: x-large;
        }

        P {
          margin: 0;
        }

        c-card {
          display: flex;
          flex-direction: column;
          gap: var(--c-gap);
        }

        c-indicator {
          padding-top: 4px;
          padding-bottom: 8px;
        }

        #info-popover-target {
          color: var(--c-color-primary);
          font-weight: 700;
          cursor: pointer;
          user-select: none;
          width: fit-content;
        }

        footer,
        header {
          display: flex;
          flex-direction: column;
          gap: calc(var(--c-gap) / 2);
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
      descriptionText: { type: String, default: '' },
      error: { type: Boolean, state: true, default: false },
      limit: { type: Number },
      src: { type: String },
      ehrId: { type: String },
      cutoff: { type: String },
      topPositive: { type: Number, default: 5 },
      topNegative: { type: Number, default: 5 }
    };
  }

  #popover;

  #popoverTarget;

  firstUpdated() {
    super.firstUpdated();

    this.#popover = this.shadowRoot.querySelector('c-popover');
    this.#popoverTarget = this.shadowRoot.querySelector('#info-popover-target');

    this.#popover.anchor = this.#popoverTarget;

    this.#loadFromQueryString();
  }

  updated(props) {
    if (
      props.has('src') ||
      props.has('ehrId') ||
      props.has('topPositive') ||
      props.has('topNegative') ||
      props.has('cutoff')
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

      const cutoff = Number(this.cutoff);

      const topPositive = cutoff ? 20 : this.topPositive;
      const topNegative = cutoff ? 20 : this.topNegative;

      if (topPositive) {
        url += `&topPositive=${topPositive}`;
      }
      if (topNegative) {
        url += `&topNegative=${topNegative}`;
      }

      this.error = false;
      try {
        const data = await httpRequest({ url });

        let negative = data.negative || [];
        let positive = data.positive || [];

        if (cutoff) {
          negative = negative.filter(d => Math.abs(d.value) >= cutoff);
          positive = positive.filter(d => d.value >= cutoff);
        }

        this.negativePredictors = negative;
        this.positivePredictors = positive;
        this.prediction = data.prediction;
        this.modelLabel = data.modelLabel;
      } catch (error) {
        this.error = true;

        console.error(error);

        this.positivePredictors = undefined;
        this.negativePredictors = undefined;
        this.prediction = undefined;
        this.modelLabel = undefined;
      }
    }
  }

  #loadFromQueryString() {
    const url = new URL(window.location.href);
    const searchParams = url.searchParams;

    const patientId = searchParams.get('patientId');

    if (patientId) {
      this.ehrId = patientId;
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

  #renderHeader() {
    if (this.prediction === undefined) {
      return '';
    }

    const indicatorVariant = this.modelLabel === 1 ? 'error' : 'success';
    const labelText =
      this.modelLabel === 1
        ? 'Hög risk för återinskrivning'
        : 'Låg risk för återinskrivning';
    return html`
      <header>
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
          sannolikheten för återinskrivning inom 30 dagar. Klicka på en faktor
          för mer information.
        </p>
      </header>
    `;
  }

  #renderBody() {
    if (this.error === true) {
      return html`<p>Du har blivit utloggad, prova att ladda om sidan</p>`;
    }
    if (this.prediction === undefined) {
      return html` <p>Ingen data</p> `;
    }

    return html`
      <cds-barchart
        heading="Ökar sannolikheten"
        color="#ffcdd2"
        emptytext="Ingen data för positiva faktorer"
        .values="${this.#positiveValues}"
        .labels="${this.#positiveLabels}"
        .descriptions="${this.#positiveDescriptions}"
      ></cds-barchart>
      <cds-barchart
        heading="Minskar sannolikheten"
        color="#bbdefb"
        emptytext="Ingen data för negativa faktorer"
        .values="${this.#negativeValues}"
        .labels="${this.#negativeLabels}"
        .descriptions="${this.#negativeDescriptions}"
      ></cds-barchart>

      ${this.#renderOfTotal()}
    `;
  }

  #renderPopoverContent() {
    return html`<c-text text="${this.descriptionText}"></c-text>`;
  }

  #renderFooter() {
    return html`
      <footer>
        <div>
          Läs mer om bakomliggande beräkningar och vad prediceringen baseras på
        </div>

        <div
          id="info-popover-target"
          @click=${event => event.stopPropagation()}
        >
          Om CDS - Risk för återinskrivning av hjärtsviktspatienter
        </div>

        <c-popover style="position: fixed" clickopen>
          ${this.#renderPopoverContent()}
        </c-popover>
      </footer>
    `;
  }

  render() {
    return html`
      <c-card>
        ${!this.error ? this.#renderHeader() : ''} ${this.#renderBody()}
        ${!this.error ? this.#renderFooter() : ''}
      </c-card>
    `;
  }
}

class CDSBarchart extends CElement {
  static get styles() {
    return [
      ...super.styles,
      css`
        :host {
          --cds-barchart-width: 170px;
          --cds-barchart-row-height: 32px;
          --cds-barchart-gap: 4px;
        }

        .chart-container {
          display: flex;
          flex-direction: column;
          gap: var(--cds-barchart-gap);
          position: relative;
          height: fit-content;
          padding: 2px 0;
        }

        .chart-row {
          display: flex;
          flex-direction: row;
          gap: var(--cds-barchart-gap);
          height: var(--cds-barchart-row-height);
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
      src: { type: String },
      emptytext: { type: String, default: 'No data' }
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
    return html` <div class="empty">${this.emptytext}</div> `;
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
