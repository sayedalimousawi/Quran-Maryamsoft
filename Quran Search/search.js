const QURAN = parseQuranText(typeof QuranText === 'string' ? QuranText : '');

let translationDataPromise = null;
let cachedTranslation = null;
let cachedSureNames = null;

const ARABIC_DIACRITICS = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0640\u200c]/g;
const normalizedQueryCache = new Map();

const MAX_RENDERED_RESULTS = 200;

const QURAN_NORMALIZED = normalizeQuranText(QURAN);
const INVERTED_INDEX = buildInvertedIndex(QURAN_NORMALIZED);

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

function buildInvertedIndex(text) {
  const index = new Map();

  text.forEach((sura, suraIndex) => {
    sura.forEach((aya, ayaIndex) => {
      const tokens = new Set(tokenize(aya));

      tokens.forEach((token) => {
        const references = index.get(token);
        const currentReference = { suraIndex, ayaIndex };

        if (references) {
          references.push(currentReference);
        } else {
          index.set(token, [currentReference]);
        }
      });
    });
  });

  return index;
}

function tokenize(value) {
  return value
    .split(/[\s.,،؛؟!\-\/]+/)
    .map((token) => token.trim())
    .filter(Boolean);
}

function debounce(fn, delay) {
  let timeoutId;
  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn.apply(this, args), delay);
  };
}

const loadedScripts = new Set();

function loadScriptOnce(src) {
  return new Promise((resolve, reject) => {
    const existingScript = document.querySelector(`script[data-dynamic-src="${src}"]`);

    if (existingScript) {
      if (existingScript.dataset.loaded === 'true') {
        resolve();
        return;
      }

      existingScript.addEventListener('load', () => resolve(), { once: true });
      existingScript.addEventListener('error', () => reject(new Error(`امکان بارگذاری ${src} وجود ندارد.`)), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.dataset.dynamicSrc = src;
    script.onload = () => {
      loadedScripts.add(src);
      script.dataset.loaded = 'true';
      resolve();
    };
    script.onerror = () => reject(new Error(`امکان بارگذاری ${src} وجود ندارد.`));
    document.head.appendChild(script);
  });
}

function loadTranslationResources() {
  if (cachedTranslation && cachedSureNames) {
    return Promise.resolve({ translation: cachedTranslation, sureNames: cachedSureNames });
  }

  if (translationDataPromise) {
    return translationDataPromise;
  }

  translationDataPromise = (async () => {
    const loadPromises = [];

    if (typeof QuranTextTG !== 'string') {
      loadPromises.push(loadScriptOnce('QuranTG.js'));
    }

    if (typeof SureText !== 'string') {
      loadPromises.push(loadScriptOnce('Sure.js'));
    }

    if (loadPromises.length) {
      await Promise.all(loadPromises);
    }

    if (typeof QuranTextTG !== 'string' || typeof SureText !== 'string') {
      throw new Error('ترجمه یا نام سوره‌ها در دسترس نیست.');
    }

    cachedTranslation = parseQuranText(QuranTextTG);
    cachedSureNames = parseQuranText(SureText);

    return { translation: cachedTranslation, sureNames: cachedSureNames };
  })();

  translationDataPromise.catch(() => {
    translationDataPromise = null;
  });

  return translationDataPromise;
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

function searchAyat(query, translation, suraNames) {
  const tokens = tokenize(query);

  if (!tokens.length) {
    return [];
  }

  const references = tokens.length === 1
    ? (INVERTED_INDEX.get(tokens[0]) || [])
    : intersectReferences(tokens.map((token) => INVERTED_INDEX.get(token) || []));

  return references
    .sort((a, b) => (a.suraIndex === b.suraIndex ? a.ayaIndex - b.ayaIndex : a.suraIndex - b.suraIndex))
    .map(({ suraIndex, ayaIndex }, index) => ({
      index: index + 1,
      translation: translation[suraIndex]?.[ayaIndex] || '',
      suraName: suraNames[suraIndex]?.[0] || `سوره ${suraIndex + 1}`
    }));
}

function intersectReferences(referenceLists) {
  if (!referenceLists.length || referenceLists.some((list) => list.length === 0)) {
    return [];
  }

  const sortedLists = [...referenceLists].sort((a, b) => a.length - b.length);
  const initialKeys = new Set(sortedLists[0].map(referenceKey));

  sortedLists.slice(1).forEach((list) => {
    const listKeys = new Set(list.map(referenceKey));
    initialKeys.forEach((key) => {
      if (!listKeys.has(key)) {
        initialKeys.delete(key);
      }
    });
  });

  return Array.from(initialKeys).map((key) => {
    const [suraIndex, ayaIndex] = key.split('-').map(Number);
    return { suraIndex, ayaIndex };
  });
}

function referenceKey(reference) {
  return `${reference.suraIndex}-${reference.ayaIndex}`;
}

function attachSearchHandler() {
  const searchInput = document.getElementById('search-input');
  const resultContainer = document.getElementById('results');
  const searchButton = document.getElementById('search-button');

  async function handleSearch(event) {
    event?.preventDefault?.();
    const query = normalizeQuery(searchInput.value);

    if (!query) {
      clearResults(resultContainer);
      return;
    }

    resultContainer.textContent = 'در حال آماده‌سازی و جست‌وجو...';

    try {
      const { translation, sureNames } = await loadTranslationResources();

      requestAnimationFrame(() => {
        const matches = searchAyat(query, translation, sureNames);
        clearResults(resultContainer);
        renderResults(resultContainer, matches);
      });
    } catch (error) {
      console.error(error);
      resultContainer.textContent = 'خطا در بارگذاری داده‌ها. لطفاً دوباره تلاش کنید.';
    }
  }

  const debouncedHandleSearch = debounce(handleSearch, 250);

  searchInput.addEventListener('input', debouncedHandleSearch);
  searchButton.addEventListener('click', debouncedHandleSearch);
  searchInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      debouncedHandleSearch(event);
    }
  });
}

document.addEventListener('DOMContentLoaded', attachSearchHandler);
