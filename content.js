/**
 * Letterboxd Alternative Sources — Content Script
 *
 * Injects an "Alternative" sources section above the "Stream" section on
 * Letterboxd film pages. Handles both initial page loads and SPA (pjax)
 * navigation, plus the dynamically-loaded availability modal.
 */

const ALT_SECTION_ID = 'las-alt-sources';

// ---------------------------------------------------------------------------
// URL generation
// ---------------------------------------------------------------------------

/**
 * Builds the full search URL for a given source and film.
 *
 * @param {{ baseUrl: string, encodeUrlParams: boolean, spacesToPlus: boolean, addYear: boolean }} source
 * @param {string} title
 * @param {string} year
 * @returns {string}
 */
function buildUrl(source, title, year) {
  let query = title;
  if (source.punctuationToSpaces) query = query.replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
  if (source.removePunctuation) query = query.replace(/[^\w\s]/g, '');
  if (source.addYear && year) query += ` ${year}`;

  if (source.encodeUrlParams) {
    query = encodeURIComponent(query);
    if (source.spacesToPlus) {
      // encodeURIComponent turns spaces into %20; swap those for +
      query = query.replace(/%20/g, '+');
    }
  } else if (source.spacesToPlus) {
    query = query.replace(/\s+/g, '+');
  }

  return source.baseUrl + query;
}

// ---------------------------------------------------------------------------
// DOM helpers
// ---------------------------------------------------------------------------

function getFilmTitle() {
  const el = document.querySelector('.headline-1 .name');
  return el ? el.textContent.trim() : null;
}

function getFilmYear() {
  const el = document.querySelector('.releasedate a');
  return el ? el.textContent.trim() : null;
}

/**
 * Finds the "Stream" section heading inside a given root element.
 * Letterboxd renders the watch panel both inline on the page and inside a
 * colorbox modal — so we accept an optional root to narrow the search.
 *
 * @param {Element} [root]
 * @returns {Element|null}
 */
function findStreamSection(root = document) {
  // Real selector confirmed from DOM: h3.type inside .justwatch-strip
  const candidates = root.querySelectorAll('.justwatch-strip h3.type');
  for (const el of candidates) {
    if (/^stream$/i.test(el.textContent.trim())) return el;
  }

  // Fallback: any h3 whose trimmed text is exactly "Stream"
  for (const el of root.querySelectorAll('h3')) {
    if (/^stream$/i.test(el.textContent.trim())) return el;
  }

  return null;
}

/**
 * Returns the .justwatch-strip container that holds the Stream heading.
 */
function getSectionContainer(streamHeading) {
  return streamHeading.closest('.justwatch-strip') || streamHeading.parentElement;
}

// ---------------------------------------------------------------------------
// Injection
// ---------------------------------------------------------------------------

/**
 * Renders the Alternative Sources section and inserts it before the Stream
 * section container.
 *
 * @param {Array} sources
 * @param {string} title
 * @param {string} year
 * @param {Element} [searchRoot]
 */
function injectSection(sources, title, year, searchRoot = document) {
  // Don't inject twice in the same root
  if (searchRoot.getElementById
      ? searchRoot.getElementById(ALT_SECTION_ID)
      : searchRoot.querySelector(`#${ALT_SECTION_ID}`)) {
    return;
  }

  const streamHeading = findStreamSection(searchRoot);
  if (!streamHeading) return;

  const container = getSectionContainer(streamHeading);
  if (!container || !container.parentElement) return;

  // Use Letterboxd's own classes so the section inherits the page's styles
  const section = document.createElement('div');
  section.id = ALT_SECTION_ID;
  section.className = 'justwatch-strip js-film-service-type';

  const heading = document.createElement('h3');
  heading.className = 'type';
  heading.textContent = 'Alternative';
  section.appendChild(heading);

  const servicesDiv = document.createElement('div');
  servicesDiv.className = 'services las-services';

  if (sources.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'las-empty';
    empty.textContent = 'No sources configured. ';
    const settingsLink = document.createElement('a');
    settingsLink.href = '#';
    settingsLink.textContent = 'Add sources →';
    settingsLink.addEventListener('click', (e) => {
      e.preventDefault();
      chrome.runtime.sendMessage({ type: 'open_options' });
    });
    empty.appendChild(settingsLink);
    servicesDiv.appendChild(empty);
  } else {
    for (const source of sources) {
      const url = buildUrl(source, title, year);

      const link = document.createElement('a');
      link.href = url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.className = 'service las-service';

      if (source.iconUrl) {
        const fig = document.createElement('figure');
        fig.className = 'logo';
        const img = document.createElement('img');
        img.src = source.iconUrl;
        img.alt = source.name;
        img.onerror = () => { fig.remove(); nameEl.classList.add('las-name-visible'); };
        fig.appendChild(img);
        link.appendChild(fig);
      }

      // Accessible hidden name (matches Letterboxd's pattern)
      const nameEl = document.createElement('h4');
      nameEl.className = 'name _hidetext';
      nameEl.textContent = source.name;
      link.appendChild(nameEl);

      // Visible label underneath the logo, like "Subs" / price
      const meta = document.createElement('p');
      meta.className = 'metadata';
      meta.textContent = source.name;
      link.appendChild(meta);

      servicesDiv.appendChild(link);
    }
  }

  section.appendChild(servicesDiv);
  container.parentElement.insertBefore(section, container);
}

/**
 * Removes any previously injected section from the given root.
 */
function removeSection(searchRoot = document) {
  const existing = searchRoot.querySelector
    ? searchRoot.querySelector(`#${ALT_SECTION_ID}`)
    : null;
  if (existing) existing.remove();
}

// ---------------------------------------------------------------------------
// Main run logic
// ---------------------------------------------------------------------------

function run(searchRoot = document) {
  const title = getFilmTitle();
  const year = getFilmYear();
  if (!title) return;

  chrome.storage.local.get('sources', ({ sources }) => {
    injectSection(sources || [], title, year, searchRoot);
  });
}

// ---------------------------------------------------------------------------
// Unified DOM observer — handles colorbox content loads and SPA navigation
// ---------------------------------------------------------------------------

let lastUrl = location.href;
let debounceTimer = null;

function debounce(fn, delay) {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(fn, delay);
}

const bodyObserver = new MutationObserver((mutations) => {
  // SPA navigation: URL changed
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    document.querySelectorAll(`#${ALT_SECTION_ID}`).forEach((el) => el.remove());
    debounce(() => run(), 300);
    return;
  }

  for (const mutation of mutations) {
    const target = mutation.target;

    // Ignore mutations caused by our own injection — our section appears in
    // addedNodes (target is the parent we inserted into, not the section itself)
    if ([...mutation.addedNodes].some((n) => n.id === ALT_SECTION_ID)) continue;

    // Ignore mutations inside our own section
    if (target.closest?.(`#${ALT_SECTION_ID}`)) continue;

    // Mutation is inside (or is) the colorbox — AJAX loaded the panel content
    const colorbox =
      target.id === 'colorbox'
        ? target
        : target.closest?.('#colorbox');

    if (colorbox) {
      // Don't removeSection here — injectSection already guards against duplicates
      debounce(() => run(colorbox), 150);
      return;
    }
  }
});

bodyObserver.observe(document.body, { childList: true, subtree: true });

// pjax event that Letterboxd fires on navigation
document.addEventListener('page:load', () => {
  document.querySelectorAll(`#${ALT_SECTION_ID}`).forEach((el) => el.remove());
  debounce(() => run(), 100);
});

// ---------------------------------------------------------------------------
// Initial run
// ---------------------------------------------------------------------------

run();
