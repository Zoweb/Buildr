import * as path from "path";
import * as Mail from "nodemailer/lib/mailer";
import {existsAsync, readFileAsync} from "fs-extra-promise";
import templater from "./tool/TemplateEngine";
import {optionsDb} from "./static";
import * as nodemailer from "nodemailer";
import {Logger} from "./getLogger";

const logger = Logger.create("send-email");

let hasSetupTransporter = false;

export let transporter: Mail;

async function setupTransporter() {
    const transporterOptions = {
        secure: (await optionsDb.getNumber("email.port")) === 465,
        host: await optionsDb.getString("email.host"),
        port: await optionsDb.getNumber("email.port"),
        auth: {
            user: await optionsDb.getString("email.user"),
            pass: await optionsDb.getString("email.pass")
        }
    };
    logger.debug("Creating email transporter at", transporterOptions.host);
    transporter = nodemailer.createTransport(transporterOptions);
}

export default async function sendEmail(
    emailName: string,
    subject: string,
    {from, to}: {from: string, to: string},
    data?: any) {
    if (!hasSetupTransporter) await setupTransporter();

    logger.info("Sending email to", to, ":", emailName);

    logger.debug("Loading format files");
    const rootPath = path.resolve(path.join("data", "email", emailName));
    const formattedPath = path.join(rootPath, "formatted.html");
    const textOnlyPath = path.join(rootPath, "text-only.txt");

    logger.trace("Root path:", rootPath);
    logger.trace("Formatted path:", formattedPath);
    logger.trace("Text-only path:", textOnlyPath);

    const options: {
        from: string,
        to: string,
        subject: string,
        text?: string,
        html?: string
    } = {
        from,
        to,
        subject
    };

    logger.debug("Checking if format files exist");
    if (await existsAsync(textOnlyPath)) options.text = await readFileAsync(textOnlyPath, "utf8");
    if (await existsAsync(formattedPath)) options.html = await readFileAsync(formattedPath, "utf8");

    if (!options.text) logger.warn("No plain text file found. The email may not display properly on some devices.");

    logger.debug("Inserting template data");
    if (options.text) options.text = await templater(options.text, data);
    if (options.html) options.html = await templater(options.html, data);

    logger.debug("Sending email");
    return await transporter.sendMail(options);
}