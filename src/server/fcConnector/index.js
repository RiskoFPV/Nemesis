const bxfConnector = require("./bxf");
const rf1Connector = require("./rf1");
const websockets = require("../websockets");

module.exports = {
  getConfig(deviceInfo, cb, ecb) {
    if (deviceInfo.hid) {
      return rf1Connector.getConfig(deviceInfo.path, cb, ecb);
    } else {
      return bxfConnector.getConfig(deviceInfo.comName, cb, ecb);
    }
  },
  setValue(deviceInfo, key, value, cb, ecb) {
    if (deviceInfo.hid) {
      return rf1Connector.setValue(deviceInfo.path, key, value, cb, ecb);
    } else {
      return bxfConnector.setValue(deviceInfo.comName, key, value, cb, ecb);
    }
  },
  sendCommand(deviceInfo, command, cb, ecb) {
    if (deviceInfo.hid) {
      return rf1Connector.sendCommand(deviceInfo.path, command, cb, ecb);
    } else {
      return bxfConnector.sendCommand(deviceInfo.comName, command, cb, ecb);
    }
  },
  getTelemetry(deviceInfo, cb, ecb) {
    if (deviceInfo.hid) {
      return rf1Connector.getTelemetry(deviceInfo.path, cb, ecb);
    } else {
      return bxfConnector.getTelemetry(deviceInfo.comName, cb, ecb);
    }
  },
  updateIMUF(deviceInfo, binUrl, cb, ecb) {
    if (deviceInfo.hid) {
      return rf1Connector.updateIMUF(
        deviceInfo.path,
        binUrl,
        data => {
          websockets.clients.forEach(client =>
            client.sendUTF(
              JSON.stringify({
                progress: data
              })
            )
          );
        },
        cb,
        ecb
      );
    } else {
      return bxfConnector.updateIMUF(
        deviceInfo.comName,
        binUrl,
        data => {
          websockets.clients.forEach(client =>
            client.sendUTF(
              JSON.stringify({
                progress: data
              })
            )
          );
        },
        cb,
        ecb
      );
    }
  }
};
