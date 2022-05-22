function removeTextFromButton(element) {
    if (element.title === undefined || element.title.trim() === "" )
        element.title = element.innerText?.trim();

    // Maestro compatibility hack
    if (element.className === "hype-track" || element.className === "item-track") {
        element.getElementsByTagName("span")[0].remove()
        return;
    }

    const nodeIterator = document.createNodeIterator(element, NodeFilter.SHOW_TEXT);
    let node = undefined;
    while (node = nodeIterator.nextNode()) {
        element.removeChild(node);
    }
}

function cleanDocumentHeader(app, html) {
    if (html === undefined) return;

    // When using PopOut! module, button text is reset when you pop window in.
    // In this case, html is just form and not all window. So, we find parent window to get header section
    const header = ( "form".localeCompare(html[0].tagName, undefined, { sensitivity: 'base' }) === 0 )
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

function cleanPoppedDocumentHeader(app, poppedWindow) {
    if (poppedWindow === undefined) return;
    cleanDocumentHeader(app, $(poppedWindow));
}

function handlePopout() {
    if (game.modules.get("popout")) {
        Hooks.on('PopOut:loaded', cleanPoppedDocumentHeader);
    }
}


Hooks.on('renderApplication', cleanDocumentHeader);
Hooks.on('renderDocumentSheet', cleanDocumentHeader);
Hooks.on('renderActorSheet', cleanDocumentHeader);
Hooks.on('renderJournalSheet', cleanDocumentHeader);
Hooks.on('renderItemSheet', cleanDocumentHeader);
Hooks.on('renderRollTableConfig', cleanDocumentHeader);
Hooks.on('renderSidebarTab', cleanDocumentHeader);
Hooks.on('renderFormApplication', cleanDocumentHeader);



Hooks.on('init', () => {
    handlePopout();
});
