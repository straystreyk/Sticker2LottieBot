export type StickerPackBuilderPendingInput =
  | { kind: "title" }
  | { kind: "emoji"; itemId: number };

class StickerPackBuilderStore {
  private pending = new Map<number, StickerPackBuilderPendingInput>();

  set(userId: number, value: StickerPackBuilderPendingInput) {
    this.pending.set(userId, value);
  }

  get(userId: number) {
    return this.pending.get(userId);
  }

  clear(userId: number) {
    this.pending.delete(userId);
  }
}

export const stickerPackBuilderStore = new StickerPackBuilderStore();
