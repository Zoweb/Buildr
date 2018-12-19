import DatabaseGetter from "./DatabaseGetter";
import User from "../../security/User";
import {Logger} from "../../getLogger";
import sha3 from "../../tool/sha3";

const logger = Logger.create("storage/getter/UserGetter");

export default class UserGetter extends DatabaseGetter {
    private _userCache: {[code: string]: User} = {};

    static getUserCode(email: string) {
        return sha3(email.toLowerCase());
    }

    async getUser(email: string, noUpdate: boolean = false): Promise<User> {
        const code = UserGetter.getUserCode(email);
        logger.debug("Getting user with code", code);

        const section = this.get(code);

        let user: User;
        if (code in this._userCache) user = this._userCache[code];
        else user = new User(section);

        if (noUpdate) return user;

        // update user information
        user.code = code;
        user.email = await section.contains("email") ? await section.getString("email") : email;
        user.isRegistered = await section.contains("isRegistered") ? await section.getBoolean("isRegistered") : false;

        user.username = await section.contains("username") ? await section.getString("username") : null;

        await user.save();

        return user;
    }

    async getRootUser() {
        const user = await this.getUser("__ROOT");
        user.username = "root";
        await user.save();
        return user;
    }
}