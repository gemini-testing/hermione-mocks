import { option, Parser } from "gemini-configparser";
import _ from "lodash";
import { RunMode } from "../types";

const isStringOrFunction = (val: unknown): boolean => _.isString(val) || _.isFunction(val);
const isRunModeOption = (val: unknown): boolean => Object.values(RunMode).includes(val as RunMode);
const isStringArray = (val: unknown): boolean => _.isArray(val) && val.every(_.isString);

const assertType = <T>(name: string, validationFn: (v: unknown) => boolean, type: string) => {
    return (v: T) => {
        if (!validationFn(v)) {
            throw new TypeError(`${name} must be a ${type}, but got ${typeof v}`);
        }
    };
};

export const booleanOption = (name: string, defaultValue: boolean): Parser<boolean> =>
    option<boolean>({
        parseEnv: (val: string) => Boolean(JSON.parse(val)),
        parseCli: (val: string) => Boolean(JSON.parse(val)),
        defaultValue,
        validate: assertType<boolean>(name, _.isBoolean, "boolean"),
    });

export const stringOrFunctionOption = (name: string, defaultValue: string | Function): Parser<string | Function> =>
    option<string | Function>({
        parseEnv: JSON.parse,
        parseCli: JSON.parse,
        defaultValue,
        validate: assertType<string | Function>(name, isStringOrFunction, "string | (test: Hermione.Test) => string"),
    });

export const runModeOption = (name: string, defaultValue?: RunMode): Parser<RunMode> =>
    option<RunMode>({
        parseEnv: JSON.parse,
        parseCli: JSON.parse,
        defaultValue,
        validate: assertType<string>(
            name,
            isRunModeOption,
            Object.values(RunMode)
                .map(val => `"${val}"`)
                .join(" or "),
        ),
    });

export function arrayStringOption(name: string, defaultValue: string[]): Parser<string[]> {
    return option<string[]>({
        parseEnv: JSON.parse,
        parseCli: JSON.parse,
        defaultValue,
        validate: assertType<string[]>(name, isStringArray, "string[]"),
    });
}
