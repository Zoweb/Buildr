import {Record} from "runtypes";
import {
    AuthenticatedResponderFunction, AuthenticatedSocketResponderFunction,
    UnauthenticatedResponderFunction,
    UnauthenticatedSocketResponderFunction
} from "../socket/ResponderFunction";
import AuthenticatedSocket from "../socket/AuthenticatedSocket";

export abstract class Action {
    permissions: string[];
    inputType: Record<any>;

    name: string;

    abstract setupResponseMethod(client: AuthenticatedSocket);
}

export class AuthenticatedAction<TType> extends Action {
    static create<TType>(inputType: Record<any>, name: string, responder: AuthenticatedSocketResponderFunction<TType>) {
        return new AuthenticatedAction(inputType, name, [], responder);
    }

    static createWithPermission<TType>(inputType: Record<any>, name: string, permission: string, responder: AuthenticatedSocketResponderFunction<TType>) {
        return new AuthenticatedAction(inputType, name, [permission], responder);
    }

    static createWithPermissions<TType>(inputType: Record<any>, name: string, permissions: string[], responder: AuthenticatedSocketResponderFunction<TType>) {
        return new AuthenticatedAction(inputType, name, permissions, responder);
    }

    responder: AuthenticatedSocketResponderFunction<TType>;

    constructor(inputType: Record<any>, name: string, permissions: string[], responder: AuthenticatedSocketResponderFunction<TType>) {
        super();

        this.permissions = permissions;
        this.inputType = inputType;
        this.responder = responder;
        this.name = name;
    }

    setupResponseMethod(client: AuthenticatedSocket) {
        if (this.permissions.length) client.respondWithPermissions(
            this.inputType, this.name, this.permissions,
            (user, data) => this.responder(user, data, client.connection)
        );
        else client.respond(
            this.inputType, this.name,
            (user, data) => this.responder(user, data, client.connection)
        );
    }
}

export class UnauthenticatedAction<TType> extends Action {
    static create<TType>(inputType: Record<any>, name: string, responder: UnauthenticatedSocketResponderFunction<TType>) {
        return new UnauthenticatedAction<TType>(inputType, name, responder);
    }

    responder: UnauthenticatedSocketResponderFunction<TType>;

    constructor(inputType: Record<any>, name: string, responder: UnauthenticatedSocketResponderFunction<TType>) {
        super();

        this.inputType = inputType;
        this.responder = responder;
        this.name = name;
    }

    setupResponseMethod(client: AuthenticatedSocket) {
        client.respondWithoutUserCheck(
             this.inputType, this.name,
            (authCode, data) => this.responder(authCode, data, client.connection)
        );
    }
}