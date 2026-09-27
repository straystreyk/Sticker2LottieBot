export type PendingAutoFix = {
  jsonText: string;
  sourceType: "json" | "lottie" | "tgs";
};

class AutoFixStore {
  private values = new Map<number, PendingAutoFix>();

  set(userId: number, value: PendingAutoFix) {
    this.values.set(userId, value);
  }

  get(userId: number) {
    return this.values.get(userId);
  }

  clear(userId: number) {
    this.values.delete(userId);
  }
}

export const autoFixStore = new AutoFixStore();
