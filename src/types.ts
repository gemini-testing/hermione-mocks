export enum RunMode {
    Play = "play",
    Save = "save",
    Create = "create",
}

export type DumpsDirCallback = (test: Hermione.Test) => string;

export interface DumpResponse {
    body: string;
    headers: Record<string, string>;
}

export interface Dump {
    responses: {
        [hashKey: string]: string[];
    };
    storage: {
        [responseId: string]: DumpResponse;
    };
}
