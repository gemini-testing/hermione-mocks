import type { CDPSession } from "puppeteer-core";

import { mkRequestXHRInterceptor } from "../cdp";
import { Store } from "../store";

export async function loadFlow(session: CDPSession, patterns: string[], store: Store): Promise<void> {
    const requestInterceptor = mkRequestXHRInterceptor(session, patterns);

    requestInterceptor.listen(async ({ requestId, request }, api) => {
        await store.resolve();

        const dumpResponse = store.get(request.url);

        if (dumpResponse) {
            await api.respondWithMock({
                requestId,
                body: dumpResponse.body,
                headers: dumpResponse.headers,
            });
        } else {
            console.error(`Cache is empty:\nkey=${request.url}`);
            process.exit(1);
        }
    });

    await requestInterceptor.enable();
}
