class Database {
  static async queryRecords(id) {
    return { id, data: "User record" };
  }
  
  static async flushCache() {
    throw new Error("ERR_CACHE_CORRUPTION: Memory segmentation fault during flush.");
  }
}

class Server {
  static async handleRequest(reqId) {
    await Database.queryRecords(reqId);
  }

  static async triggerMaintenance() {
    await Database.flushCache();
  }
}

module.exports = { Database, Server };
