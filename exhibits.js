(() => {
  const method = document.querySelector('#nf4-exhibit');
  if (method) {
    // Ordered by their four-bit indices in bitsandbytes' get_4bit_type("nf4").
    const levels = [
      -1, -0.696192801, -0.525073051, -0.394917488,
      -0.284441382, -0.184773430, -0.091050036, 0,
      0.079580300, 0.160930201, 0.246112302, 0.337915242,
      0.440709829, 0.562617004, 0.722956836, 1,
    ];
    const slider = method.querySelector('input[type=range]');
    const reset = method.querySelector('[data-ex-reset]');
    const ruler = method.querySelector('.ex-ruler');
    const scalePosition = value => (value + 1) * 50;
    const display = (value, digits) => value.toFixed(digits).replace('-', '−');
    function renderWeight() {
      const weight = Number(slider.value);
      const index = levels.reduce((best, value, i) =>
        Math.abs(value - weight) < Math.abs(levels[best] - weight) ? i : best, 0);
      const nearest = levels[index];
      const low = index === 0 ? -1 : (levels[index - 1] + nearest) / 2;
      const high = index === levels.length - 1 ? 1 : (levels[index + 1] + nearest) / 2;
      ruler.style.setProperty('--ex-input', scalePosition(weight) + '%');
      ruler.style.setProperty('--ex-nearest', scalePosition(nearest) + '%');
      ruler.style.setProperty('--ex-low', scalePosition(low) + '%');
      ruler.style.setProperty('--ex-span', (scalePosition(high) - scalePosition(low)) + '%');

      const code = index.toString(2).padStart(4, '0');
      const recovered = display(nearest * 2, 3);
      const values = {
        weight: display(weight, 2), level: display(nearest, 3), code, recovered,
        original: display(weight * 2, 2), decoded: recovered, error: display(Math.abs(weight - nearest) * 2, 3),
      };
      for (const [name, value] of Object.entries(values)) {
        method.querySelector('[data-ex-' + name + ']').textContent = value;
      }
      slider.setAttribute('aria-valuetext', weight.toFixed(2) + ', nearest level ' + nearest.toFixed(3) + ', code ' + code + ', recovered weight ' + recovered);
    }
    slider.disabled = false;
    reset.hidden = false;
    slider.addEventListener('input', renderWeight);
    reset.addEventListener('click', () => {
      slider.value = slider.defaultValue;
      renderWeight();
      slider.focus();
    });
    renderWeight();
  }

  const results = document.querySelector('#mmlu-exhibit');
  if (results) {
    // The source table groups two training datasets under each LLaMA size.
    const sourceTable = document.querySelector('#paper-table-4 table');
    const columns = new Map();
    const sizes = [...sourceTable.tHead.rows[1].cells].slice(1, -1);
    const datasetHeaders = sourceTable.tHead.rows[2].cells;
    let column = 1;
    for (const size of sizes) {
      for (let i = 0; i < size.colSpan; i++, column++) {
        const setting = size.textContent.trim() + ' · ' + datasetHeaders[column].textContent.trim();
        columns.set(setting, column);
      }
    }
    const form = results.querySelector('form');
    const cells = results.querySelectorAll('[data-ex-score]');
    const tracks = results.querySelectorAll('.ex-score-track');
    function renderSetting() {
      const size = form.elements['ex-size'].value;
      const dataset = form.elements['ex-data'].value;
      const setting = size + ' · ' + dataset;
      const selected = [...sourceTable.tBodies[0].rows].map(row =>
        Number(row.cells[columns.get(setting)].textContent.trim()));
      selected.forEach((score, i) => {
        cells[i].textContent = score.toFixed(1) + '%';
        tracks[i].style.setProperty('--ex-score', (score - 35) / 30 * 100 + '%');
      });
      const delta = Math.round((selected[2] - selected[0]) * 10) / 10;
      const sign = delta < 0 ? '−' : delta > 0 ? '+' : '';
      results.querySelector('[data-ex-setting]').textContent = setting;
      results.querySelector('[data-ex-condition]').textContent = setting;
      results.querySelector('[data-ex-delta]').textContent = sign + Math.abs(delta).toFixed(1) + ' percentage points';
    }
    form.hidden = false;
    form.addEventListener('change', renderSetting);
    renderSetting();
  }
})();
