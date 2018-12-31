import "../../../css/element/load-icon.css";

export default class LoadingIcon {
    private static generate() {
        const container = document.createElement("div");
        container.classList.add("load-icon");

        return container;
    }

    container: HTMLElement = LoadingIcon.generate();

    /**
     * Create a
     * @param expectedTime - Time that the operation should take. -1 means it will never time out.
     */
    constructor(expectedTime: number = -1) {

        if (expectedTime === -1) return;
        setTimeout(() => {
            this.container.classList.add("warning");
        }, expectedTime);
    }
}