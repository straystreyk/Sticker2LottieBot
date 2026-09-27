// store/convertFlowStore.ts
export type ConvertMode = "tgs2lottie" | "lottie2tgs";
export type Tgs2LottieFormat = "lottie" | "json";

type ConvertState =
    | { mode: "tgs2lottie"; format?: Tgs2LottieFormat }
    | { mode: "lottie2tgs" };

class ConvertFlowStore {
    private map = new Map<number, ConvertState>();
    private pendingStickerFiles = new Map<number, string>();

    setMode(userId: number, mode: ConvertMode) {
        if (mode === "tgs2lottie") this.map.set(userId, { mode, format: undefined });
        if (mode === "lottie2tgs") this.map.set(userId, { mode });
    }

    setFormat(userId: number, format: Tgs2LottieFormat) {
        const state = this.map.get(userId);
        if (!state || state.mode !== "tgs2lottie") return;
        this.map.set(userId, { mode: "tgs2lottie", format });
    }

    get(userId: number) {
        return this.map.get(userId);
    }

    clear(userId: number) {
        this.map.delete(userId);
    }

    setPendingSticker(userId: number, fileId: string) {
        this.pendingStickerFiles.set(userId, fileId);
    }

    takePendingSticker(userId: number) {
        const fileId = this.pendingStickerFiles.get(userId);
        this.pendingStickerFiles.delete(userId);
        return fileId;
    }
}

export const convertFlowStore = new ConvertFlowStore();
