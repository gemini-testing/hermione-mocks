import { Store } from "../store";
import { readMode } from ".";
import type { CDPSession } from "puppeteer-core";
import type { ApiType } from "../cdp/interceptor";
import type { FetchEvent } from "../cdp/types";

interface MockedXHRInterceptor {
    handler?: (event: FetchEvent, api: ApiType) => Promise<void>;
    enable: () => void;
    listen: (handler: (event: FetchEvent, api: ApiType) => Promise<void>) => void;
}

const mockedXHRInterceptor: MockedXHRInterceptor = {
    enable: jest.fn(),
    listen: function (handler) {
        this.handler = handler;
    },
};

const mockedStore = {
    get: jest.fn(),
} as unknown as Store;

jest.mock("../cdp", () => ({
    mkRequestXHRInterceptor: () => mockedXHRInterceptor,
}));

describe("modes/readMode", () => {
    let savedConsoleError: () => void;

    beforeAll(() => {
        savedConsoleError = console.error;
        console.error = jest.fn();
    });

    beforeEach(async () => {
        await readMode({} as CDPSession, [], () => mockedStore);
    });

    afterAll(() => {
        console.error = savedConsoleError;
    });

    it("should enable XHR interceptor", async () => {
        expect(mockedXHRInterceptor.enable).toBeCalled();
    });

    describe("listen", () => {
        const handle_ = (
            opts: {
                requestUrl?: string;
                requestId?: string;
                respondWithMock?: () => void;
            } = {},
        ): Promise<void> => {
            const api = { respondWithMock: opts.respondWithMock } as unknown as ApiType;
            const event = {
                request: { url: opts.requestUrl || "requestUrl" },
                requestId: opts.requestId || "requestId",
            } as FetchEvent;

            return mockedXHRInterceptor.handler!(event, api);
        };

        it("should get dump from store", async () => {
            await handle_({ requestUrl: "url" });

            expect(mockedStore.get).toBeCalledWith("url");
        });

        it("should print error in console if dump does not exist", async () => {
            await handle_({ requestUrl: "url" });

            expect(console.error).toBeCalledWith("Cache is empty:\nkey=url");
        });

        it("should respond with mock", async () => {
            const respondWithMock = jest.fn();
            mockedStore.get = jest.fn().mockResolvedValue({ foo: "bar" });

            await handle_({ requestId: "id", respondWithMock });

            expect(respondWithMock).toBeCalledWith({
                requestId: "id",
                foo: "bar",
            });
        });
    });
});