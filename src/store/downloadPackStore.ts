const awaitingPackNameUsers = new Set<number>();

export const downloadPackStore = {
  setAwaiting(userId: number) {
    awaitingPackNameUsers.add(userId);
  },

  isAwaiting(userId: number) {
    return awaitingPackNameUsers.has(userId);
  },

  clear(userId: number) {
    awaitingPackNameUsers.delete(userId);
  },
};
