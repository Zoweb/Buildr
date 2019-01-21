import {Boolean, Number, String, Literal, Array, Tuple, Record, Union, Void} from "runtypes";

export interface IRepositoryGetFiles {
    files: IRepositoryGetFiles_File[]
}

export interface IRepositoryGetFiles_File {
    status: string[],
    files: string[],
    abbrevHash: string,
    hash: string,
    subject: string,
    authorName: string,
    authorDate: string
}

export const RepositoryGetFiles = Record({
    files: Array(Record({
        status: Array(String),
        files: Array(String),
        abbrevHash: String,
        hash: String,
        subject: String,
        authorName: String,
        authorDate: String
    }))
});

export const RepositoryList = Record({
});

export interface IRepositoryBranchList {
    branches: IRepositoryBranch[]
}

export interface IRepositoryBranch {
    current: boolean;
    name: string;
    latestCommit: string;
    behindBy: number;
    aheadBy: number;
}

export const RepositoryBranchList = Record({
    branches: Array(Record({
        current: Boolean,
        name: String,
        latestCommit: String,
        behindBy: Number,
        aheadBy: Number
    }))
});