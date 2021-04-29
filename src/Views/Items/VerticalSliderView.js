import React, { Component } from "react";
import { Slider } from "@material-ui/core";
import TextField from "@material-ui/core/TextField";
import Typography from "@material-ui/core/Typography";
import { FormattedMessage } from "react-intl";

export default class VerticalSliderView extends Component {
  constructor(props) {
    super(props);
    this.parser = parseInt;
    this.state = {
      isDirty: false,
      inputVal: this.props.item.current
    };
  }
  updateValue(newVal) {
    this.setState({ isDirty: true });
    this.props
      .updateCurve(newVal)
      .then(() => this.setState({ isDirty: false }));
  }
  UNSAFE_componentWillReceiveProps(nextProps) {
    this.setState({ inputVal: nextProps.item.current });
  }
  render() {
    return (
      <div className="vertical-slider-view">
        <Typography
          variant="caption"
          className={this.props.labelClassName}
          style={{ whiteSpace: "nowrap" }}
        >
          <FormattedMessage id={this.props.item.id} />
        </Typography>
        <Slider
          className={this.props.sliderClassName}
          value={this.parser(this.props.item.current)}
          disabled={!!this.state.isDirty}
          min={this.parser(this.props.item.min)}
          max={this.parser(this.props.item.max)}
          step={this.props.item.step}
          //vertical={this.props.item.axis === "y"}
          orientation="vertical"
          reverse="true"
          onChange={(event, inputVal) => {
            this.setState({ inputVal: this.parser(inputVal) });
            this.props.item.current = this.parser(inputVal);
            this.props.onChange && this.props.onChange(event, inputVal);
          }}
          onDragEnd={() => {
            this.updateValue(this.state.inputVal);
          }}
        />
        <TextField
          name={this.props.item.id}
          inputProps={this.props.textInputProps}
          type="number"
          disabled={this.props.inputDisabled}
          value={this.parser(this.state.inputVal)}
          onBlur={() => {
            this.updateValue(this.state.inputVal);
          }}
          onChange={event => {
            this.setState({ inputVal: this.parser(event.target.value) });
          }}
        />
      </div>
    );
  }
}
