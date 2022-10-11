import _ from "lodash";
import type { Page, Target } from "puppeteer-core";

import { createWorkersRunner } from "./workers";
import { Store } from "./store";
import { DumpsPluginConfig, parseDumpsConfig } from "./config";
import { declareModeFlows } from "./declareModeFlows";
import { gatherFlow, loadFlow } from "./flows";

export = (hermione: Hermione, opts: DumpsPluginConfig): void => {
    const config = parseDumpsConfig(opts, hermione.config);

    if (!config.enabled || hermione.isWorker()) {
        return;
    }

    const store = Store.create(config.dumpsDir);
    let writingQueue: Promise<void> | undefined;

    const withWritingQueue = async (promise: Promise<void>): Promise<void> => {
        if (!writingQueue) {
            writingQueue = promise;
            return promise;
        }

        return writingQueue.then(() => {
            writingQueue = promise;
            return promise;
        });
    };

    const attachTarget = async (page: Page): Promise<void> => {
        if (page.isClosed()) {
            return;
        }

        const target = page.target();

        if (target.type() !== "page") {
            return;
        }

        const session = await target.createCDPSession();

        await declareModeFlows(
            {
                onPlay: async () => loadFlow(session, config.hosts, store),
                onCreate: async () => gatherFlow(session, config.hosts, store),
                onSave: async () => gatherFlow(session, config.hosts, store),
            },
            config.mode,
        );
    };

    hermione.on(hermione.events.RUNNER_START, async runner => {
        const workersRunner = createWorkersRunner(runner);
        store.consume(workersRunner);
    });

    hermione.on(hermione.events.TEST_BEGIN, test => {
        declareModeFlows(
            {
                onPlay: () => store.loadDump(test),
                onSave: () => store.init(),
                onCreate: () => store.init(),
            },
            config.mode,
        );
    });

    hermione.on(hermione.events.TEST_BEGIN, test => {
        hermione.on(hermione.events.TEST_PASS, () => {
            declareModeFlows(
                {
                    onCreate: () => withWritingQueue(store.saveDump(test, false)),
                    onSave: () => withWritingQueue(store.saveDump(test, true)),
                },
                config.mode,
            )
        })
    });

    hermione.on(hermione.events.RUNNER_END, () => writingQueue);

    hermione.on(hermione.events.SESSION_START, async (browser, info) => {
        if (config.browsers === null && !browser.isDevTools) {
            return;
        }
        if (_.isArray(config.browsers) && !config.browsers.includes(info.browserId)) {
            return;
        }

        const puppeteer = await browser.getPuppeteer();
        const pages = await puppeteer.pages();

        await Promise.all(
            pages.map(async (page: unknown) => {
                if (!page) {
                    return;
                }

                await attachTarget(page as Page);
            }),
        );

        puppeteer.on("targetcreated", async (target: Target) => {
            const page = await target.page();

            if (!page) {
                return;
            }

            await attachTarget(page);
        });
    });
};
