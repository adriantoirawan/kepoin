const { kepoin } = require('./src/index.cjs');

class View {
  static showError(err) {
    console.error(err.message);
  }
  static showCustomerList(data) {
    data.map(item => item);
  }
}

class Model {
  static async readCustomer() {
    return new Promise((resolve) => setTimeout(() => resolve([]), 50));
  }
}

const TracedView = kepoin(View, 'View', 'view.js');
const TracedModel = kepoin(Model, 'Model', 'model.js');

class Controller {
  static async customerList() {
    try {
      // Deliberately no await
      let data = TracedModel.readCustomer();
      TracedView.showCustomerList(data);
    } catch (err) {
      TracedView.showError(err);
    }
  }
}

const TracedController = kepoin(Controller, 'Controller', 'controller.js');

TracedController.customerList().then(() => {
    setTimeout(() => {
        // keep alive to allow readCustomer to finish
    }, 100);
});
