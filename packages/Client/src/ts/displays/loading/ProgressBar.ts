import {EventEmitter} from "events";
import moment from "moment";
import "../../../css/element/progress-bar.css";

export default class ProgressBar extends EventEmitter {
    private static generate() {
        const container = document.createElement("div");
        container.classList.add("progress-bar");

        const bar = document.createElement("div");
        bar.classList.add("bar");

        container.appendChild(bar);

        return {container, bar};
    }

    private _progress: number = 0;
    private _startTime: number = 0;
    private _lastUpdateTime: number = 0;
    private _lastUpdateProgress: number = 0;
    private _endTime: number = 0;
    private _timeLeft: number = 0;
    private _running: boolean = false;
    private _bar: HTMLElement;

    /**
     * Container element containing the progress bar
     */
    container: HTMLElement;

    get progress() { return this._progress }
    set progress(value: number) {
        this._progress = value;

        this.updateProgress();
    }

    constructor() {
        super();

        const generated = ProgressBar.generate();
        this.container = generated.container;
        this._bar = generated.bar;

        this.progress = 0;
    }

    private estimateTime(progress: number) {
        return this._startTime + (this._lastUpdateTime - this._startTime) / this._lastUpdateProgress * progress;
    }

    private end(event: string) {
        this._endTime = performance.now();
        this._running = false;

        this.emit(event);
    }

    private updateProgress() {
        const estimatedCurrentTime = this.estimateTime(this.progress);
        const estimatedTotalTime = this.estimateTime(1);

        this._timeLeft = estimatedTotalTime - estimatedCurrentTime;
        this.updateElements(estimatedTotalTime, estimatedCurrentTime);
    }

    private updateElements(endTime: number, currentTime: number) {
        const timeLeftString = moment(endTime).to(currentTime);

        this.container.setAttribute("data-progress-text", timeLeftString);
        this._bar.setAttribute("data-progress-text", Math.round(this.progress * 100) + "%");
        this._bar.style.width = (this.progress * 100) + "%";
    }

    start() {
        if (this._running) {
            this.cancel();
        }

        this._startTime = performance.now();
        this._running = true;

        this.emit("start");
    }

    cancel() {
        this.end("cancel");
    }

    stop() {
        this.end("cancel");
    }
}