export default function selectElementText($el, win = window) {
    const doc = win.document;

    console.debug("Selecting element:", $el);

    const sel = win.getSelection(),
        range = doc.createRange();

    range.selectNodeContents($el);
    sel.removeAllRanges();
    sel.addRange(range);
}