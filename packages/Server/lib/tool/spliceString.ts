/**
 * The spliceString() method changes the content of a string by removing a range of characters and/or adding new
 * characters.
 *
 * @param input - Input string
 * @param start Index to start changing the string
 * @param delCount Amount of old characters to remove
 * @param newSubstring String that will be inserted
 */
export default function spliceString(input: string, start: number, delCount: number = 0, newSubstring: string = "") {
    return input.slice(0, start) + newSubstring + input.slice(start + Math.abs(delCount));
}