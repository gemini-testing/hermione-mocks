export enum RunMode {
    Play = "play",
    Save = "save",
    Create = "create",
}

export interface DumpResponse {
    body: string;
    headers: Record<string, string>;
    responseCode: number;
}

export interface Dump {
    requests: {
        [hashKey: string]: string[];
    };
    responses: {
        [responseId: string]: DumpResponse;
    };
}