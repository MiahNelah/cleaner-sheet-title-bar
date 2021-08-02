function removeTextFromButton(element) {
    element.title = element.innerText?.trim();

    const nodeIterator = document.createNodeIterator(element, NodeFilter.SHOW_TEXT);
    let node = undefined;
    while (node = nodeIterator.nextNode()) {
        element.removeChild(node);
    }
}

function cleanDocumentHeader(app, html) {
    if (html === undefined) return;

    const sheetHeader = html[0].querySelector("header.window-header");
    if (sheetHeader === null || sheetHeader === undefined) return;

    const headerButtons = sheetHeader.querySelectorAll("a.header-button");
    if (headerButtons === null
        || headerButtons === undefined
        || (Array.isArray(headerButtons) && !headerButtons.length)) return;

    for (let headerButton of headerButtons) {
        removeTextFromButton(headerButton);
    }
}

Hooks.on('renderApplication', cleanDocumentHeader);
Hooks.on('renderDocumentSheet', cleanDocumentHeader);
Hooks.on('renderActorSheet', cleanDocumentHeader);
Hooks.on('renderJournalSheet', cleanDocumentHeader);
Hooks.on('renderItemSheet', cleanDocumentHeader);
Hooks.on('renderRollTableConfig', cleanDocumentHeader);
