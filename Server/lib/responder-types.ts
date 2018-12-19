import {Boolean, Number, String, Literal, Array, Tuple, Record, Union, Void} from "runtypes";

export const AuthenticationIsValidCurrent = Record({
});

export const AuthenticationIsValidOther = Record({
    authCode: Union(String, Void)
});

export const AuthenticationUnauth = Record({
});

export const AuthenticationSendEmail = Record({
    email: String
});

export const UsernameFieldUpdate = Record({
    username: String
});

export const RepositoryCreate = Record({
    name: String
});

export const RepositoryGetFiles = Record({
    repoName: String,
    repoPath: String
});

export const RepositoryList = Record({
});

export const RepositoryFileContents = Record({
    repository: String,
    hash: String,
    file: String
});

export const Resource = Record({
    path: String
});