import { Page, Target } from "puppeteer-core";
import PQueue from "p-queue";
import os from "os";

import { createWorkersRunner } from "./workers";
import { WorkersRunner } from "./workers/worker";
import { Store } from "./store";
import { DumpsPluginConfig, parseConfig } from "./config";
import { useModes, readMode, writeMode } from "./modes";

export = (hermione: Hermione, opts: DumpsPluginConfig): void => {
    const config = parseConfig(opts, hermione.config);
    if (!config.enabled || hermione.isWorker()) {
        return;
    }

    let workersRunner: WorkersRunner;
    const stores = new Map<string, Store>();
    const sessionEndedIds = new Set<string>();
    const queue = new PQueue({ concurrency: os.cpus().length });

    const attachTarget = async (page: Page, sessionId: string): Promise<void> => {
        if (page.isClosed()) {
            return;
        }

        const target = page.target();

        if (target.type() !== "page") {
            return;
        }

        const session = await target.createCDPSession();

        await useModes(
            {
                onPlay: () => readMode(session, config.hostsPatterns, stores.get(sessionId)!),
                onCreate: () => writeMode(session, config.hostsPatterns, stores.get(sessionId)!),
                onSave: () => writeMode(session, config.hostsPatterns, stores.get(sessionId)!),
            },
            config.mode,
        );
    };

    hermione.on(hermione.events.RUNNER_START, runner => {
        workersRunner = createWorkersRunner(runner);
    });

    hermione.on(hermione.events.SESSION_START, async (browser, info) => {
        if (!config.browsers.includes(info.browserId)) {
            return;
        }

        const puppeteer = await browser.getPuppeteer();
        const pages = await puppeteer.pages();

        stores.set(info.sessionId, Store.create(config.dumpsDir, workersRunner));

        await Promise.all(
            pages.map(async (page: unknown) => {
                if (!page) {
                    return;
                }

                await attachTarget(page as Page, info.sessionId);
            }),
        );

        puppeteer.on("targetcreated", async (target: Target) => {
            const page = await target.page();

            if (!page) {
                return;
            }

            await attachTarget(page, info.sessionId);
        });
    });

    hermione.on(hermione.events.TEST_BEGIN, test => {
        if (!config.browsers.includes(test.browserId)) {
            return;
        }

        useModes(
            {
                onPlay: () => stores.get(test.sessionId)!.loadDump(test),
                onSave: () => stores.get(test.sessionId)!.createEmptyDump(),
                onCreate: () => stores.get(test.sessionId)!.createEmptyDump(),
            },
            config.mode,
        );
    });

    const cleanStaleStores = (): void => sessionEndedIds.forEach(id => sessionEndedIds.delete(id) && stores.delete(id) && console.log(`deleted ${id}`));

    hermione.on(hermione.events.TEST_PASS, test => {
        if (!config.browsers.includes(test.browserId)) {
            return;
        }

        const onWrite = (test: Hermione.Test, opts: { overwrite: boolean }): void => {
            queue.add(() => stores.get(test.sessionId)!.saveDump(test, opts).then(cleanStaleStores));
        };

        useModes(
            {
                onCreate: () => onWrite(test, { overwrite: false }),
                onSave: () => onWrite(test, { overwrite: true }),
            },
            config.mode,
        );
    });

    hermione.on(hermione.events.TEST_FAIL, test => {
        if (!config.browsers.includes(test.browserId)) {
            return;
        }

        useModes(
            {
                onCreate: cleanStaleStores,
                onSave: cleanStaleStores,
            },
            config.mode,
        );
    });

    hermione.on(hermione.events.SESSION_END, (_, { sessionId }) => {
        const onWrite = (sessionId: string): void => {
            sessionEndedIds.add(sessionId);
        };

        useModes(
            {
                onCreate: () => onWrite(sessionId),
                onSave: () => onWrite(sessionId),
            },
            config.mode,
        );
    });

    hermione.on(hermione.events.RUNNER_END, () => queue.onIdle());
};
