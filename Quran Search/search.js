const QURAN = parseQuranText(typeof QuranText === 'string' ? QuranText : '');
const QURAN_TG = parseQuranText(typeof QuranTextTG === 'string' ? QuranTextTG : '');
const SURE_NAMES = parseQuranText(typeof SureText === 'string' ? SureText : '');

const ARABIC_DIACRITICS = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0640\u200c]/g;

function parseQuranText(text) {
  return text.split(' + ').map((sure) => sure.split(' - '));
}

function normalizeQuery(value) {
  return removeDiacritics(value.trim())
    .replace(/ي/g, 'ی')
    .replace(/ک/g, 'ك');
}

function removeDiacritics(value) {
  return value.replace(ARABIC_DIACRITICS, '');
}

function clearResults(container) {
  container.textContent = '';
}

function renderResults(container, matches) {
  const fragment = document.createDocumentFragment();
  const table = document.createElement('table');
  table.style.tableLayout = 'fixed';
  table.style.width = '100%';
  table.style.fontSize = '24pt';
  table.style.fontFamily = '"wm_Naskh Qurani 93"';

  matches.forEach(({ index, translation, suraName }) => {
    const row = document.createElement('tr');
    row.style.backgroundColor = index % 2 === 0 ? '#E0E0E0' : '#F0F0F0';

    const cell = document.createElement('td');
    cell.textContent = `${index}- ${translation} <${suraName}>`;
    row.appendChild(cell);
    table.appendChild(row);
  });

  fragment.appendChild(table);
  container.appendChild(fragment);
}

function searchAyat(query) {
  const matches = [];
  let counter = 1;

  QURAN.forEach((sura, suraIndex) => {
    sura.forEach((aya, ayaIndex) => {
      const normalizedAya = removeDiacritics(aya);
      if (normalizedAya.includes(query)) {
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
