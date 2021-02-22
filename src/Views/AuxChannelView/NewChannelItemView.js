import React, { Component } from "react";
import List from "@material-ui/core/List";
import { FormattedMessage } from "react-intl";
import Typography from "@material-ui/core/Typography";
import "./NewAuxChannelView.css";
import Accordion from "@material-ui/core/Accordion";
import AccordionDetails from "@material-ui/core/AccordionDetails";
import AccordionSummary from "@material-ui/core/AccordionSummary";
import AccordionActions from "@material-ui/core/AccordionActions";
import ExpandMoreIcon from "@material-ui/icons/ExpandMore";
import Chip from "@material-ui/core/Chip";
import Divider from "@material-ui/core/Divider";
import Button from "@material-ui/core/Button";
import { Slider } from "@material-ui/core";
import HelperSelect from "../Items/HelperSelect";
import DeleteIcon from "@material-ui/icons/Delete";
import AddCircleOutlineIcon from "@material-ui/icons/AddCircleOutline";
import { IconButton } from "@material-ui/core";

export default class NewChannelItemView extends Component {
  constructor(props) {
    super(props);
    this.state = {
      mappings: props.mappings
    };
    if (props.item.range[0] === props.item.range[1]) {
      // handle multiple mappings
      props.item.range[1] += props.scale.step;
    }
  }

  //run by bxf.js:
  //return sendCommand(device, `aux ${modeVals.split("|").join(" ")}`, 20);

  /*
  updateValue() {
    this.setState({ isDirty: true });
    FCConnector.setMode(this.state).then(() => {
      this.setState({ isDirty: false });
      this.props.notifyDirty(true, this.state);
    });
  }
  */

  addRange() {
    this.state.mappings.append({
      id: this.props.auxMode.id, //set to auxmode ID
      channel: -1,
      range: { min: 0, max: 0 }
    });
  }
  render() {
    let sliderLeft = 0;

    //set telemetry min and max
    if (this.state.channel > -1 && this.props.telemetry) {
      sliderLeft =
        ((this.props.telemetry[this.state.channel] - this.props.telemetryMin) *
          100) /
        (this.props.telemetryMax - this.props.telemetryMin);
    }

    return (
      <Accordion>
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          aria-controls="panel1c-content"
          id="panel1c-header"
        >
          <div className="three-column">
            <Typography className="heading">
              <FormattedMessage id={this.props.auxMode.label} />
            </Typography>
          </div>
          <div className="three-column">
            {}
            <Typography className="secondaryHeading">
              <FormattedMessage id="aux.select.channel" />
            </Typography>
          </div>
        </AccordionSummary>
        <AccordionDetails className="details">
          <div style={{ width: "180rem" }}>
            <HelperSelect
              id={this.props.id}
              className={this.props.id}
              label="Channel"
              //value={//{this.props.auxMode.mappings..channel}
              //onChange={event => this.props.changeProfile(event.target.value)}
              //items={}
            />
            <Typography style={{ margin: "20px", fontFamily: "inherit" }}>
              {this.props.min}
            </Typography>
            <ExpandMoreIcon
              style={{
                position: "absolute",
                left: `${sliderLeft}%`
              }}
              color="secondary"
              fontSize="large"
            />
            <Slider
              style={{
                width: 300,
                marginTop: 40,
                marginLeft: 20,
                width: "70%"
              }}
              value="0" //{value}
              //onChange={handleChange}
              valueLabelDisplay="auto"
              aria-labelledby="range-slider"
              value={this.state.range}
              min={this.props.min}
              max={this.props.max}
              scaleLength={this.props.step}
              //getAriaValueText={valuetext}
            />
          </div>
          <Typography style={{ margin: "20px" }}>{this.props.max}</Typography>
          <IconButton aria-label="delete">
            <DeleteIcon />
          </IconButton>
          <div className="helper">
            <Typography variant="caption">
              Explanation of flight mode
              <br />
              <a href="#secondary-heading-and-columns" className="link">
                Learn more
              </a>
            </Typography>
          </div>
        </AccordionDetails>
        <Divider />
        <AccordionActions>
          <IconButton
            aria-label="add"
            name="add_range"
            onClick={() => this.addRange()}
            color="primary"
            variant="contained"
          >
            <AddCircleOutlineIcon />
          </IconButton>
          <Button size="small" color="red">
            Reset
          </Button>
        </AccordionActions>
      </Accordion>
    );
  }
}
