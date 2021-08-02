function cleanDocumentHeader(app, html) {
    if (html === undefined) return;

    const sheetHeader = html[0].querySelector("header.window-header");
    if (sheetHeader === null || sheetHeader === undefined) return;

    const headerButtons = sheetHeader.querySelectorAll("a.header-button");
    if (headerButtons === null
        || headerButtons === undefined
        || (Array.isArray(headerButtons) && !headerButtons.length)) return;

    for (let headerButton of headerButtons) {

        headerButton.title = headerButton.innerText?.trim();

        const nodeIterator = document.createNodeIterator(headerButton, NodeFilter.SHOW_TEXT);
        let node = undefined;
        while (node = nodeIterator.nextNode()) {
            headerButton.removeChild(node);
        }
    }
}

Hooks.on('renderApplication', cleanDocumentHeader);
Hooks.on('renderDocumentSheet', cleanDocumentHeader);
Hooks.on('renderActorSheet', cleanDocumentHeader);
Hooks.on('renderJournalSheet', cleanDocumentHeader);
Hooks.on('renderItemSheet', cleanDocumentHeader);
Hooks.on('renderRollTableConfig', cleanDocumentHeader);
