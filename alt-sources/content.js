/**
 * Letterboxd Alternative Sources — Content Script
 *
 * Injects an "Alternative" sources section above the "Stream" section on
 * Letterboxd film pages. Handles both initial page loads and SPA (pjax)
 * navigation, plus the dynamically-loaded availability modal.
 */

const ALT_SECTION_ID = 'las-alt-sources';
const INLINE_SECTION_ID = 'las-alt-sources-inline';

// ---------------------------------------------------------------------------
// URL generation
// ---------------------------------------------------------------------------

/**
 * Builds the full search URL for a given source and film.
 *
 * @param {{ baseUrl: string, encodeUrlParams: boolean, spacesToPlus: boolean, addYear: boolean, extraText: string }} source
 * @param {string} title
 * @param {string} year
 * @returns {string}
 */
function buildUrl(source, title, year) {
  let query = title;
  if (source.addYear && year) query += ` ${year}`;

  // Extra text (e.g. "full movie") is appended before the punctuation/encoding
  // rules run, so those rules apply to it as well.
  const extra = (source.extraText || '').trim();
  if (extra) query += ` ${extra}`;

  if (source.punctuationToSpaces) query = query.replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
  if (source.removePunctuation) query = query.replace(/[^\w\s]/g, '');

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
 * Finds the first watch-option section heading (Stream, Rent, or Buy) inside
 * a given root element, so the alt sources section is injected even when only
 * buy/rent options are available.
 * Letterboxd renders the watch panel both inline on the page and inside a
 * colorbox modal — so we accept an optional root to narrow the search.
 *
 * @param {Element} [root]
 * @returns {Element|null}
 */
function findStreamSection(root = document) {
  const sectionPattern = /^(stream|rent|buy)$/i;

  // Real selector confirmed from DOM: h3.type inside .justwatch-strip
  const candidates = root.querySelectorAll('.justwatch-strip h3.type');
  for (const el of candidates) {
    if (sectionPattern.test(el.textContent.trim())) return el;
  }

  // Fallback: any h3 whose trimmed text is exactly "Stream", "Rent", or "Buy"
  for (const el of root.querySelectorAll('h3')) {
    if (sectionPattern.test(el.textContent.trim())) return el;
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

  // Preferred anchor: an existing Stream/Rent/Buy heading.
  const streamHeading = findStreamSection(searchRoot);

  // Fallback anchor: the strips container itself. This exists even when the
  // film has no availability ("No available sources"), where there is no
  // Stream/Rent/Buy heading to hook onto.
  const stripsContainer = searchRoot.querySelector
    ? searchRoot.querySelector('.js-film-service-strips, .justwatch-strips')
    : null;

  // Nothing to anchor to yet (watch panel not loaded).
  if (!streamHeading && !stripsContainer) return;

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
    servicesDiv.appendChild(buildEmptyState());
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

  // Insert above the Stream/Rent/Buy section when present, otherwise at the top
  // of the strips container (the "No available sources" case).
  if (streamHeading) {
    const container = getSectionContainer(streamHeading);
    if (container && container.parentElement) {
      container.parentElement.insertBefore(section, container);
      return;
    }
  }

  if (stripsContainer) {
    stripsContainer.insertBefore(section, stripsContainer.firstChild);
  }
}

/**
 * Builds the "No sources configured → Add sources" message. Shared by the
 * modal section and the inline panel.
 *
 * @returns {HTMLParagraphElement}
 */
function buildEmptyState() {
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
  return empty;
}

const INLINE_ROW_CLASS = 'las-inline-service';

/**
 * Builds one source row using Letterboxd's own .service markup, so it inherits
 * the native "icon + name … pill" layout. The pill (.options .link .extended)
 * reads "ALT" in place of the native BLU/Buy/Rent labels.
 *
 * @param {object} source
 * @param {string} title
 * @param {string} year
 * @returns {HTMLParagraphElement}
 */
function buildInlineServiceRow(source, title, year) {
  const url = buildUrl(source, title, year);

  const row = document.createElement('p');
  row.className = `service ${INLINE_ROW_CLASS}`;

  const labelLink = document.createElement('a');
  labelLink.href = url;
  labelLink.target = '_blank';
  labelLink.rel = 'noopener noreferrer';
  labelLink.className = 'label';

  const brand = document.createElement('span');
  brand.className = 'brand';
  if (source.iconUrl) {
    const img = document.createElement('img');
    img.src = source.iconUrl;
    img.alt = source.name;
    img.width = 24;
    img.height = 24;
    brand.appendChild(img);
  }
  labelLink.appendChild(brand);

  const titleSpan = document.createElement('span');
  titleSpan.className = 'title';
  const nameSpan = document.createElement('span');
  nameSpan.className = 'name';
  nameSpan.textContent = source.name;
  titleSpan.appendChild(nameSpan);
  labelLink.appendChild(titleSpan);

  row.appendChild(labelLink);

  const options = document.createElement('span');
  options.className = 'options';
  const optLink = document.createElement('a');
  optLink.href = url;
  optLink.target = '_blank';
  optLink.rel = 'noopener noreferrer';
  optLink.className = 'link';
  const ext = document.createElement('span');
  ext.className = 'extended';
  ext.textContent = 'ALT';
  optLink.appendChild(ext);
  options.appendChild(optLink);
  row.appendChild(options);

  return row;
}

/**
 * Injects alternative-source rows into the inline "Where to watch" panel on the
 * film page (separate from the JustWatch modal). Rows are inserted at the top of
 * Letterboxd's own .services list so they blend in seamlessly, distinguished
 * only by their "ALT" pill — no separate heading or divider. When the film has
 * no availability list, a minimal .services container is created to hold them.
 *
 * @param {Array} sources
 * @param {string} title
 * @param {string} year
 */
function injectInlinePanel(sources, title, year) {
  const panel = document.querySelector('.js-watch-panel #watch');
  if (!panel) return;

  // Don't inject twice
  if (panel.querySelector(`.${INLINE_ROW_CLASS}`) ||
      document.getElementById(INLINE_SECTION_ID)) {
    return;
  }

  // Build the nodes to insert.
  const nodes = sources.length === 0
    ? [(() => { const e = buildEmptyState(); e.classList.add(INLINE_ROW_CLASS); return e; })()]
    : sources.map((s) => buildInlineServiceRow(s, title, year));

  // Prefer the film's existing services list so our rows sit flush with it.
  const nativeServices = panel.querySelector('section.services');
  if (nativeServices) {
    const anchor = nativeServices.firstChild;
    for (const node of nodes) nativeServices.insertBefore(node, anchor);
    return;
  }

  // No availability list (e.g. "Not streaming.") — create our own container.
  const services = document.createElement('section');
  services.id = INLINE_SECTION_ID;
  services.className = 'services';
  for (const node of nodes) services.appendChild(node);
  panel.insertBefore(services, panel.firstChild);
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
    const list = sources || [];
    injectSection(list, title, year, searchRoot);
    // The inline panel always lives in the main document, regardless of which
    // root triggered this run; its own guard prevents duplicate injection.
    injectInlinePanel(list, title, year);
  });
}

