import type { CDPSession } from "puppeteer-core";

import { mkResponseXHRInterceptor, normalizeHeaders } from "../cdp";
import { Store } from "../store";

export async function gatherFlow(session: CDPSession, patterns: string[], store: Store): Promise<void> {
    const responseInterceptor = mkResponseXHRInterceptor(session, patterns);

    responseInterceptor.listen(async ({ requestId, request, responseHeaders }, api) => {
        const rawBody = await api.getRealResponse(requestId);
        const headers = normalizeHeaders(responseHeaders);
        const body = rawBody.toString("binary");

        await store.resolve();
        store.set(request.url, { body, headers });

        await api.respondWithMock({
            requestId,
            body,
            headers,
        });
    });

    await responseInterceptor.enable();
}
