import {EventEmitter} from "events";
import sha1 from "sha1";

export default class WindowDisplay extends EventEmitter {
    private readonly _window = document.createElement("section");
    private readonly _outer = document.createElement("div");
    private readonly _title = document.createElement("span");

    private readonly _backgroundHider = document.createElement("div");
    private _oldBodyContents: HTMLBodyElement;

    private readonly _id: string;
    private readonly _hideBg: boolean;

    readonly content = document.createElement("div");

    constructor(title, hideBackground: boolean = false) {
        super();

        this._hideBg = hideBackground;

        this._title.textContent = title;

        this._id = sha1(title).toString();
        if (document.getElementById(this._id) !== null) {
            document.getElementById(this._id).remove();
        }
        if (document.getElementById(this._id + "-bg") !== null) {
            document.getElementById(this._id + "-bg").remove();
        }

        this._window.id = this._id;

        this._title.className = "title";
        this.content.className = "content";
        this._outer.className = "outer";
        this._window.className = "window";

        this._backgroundHider.className = "window-background-hider";
        this._backgroundHider.id = this._id + "-bg";

        this._outer.appendChild(this._title);
        this._outer.appendChild(this.content);
        this._window.appendChild(this._outer);
    }

    async create() {
        this.emit("create-start");

        //const canvas = await html2canvas(document.body);
        //canvas.className = "window-background-hider-canvas";

        if (this._hideBg) {
            //this._oldBodyContents = document.body.cloneNode(true) as HTMLBodyElement;
            //document.body.remove();
            //document.body = document.createElement("body");

            document.body.appendChild(this._backgroundHider);
            //document.body.appendChild(canvas);
        }

        document.body.appendChild(this._window);

        let isMouseDown = false, startPos = {x: 0, y: 0};

        this._title.addEventListener("mousedown", (e: MouseEvent) => {
            e.preventDefault();

            isMouseDown = true;
            startPos = {x: e.clientX - this._window.offsetLeft, y: e.clientY - this._window.offsetTop};
        });

        window.addEventListener("mouseup", () => isMouseDown = false);

        window.addEventListener("mousemove", (e: MouseEvent) => {
            if (!isMouseDown) return;

            const offset = {x: e.clientX - startPos.x, y: e.clientY - startPos.y};

            if (offset.x > window.innerWidth - this._window.offsetWidth)
                offset.x = window.innerWidth - this._window.offsetWidth;
            if (offset.y > window.innerHeight - this._window.offsetHeight)
                offset.y = window.innerHeight - this._window.offsetHeight;
            if (offset.x < 0) offset.x = 0;
            if (offset.y < 0) offset.y = 0;

            this._window.style.top = offset.y + "px";
            this._window.style.left = offset.x + "px";
        });
    }

    destroy() {
        this._backgroundHider.remove();
        this._window.remove();

        if (this._oldBodyContents) {
            console.log(this._oldBodyContents);
            document.body.remove();
            document.body = this._oldBodyContents;
        }
    }

    centre() {
        this._window.style.top = ((window.innerHeight - this._window.offsetHeight) / 2) + "px";
        this._window.style.left = ((window.innerWidth - this._window.offsetWidth) / 2) + "px";
    }

    addMessage(content) {
        const elem = document.createElement("p");
        elem.className = "message";

        elem.textContent = content;

        this.content.appendChild(elem);
    }
}