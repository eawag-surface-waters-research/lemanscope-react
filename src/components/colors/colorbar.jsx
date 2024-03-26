import React, { Component } from "react";
import COLORS from "./colors.json";

class Colorbar extends Component {
  render() {
    var { min, max, paletteName, unit, text } = this.props;
    var palette = COLORS[paletteName];
    var colors = [];
    for (let p of palette) {
      colors.push(
        `rgb(${p.color[0]},${p.color[1]},${p.color[2]}) ${p.point * 100}%`
      );
    }
    var background = `linear-gradient(90deg, ${colors.join(", ")})`;
    return (
      <div className="colorbar">
        <div className="value left">
          {min}
          {unit}
        </div>
        <div className="bar" style={{ background: background }}>
          {text}
        </div>
        <div className="value right">
          {max}
          {unit}
        </div>
      </div>
    );
  }
}

export default Colorbar;
