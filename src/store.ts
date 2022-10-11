import { createHash } from "crypto";
import path from "path";
import _ from "lodash";

import type { WorkersRunner } from "./workers/worker";
import { Dump, DumpResponse, DumpsDirCallback } from "./types";

export class Store {
    static create(dumpsDir: string | DumpsDirCallback): Store {
        return new this(dumpsDir);
    }

    private workersRunner!: WorkersRunner;
    private dumpPromise!: Promise<Dump>;
    private dump!: Dump;
    private queryCounter!: Map<string, number>;

    constructor(private dumpsDir: string | DumpsDirCallback) {}

    public init(): void {
        this.queryCounter = new Map();
        this.dumpPromise = Promise.resolve<Dump>({
            responses: {},
            storage: {},
        });
    }

    public consume(workersRunner: WorkersRunner): void {
        this.workersRunner = workersRunner;
    }

    public async resolve(): Promise<void> {
        this.dump = await this.dumpPromise;
    }

    public loadDump(test: Hermione.Test): void {
        const dumpPath = this.getDumpPath(test);

        this.queryCounter = new Map();
        this.dumpPromise = this.workersRunner.readDump(dumpPath);
    }

    public saveDump(test: Hermione.Test, overwrite: boolean): Promise<void> {
        const dump = this.dump!;
        const dumpPath = this.getDumpPath(test);

        return this.workersRunner.writeDump(dumpPath, dump, overwrite);
    }

    public get(hashKey: string): DumpResponse | null {
        const ind = this.getResponseIndex(hashKey);

        const responseId = this.dump.responses[hashKey][ind];

        return this.dump.storage[responseId];
    }

    public set(hashKey: string, response: DumpResponse): void {
        const responseHash = this.getResponseHash(response);

        this.dump.responses[hashKey] = this.dump.responses[hashKey] || [];
        this.dump.responses[hashKey].push(responseHash);

        this.dump.storage[responseHash] = response;
    }

    private getDumpPath(test: Hermione.Test): string {
        const testDirPath = path.dirname(test.file!);
        const dumpsDir = _.isFunction(this.dumpsDir) ? this.dumpsDir(test) : this.dumpsDir;
        const dumpPath = path.resolve(testDirPath, dumpsDir, this.getFileName(test));
        const cwd = process.cwd();
        const targetPath = path.relative(cwd, dumpPath);

        return targetPath;
    }

    private getFileName(test: Hermione.Test): string {
        return createHash("md5").update(`${test.fullTitle()}#${test.browserId}`).digest("hex");
    }

    private getResponseHash(response: DumpResponse): string {
        const responseString = `${response.body}#${Object.values(response.headers).join("#")}`;

        return createHash("md5").update(response.body).update(responseString).digest("hex");
    }

    private getResponseIndex(hashKey: string): number {
        const ind = this.queryCounter.get(hashKey) || 0;

        this.queryCounter.set(hashKey, ind + 1);

        return ind;
    }
}
