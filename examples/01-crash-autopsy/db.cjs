class DatabaseService {
  async getUsers() {
    return new Promise(resolve => setTimeout(() => resolve([{ id: 1, name: "Alice" }]), 50));
  }
  
  processPayload(data) {
    // some fake processing
    return true;
  }
  
  causeCrash() {
    throw new Error("Simulated Database Connection Failure!");
  }
}

module.exports = new DatabaseService();
