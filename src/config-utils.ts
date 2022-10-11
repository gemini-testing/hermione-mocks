import { option, Parser } from "gemini-configparser";
import _ from "lodash";
import { RunMode, DumpsDirCallback } from "./types";

export const booleanOption = (name: string, defaultValue = false): Parser<boolean> =>
    option<boolean>({
        parseEnv: (val: string) => Boolean(JSON.parse(val)),
        parseCli: (val: string) => Boolean(JSON.parse(val)),
        defaultValue,
        validate: (val: boolean) => {
            if (_.isBoolean(val)) {
                return;
            }

            throw new Error(`Option '${name}' must be a boolean`);
        },
    });

export const stringOrCallbackOption = (
    name: string,
    defaultValue: string | DumpsDirCallback,
): Parser<string | DumpsDirCallback> =>
    option<string>({
        defaultValue,
        validate: (val: string | DumpsDirCallback) => {
            if (_.isFunction(val) || _.isString(val) || !_.isEmpty(val)) {
                return val;
            }

            throw new Error(`Option '${name}' must be presented and type of "string | function"`);
        },
    });

export const runModeOption = (name: string, defaultValue: RunMode): Parser<RunMode> =>
    option<RunMode>({
        defaultValue,
        validate: (val: string) => {
            const runModes: string[] = Object.values(RunMode);
            if (runModes.includes(val)) {
                return val;
            }

            throw new Error(`Option '${name}' must be presented and equal to 'play' | 'save' | 'create'`);
        },
    });

export function arrayStringOption(name: string, defaultValue: string[]): Parser<string[]>;
export function arrayStringOption(name: string, defaultValue: string[] | null): Parser<string[] | null>;
export function arrayStringOption(name: string, defaultValue: string[] | null): Parser<string[] | null> {
    return option<Array<string> | null>({
        parseEnv: JSON.parse,
        parseCli: JSON.parse,
        defaultValue,
        validate: (vals: string[] | null) => {
            if (vals === defaultValue) {
                return vals;
            }

            if (!Array.isArray(vals)) {
                throw new Error(`'${name}' must be type of Array`);
            }

            vals.forEach((val: string) => {
                if (_.isString(val) || !_.isEmpty(val)) {
                    return;
                }

                throw new Error(`Value [${val}=${typeof val}] of option '${name}' must be type of "string"`);
            });

            return vals;
        },
    });
}
