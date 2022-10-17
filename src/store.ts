import { createHash } from "crypto";
import path from "path";
import _ from "lodash";

import type { WorkersRunner } from "./workers/worker";
import { Dump, DumpResponse, DumpsDirCallback } from "./types";

export class Store {
    static create(dumpsDir: string | DumpsDirCallback, workersRunner: WorkersRunner): Store {
        return new this(dumpsDir, workersRunner);
    }

    private dumpPromise!: Promise<Dump>;
    private queryCounter!: Map<string, number>;

    constructor(private dumpsDir: string | DumpsDirCallback, private workersRunner: WorkersRunner) {}

    public createEmptyDump(): void {
        this.queryCounter = new Map();
        this.dumpPromise = Promise.resolve<Dump>({
            requests: {},
            responses: {},
        });
    }

    public loadDump(test: Hermione.Test): void {
        const dumpPath = this.getDumpPath(test);

        this.queryCounter = new Map();
        this.dumpPromise = this.workersRunner.readDump(dumpPath);
    }

    public async saveDump(test: Hermione.Test, opts: { overwrite: boolean }): Promise<void> {
        const dump = await this.dumpPromise;

        const dumpPath = this.getDumpPath(test);

        return this.workersRunner.writeDump(dumpPath, dump, opts.overwrite);
    }

    public async get(hashKey: string): Promise<DumpResponse | null> {
        const dump = await this.dumpPromise;
        const ind = this.getResponseIndex(hashKey);

        const requestId = dump.requests[hashKey][ind];

        return dump.responses[requestId];
    }

    public async set(hashKey: string, response: DumpResponse): Promise<void> {
        const dump = await this.dumpPromise;
        const responseHash = this.getResponseHash(response);

        dump.requests[hashKey] = dump.requests[hashKey] || [];
        dump.requests[hashKey].push(responseHash);

        dump.responses[responseHash] = response;
    }

    private getDumpPath(test: Hermione.Test): string {
        const fileName = this.getFileName(test);
        return _.isFunction(this.dumpsDir)
            ? path.resolve(this.dumpsDir(test), fileName)
            : path.resolve(process.cwd(), this.dumpsDir, fileName);
    }

    private getFileName(test: Hermione.Test): string {
        const fileNameString = `${test.fullTitle()}#${test.browserId}`;

        return createHash("md5").update(fileNameString, "ascii").digest("hex") + ".json";
    }

    private getResponseHash({ responseCode, body, headers }: DumpResponse): string {
        const responseString = `${responseCode}#${body}#${Object.values(headers).join("#")}`;

        return createHash("md5").update(responseString, "utf8").digest("hex");
    }

    private getResponseIndex(hashKey: string): number {
        const ind = this.queryCounter.get(hashKey) || 0;

        this.queryCounter.set(hashKey, ind + 1);

        return ind;
    }
}
