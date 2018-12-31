import DatabaseManager from "./storage/DatabaseManager";
import Database from "./storage/Database";
import DatabaseGetter from "./storage/getter/DatabaseGetter";
import UserGetter from "./storage/getter/UserGetter";
import GitServer from "./Git/GitServer";

export const manager = new DatabaseManager();

export let languagesDb: DatabaseGetter, optionsDb: DatabaseGetter, usersDb: UserGetter, gitServer: GitServer, gitDb: DatabaseGetter;

export async function setDatabases() {
    await manager.setDataDirectory("data/dbs");

    languagesDb = manager.getDatabase("language");
    optionsDb = manager.getDatabase("configuration");
    usersDb = manager.getUserDatabase("user");
    gitDb = manager.getDatabase("git");

    gitServer = new GitServer();
    await gitServer.setDataDirectory("data/git");
    await gitServer.setSetupDirectory("data/git-setup");
}