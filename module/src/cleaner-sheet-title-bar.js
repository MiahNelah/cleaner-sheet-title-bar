const MODULE_ID = "cleaner-sheet-title-bar";

const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

// Applications whose sheet tabs can be compacted by the 'collapse-navbars' setting.
const COMPACTABLE_APPS = ["TokenConfig", "PrototypeTokenConfig", "TileConfig"];

// ApplicationV1 only emits a hook named after the concrete class, hence this list.
const V1_RENDER_HOOKS = [
    "renderApplication",
    "renderDocumentSheet",
    "renderActorSheet",
    "renderJournalSheet",
    "renderItemSheet",
    "renderRollTableConfig",
    "renderSidebarTab",
    "renderFormApplication"
];

// ApplicationV2 emits render hooks for every class of its inheritance chain,
// so the base hook alone covers every V2 application, subclasses included.
const V2_RENDER_HOOKS = ["renderApplicationV2"];

// 'attributes' is deliberately left out: our own data-tooltip writes must stay
// invisible to the observer, otherwise cleaning would retrigger itself forever.
const OBSERVER_OPTIONS = { childList: true, subtree: true, characterData: true };

// Already watched nodes, so re-renders do not stack observers on the same element.
const observed = new WeakSet();

/**
 * Render hooks hand over a jQuery object on ApplicationV1 and a native HTMLElement
 * on ApplicationV2. Everything downstream works on plain elements.
 */
function toElement(html) {
    if (!html) return null;
    // Duck typing instead of instanceof: PopOut! nodes live in another window,
    // where they are not instances of *this* realm's HTMLElement.
    if (html.nodeType === Node.ELEMENT_NODE) return html;
    return (html[0]?.nodeType === Node.ELEMENT_NODE) ? html[0] : null;
}

/**
 * Match on the whole prototype chain so system subclasses (and both the V1 and V2
 * flavours of a sheet) are recognized without touching version specific namespaces.
 */
function isInstanceOfAny(app, classNames) {
    for (let proto = Object.getPrototypeOf(app ?? {}); proto; proto = Object.getPrototypeOf(proto)) {
        if (classNames.includes(proto.constructor?.name)) return true;
    }
    return false;
}

function isInsideSvg(node, root) {
    for (let parent = node.parentNode; parent && parent !== root; parent = parent.parentNode) {
        if (parent.namespaceURI === SVG_NAMESPACE) return true;
    }
    return false;
}

/**
 * Read the rendered label of an element and strip the text nodes carrying it.
 * Text nodes inside an <svg> are skipped: a <title> there is not rendered text,
 * it is the accessible name of the icon, and removing it used to throw.
 * Returns null when there is nothing to strip, leaving the DOM untouched: that is
 * what makes a second pass emit no mutation, and what lets the observer settle.
 */
function stripLabel(element) {
    const iterator = element.ownerDocument.createNodeIterator(element, NodeFilter.SHOW_TEXT);
    const nodes = [];
    let node = undefined;
    while (node = iterator.nextNode()) {
        if (!isInsideSvg(node, element)) nodes.push(node);
    }

    const label = nodes.map(textNode => textNode.nodeValue).join("").trim();
    if (!label) return null;

    // Collect first, remove after: never mutate the tree while the iterator walks it.
    for (let textNode of nodes) textNode.remove();
    return label;
}

function setTooltip(element, label) {
    if (!label) return;

    // Remove 'title' attribute to avoid double tooltip
    element.removeAttribute("title");

    element.setAttribute("data-tooltip", label);
    element.setAttribute("data-tooltip-direction", "UP");
}

/**
 * Returns whether the element was actually modified.
 */
function removeTextFromButton(element) {
    // Skip Document Id Link button, data-tooltip is already used natively
    if (element.classList.contains("document-id-link")) return false;

    // Maestro compatibility hack: those buttons hold their label in a <span>.
    if (element.className === "hype-track" || element.className === "item-track") {
        const span = element.getElementsByTagName("span")[0];
        if (!span) return false;

        setTooltip(element, span.textContent?.trim());
        span.remove();
        return true;
    }

    const label = stripLabel(element);
    if (label === null) return false;

    setTooltip(element, label);
    return true;
}

