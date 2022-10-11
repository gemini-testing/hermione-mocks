import { RunMode } from "./types";

export async function declareModeFlows(
    {
        onPlay,
        onCreate,
        onSave,
    }: {
        onPlay?: () => Promise<void> | void;
        onCreate?: () => Promise<void> | void;
        onSave?: () => Promise<void> | void;
    },
    mode: RunMode,
): Promise<void> {
    const action = {
        [RunMode.Play]: onPlay,
        [RunMode.Create]: onCreate,
        [RunMode.Save]: onSave,
    }[mode];

    if (action) {
        await action();
    }
}
