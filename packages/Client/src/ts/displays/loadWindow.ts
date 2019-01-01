import WindowDisplay from "./WindowDisplay";

export default async function createLoadWindow(asyncFunction: () => Promise<void>) {
    const window = new WindowDisplay("Loading", true);

    const loadIcon = document.createElement("div");
    loadIcon.style.width = "64px";
    loadIcon.style.height = "64px";
    loadIcon.style.margin = "8px";
    loadIcon.style.background = "url(data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiIHN0YW5kYWxvbmU9Im5vIj8+PHN2ZyB4bWxuczpzdmc9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB2ZXJzaW9uPSIxLjAiIHdpZHRoPSI2NHB4IiBoZWlnaHQ9IjY0cHgiIHZpZXdCb3g9IjAgMCAxMjggMTI4IiB4bWw6c3BhY2U9InByZXNlcnZlIj48Zz48cGF0aCBkPSJNNzUuNCAxMjYuNjNhMTEuNDMgMTEuNDMgMCAwIDEtMi4xLTIyLjY1IDQwLjkgNDAuOSAwIDAgMCAzMC41LTMwLjYgMTEuNCAxMS40IDAgMSAxIDIyLjI3IDQuODdoLjAyYTYzLjc3IDYzLjc3IDAgMCAxLTQ3LjggNDguMDV2LS4wMmExMS4zOCAxMS4zOCAwIDAgMS0yLjkzLjM3eiIgZmlsbD0iYmxhY2siIGZpbGwtb3BhY2l0eT0iMSIvPjxhbmltYXRlVHJhbnNmb3JtIGF0dHJpYnV0ZU5hbWU9InRyYW5zZm9ybSIgdHlwZT0icm90YXRlIiBmcm9tPSIwIDY0IDY0IiB0bz0iMzYwIDY0IDY0IiBkdXI9IjE4MDBtcyIgcmVwZWF0Q291bnQ9ImluZGVmaW5pdGUiPjwvYW5pbWF0ZVRyYW5zZm9ybT48L2c+PC9zdmc+)";

    window.content.appendChild(loadIcon);

    await window.create();
    window.centre();

    try {
        await asyncFunction();

        window.destroy();
        return;
    } catch(err) {
        loadIcon.remove();
        window.addMessage("An error occurred:");
        window.addMessage(err.message);
    }
}