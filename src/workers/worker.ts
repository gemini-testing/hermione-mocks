import fs from "fs";
import path from "path";

import { Dump } from "../types";

type readDump = (fileName: string) => Promise<Dump>;
type writeDump = (fileName: string, dump: Dump, overwrite: boolean) => Promise<void>;

export interface WorkersRunner {
    readDump: readDump;
    writeDump: writeDump;
}

export const readDump: readDump = async fileName => {
    return fs.promises.readFile(fileName, { encoding: "utf8" }).then(JSON.parse);
};

/**
 * @returns null, if doesn't exist. Boolean otherwise
 */
const isDirectory = async (path: string): Promise<boolean | null> => {
    const stat = await new Promise<fs.Stats | null>(resolve => {
        fs.promises
            .lstat(path)
            .then(resolve)
            .catch(() => resolve(null));
    });
    return stat && stat.isDirectory();
};

export const writeDump: writeDump = async (fileName, dump, overwrite) => {
    const isDir = await isDirectory(fileName);

    if (isDir) {
        throw Error(`${fileName} is directory. Please remove or rename it`);
    }

    if (isDir === false && !overwrite) {
        return;
    }

    await fs.promises.mkdir(path.dirname(fileName), { recursive: true });
    return fs.promises.writeFile(fileName, JSON.stringify(dump, null, 2));
};
