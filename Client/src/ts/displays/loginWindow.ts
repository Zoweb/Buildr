import WindowDisplay from "./WindowDisplay";

function generateInput(name, type, placeholder = "") {
    const input = document.createElement("input") as HTMLInputElement;
    input.type = type;
    input.placeholder = placeholder;

    const label = document.createElement("span") as HTMLLabelElement;
    label.classList.add("input-label");
    label.textContent = name;

    const container = document.createElement("div");

    container.appendChild(label);
    label.appendChild(input);

    return {
        container,
        input,
        label
    };
}

export default function createLoginWindow({
    isReAuth = false,
    isRegister = false,
    forceUsername = "",
    message = null as string
                                          } = {}): Promise<{username: string, password: string}> {
    const window = new WindowDisplay(isRegister ? "Register" : "Log In", true);

    if (message) {
        if (message.length > 0) window.addMessage(message);
    } else {
        window.addMessage(isReAuth ? "We need you to log in again." : "Please enter your details below.");
    }

    const usernameField = generateInput("Username", "text", "BobRoss");
    const passwordField = generateInput("Password", "password", "••••••••••••");
    const finishButton = document.createElement("button");
    finishButton.textContent = isRegister ? "Register" : "Log in";

    window.content.appendChild(usernameField.container);
    window.content.appendChild(passwordField.container);
    window.content.appendChild(finishButton);

    if (forceUsername.length > 0) {
        usernameField.input.value = forceUsername;
        usernameField.input.disabled = true;
    }

    window.create().then(() => window.centre());

    return new Promise(yay => {
        finishButton.addEventListener("click", () => {
            window.destroy();
            yay({
                username: forceUsername.length > 0 ? forceUsername : usernameField.input.value,
                password: passwordField.input.value
            });
        });
    });
}