import SocketConnection from "./SocketConnection";
import LocalState from "../tool/LocalState";
import User from "../security/User";
import InvalidRequestException from "../errors/InvalidRequestException";
import AuthenticationException from "../errors/AuthenticationException";
import {AuthenticatedResponderFunction, UnauthenticatedResponderFunction} from "./ResponderFunction";
import {Record} from "runtypes";

export default class AuthenticatedSocket {
    public connection: SocketConnection;
    private users: LocalState<User>;

    constructor(connection: SocketConnection, usersState: LocalState<User>) {
        this.connection = connection;
        this.users = usersState;
    }

    public respond(type: Record<any>, event: string, responder: AuthenticatedResponderFunction<any>) {
        this.connection.respond(event, data => {
            if (typeof data["authCode"] === "undefined")
                throw new InvalidRequestException(event, "Invalid request structure: Missing auth code");
            if (typeof data["data"] === "undefined")
                throw new InvalidRequestException(event, "Invalid request structure: Missing data");

            if (!type.validate(data["data"]).success)
                throw new InvalidRequestException(event, "Invalid request structure: Does not conform to data format");

            if (!this.users.contains(data["authCode"])) throw new AuthenticationException("Invalid auth code");

            const user = this.users.get(data["authCode"]);

            return responder(user, data["data"]);
        });
    }

    public respondWithPermissions(type: Record<any>, event: string, permissions: string[], responder: AuthenticatedResponderFunction<any>) {
        this.respond(type, event, (user, data) => {
            for (const permission in permissions) {
                if (!user.hasPermission(permission))
                    throw new AuthenticationException("User does not have required permission", permission);
            }

            return responder(user, data);
        });
    }

    public respondWithPermission(type: Record<any>, event: string, permission: string, responder: AuthenticatedResponderFunction<any>) {
        return this.respondWithPermissions(type, event, [permission], responder);
    }

    respondWithoutUserCheck(type: Record<any>, event: string, responder: UnauthenticatedResponderFunction<any>) {
        this.connection.respond(event, data => {
            if (typeof data["authCode"] === "undefined")
                throw new InvalidRequestException(event, "Invalid request structure: Missing auth code");
            if (typeof data["data"] === "undefined")
                throw new InvalidRequestException(event, "Invalid request structure: Missing data");

            if (!type.validate(data["data"]).success)
                throw new InvalidRequestException(event, "Invalid request structure: Does not conform to data format");

            return responder(data["authCode"], data["data"]);
        });
    }
}