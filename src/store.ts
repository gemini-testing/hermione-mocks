import { createHash } from "crypto";
import path from "path";
import _ from "lodash";

import type { WorkersRunner } from "./workers/worker";
import type { Dump, DumpResponse, DumpsDirCallback } from "./types";

export class Store {
    static create(dumpsDir: string | DumpsDirCallback, workersRunner: WorkersRunner, test: Hermione.Test): Store {
        return new this(dumpsDir, workersRunner, test);
    }

    private dump?: Dump;
    private queryCounter: Map<string, number> | null = null;

    constructor(
        private dumpsDir: string | DumpsDirCallback,
        private workersRunner: WorkersRunner,
        private test: Hermione.Test,
    ) {}

    public async saveDump(opts: { overwrite: boolean }): Promise<void> {
        const dumpPath = this.getDumpPath();

        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        await this.workersRunner.writeDump(dumpPath, this.dump!, opts.overwrite);

        delete this.dump;
    }

    public async get(hashKey: string): Promise<DumpResponse | null> {
        if (!this.dump) {
            const dumpPath = this.getDumpPath();

            this.dump = await this.workersRunner.readDump(dumpPath);
        }

        const ind = this.getResponseIndex(hashKey);
        const requestId = this.dump.requests[hashKey][ind];

        return this.dump.responses[requestId];
    }

    public set(hashKey: string, response: DumpResponse): void {
        if (!this.dump) {
            this.dump = {
                requests: {},
                responses: {},
            };
        }

        const responseHash = this.getResponseHash(response);

        this.dump.requests[hashKey] = this.dump.requests[hashKey] || [];
        this.dump.requests[hashKey].push(responseHash);
        this.dump.responses[responseHash] = response;
    }

    private getDumpPath(): string {
        const fileName = this.getFileName();
        return _.isFunction(this.dumpsDir)
            ? path.resolve(this.dumpsDir(this.test), fileName)
            : path.resolve(process.cwd(), this.dumpsDir, fileName);
    }

    private getFileName(): string {
        const fileNameString = `${this.test.fullTitle()}#${this.test.browserId}`;
        const base64 = createHash("md5").update(fileNameString, "ascii").digest("base64");

        return base64.slice(0, -2).replace("/", "#") + ".json";
    }

    private getResponseHash({ responseCode, body, headers }: DumpResponse): string {
        const responseString = `${responseCode}#${body}#${Object.values(headers).join("#")}`;

        return createHash("md5").update(responseString, "utf8").digest("hex");
    }

    private getResponseIndex(hashKey: string): number {
        this.queryCounter = this.queryCounter || new Map();

        const ind = this.queryCounter.get(hashKey) || 0;

        this.queryCounter.set(hashKey, ind + 1);

        return ind;
    }
}
