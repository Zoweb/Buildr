import ConfigurationSection from "../storage/ConfigurationSection";
import Path from "../storage/paths/Path";

export default class User {
    private _permissions: ConfigurationSection;

    public getter: ConfigurationSection;

    public code: string;

    public isRegistered: boolean;

    public username?: string;
    public email: string;

    public authCode: string;

    constructor(getter: ConfigurationSection) {
        this.getter = getter;

        this._permissions = this.getter.get("permissions");
    }

    /**
     * Checks if the user has a permissions.
     *
     * @param name - The name of the permission, a hierarchy separated by periods. A wildcard value means the user
     * has any permission directly in place of it, as well as higher up.
     *
     * @example
     * User1 has permissions:
     *  - create.awesomeness
     *  - create.everything.*
     *
     * User1 does not have the permission "create.everything",
     * but does have:
     *  - create.awesomeness
     *  - create.everything.awesome
     *  - create.everything.awesome.and.amazing
     *
     * @see givePermission
     * @see revokePermission
     * @see resetPermissions
     */
    async hasPermission(name: string): Promise<boolean> {
        name = name.replace(/\*/g, "__WILDCARD__");

        console.log("Name changed to", name);

        const sections = name.split(".");

        console.log("Sections:", sections);
        if (await this._permissions.contains(name) && await this._permissions.getBoolean(name)) return true;

        for (let i = sections.length - 1; i > 0; i--) {
            const path = sections.slice(0, i).join(".");
            const fullPath = new Path(path).append("__WILDCARD__");

            if (await this._permissions.contains(fullPath) && await this._permissions.getBoolean(fullPath)) return true;
        }

        return false;
    }

    /**
     * Gives a user a permission. Make the last section be a `*` to give the user any permission at this point or
     * deeper.
     *
     * @param name - The name of the permission, a hierarchy separated by periods. A wildcard valeu means the user
     * has any permission directly in place of it, as well as higher up.
     *
     * @see hasPermission
     * @see revokePermission
     * @see resetPermissions
     */
    givePermission(name: string) {
        name = name.replace(/\*/g, "__WILDCARD__");
        return this._permissions.set(name, true);
    }

    /**
     * Revokes a permission from a user. Make the last section be a `*` to revoke any permission at this
     * point or deeper from the user.
     *
     * @param name - The name of the permission, a hierarchy separated by periods. A wildcard valeu means the user
     * has any permission directly in place of it, as well as higher up.
     *
     * @see hasPermission
     * @see givePermission
     * @see resetPermissions
     */
    revokePermission(name: string) {
        name = name.replace(/\*/g, "__WILDCARD__");
        return this._permissions.set(name, false);
    }

    /**
     * Resets the user's permissions to the default.
     */
    async resetPermissions() {
        await this.givePermission("email.get.me");
        await this.revokePermission("email.get.others");
        await this.givePermission("username.change.me");
        await this.revokePermission("username.change.others");
        await this.givePermission("account.remove.me");
        await this.revokePermission("account.remove.others");
        await this.givePermission("git.repo.create");
        await this.givePermission("git.repo.mine.*");
        await this.revokePermission("git.repo.others.*");
        await this.givePermission("git.repo.others.read");
    }

    async save() {
        await this.getter.set("email", this.email);
        await this.getter.set("username", this.username);
        await this.getter.set("isRegistered", this.isRegistered);
    }
}