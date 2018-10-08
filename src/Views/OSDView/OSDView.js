import React, { Component } from "react";
import GridLayout from "react-grid-layout";
import "./OSDView.css";
import Paper from "@material-ui/core/Paper";
import List from "@material-ui/core/List";
import Switch from "@material-ui/core/Switch";
import FormGroup from "@material-ui/core/FormGroup";
import FormControlLabel from "@material-ui/core/FormControlLabel";
import Typography from "@material-ui/core/Typography";
import Button from "@material-ui/core/Button";
import LinearProgress from "@material-ui/core/LinearProgress";
import ConfigListView from "../ConfigListView/ConfigListView";
import FCConnector from "../../utilities/FCConnector";
import HelperSelect from "../Items/HelperSelect";
import OSDElement from "./OSDElement";
import { FormattedMessage } from "react-intl";

const visibilityFlag = 0x0800;
const normalise = value => (value * 100) / 256;
const checkOSDVal = val => {
  //TODO: this is wrong because the stupid timer flags use other bits and show up as checked even when they aren't
  let intVal = parseInt(val, 10) & visibilityFlag;
  // console.log((intVal >>> 0).toString(2));
  let isChecked = intVal > 0;
  return isChecked;
};
const xyPosToOSD = (x, y) =>
  ((x & ((1 << 5) - 1)) | ((y & ((1 << 5) - 1)) << 5)) ^ visibilityFlag;
const osdPosToXy = osdVal => {
  let pos = osdVal | visibilityFlag;
  let x = pos & 0x1f;
  let y = (pos >> 5) & ((1 << 5) - 1);
  return { x, y };
};

export default class OSDView extends Component {
  constructor(props) {
    super(props);
    this.state = {
      uploadProgress: 0,
      theme: props.theme,
      elementsAvailable: props.items.filter(item => {
        return item.id.endsWith("_pos");
      }),
      videoMode:
        props.fcConfig.vcd_video_system &&
        props.fcConfig.vcd_video_system.current,
      uploadingFont: false,
      selectedFont: "butterflight"
    };

    this.fontList = [
      { label: "DEFAULT", value: "default" },
      { label: "BUTTERFLIGHT", value: "butterflight" },
      { label: "CLEANFLIGHT", value: "cleanflight" },
      { label: "DIGITAL", value: "digital" },
      { label: "BOLD", value: "bold" },
      { label: "LARGE", value: "large" },
      { label: "X-LARGE", value: "extra_large" }
    ];
  }
  setOSDElement(gridElement) {
    let newPos = xyPosToOSD(gridElement.x, gridElement.y);
    FCConnector.setValue(gridElement.i, newPos).then(() => {
      this.props.notifyDirty(true, gridElement, newPos);
    });
  }
  handleUpload(message) {
    this.setState({ uploadingFont: true });
    FCConnector.uploadFont(this.state.selectedFont).then(() => {
      this.setState({ uploadProgress: 1 });
    });
  }

  handleUploadProgress = mesage => {
    let notification = JSON.parse(mesage.data);
    if (notification.progress) {
      let newProgress = this.state.uploadProgress + 1;
      this.setState({
        uploadProgress: newProgress,
        uploadingFont: !(newProgress >= 256)
      });
    }
  };

  componentDidMount() {
    FCConnector.webSockets.addEventListener(
      "message",
      this.handleUploadProgress
    );
  }

  componentWillUnmount() {
    FCConnector.webSockets.removeEventListener(
      "message",
      this.handleUploadProgress
    );
  }

  render() {
    let elementsPositioned = this.state.elementsAvailable.filter(item =>
      checkOSDVal(item.current)
    );
    let nonElementSettings = this.props.items.filter(item => {
      return !item.id.endsWith("_pos");
    });
    let maxRows = this.state.videoMode === "NTSC" ? 13 : 18;
    return (
      <Paper elevation={3} style={{ display: "flex" }}>
        <div className={this.state.selectedFont}>
          <div
            style={{
              display: "flex",
              justifyItems: "center",
              alignItems: "center"
            }}
          >
            <HelperSelect
              name="osd.select-font"
              label="osd.select-font"
              value={this.state.selectedFont}
              onChange={(event, elem) => {
                this.setState({ selectedFont: elem.key });
              }}
              items={this.fontList}
            />
            <Button
              variant="raised"
              color="primary"
              disabled={this.state.uploadingFont}
              onClick={() => this.handleUpload()}
            >
              <FormattedMessage id="osd.upload" />
            </Button>
            <LinearProgress
              style={{ height: 20, flex: 1, marginLeft: 10 }}
              variant="determinate"
              value={normalise(this.state.uploadProgress)}
            />
          </div>
          <div
            style={{
              margin: "10px",
              padding: "10px",
              flex: 1,
              position: "relative"
            }}
          >
            {this.state.showDropZone && (
              <div className="dropzone-overlay">
                <Typography variant="headline">DROP ELEMENTS HERE</Typography>
              </div>
            )}
            <Paper theme={this.state.theme} elevation={3}>
              <GridLayout
                style={{
                  backgroundImage: "url('assets/osd-backdrop.png')",
                  backgroundPosition: "center",
                  backgroundRepeat: "none",
                  backgroundSize: "cover",
                  margin: "0 auto",
                  height: maxRows * 26,
                  width: 550,
                  overflow: "hidden"
                }}
                width={550}
                onDragStop={(layout, oldItem, newItem) => {
                  this.setOSDElement(newItem);
                }}
                maxRows={maxRows}
                autoSize={false}
                cols={30}
                compactType={null}
                preventCollision={false}
                rowHeight={16}
              >
                {elementsPositioned.map(item => {
                  let gridPos = osdPosToXy(parseInt(item.current, 10));
                  return (
                    <div
                      className="osd-element"
                      key={item.id}
                      data-grid={{
                        i: item.id,
                        x: gridPos.x,
                        y: gridPos.y,
                        w: 1,
                        h: 1,
                        isResizable: false
                      }}
                    >
                      <OSDElement fcConfig={this.props.fcConfig} id={item.id} />
                    </div>
                  );
                })}
              </GridLayout>
            </Paper>
            <div>
              <ConfigListView
                notifyDirty={(isDirty, item, val) => {
                  if (item.id === "vcd_video_system") {
                    this.setState({ videoMode: val });
                  }
                  this.props.notifyDirty(isDirty, item, val);
                }}
                items={nonElementSettings}
              />
            </div>
          </div>
        </div>
        <Paper
          theme={this.state.theme}
          elevation={3}
          style={{
            margin: "10px",
            padding: "10px",
            height: 700,
            overflow: "auto"
          }}
        >
          <List style={{ overflow: "auto" }}>
            {this.state.elementsAvailable.map(item => {
              return (
                <FormGroup key={item.id} component="fieldset">
                  <FormControlLabel
                    control={
                      <Switch
                        id={item.id}
                        checked={checkOSDVal(item.current)}
                        onChange={() => {
                          item.current =
                            parseInt(item.current, 10) ^ visibilityFlag;
                          this.forceUpdate();
                        }}
                      />
                    }
                    label={<FormattedMessage id={item.id} />}
                  />
                </FormGroup>
              );
            })}
          </List>
        </Paper>
      </Paper>
    );
  }
}
