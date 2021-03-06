import React, { Component } from "react";
import PortsItemView from "./PortsItemView";
import DropdownView from "../Items/DropdownView";
import Paper from "@material-ui/core/Paper";

export default class PortsView extends Component {
  constructor(props) {
    super(props);
    this.state = {
      theme: props.theme,
      rxProvider: {
        id: "serialrx_provider",
        current: props.rxProvider.current,
        values: props.rxProvider.values
      },
      ports: props.ports
    };
  }

  handleDirty = (dirty, stateObj, index, newVal) => {
    let ports = this.state.ports;
    ports[index].mode = newVal;
    this.setState(ports);
    this.props.notifyDirty(dirty, stateObj, newVal);
  };

  render() {
    return (
      <div>
        {this.state.ports.map((port, i) => {
          return (
            <Paper key={port.id} className="flex">
              <PortsItemView
                notifyDirty={(dirty, stateObj, newVal) =>
                  this.handleDirty(dirty, stateObj, i, newVal)
                }
                item={port}
              />
              {port.mode === "64" && (
                <DropdownView
                  notifyDirty={this.props.notifyDirty}
                  item={this.state.rxProvider}
                />
              )}
            </Paper>
          );
        })}
      </div>
    );
  }
}
