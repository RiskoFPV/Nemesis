const SerialPort = require("serialport");
const imufFirmware = require("../firmware/imuf");
fs = require("fs"); // temp for debugging json output
const imufCaesar = require("../firmware/imuf/caesar");
let openConnection;
const log_serial_commands = false; // enable to console.log each command request port, disable for less log output
const log_config_to_file = false; //enable to console.log the config command response and save it to debug.txt

const setupConnection = device => {
  return new Promise((resolve, reject) => {
    const connect = () => {
      if (!openConnection.isOpen) {
        console.log("Trying to open port: ", device.comName);
        try {
          openConnection.open(openError => {
            if (openError) {
              console.log("OPEN ERROR: ", openError);
              reject(openError);
            } else {
              openConnection.write("#\n", cliError => {
                // send # and carriage return, attempt to open CLI. If this doesn't initialize it, the getConfig command will send another #\n
                if (cliError) {
                  console.log("couldn't get into cli mode: ", cliError);
                  reject(cliError);
                } else {
                  openConnection.read();
                  resolve(openConnection);
                }
              });
            }
          });
        } catch (ex) {
          console.log("ALREADY OPEN!!!!!", ex);
          openConnection.write("#\n", cliError => {
            console.log("sent # and carriage - 2");
            if (cliError) {
              console.log("couldn't get into cli mode: ", cliError);
              reject(cliError);
            } else {
              openConnection.read();
              resolve(openConnection);
            }
          });
        }
      }
    };
    if (!openConnection) {
      console.log("creating new port port: ", device.comName);
      openConnection = new SerialPort(device.comName, {
        autoOpen: false
      });
      openConnection.on("error", err => {
        console.log("ERROR: ", err);
        openConnection = undefined;
        reject(err);
      });
      // openConnection.setEncoding('utf8');
      setTimeout(() => connect(), 300);
    } else {
      if (log_serial_commands) {
        console.log("using open port: ", device.comName);
      }
      resolve(openConnection);
    }
  });
};
let retry = 5;
const getConfig = device => {
  return sendCommand(device, "#\nconfig", 1500).then(conf => {
    // send # and carriage return before config command to help initialize the CLI - fix trouble with 1.0.0
    try {
      if (conf.length == 0) {
        console.log("CONF LENGTH IS ZERO");
        sendCommand(device, "\n#\n");
      }
      if (log_config_to_file) {
        fs.writeFile("debug.txt", conf, function(err) {
          if (err) return console.log(err);
          console.log("wrote config to file");
        });
        console.log(conf); // also console.log the config
      }

      //trim off " config\n" from incoming json config;
      let config = JSON.parse(conf.slice(conf.indexOf("{"), conf.length - 3));
      retry = 3;
      return sendCommand(device, "mixer").then(mixer => {
        try {
          let parts = mixer.split(":");
          config.mixer_type = {
            mode: "LOOKUP",
            current: parts[1].replace(/\s|\n|#/gim, "")
          };
          retry = 5;
          return config;
        } catch (ex) {
          if (retry) {
            retry--;
            return getConfig(device);
          } else {
            console.log(ex);
            return sendCommand(device, "#").then(() => {
              return sendCommand(device, "version").then(version => {
                return { version: version, incompatible: true };
              });
            });
          }
        }
      });
    } catch (ex) {
      console.log(ex);
      if (retry) {
        retry--;
        return getConfig(device);
      } else {
        retry = 5;
        return sendCommand(device, "version").then(version => {
          return { version: version, incompatible: true };
        });
      }
    }
  });
};

const commandQueue = [];
let currentCommand;
const runQueue = next => {
  if (!next) return;
  currentCommand = next;
  setupConnection(next.device)
    .then(port => {
      if (log_serial_commands) {
        console.log(
          `sending command: ${next.command} on port ${next.device.comName}`
        );
      }
      port.write(`${next.command}\n`, err => {
        if (err) {
          console.log("WRITE ERROR: ", err);
          err && next.reject(err);
          currentCommand = null;
          runQueue(commandQueue.pop());
        }
      });
      let currentRecBuffer = "";
      let interval = setInterval(() => {
        try {
          let more = port.read();
          if (more) {
            if (next.encode) {
              let msg = more.toString(next.encode);
              currentRecBuffer += msg;
            } else {
              currentRecBuffer = more;
            }
          } else {
            interval && clearInterval(interval);
            next.resolve(currentRecBuffer);
            currentCommand = null;
            runQueue(commandQueue.pop());
          }
        } catch (ex) {
          log(ex);
        }
      }, next.waitMs);
    })
    .catch(error => {
      next.reject(error);
      currentCommand = null;
      runQueue(commandQueue.pop());
      console.log(error);
    });
};

const sendCommand = (device, command, waitMs = 30, encode = "utf8") => {
  return new Promise((resolve, reject) => {
    commandQueue.unshift({ device, command, waitMs, encode, resolve, reject });
    if (!currentCommand) {
      runQueue(commandQueue.pop());
    }
  });
};

const updateIMUFLocal = (device, binBuffer, notify) => {
  notify("Communicating with IMU-F...\n");
  let binAsStr = binBuffer.toString("hex");

  //Decide whether to encrypt binary based on first bytes:
  //  26f32612 <- helio imuf
  //  00400020 <- compiled imuf

  if (binAsStr.slice(0, 8) == "00400020") {
    //is un-caesared compiled imuf ie. emu release
    notify("Caesar encrypting IMU-F Binary... ");
    binAsStr = imufCaesar.caesarBin(binAsStr); //caesar binary before flashing
    notify("Done.\n");
  }

  sendCommand(device, "imufbootloader", 5000).then(bootlresp => {
    if (bootlresp.indexOf("BOOTLOADER") > -1) {
      notify("IMU-F ready to talk...\n");
      sendCommand(device, "imufloadbin !").then(prepResp => {
        if (prepResp.indexOf("SUCCESS") > -1) {
          notify(`Loading binary onto IMU-F...\n`);
          let index = 0;
          const sendBytes = () => {
            if (index < binAsStr.length) {
              let tail = Math.min(binAsStr.length, index + 200);
              let sending = `imufloadbin l64000000${binAsStr.slice(
                index,
                tail
              )}\n`;
              sendCommand(device, sending, 50).then(() => {
                notify(".");
                index = tail;
                sendBytes();
              });
            } else {
              notify("\nFlashing IMU-F...\n");
              sendCommand(device, "imufflashbin\n", 5000).then(() => {
                notify("\ndone!\nPlease wait for reboot..\n \n#flashEmu");
              });
            }
          };
          sendBytes();
        }
      });
    }
  });
};
const updateIMUF = (device, binName, notify) => {
  notify(`Downloading ${binName}...\n`);
  imufFirmware.load(binName, fileBuffer => {
    //loads url to fileBuffer
    notify("Communicating with IMU-F...\n");
    let binAsStr = fileBuffer.toString("hex");

    //Decide whether to encrypt binary based on first bytes:
    //  26f32612 <- helio imuf
    //  00400020 <- compiled imuf

    if (binAsStr.slice(0, 8) == "00400020") {
      //is un-caesared compiled imuf ie. emu release
      notify("Caesar encrypting IMU-F Binary... ");
      binAsStr = imufCaesar.caesarBin(binAsStr); //caesar binary before flashing
      notify("Done.\n");
    }

    sendCommand(device, "imufbootloader", 5000).then(bootlresp => {
      if (bootlresp.indexOf("BOOTLOADER") > -1) {
        notify("IMU-F ready to talk...\n");
        sendCommand(device, "imufloadbin !").then(prepResp => {
          if (prepResp.indexOf("SUCCESS") > -1) {
            notify(`Loading binary onto IMU-F...\n`);
            let index = 0;
            const sendBytes = () => {
              if (index < binAsStr.length) {
                let tail = Math.min(binAsStr.length, index + 200);
                let sending = `imufloadbin l64000000${binAsStr.slice(
                  index,
                  tail
                )}\n`;
                sendCommand(device, sending, 50).then(() => {
                  notify(".");
                  index = tail;
                  sendBytes();
                });
              } else {
                notify("\nFlashing IMU-F...\n");
                sendCommand(device, "imufflashbin\n", 5000).then(() => {
                  notify("\ndone!\nPlease wait for reboot..\n \n#flashEmu");
                });
              }
            };
            sendBytes();
          }
        });
      }
    });
  });
};

const setValue = (device, name, newVal) => {
  if (name === "mixer_type") {
    return sendCommand(device, `mixer ${newVal}`);
  } else {
    return sendCommand(device, `set ${name}=${newVal}`);
  }
};

const remapMotor = (device, from, to) => {
  return sendCommand(device, `resource`, 40).then(resources => {
    let mapping = resources
      .split("\nresource ")
      .filter(line => line.indexOf("MOTOR") > -1)
      .map(motorResource => {
        let resourceParts = motorResource.split(" ");
        return resourceParts[2];
      });
    let resourceTo = mapping[parseInt(to) - 1];
    let resourceFrom = mapping[parseInt(from) - 1];
    return sendCommand(device, `resource MOTOR ${from} ${resourceTo}`, 20).then(
      () => {
        return sendCommand(device, `resource MOTOR ${to} ${resourceFrom}`, 20);
      }
    );
  });
};
const spinTestMotor = (device, motor, startStop) => {
  return sendCommand(
    device,
    `motor ${parseInt(motor, 10) - 1} ${startStop}`,
    10
  );
};

const getTpaCurves = deviceInfo => {
  return sendCommand(deviceInfo, "tpacurve");
};
const setTpaCurves = (deviceInfo, pid, profile, newCurve) => {
  let command = `tpacurve ${pid} ${newCurve}`;
  return sendCommand(deviceInfo, command);
};

const saveEEPROM = device => {
  return sendCommand(device, `msp 250`);
};
const getChannelMap = device => {
  return sendCommand(device, `map`, 30).then(mapping => {
    return mapping.replace(/map|\s+|#|\n/gim, "");
  });
};
const setChannelMap = (device, newmap) => {
  return sendCommand(device, `map ${newmap}`);
};
const getModes = device => {
  // return sendCommand(device, `map`);
};
const setMode = (device, modeVals) => {
  return sendCommand(device, `aux ${modeVals.split("|").join(" ")}`, 20);
};

const getMotors = device => {
  return sendCommand(device, "msp 104", 50, false).then(motorData => {
    let data = new DataView(new Uint8Array(motorData).buffer, 12);

    let motorInfo = [];
    try {
      for (var i = 0; i < 10; i++) {
        motorInfo.push(data.getUint16(i * 2, 1));
      }
    } catch (ex) {
      console.log(ex);
    }
    return motorInfo;
  });
};

const storage = (device, command) => {
  switch (command) {
    case "erase":
      return sendCommand(device, "msp 72");
    case "info":
      //MSP_DATAFLASH_SUMMARY
      return sendCommand(device, "msp 70", 50, false).then(storageInfo => {
        let data = new DataView(new Uint8Array(storageInfo).buffer, 11);
        var flags = data.getUint8(0);
        return {
          ready: (flags & 1) != 0,
          supported: (flags & 2) != 0,
          sectors: data.getUint32(1, 1),
          totalSize: data.getUint32(5, 1),
          usedSize: data.getUint32(9, 1)
        };
      });
    case "download":
    default:
      return sendCommand(device, "msc");
  }
};

const getTelemetry = (device, type) => {
  switch (type) {
    case "status": {
      return sendCommand(device, `msp 150`, 30, false).then(status => {
        if (status) {
          try {
            //console.log("STATUS DATA :", status);
            let data = new DataView(new Uint8Array(status).buffer, 12);
            let modeFlasCount = data.getUint8(15);
            let modeflags = [];
            let offset = 16;
            for (var i = 0; i < modeFlasCount; i++) {
              modeflags.push(data.getUint8(offset++));
            }
            return {
              type: "status",
              cpu: data.getUint16(11, 1),
              modeflags: modeflags,
              flagCount: data.getUint8(offset++),
              armingFlags: data.getUint32(offset, 1)
            };
          } catch (ex) {
            console.log(ex);
          }
        }
      });
    }
    case "attitude": {
      return sendCommand(device, `msp 108`, 40, false).then(telem => {
        if (telem) {
          try {
            let data = new DataView(new Uint8Array(telem).buffer, 12);
            console.log(
              "attitude: ",
              data.getInt16(0, 1) / 10,
              data.getInt16(2, 1) / 10,
              data.getInt16(4, 1),
              " (",
              telem.length,
              ")"
            );
            return {
              attitude: {
                x: data.getInt16(0, 1) / 10,
                y: data.getInt16(2, 1) / 10,
                z: data.getInt16(4, 1)
              }
            };
          } catch (ex) {
            console.log(ex);
          }
        }
      });
    }
    case "gyro": {
      return sendCommand(device, `msp 102`, 50, false).then(telem => {
        if (telem) {
          try {
            let data = new DataView(new Uint8Array(telem).buffer, 12);
            return {
              type: "gyro",
              acc: {
                x: data.getInt16(0, 1) / 512,
                y: data.getInt16(2, 1) / 512,
                z: data.getInt16(4, 1) / 512
              },
              gyro: {
                x: data.getInt16(6, 1) * (4 / 16.4),
                y: data.getInt16(8, 1) * (4 / 16.4),
                z: data.getInt16(10, 1) * (4 / 16.4)
              },
              mag: {
                x: data.getInt16(12, 1) / 1090,
                y: data.getInt16(14, 1) / 1090,
                z: data.getInt16(16, 1) / 1090
              }
            };
          } catch (ex) {
            console.log(ex);
          }
        }
      });
    }
    case "vbat": {
      return sendCommand(device, `msp 130`, 50, false).then(vbatData => {
        let data = new DataView(new Uint8Array(vbatData).buffer, 12);
        return {
          type: "vbat",
          cells: data.getUint8(0),
          cap: data.getUint16(1, 1),
          volts: data.getUint8(3) / 10.0,
          mah: data.getUint16(4, 1),
          amps: data.getUint16(6, 1) / 100
        };
      });
    }
    default:
    case "rx": {
      return sendCommand(device, `msp 105`, 50, false).then(rcData => {
        let channels = [];
        try {
          let data = new DataView(new Uint8Array(rcData).buffer, 12);
          let active = (data.byteLength - 4) / 2;
          for (var i = 0; i < active; i++) {
            channels[i] = data.getUint16(i * 2, 1);
          }
        } catch (ex) {
          console.log(ex);
        }
        return {
          rx: {
            min: 800,
            max: 2200,
            channels
          }
        };
      });
    }
  }
};

const reset = () => {
  if (openConnection && openConnection.isOpen) {
    openConnection.close();
  }
  openConnection = undefined;
};

module.exports = {
  sendCommand: sendCommand,
  updateIMUFLocal: updateIMUFLocal,
  updateIMUF: updateIMUF,
  getConfig: getConfig,
  getTelemetry: getTelemetry,
  setValue: setValue,
  remapMotor: remapMotor,
  spinTestMotor: spinTestMotor,
  storage: storage,
  getMotors: getMotors,
  getChannelMap: getChannelMap,
  setChannelMap: setChannelMap,
  getModes: getModes,
  setMode: setMode,
  getTpaCurves: getTpaCurves,
  setTpaCurves: setTpaCurves,
  saveEEPROM: saveEEPROM,
  reset: reset
};
