import {Stringifyable} from "../Stringifyable";
import User from "../security/User";
import SocketConnection from "./SocketConnection";

export interface ResponderFunction {
    (data: Stringifyable): Stringifyable | Promise<Stringifyable>;
}

export interface AuthenticatedResponderFunction<TType> {
    (user: User, data: TType): Stringifyable | Promise<Stringifyable>;
}

export interface AuthenticatedSocketResponderFunction<TType> {
    (user: User, data: TType, connection: SocketConnection): Stringifyable | Promise<Stringifyable>;
}

export interface UnauthenticatedResponderFunction<TType> {
    (authCode: string, data: TType): Stringifyable | Promise<Stringifyable>;
}

export interface UnauthenticatedSocketResponderFunction<TType> {
    (authCode: string, data: TType, connection: SocketConnection): Stringifyable | Promise<Stringifyable>;
}
