import React, { Component } from "react";
import axios from "axios";
import * as d3 from "d3";
import DatePicker from "react-datepicker";
import Basemap from "./components/leaflet/basemap";
import "react-datepicker/dist/react-datepicker.css";
import {
  keepDuplicatesWithHighestValue,
  sortOccurrencesByDate,
} from "./functions";
import CONFIG from "./config.json";
import "./App.css";
import Colorbar from "./components/colors/colorbar";

class App extends Component {
  state = {
    datetime: Date.now(),
    updates: [],
    layers: CONFIG.layers,
    products: { observations: [], sentinel3: [] },
    includeDates: [],
    satellite: "tiff",
    available: [],
    modal: false,
  };
  updated = () => {
    this.setState({ updates: [] });
  };
  closeModal = () => {
    if (this.state.modal) {
      this.setState({ modal: false });
    }
  };
  openModal = () => {
    this.setState({ modal: true });
  };
  parseDatetime = (dateString) => {
    const year = dateString.slice(0, 4);
    const month = parseInt(dateString.slice(4, 6)) - 1; // month is zero-indexed
    const day = dateString.slice(6, 8);
    const hour = dateString.slice(9, 11);
    const minute = dateString.slice(11, 13);
    const second = dateString.slice(13, 15);
    const date = new Date(year, month, day, hour, minute, second);
    return date;
  };
  parseDate = (dateString) => {
    const year = dateString.slice(0, 4);
    const month = parseInt(dateString.slice(4, 6)) - 1; // month is zero-indexed
    const day = dateString.slice(6, 8);
    const date = new Date(year, month, day, 8);
    return date;
  };
  compareDates = (date1, date2) => {
    return date1 - date2;
  };
  setDatetime = (datetime) => {
    var { updates, satellite } = this.state;
    updates.push(
      { event: "addLayer", id: satellite },
      { event: "addLayer", id: "eyeonwater" }
    );
    this.setState({ datetime, updates });
  };
  onMonthChange = (event) => {
    var { available } = this.state;
    this.addCssRules(event, available);
  };
  addDays = (inputDate, daysToAdd) => {
    if (!(inputDate instanceof Date)) {
      throw new Error("Input must be a Date object");
    }
    const timestamp = inputDate.getTime() + daysToAdd * 24 * 60 * 60 * 1000;
    const resultDate = new Date(timestamp);
    return resultDate;
  };
  addOneMonth = (inputDate) => {
    if (!(inputDate instanceof Date)) {
      throw new Error("Input must be a Date object");
    }
    const currentMonth = inputDate.getMonth();
    const currentYear = inputDate.getFullYear();
    const nextMonth = (currentMonth + 1) % 12;
    const nextYear = nextMonth === 0 ? currentYear + 1 : currentYear;
    const resultDate = new Date(nextYear, nextMonth, inputDate.getDate());
    return resultDate;
  };
  addCssRules = (date, available) => {
    var start = new Date(date.getFullYear(), date.getMonth(), 1);
    var end = this.addOneMonth(start);
    var className;
    for (let i = 0; i < available.length; i++) {
      let p = available[i].percent;
      let day = available[i].time.getDate();
      let obs = available[i].obs;
      let element = [];
      if (available[i].time > start && available[i].time < end) {
        className = `.custom-css-datepicker .react-datepicker__day--0${
          day < 10 ? "0" + day : day
        }:not(.react-datepicker__day--outside-month)`;
        element = document.querySelectorAll(className);
      } else if (
        available[i].time < start &&
        available[i].time > this.addDays(start, -15)
      ) {
        className = `.custom-css-datepicker .react-datepicker__day--0${
          day < 10 ? "0" + day : day
        }.react-datepicker__day--outside-month`;
        element = document.querySelectorAll(className);
      } else if (
        available[i].time > end &&
        available[i].time < this.addDays(end, 15)
      ) {
        className = `.custom-css-datepicker .react-datepicker__day--0${
          day < 10 ? "0" + day : day
        }.react-datepicker__day--outside-month`;
        element = document.querySelectorAll(className);
      }
      if (element.length > 0) {
        let deg = Math.ceil((p / 100) * 180) + 180;
        element[0].title = `${p}% pixel coverage and ${obs} observations`;
        if (obs > 0) {
          element[0].innerHTML = `<div class="percentage" style="background: conic-gradient(transparent 180deg, var(--e-global-color-subtle-accent) 180deg ${deg}deg, transparent ${deg}deg 360deg);"></div></div><div class="observations">${obs}</div><div class="date">${element[0].innerHTML}</div>`;
        } else {
          element[0].innerHTML = `<div class="percentage" style="background: conic-gradient(transparent 180deg, var(--e-global-color-subtle-accent) 180deg ${deg}deg, transparent ${deg}deg 360deg);"></div></div><div class="date">${element[0].innerHTML}</div>`;
        }
      }
    }
  };
  async componentDidMount() {
    var { products, satellite, modal } = this.state;
    console.log(JSON.parse(localStorage.getItem("visited")));
    if (JSON.parse(localStorage.getItem("visited")) === null) {
      modal = true;
      localStorage.setItem("visited", JSON.stringify(true));
    }

    var observations = {};
    var { data: sentinel3 } = await axios.get(
      "https://eawagrs.s3.eu-central-1.amazonaws.com/metadata/sentinel3/geneva_Zsd_lee.json"
    );
    var max_pixels = d3.max(sentinel3.map((m) => parseFloat(m.p)));
    sentinel3 = sentinel3.map((m) => {
      m.unix = this.parseDatetime(m.dt).getTime();
      m.date = m.dt.slice(0, 8);
      m.url = CONFIG.sencast_bucket + "/" + m.k;
      m.time = this.parseDatetime(m.dt);
      m.percent = Math.ceil((parseFloat(m.vp) / max_pixels) * 100);
      return m;
    });
    products["sentinel3"] = sentinel3;
    var dates = keepDuplicatesWithHighestValue(sentinel3, "date", "percent");

    try {
      ({ data: observations } = await axios.get(
        "https://www.eyeonwater.org/api/observations?period=120&offset=0&limit=10000&sort=desc&bbox=46.20%2C6.14%2C46.53%2C6.94&bboxVersion=1.3.0"
      ));
      observations = observations.filter((o) => o.water.sd_depth > 0);
      observations = sortOccurrencesByDate(observations);
      products["eyeonwater"] = observations;
    } catch (e) {
      console.error("Failed to collect data from Eyeonwater");
    }
    var available = dates.map((d) => {
      let obs = 0;
      if (Object.keys(observations).includes(d.date)) {
        obs = observations[d.date].length;
      }
      return {
        time: d.time,
        date: d.date,
        percent: d.percent,
        obs: obs,
      };
    });
    var currentDates = dates.map((m) => m.date);
    for (let obs of Object.keys(observations)) {
      if (!currentDates.includes(obs)) {
        available.push({
          time: this.parseDate(obs),
          date: obs,
          percent: 0,
          obs: observations[obs].length,
        });
      }
    }
    var includeDates = available.map((m) => m.time);
    includeDates.sort(this.compareDates);
    var datetime = includeDates[includeDates.length - 1];
    var updates = [
      { event: "addLayer", id: satellite },
      { event: "addLayer", id: "eyeonwater" },
    ];
    this.addCssRules(datetime, available);
    this.setState({
      modal,
      products,
      includeDates,
      datetime,
      updates,
      available,
    });
  }
  render() {
    var { updates, layers, datetime, includeDates, products, modal } =
      this.state;
    const { min, max, paletteName, unit } = layers[0].properties.options;
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
      <div className="main" onClick={this.closeModal}>
        <div className={modal ? "modal" : "model hide"}>
          <div className="close">&times;</div>
          <div className="content">
            <div className="top">Calendrier</div>
            <div className="left">Couverture du lac sur l'image satellite</div>
            <div className="center">
              <div className="percentage">
                <div className="observations">4</div>
                <div className="date">12</div>
              </div>
            </div>
            <div className="right">Nombre de mesures quotidiennes</div>
          </div>
        </div>
        <div className="sidebar">
          <div className="custom-css-datepicker">
            <div className="instructions" onClick={this.openModal}>
              Instructions
            </div>
            <DatePicker
              dateFormat="dd/MM/yyyy"
              locale={locale}
              inline={true}
              includeDates={includeDates}
              selected={datetime}
              onChange={this.setDatetime}
              onMonthChange={this.onMonthChange}
            />
          </div>
        </div>
        <div className="map">
          <Basemap
            updates={updates}
            updated={this.updated}
            layers={layers}
            datetime={datetime}
            products={products}
          />
          <Colorbar
            min={min}
            max={max}
            paletteName={paletteName}
            text={"Profondeur de secchi"}
            unit={unit}
          />
        </div>
      </div>
    );
  }
}

export default App;
