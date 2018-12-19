export default function runImports() {
    const methods = [];

    document.querySelectorAll("link[rel=import][href]").forEach(el => {
        methods.push(async () => {
            const href = el.getAttribute("href");

            // send ajax
            const res = await fetch(href);
            if (!res.ok) throw Error(`Could not load resource: ${href}`);

            const content = await res.text();

            const newElement = document.createElement("div");
            newElement.innerHTML = content;

            el.replaceWith(newElement);
        })
    });

    return Promise.all(methods.map(method => method()));
}