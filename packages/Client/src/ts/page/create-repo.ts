import {Logger} from "../getLogger";
import main from "./main";
import WindowDisplay from "../displays/WindowDisplay";
import loadWindow from "../displays/loadWindow";
import {generateInput} from "../displays/emailSendWindow";

const logger = Logger.create("page/create-repo");
(async function() {
    const {client} = await main();

    console.debug("Waiting until user presses button");
    await new Promise(yay => document.getElementById("start-steps").addEventListener("click", yay));
    console.debug("Ready!");

    const window = new WindowDisplay("Create Repository", true);
    window.addMessage("Choose a unique name");

    const nameField = generateInput("Name", "text", "my-awesome-project");
    window.content.appendChild(nameField.container);

    const createButton = document.createElement("button");
    createButton.textContent = "Create";
    window.content.appendChild(createButton);

    await window.create();
    window.centre();

    await new Promise(yay => createButton.addEventListener("click", yay));

    window.destroy();

    await loadWindow(async () => {
        await client.get("repository:create", {
            name: nameField.input.value
        });
    });

    location.assign("/repository.html#" + nameField.input.value);

})().catch(err => {
    console.error(err);
});