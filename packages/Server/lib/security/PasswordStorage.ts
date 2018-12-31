import * as crypto from "crypto";

const PASSWORD_LENGTH = 256;
const SALT_LENGTH = 64;
const ITERATIONS = 10000;
const DIGEST = "sha256";
const BYTE_TO_STRING_ENCODING = "hex";

/**
 * Information about the password that will be stored
 */
interface PersistedPassword {
    salt: string;
    hash: string;
    iterations: number;
}

/**
 * Generates a {@link PersistedPassword} from the password provided by the user. Should be called whenever password
 * storage is required.
 * @param password - The password to hash
 */
export function passwordHash(password: string): Promise<PersistedPassword> {
    return new Promise<PersistedPassword>((yay, nay) => {
        const salt = crypto.randomBytes(SALT_LENGTH).toString(BYTE_TO_STRING_ENCODING);

        crypto.pbkdf2(password, salt, ITERATIONS, PASSWORD_LENGTH, DIGEST, (err, hash) => {
            if (err) nay(err);
            else yay({
                salt,
                hash: hash.toString(BYTE_TO_STRING_ENCODING),
                iterations: ITERATIONS
            });
        });
    })
}

/**
 * Verifies that the supplied attempt matches the original {@link PersistedPassword}.
 * @param password - Original password data
 * @param attempt - Attempted password
 */
export function passwordVerify(password: PersistedPassword, attempt: string): Promise<boolean> {
    return new Promise<boolean>((yay, nay) => {
        crypto.pbkdf2(attempt, password.salt, password.iterations, PASSWORD_LENGTH, DIGEST, (err, hash) => {
            if (err) nay(err);
            else yay(password.hash === hash.toString(BYTE_TO_STRING_ENCODING));
        });
    });
}