/** Removes everything this extension has injected anywhere on the page. */
function removeAllInjected() {
  document
    .querySelectorAll(`#${ALT_SECTION_ID}, #${INLINE_SECTION_ID}, .${INLINE_ROW_CLASS}`)
    .forEach((el) => el.remove());
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
    removeAllInjected();
    debounce(() => run(), 300);
    return;
  }

  for (const mutation of mutations) {
    const target = mutation.target;

    // Ignore mutations caused by our own injection — our nodes appear in
    // addedNodes (target is the parent we inserted into, not the node itself)
    if ([...mutation.addedNodes].some(
      (n) => n.id === ALT_SECTION_ID ||
             n.id === INLINE_SECTION_ID ||
             n.classList?.contains(INLINE_ROW_CLASS)
    )) continue;

    // Ignore mutations inside our own injected nodes
    if (target.closest?.(`#${ALT_SECTION_ID}, #${INLINE_SECTION_ID}, .${INLINE_ROW_CLASS}`)) {
      continue;
    }

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

    // Letterboxd's film-availability script repaints the inline "Where to
    // watch" panel after we run, wiping our block. If a mutation touches the
    // panel and our block is gone, re-inject. injectInlinePanel's own guard
    // makes this a no-op once our block is present, so it can't loop.
    if (target.closest?.('.js-watch-panel') &&
        !document.querySelector(`.js-watch-panel .${INLINE_ROW_CLASS}`) &&
        !document.getElementById(INLINE_SECTION_ID)) {
      debounce(() => run(), 150);
      return;
    }
  }
});

bodyObserver.observe(document.body, { childList: true, subtree: true });

// pjax event that Letterboxd fires on navigation
document.addEventListener('page:load', () => {
  removeAllInjected();
  debounce(() => run(), 100);
});

// ---------------------------------------------------------------------------
// Initial run
// ---------------------------------------------------------------------------

run();
