import React, { Component } from "react";
import axios from "axios";
import * as d3 from "d3";
import DatePicker from "react-datepicker";
import Basemap from "./components/leaflet/basemap";
import "react-datepicker/dist/react-datepicker.css";
import { keepDuplicatesWithHighestValue } from "./functions";
import CONFIG from "./config.json";
import "./App.css";

class App extends Component {
  state = {
    datetime: Date.now(),
    updates: [],
    layers: CONFIG.layers,
    products: { observations: [], sentinel3: [] },
    includeDates: [],
  };
  updated = () => {
    this.setState({ updates: [] });
  };
  parseDate = (dateString) => {
    const year = dateString.slice(0, 4);
    const month = parseInt(dateString.slice(4, 6)) - 1; // month is zero-indexed
    const day = dateString.slice(6, 8);
    const hour = dateString.slice(9, 11);
    const minute = dateString.slice(11, 13);
    const second = dateString.slice(13, 15);
    const date = new Date(year, month, day, hour, minute, second);
    return date;
  };
  async componentDidMount() {
    var { products } = this.state;
    var { data: sentinel3 } = await axios.get(
      "https://eawagrs.s3.eu-central-1.amazonaws.com/metadata/sentinel3/geneva_Zsd_lee.json"
    );
    var max_pixels = d3.max(sentinel3.map((m) => parseFloat(m.p)));
    sentinel3 = sentinel3.map((m) => {
      m.unix = this.parseDate(m.dt).getTime();
      m.date = m.dt.slice(0, 8);
      m.url = CONFIG.sencast_bucket + "/" + m.k;
      m.time = this.parseDate(m.dt);
      let split = m.k.split("_");
      m.tile = split[split.length - 1].split(".")[0];
      m.satellite = split[0].split("/")[2];
      m.percent = Math.ceil((parseFloat(m.vp) / max_pixels) * 100);
      m.ave = Math.round(parseFloat(m.mean) * 100) / 100;
      return m;
    });
    var dates = keepDuplicatesWithHighestValue(sentinel3, "date", "percent");
    var includeDates = dates.map((m) => m.time);
    products["sentinel3"] = sentinel3;
    this.setState({ products, includeDates });
  }
  render() {
    var { updates, layers, datetime, includeDates } = this.state;
    const locale = {
      localize: {
        day: (n) => ["Di", "Lu", "Ma", "Me", "Je", "Ve", "Sa"][n],
        month: (n) =>
          [
            "Janvier",
            "Février",
            "Mars",
            "Avril",
            "Mai",
            "Juin",
            "Juillet",
            "Août",
            "Septembre",
            "Octobre",
            "Novembre",
            "Décembre",
          ][n],
      },
      formatLong: {
        date: () => "dd/mm/yyyy",
      },
    };
    return (
      <div className="main">
        <div className="sidebar">
          <div className="custom-css-datepicker">
            <DatePicker
              dateFormat="dd/MM/yyyy"
              locale={locale}
              inline={true}
              includeDates={includeDates}
            />
          </div>
        </div>
        <div className="map">
          <Basemap
            updates={updates}
            updated={this.updated}
            layers={layers}
            datetime={datetime}
          />
        </div>
      </div>
    );
  }
}

export default App;
