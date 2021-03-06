import React from "react";
import DfuView from "../DfuView/DfuView";
import FCConnector from "../../utilities/FCConnector";
import { FormattedMessage } from "react-intl";

export default class ImufView extends DfuView {
  constructor(props) {
    super(props);
    this.title = <FormattedMessage id="imuf.title" />;
    this.flText = <FormattedMessage id="imuf.select.version" />;
    this.btnLabel = <FormattedMessage id="common.update" />;
    this.cliNotice =
      '\n\n**********<h1>YOU ARE IN IMU-F UPDATE MODE.\nDO NOT UNPLUG YOUR DEVICE UNTIL UPDATE IS COMPLETE OR YOU\'RE GONNA HAVE A BAD TIME.</h1><img id="pbjt" src="assets/teehee.png" height="90" width="90"/><br/>**********\n\n';
    this.state = {
      currentTarget: "IMU-F",
      currentRelease: {},
      current: "IMU-F",
      progress: "",
      hasTarget: true,
      allowUpload: true,
      targetList: ["IMU-F"],
      firmwares: {},
      imuf: true
    };
  }
  get releasesKey() {
    return "imufReleases";
  }
  releaseUrl() {
    return "https://api.github.com/repos/emuflight/imu-f/releases";
  }

  setFirmware(data) {
    let firmwares = data.reverse().filter(file => file.name.endsWith(".bin"));
    this.setState({
      firmwares: { "IMU-F": firmwares },
      current: firmwares[0].download_url,
      isFlashing: false
    });
  }
  handleFlash() {
    this.refs.cliView.setState({ open: true, stayOpen: true, disabled: true });
    this.setState({ isFlashing: true });

    if (this.state.selectedFile && this.state.selectedFile != null) {
      FCConnector.flashIMUFLocal(this.state.selectedFile, progress => {
        this.setState({ progress });
      }).then(done => {
        this.setState({ isFlashing: false, note: done });
      });
    } else {
      FCConnector.flashIMUF(this.state.selectedUrl, progress => {
        this.setState({ progress });
      }).then(done => {
        this.setState({ isFlashing: false, note: done });
      });
    }
  }
}