/**
 * One malformed button used to abort the whole loop, leaving the rest of the bar
 * untouched. Returns how many elements were actually modified.
 */
function cleanButtons(elements) {
    let cleaned = 0;
    for (let element of elements) {
        try {
            if (removeTextFromButton(element)) cleaned++;
        } catch (error) {
            console.warn(`${MODULE_ID} | Unable to clean element, skipping it.`, element, error);
        }
    }
    return cleaned;
}

/**
 * No event tells us that every module is done injecting its buttons, and none ever
 * can: hook callbacks run in module load order. So rather than waiting an arbitrary
 * delay, watch the node and clean whatever shows up, whenever it shows up.
 * This terminates because cleaning is idempotent: a pass with nothing left to strip
 * emits no mutation, hence no new record, hence no further pass.
 */
function watch(node, clean) {
    if (observed.has(node)) return;
    observed.add(node);

    const observer = new MutationObserver(() => {
        // Detached node: stop watching, but forget it too. PopOut! moves nodes to
        // another window, and they have to be watchable again once re-attached.
        if (!node.isConnected) {
            observer.disconnect();
            observed.delete(node);
            return;
        }
        clean();
    });
    observer.observe(node, OBSERVER_OPTIONS);
}

function cleanHeader(windowHeader) {
    // ApplicationV1 renders header controls as <a>, ApplicationV2 as <button>.
    // The V2 overflow menu is a real text menu, it must keep its labels.
    const headerButtons = Array.from(windowHeader.querySelectorAll("a, button"))
        .filter(button => !button.closest(".controls-dropdown"));

    cleanButtons(headerButtons);
}

function cleanNav(app, nav) {
    const tabs = nav.querySelectorAll("a.item, button.item");
    if (!tabs.length) return;

    const cleaned = cleanButtons(tabs);
    nav.style.justifyContent = "center";

    // Only resize when something was actually compacted, otherwise every batch of
    // mutations would nudge the window around.
    if (cleaned) app.setPosition(app.position);
}

function cleanDocumentHeader(app, html) {
    const element = toElement(html);
    if (element === null) return;

    // When using PopOut! module, button text is reset when you pop window in.
    // In this case, html is just form and not all window. So, we find parent window to get header section
    const root = ("form".localeCompare(element.tagName, undefined, { sensitivity: 'base' }) === 0)
        ? element.parentElement?.parentElement ?? element
        : element;

    const windowHeader = root.querySelector("header.window-header");
    if (!windowHeader) return;

    cleanHeader(windowHeader);
    watch(windowHeader, () => cleanHeader(windowHeader));
}

function cleanSheetTabs(app, html) {
    const element = toElement(html);
    if (element === null
        || !isInstanceOfAny(app, COMPACTABLE_APPS)
        || !game.settings.get(MODULE_ID, "collapse-navbars")) return;

    for (let nav of element.querySelectorAll(".window-content nav.tabs")) {
        cleanNav(app, nav);
        watch(nav, () => cleanNav(app, nav));
    }
}

function cleanPoppedDocumentHeader(app, poppedWindow) {
    if (poppedWindow === undefined) return;
    cleanDocumentHeader(app, poppedWindow);
}

function handlePopout() {
    if (game.modules.get("popout")) {
        Hooks.on('PopOut:loaded', cleanPoppedDocumentHeader);
    }
}

function eventHandler(app, html) {
    cleanDocumentHeader(app, html);
    cleanSheetTabs(app, html);
}


for (let hook of [...V1_RENDER_HOOKS, ...V2_RENDER_HOOKS]) {
    Hooks.on(hook, eventHandler);
}

Hooks.on('init', () => {
    handlePopout();

    game.settings.register(MODULE_ID, "collapse-navbars", {
        name: game.i18n.localize('CSTB.Settings.CompactNavbars.Title'),
        hint: game.i18n.localize('CSTB.Settings.CompactNavbars.Hint'),
        scope: "world",
        group: "UI",
        config: true,
        type: Boolean,
        default: false,
    });
});
