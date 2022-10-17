import { root, section, Parser } from "gemini-configparser";

import { arrayStringOption, stringOrFunctionOption, booleanOption, runModeOption } from "./utils";
import { DUMPS_DIR } from "../constants";
import { DumpsDirCallback, RunMode } from "../types";

export type DumpsPluginConfig = {
    enabled: boolean;
    hostsPatterns: string[];
    browsers: string[];
    mode: RunMode;
    dumpsDir: string | DumpsDirCallback;
};

export function parseConfig(options: DumpsPluginConfig, hermioneConfig: Hermione.Config): DumpsPluginConfig {
    const { env, argv } = process;
    const parseOptions = root<DumpsPluginConfig>(
        section({
            enabled: booleanOption("enabled", false),
            hostsPatterns: arrayStringOption("hostsPatterns", [hermioneConfig.baseUrl + "*"]),
            browsers: arrayStringOption("browsers", []),
            mode: runModeOption("mode", RunMode.Save),
            dumpsDir: stringOrFunctionOption("dumpsDir", DUMPS_DIR) as Parser<string | DumpsDirCallback>,
        }),
        {
            envPrefix: "dumps_",
            cliPrefix: "--dumps-",
        },
    );

    return parseOptions({ options, env, argv });
}
