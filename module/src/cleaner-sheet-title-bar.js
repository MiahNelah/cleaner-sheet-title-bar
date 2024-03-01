function removeTextFromButton(element) {
    // Skip Document Id Link button, data-tooltip is already used natively
    if (element.classList.contains("document-id-link")) return;
    
    // Remove 'title' attribute to avoid double tooltip
    element.removeAttribute("title");

    element.setAttribute("data-tooltip", element.innerText?.trim());
    element.setAttribute("data-tooltip-direction", "UP");

    // Maestro compatibility hack
    if (element.className === "hype-track" || element.className === "item-track") {
        element.getElementsByTagName("span")[0]?.remove()
        return;
    }

    const nodeIterator = document.createNodeIterator(element, NodeFilter.SHOW_TEXT);
    let node = undefined;
    while (node = nodeIterator.nextNode()) {
        try {
            element.removeChild(node);
        } catch(e) {
            // Error DOMException: Failed to execute 'removeChild' on 'Node': The node to be removed is not a child of this node.
            //console.warn(`cleaner-sheet-title-bar | Error`, e);
            for(const nodeWithText of element.childNodes) {
                if(nodeWithText.innerText) {
                    nodeWithText.innerText = "";
                }
            }
        }
    }
}

function cleanDocumentHeader(app, html) {
    if (html === undefined) return;

    // When using PopOut! module, button text is reset when you pop window in.
    // In this case, html is just form and not all window. So, we find parent window to get header section
    const header = ("form".localeCompare(html[0].tagName, undefined, { sensitivity: 'base' }) === 0)
        ? html[0].parentElement.parentElement
        : html[0];

    const windowHeader = header.querySelector("header.window-header");
    if (windowHeader === null || windowHeader === undefined) return;

    setTimeout(() => {
        const headerButtons = windowHeader.querySelectorAll("a");
        if (headerButtons === null
            || headerButtons === undefined
            || (Array.isArray(headerButtons) && !headerButtons.length)) return;

        for (let headerButton of headerButtons) {
            removeTextFromButton(headerButton);
        }
    }, 100);
}

function cleanSheetTabs(app, html) {
    if (!(app instanceof TokenConfig)
        || !html
        || !game.settings.get("cleaner-sheet-title-bar", "collapse-navbars")) return;

    const navs = html[0].querySelectorAll(".window-content nav.tabs");
    if (navs === null || navs === undefined) return;

    setTimeout(() => {
        for (let nav of navs) {
            const tabs = nav.querySelectorAll("a.item");
            if (tabs === null
                || tabs === undefined
                || (Array.isArray(tabs) && !tabs.length)) return;

            for (let tab of tabs) {
                removeTextFromButton(tab);
            }
            $(nav).css("justify-content", "center");
        }
        app.setPosition(app.position);
    }, 100);
}

function cleanPoppedDocumentHeader(app, poppedWindow) {
    if (poppedWindow === undefined) return;
    cleanDocumentHeader(app, $(poppedWindow));
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


Hooks.on('renderApplication', eventHandler);
Hooks.on('renderDocumentSheet', eventHandler);
Hooks.on('renderActorSheet', eventHandler);
Hooks.on('renderJournalSheet', eventHandler);
Hooks.on('renderItemSheet', eventHandler);
Hooks.on('renderRollTableConfig', eventHandler);
Hooks.on('renderSidebarTab', eventHandler);
Hooks.on('renderFormApplication', eventHandler);

Hooks.on('init', () => {
    handlePopout();
    
    game.settings.register("cleaner-sheet-title-bar", "collapse-navbars", {
        name: game.i18n.localize('CSTB.Settings.CompactNavbars.Title'),
        hint: game.i18n.localize('CSTB.Settings.CompactNavbars.Hint'),
        scope: "world",
        group: "UI",
        config: true,
        type: Boolean,
        default: false,
    });
});
