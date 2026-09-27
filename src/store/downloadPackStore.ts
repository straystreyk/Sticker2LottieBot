export type PackOutputFormat = "files" | "json" | "lottie";

type DownloadPackState = {
  output?: PackOutputFormat;
  pendingInput?: string;
};

const states = new Map<number, DownloadPackState>();

export const downloadPackStore = {
  setAwaiting(userId: number, output: PackOutputFormat) {
    states.set(userId, { output });
  },

  isAwaiting(userId: number) {
    return Boolean(states.get(userId)?.output);
  },

  getOutput(userId: number) {
    return states.get(userId)?.output;
  },

  setPendingInput(userId: number, pendingInput: string) {
    states.set(userId, { pendingInput });
  },

  takePendingInput(userId: number) {
    const input = states.get(userId)?.pendingInput;
    states.delete(userId);
    return input;
  },

  clear(userId: number) {
    states.delete(userId);
  },
};
