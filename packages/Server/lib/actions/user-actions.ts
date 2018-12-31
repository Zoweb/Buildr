import {Record, String, Union, Void} from "runtypes";
import {AuthenticatedAction, UnauthenticatedAction} from "./Action";
import {Logger} from "../getLogger";
import LocalState from "../tool/LocalState";
import User from "../security/User";
import EmailAuthenticationState from "../state-types/EmailAuthenticationState";
import sendEmail from "../send-email";

const logger = Logger.create("actions/user");

export const userState = new LocalState<User>();
export const emailAuthState = new LocalState<EmailAuthenticationState>();

// Checks if the user's current authentication code is valid.
export interface IAuthenticationIsValidCurrent {}
export const AuthenticationIsValidCurrentType = Record({
});
export const AuthenticationIsValidCurrentAction
    = UnauthenticatedAction.create<IAuthenticationIsValidCurrent>
(AuthenticationIsValidCurrentType, "authentication:is-valid:current", async (authCode, data) => {
    logger.debug("Checking user's authentication code validity");

    return {
        isValid: userState.contains(authCode)
    }
});

// Checks if an authentication code is valid.
export interface IAuthenticationIsValidOther {
    authCode?: string;
}
export const AuthenticationIsValidOtherType = Record({
    authCode: Union(String, Void)
});
export const AuthenticationIsValidOtherAction
    = UnauthenticatedAction.create<IAuthenticationIsValidOther>
(AuthenticationIsValidOtherType, "authentication:is-valid:other", async (authCode, data) => {
    logger.debug("Checking an authentication code validity");

    return {
        isValid: userState.contains(data.authCode)
    }
});

// Removes an authentication code.
export interface IAuthenticationUnauth {}
export const AuthenticationUnauthType = Record({
});
export const AuthenticationUnauthAction
    = AuthenticatedAction.create<IAuthenticationUnauth>
(AuthenticationUnauthType, "authentication:unauth", async (user, data) => {
    logger.debug("Removing user's authentication code");
    userState.remove(user.authCode);
    return {
        success: true
    }
});

// Sends an email to allow for a user to log in
export interface IAuthenticationSendEmail {
    email: string
}
export const AuthenticationSendEmailType = Record({
    email: String
});
export const AuthenticationSendEmailAction
    = UnauthenticatedAction.create<IAuthenticationSendEmail>
(AuthenticationSendEmailType, "authentication:send-email", async (authCode, data, socket) => {
    logger.debug("Creating authentication email state");

    const loginId = emailAuthState.create({
        email: data.email,
        client: socket
    });

    await sendEmail("login", "Your magic link is ready", {
        from: "noreply@zoweb.me",
        to: data.email
    }, {
        loginId
    });

    logger.debug("Done");

    return {
        success: true
    }
});