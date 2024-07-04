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
import Toggle from "./components/toggle/toggle";
import InitialLoading from "./components/loading/initialloading";

class App extends Component {
  state = {
    datetime: Date.now(),
    updates: [],
    layers: CONFIG.layers,
    products: { observations: [], sentinel3: [] },
    includeDates: [],
    available: [],
    modal: false,
    eyeonwater: {},
    parameter: "Secchi",
    loading: true,
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
    var { updates, parameter } = this.state;
    if (parameter === "Secchi") {
      updates.push(
        { event: "addLayer", id: "tiff_secchi" },
        { event: "addLayer", id: "eyeonwater_secchi" }
      );
    } else {
      updates.push(
        { event: "addLayer", id: "tiff_forelule" },
        { event: "addLayer", id: "eyeonwater_forelule" }
      );
    }

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
          element[0].innerHTML = `<div class="percentage" style="background: conic-gradient(transparent 180deg, var(--e-global-color-subtle-accent) 180deg ${deg}deg, transparent ${deg}deg 360deg);"></div></div><div class="observations">${obs}</div><div class="date">${day}</div>`;
        } else {
          element[0].innerHTML = `<div class="percentage" style="background: conic-gradient(transparent 180deg, var(--e-global-color-subtle-accent) 180deg ${deg}deg, transparent ${deg}deg 360deg);"></div></div><div class="date">${day}</div>`;
        }
      }
    }
  };
  setParameter = async () => {
    var { parameter, eyeonwater } = this.state;
    if (parameter === "Secchi") {
      parameter = "Couleur";
    } else {
      parameter = "Secchi";
    }
    this.processData(eyeonwater, parameter);
  };

  processData = async (eyeonwater, parameter) => {
    var { products } = this.state;
    var observations = JSON.parse(JSON.stringify(eyeonwater));
    var url =
      "https://eawagrs.s3.eu-central-1.amazonaws.com/metadata/sentinel3/geneva_Zsd_lee.json";
    if (parameter === "Couleur") {
      url =
        "https://eawagrs.s3.eu-central-1.amazonaws.com/metadata/sentinel3/geneva_forel_ule.json";
    }
    var { data: sentinel3 } = await axios.get(url);
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

    if (parameter === "Couleur") {
      observations = observations.filter((o) => o.water.fu_processed > 0);
      observations = observations.map((o) => {
        o.value = o.water.fu_processed;
        return o;
      });
    } else {
      observations = observations.filter((o) => o.water.sd_depth > 0);
      observations = observations.map((o) => {
        o.value = o.water.sd_depth;
        return o;
      });
    }

    observations = sortOccurrencesByDate(observations);
    products["eyeonwater"] = observations;

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
    var updates = [];
    if (parameter === "Secchi") {
      updates.push(
        { event: "addLayer", id: "tiff_secchi" },
        { event: "addLayer", id: "eyeonwater_secchi" }
      );
    } else {
      updates.push(
        { event: "addLayer", id: "tiff_forelule" },
        { event: "addLayer", id: "eyeonwater_forelule" }
      );
    }
    this.addCssRules(datetime, available);
    this.setState({
      products,
      includeDates,
      datetime,
      updates,
      available,
      parameter,
    });
  };

  async componentDidMount() {
    var { modal, eyeonwater, parameter } = this.state;
    if (JSON.parse(localStorage.getItem("visited")) === null) {
      modal = true;
      localStorage.setItem("visited", JSON.stringify(true));
    }

    try {
      ({ data: eyeonwater } = await axios.get(
        "https://www.eyeonwater.org/api/observations?period=120&offset=0&limit=10000&sort=desc&bbox=46.20%2C6.14%2C46.53%2C6.94&bboxVersion=1.3.0"
      ));
    } catch (e) {
      console.error("Failed to collect data from Eyeonwater");
    }

    this.processData(eyeonwater, parameter);
    this.setState({ modal, eyeonwater, loading: false });
  }
  render() {
    var {
      updates,
      layers,
      datetime,
      includeDates,
      products,
      modal,
      parameter,
      loading,
    } = this.state;
    var layer;
    if (parameter === "Secchi") {
      layer = "tiff_secchi";
    } else {
      layer = "tiff_forelule";
    }
    const { min, max, paletteName, unit, label } = layers.find(
      (l) => l.id === layer
    ).properties.options;
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
            <div className="left">Couverture du lac sur l'image white</div>
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
            <Toggle
              left="Secchi"
              right="Couleur"
              onChange={this.setParameter}
              checked={parameter === "Couleur"}
            />
            <div className="instructions" onClick={this.openModal}>
              ?
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
          {loading && <InitialLoading />}
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
            text={label}
            unit={unit}
          />
        </div>
      </div>
    );
  }
}

export default App;
