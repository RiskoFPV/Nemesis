import React, { Component } from "react";
import List from "@material-ui/core/List";
import LinearProgress from "@material-ui/core/LinearProgress";
import Card from "@material-ui/core/Card";
import CardActionArea from "@material-ui/core/CardActionArea";
import CardMedia from "@material-ui/core/CardMedia";
import CardContent from "@material-ui/core/CardContent";
import Typography from "@material-ui/core/Typography";
import FCConnector from "../../utilities/FCConnector";
import { Button } from "@material-ui/core";
import { FormattedMessage } from "react-intl";
import SavingIndicator from "../SavingIndicator";

export default class PickerAssistantView extends Component {
  constructor(props) {
    super(props);
    this.state = {
      theme: props.theme,
      steps: [{ id: undefined }],
      currentStep: 0,
      progress: 0
    };
  }

  handleCommands(type) {
    this.userChoice = type;
    this.setState({
      saving: true,
      progress: 0,
      currentMessage: <SavingIndicator />,
      currentResponse: ""
    });
    FCConnector.sendBulkCommands(
      type.commands.slice(0).filter(com => com),
      progress => {
        let percent = (progress / type.commands.length) * 100;
        this.setState({
          progress: Math.floor(percent),
          saved: percent >= 100
        });
      }
    ).then(response => {
      if (type.verify) {
        if (type.verify.success) {
          if (response.toLowerCase().indexOf(type.verify.success) > -1) {
            this.setState({
              saving: false,
              completed: true,
              currentMessage: <FormattedMessage id="common.continue" />
            });
          } else {
            this.setState({
              saving: false,
              completed: false,
              currentMessage: <FormattedMessage id="common.failed" />,
              currentResponse: response
            });
          }
        } else if (type.verify.command) {
          this.setState({ verifying: true });
          const verifySetting = () => {
            FCConnector.sendCliCommand(type.verify.command).then(resp => {
              if (this.state.cancel) {
                this.setState({
                  currentMessage: <FormattedMessage id="common.cancelled" />,
                  currentResponse: ""
                });
              } else if (resp.toLowerCase().indexOf(type.verify.error) > -1) {
                this.setState({ error: resp });
              } else if (resp.toLowerCase().indexOf(type.verify.until) > -1) {
                this.setState({
                  saving: false,
                  verifying: false,
                  currentResponse: resp,
                  completed: true
                });
              } else {
                this.setState({
                  currentMessage: <FormattedMessage id="common.verifying" />,
                  currentResponse: resp
                });
                type.verify.until && verifySetting();
              }
            });
          };
          verifySetting();
        }
      } else {
        this.setState({
          saving: false,
          completed: true,
          currentMessage: <FormattedMessage id="common.continue" />
        });
      }
    });
  }

  render() {
    return (
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          padding: 10
        }}
      >
        <Typography variant="h5">
          <FormattedMessage id={this.props.title} />
        </Typography>
        <div>
          <List
            style={{
              flex: 1,
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyItems: "center",
              alignContent: "center",
              justifyContent: "center"
            }}
          >
            {this.props.items &&
              this.props.items.map(type => {
                return (
                  <Card style={{ flex: 1 }} key={type.title}>
                    <CardActionArea
                      style={{ width: "100%" }}
                      onClick={() => {
                        if (this.props.onSelect) {
                          this.props.onSelect(type);
                        } else if (!this.state.saving) {
                          this.handleCommands(type);
                        }
                      }}
                    >
                      <CardMedia
                        style={type.style}
                        image={type.image}
                        title={type.title}
                      />
                      <CardContent style={{ padding: 0 }}>
                        <Typography gutterBottom variant="subheading">
                          {type.headline}
                        </Typography>
                      </CardContent>
                    </CardActionArea>
                  </Card>
                );
              })}
          </List>
        </div>
        <div style={{ height: 60, display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", flex: 1, padding: 10 }}>
            <Typography variant="subtitle1">
              {this.state.currentMessage}
              <span style={{ fontFamily: "monospace" }}>
                {this.state.currentResponse}
              </span>
            </Typography>
            <div style={{ flexGrow: 1 }} />
            {this.state.verifying && (
              <Button
                onClick={() =>
                  this.state.cancel
                    ? this.props.onCancel()
                    : this.setState({ cancel: true })
                }
                variant="contained"
                color="secondary"
              >
                {this.state.cancel ? "Dismiss" : "Cancel"}
              </Button>
            )}
            {!this.state.saving &&
              this.state.completed === true &&
              !this.state.error && (
                <Button
                  onClick={() => {
                    this.setState({ completed: false });
                    this.props.onFinish(this.userChoice);
                  }}
                  variant="contained"
                  color="primary"
                >
                  <FormattedMessage id="common.next" />
                </Button>
              )}
          </div>
          <LinearProgress variant="determinate" value={this.state.progress} />
        </div>
      </div>
    );
  }
}
