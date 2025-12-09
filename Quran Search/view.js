const QURAN_TG = parseQuranText(typeof QuranTextTG === 'string' ? QuranTextTG : '');
const TARJOME = parseQuranText(typeof TarjomeText === 'string' ? TarjomeText : '');
const SURE_NAMES = parseQuranText(typeof SureText === 'string' ? SureText : '');

function parseQuranText(text) {
  return text.split(' + ').map((sure) => sure.split(' - '));
}

async function copyToClipboard(text) {
  if (!text) return;

  if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', 'readonly');
  textarea.style.position = 'absolute';
  textarea.style.left = '-9999px';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  textarea.remove();
}

function populateSuraOptions(select) {
  select.innerHTML = '';
  QURAN_TG.forEach((_, index) => {
    const option = document.createElement('option');
    option.value = index;
    option.textContent = SURE_NAMES[index]?.[0] || `سوره ${index + 1}`;
    select.appendChild(option);
  });
}

function populateAyaOptions(suraIndex, select) {
  select.innerHTML = '';
  const suraLength = QURAN_TG[suraIndex]?.length || 0;
  for (let i = suraLength; i >= 1; i -= 1) {
    const option = document.createElement('option');
    option.value = i - 1;
    option.textContent = i;
    select.appendChild(option);
  }
  select.selectedIndex = 0;
}

function renderAya(suraIndex, ayaIndex, quranField, translationField) {
  const aya = QURAN_TG[suraIndex]?.[ayaIndex] || '';
  const translation = TARJOME[suraIndex]?.[ayaIndex] || '';
  quranField.value = aya;
  translationField.value = translation;
}

function attachViewHandlers() {
  const suraSelect = document.getElementById('sura-select');
  const ayaSelect = document.getElementById('aya-select');
  const quranField = document.getElementById('quran-view');
  const translationField = document.getElementById('translation-view');
  const copyAyaButton = document.getElementById('copy-aya');
  const copySuraButton = document.getElementById('copy-sura');
  const copyTranslationButton = document.getElementById('copy-translation');

  populateSuraOptions(suraSelect);
  populateAyaOptions(suraSelect.selectedIndex, ayaSelect);
  renderAya(suraSelect.selectedIndex, ayaSelect.selectedIndex, quranField, translationField);

  suraSelect.addEventListener('change', () => {
    populateAyaOptions(suraSelect.selectedIndex, ayaSelect);
    renderAya(suraSelect.selectedIndex, ayaSelect.selectedIndex, quranField, translationField);
  });

  ayaSelect.addEventListener('change', () => {
    renderAya(suraSelect.selectedIndex, ayaSelect.selectedIndex, quranField, translationField);
  });

  copyAyaButton.addEventListener('click', () => {
    copyToClipboard(quranField.value);
  });

  copySuraButton.addEventListener('click', () => {
    const ayat = QURAN_TG[suraSelect.selectedIndex] || [];
    copyToClipboard(ayat.join(' '));
  });

  copyTranslationButton.addEventListener('click', () => {
    copyToClipboard(translationField.value);
  });
}

document.addEventListener('DOMContentLoaded', attachViewHandlers);
