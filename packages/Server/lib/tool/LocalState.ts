import * as crypto from "crypto";
import NullReferenceException from "../errors/NullReferenceException";
import nameof from "../nameof";

export interface StateData<TValue> {
    id: string;
    data: TValue;
    created: number;
    lastModified: number;
    lastAccessed: number;
}

export default class LocalState<TValue> {
    private static readonly ID_SIZE: number = 1;

    private static generateId() {
        return crypto.randomBytes(LocalState.ID_SIZE).toString("hex");
    }

    private states: {
        [id: string]: StateData<TValue>
    } = {};

    create(data: TValue): string {
        const id = LocalState.generateId();
        this.states[id] = {
            id,
            data,
            created: Date.now(),
            lastModified: 0,
            lastAccessed: 0
        };
        return id;
    }

    update(id: string, data: TValue) {
        if (!(id in this.states)) throw new NullReferenceException(nameof({id}), "Could not find state");
        this.states[id].data = data;
        this.states[id].lastModified = Date.now();
    }

    contains(id: string) {
        return id in this.states;
    }

    get(id: string): TValue {
        if (!(id in this.states)) throw new NullReferenceException(nameof({id}), "Could not find state");
        this.states[id].lastAccessed = Date.now();
        return this.states[id].data;
    }

    remove(id: string) {
        if (!(id in this.states)) throw new NullReferenceException(nameof({id}), "Could not find state");
        delete this.states[id];
    }
}