class DoctorStore {
  private awaiting = new Set<number>();

  start(userId: number) {
    this.awaiting.add(userId);
  }

  isAwaiting(userId: number) {
    return this.awaiting.has(userId);
  }

  take(userId: number) {
    const awaiting = this.awaiting.has(userId);
    this.awaiting.delete(userId);
    return awaiting;
  }

  clear(userId: number) {
    this.awaiting.delete(userId);
  }
}

export const doctorStore = new DoctorStore();
