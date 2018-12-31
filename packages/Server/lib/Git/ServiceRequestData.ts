import * as HTTP from "http";

export default interface ServiceRequestData {
    request: HTTP.IncomingMessage;
    response: HTTP.ServerResponse;

    service?: string;

    repoCombinedPath: string;
    repoRootPath: string;
    repoPath: string;
    fullPath: string;
}