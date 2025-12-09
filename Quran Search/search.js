const QURAN = parseQuranText(typeof QuranText === 'string' ? QuranText : '');
const QURAN_TG = parseQuranText(typeof QuranTextTG === 'string' ? QuranTextTG : '');
const SURE_NAMES = parseQuranText(typeof SureText === 'string' ? SureText : '');

const ARABIC_DIACRITICS = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0640\u200c]/g;
const normalizedQueryCache = new Map();

const MAX_RENDERED_RESULTS = 200;

const QURAN_NORMALIZED = normalizeQuranText(QURAN);
const QURAN_TG_NORMALIZED = normalizeQuranText(QURAN_TG);

function parseQuranText(text) {
  return text.split(' + ').map((sure) => sure.split(' - '));
}

function normalizeQuery(value) {
  const trimmedValue = value.trim();
  if (!trimmedValue) {
    return '';
  }

  const cachedValue = normalizedQueryCache.get(trimmedValue);
  if (cachedValue !== undefined) {
    return cachedValue;
  }

  const normalizedValue = removeDiacritics(trimmedValue)
    .replace(/ي/g, 'ی')
    .replace(/ک/g, 'ك');

  normalizedQueryCache.set(trimmedValue, normalizedValue);
  return normalizedValue;
}

function removeDiacritics(value) {
  return value.replace(ARABIC_DIACRITICS, '');
}

function normalizeQuranText(text) {
  return text.map((sura) => sura.map(normalizeText));
}

function normalizeText(value) {
  return removeDiacritics(value)
    .replace(/ي/g, 'ی')
    .replace(/ک/g, 'ك');
}

function escapeHtml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function clearResults(container) {
  container.textContent = '';
}

function renderResults(container, matches) {
  const renderCount = Math.min(matches.length, MAX_RENDERED_RESULTS);
  const hiddenCount = matches.length - renderCount;

  const rowsHtml = matches.slice(0, renderCount).map(({ index, translation, suraName }) => {
    const backgroundColor = index % 2 === 0 ? '#E0E0E0' : '#F0F0F0';
    const content = escapeHtml(`${index}- ${translation} <${suraName}>`);
    return `<tr style="background-color:${backgroundColor}"><td>${content}</td></tr>`;
  }).join('');

  requestAnimationFrame(() => {
    const fragment = document.createDocumentFragment();
    const table = document.createElement('table');
    table.style.tableLayout = 'fixed';
    table.style.width = '100%';
    table.style.fontSize = '24pt';
    table.style.fontFamily = '"wm_Naskh Qurani 93"';

    table.innerHTML = rowsHtml;
    fragment.appendChild(table);

    if (hiddenCount > 0) {
      const hiddenMessage = document.createElement('div');
      hiddenMessage.style.marginTop = '8px';
      hiddenMessage.textContent = `بقیه مخفی شده‌اند (${hiddenCount} نتیجه دیگر).`;
      fragment.appendChild(hiddenMessage);
    }

    container.appendChild(fragment);
  });
}

function searchAyat(query) {
  const matches = [];
  let counter = 1;

  QURAN_NORMALIZED.forEach((sura, suraIndex) => {
    sura.forEach((aya, ayaIndex) => {
      if (aya.includes(query)) {
        matches.push({
          index: counter,
          translation: QURAN_TG[suraIndex]?.[ayaIndex] || '',
          suraName: SURE_NAMES[suraIndex]?.[0] || `سوره ${suraIndex + 1}`
        });
        counter += 1;
      }
    });
  });

  return matches;
}

function attachSearchHandler() {
  const searchInput = document.getElementById('search-input');
  const resultContainer = document.getElementById('results');
  const searchButton = document.getElementById('search-button');

  function handleSearch(event) {
    event?.preventDefault();
    const query = normalizeQuery(searchInput.value);
    clearResults(resultContainer);

    if (!query) {
      return;
    }

    const matches = searchAyat(query);
    renderResults(resultContainer, matches);
  }

  searchButton.addEventListener('click', handleSearch);
  searchInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSearch();
    }
  });
}

document.addEventListener('DOMContentLoaded', attachSearchHandler);
