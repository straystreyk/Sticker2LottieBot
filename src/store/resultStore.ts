export type GeneratedSticker = {
  fileId: string;
  emoji: string;
};

class ResultStore {
  private stickers = new Map<number, GeneratedSticker>();

  set(userId: number, sticker: GeneratedSticker) {
    this.stickers.set(userId, sticker);
  }

  get(userId: number) {
    return this.stickers.get(userId);
  }
}

export const resultStore = new ResultStore();

