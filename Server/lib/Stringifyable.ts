/**
 * Data that can be sent through the socket
 */
export type Stringifyable =
    {[k: string]: Stringifyable} |
    {[i: number]: Stringifyable} |
    string |
    number |
    boolean |
    any;