import "../css/index.css";

document.querySelectorAll(".input-label").forEach(el => {
    const $input = el.querySelector("input") as HTMLInputElement;

    console.log(el, $input);

    el.addEventListener("mousedown", e => {
        $input.focus();
        e.preventDefault();
    });
});