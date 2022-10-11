import { root, section } from "gemini-configparser";

import { arrayStringOption, stringOrCallbackOption, booleanOption, runModeOption } from "./config-utils";
import { DumpsDirCallback, RunMode } from "./types";

export type DumpsPluginConfig = {
    enabled: boolean;
    hosts: string[];
    browsers: string[] | null;
    mode: RunMode;
    dumpsDir: string | DumpsDirCallback;
};

export function parseDumpsConfig(pluginOpts: DumpsPluginConfig, hermioneOpts: Hermione.Config): DumpsPluginConfig {
    const { env, argv } = process;
    const parseOptions = root<DumpsPluginConfig>(
        section({
            enabled: booleanOption("enabled", false),
            hosts: arrayStringOption("hostsPatterns", [hermioneOpts.baseUrl + "*"]),
            browsers: arrayStringOption("browsers", null),
            mode: runModeOption("mode", RunMode.Save),
            dumpsDir: stringOrCallbackOption("dumpsDir", "test-dumps"),
        }),
        {
            envPrefix: "hermione_dumps_recorder_",
            cliPrefix: "--hermione-dumps-recorder-",
        },
    );

    const config = parseOptions({ options: pluginOpts, env, argv });

    return config;
}
