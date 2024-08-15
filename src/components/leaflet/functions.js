import L from "leaflet";
import * as d3 from "d3";
import axios from "axios";
import COLORS from "../colors/colors.json";
import CONFIG from "../../config.json";
import "leaflet.markercluster";
import "./css/markercluster.css";
import "./css/markerclusterdefault.css";
import "./leaflet_raster";
import "./leaflet_streamlines";
import "./leaflet_floatgeotiff";
import "./leaflet_particletracking";
import "./leaflet_polylinedraw";
import "./leaflet_vectorfield";
import "./leaflet_markerdraw";

const setNested = (obj, args, value) => {
  for (var i = 0; i < args.length - 1; i++) {
    if (!obj || !obj.hasOwnProperty(args[i])) {
      obj[args[i]] = {};
    }
    obj = obj[args[i]];
  }
  obj[args[args.length - 1]] = value;
};

const checkNested = (obj, args) => {
  for (var i = 0; i < args.length; i++) {
    if (!obj || !obj.hasOwnProperty(args[i])) {
      return false;
    }
    obj = obj[args[i]];
  }
  return true;
};

const getNested = (obj, args) => {
  return args.reduce((acc, arg) => acc && acc[arg], obj);
};

const hex = (c) => {
  var s = "0123456789abcdef";
  var i = parseInt(c, 10);
  if (i === 0 || isNaN(c)) return "00";
  i = Math.round(Math.min(Math.max(0, i), 255));
  return s.charAt((i - (i % 16)) / 16) + s.charAt(i % 16);
};

const convertToHex = (rgb) => {
  return hex(rgb[0]) + hex(rgb[1]) + hex(rgb[2]);
};

const addMinutes = (date, minutes) => {
  return new Date(date.getTime() + minutes * 60000);
};

export const toRadians = (degrees) => {
  return (degrees * Math.PI) / 180;
};

export const dayName = (YYYYMMDD, language, Translations, full = false) => {
  if (formatDateYYYYMMDD(new Date()) === YYYYMMDD) {
    if (full) {
      return Translations.today[language];
    }
    return Translations.today[language];
  }
  const year = parseInt(YYYYMMDD.substr(0, 4), 10);
  const month = parseInt(YYYYMMDD.substr(4, 2), 10) - 1; // Subtracting 1 to make it zero-based
  const day = parseInt(YYYYMMDD.substr(6, 2), 10);
  var daysOfWeekNames = Translations.axis[language].shortDays;
  if (full) {
    daysOfWeekNames = Translations.axis[language].days;
  }
  const date = new Date(year, month, day);
  const dayOfWeekNumber = date.getDay();
  return daysOfWeekNames[dayOfWeekNumber];
};

export const dateName = (YYYYMMDD, language, Translations) => {
  const year = parseInt(YYYYMMDD.substr(0, 4), 10);
  const month = parseInt(YYYYMMDD.substr(4, 2), 10) - 1; // Subtracting 1 to make it zero-based
  const day = parseInt(YYYYMMDD.substr(6, 2), 10);
  return `${day} ${Translations.axis[language].months[month]} ${year}`;
};

export const formatDateYYYYMMDD = (d) => {
  const date = new Date(d);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
};

const formatDateIso = (datetime) => {
  var year = datetime.getFullYear();
  var month = datetime.getMonth() + 1;
  var date = datetime.getDate();
  var hour = datetime.getHours();
  var minute = datetime.getMinutes();
  return `${String(year)}-${month < 10 ? "0" + month : month}-${
    date < 10 ? "0" + date : date
  }T${hour < 10 ? "0" + hour : hour}:${
    minute < 10 ? "0" + minute : minute
  }:00Z`;
};

const formatWmsDate = (datetime, minutes = 120) => {
  var start = addMinutes(datetime, -minutes);
  var end = addMinutes(datetime, minutes);
  return `${formatDateIso(start)}/${formatDateIso(end)}`;
};

const parseDate = (dateString) => {
  const year = dateString.slice(0, 4);
  const month = parseInt(dateString.slice(4, 6)) - 1; // month is zero-indexed
  const day = dateString.slice(6, 8);
  const hour = dateString.slice(9, 11);
  const minute = dateString.slice(11, 13);
  const second = dateString.slice(13, 15);
  const date = new Date(year, month, day, hour, minute, second);
  return date;
};

const formatDateToYYYYMMDD = (date) => {
  const year = date.getFullYear().toString();
  const month = (date.getMonth() + 1).toString().padStart(2, "0"); // Add leading zero if needed
  const day = date.getDate().toString().padStart(2, "0"); // Add leading zero if needed
  return year + month + day;
};

const findClosest = (array, key, value) => {
  let closest = null;
  let minDiff = Infinity;

  for (let i = 0; i < array.length; i++) {
    let diff = Math.abs(array[i][key] - value);
    if (diff < minDiff) {
      minDiff = diff;
      closest = array[i];
    }
  }
  if (closest.date === formatDateToYYYYMMDD(value)) {
    return closest;
  } else {
    return false;
  }
};

const findClosestValue = (listOfObjects, targetValue, key) => {
  let closest = null;
  let minDifference = Infinity;

  listOfObjects.forEach((obj) => {
    if (obj.hasOwnProperty(key)) {
      const difference = Math.abs(parseFloat(obj[key]) - targetValue);
      if (difference < minDifference) {
        minDifference = difference;
        closest = obj;
      }
    }
  });

  return closest;
};

const round = (value, decimals) => {
  return Math.round(value * 10 ** decimals) / 10 ** decimals;
};

const keepDuplicatesWithHighestValue = (list, dateKey, valueKey) => {
  const uniqueObjects = {};
  for (const obj of list) {
    const currentDate = obj[dateKey];
    const currentValue = obj[valueKey];

    if (
      !uniqueObjects[currentDate] ||
      uniqueObjects[currentDate][valueKey] < currentValue
    ) {
      uniqueObjects[currentDate] = obj;
    }
  }

  return Object.values(uniqueObjects);
};

export const flyToBounds = async (bounds, map) => {
  return new Promise((resolve) => {
    function flyEnd() {
      resolve();
      map.off("zoomend", flyEnd);
    }
    map.on("zoomend", flyEnd);
    map.fitBounds(
      L.latLngBounds(L.latLng(bounds.southWest), L.latLng(bounds.northEast)),
      { padding: [20, 20] }
    );
  });
};

const loading = (message) => {
  if (document.getElementById("loading")) {
    document.getElementById("loading-text").innerHTML = message;
    document.getElementById("loading").style.visibility = "visible";
  }
};

const loaded = () => {
  if (document.getElementById("loading")) {
    document.getElementById("loading").style.visibility = "hidden";
  }
};

export const addLayer = async (layer, map, datetime, layerStore, products) => {
  if (layer.type === "sencast_tiff") {
    await plotSencastTiff(layer, layerStore, datetime, map, products);
  } else if (layer.type === "eyeonwater_points") {
    plotEyeonwater(layer, layerStore, datetime, map, products);
  }
  loaded();
};

const plotSencastTiff = async (layer, layerStore, datetime, map, products) => {
  var path = [layer.type, layer.properties.model, layer.properties.lake];
  const image = findClosest(
    products[layer.properties.model.toLowerCase()],
    "unix",
    datetime
  );
  if (image) {
    var options = {};
    if ("options" in layer.properties) {
      options = layer.properties.options;
      if ("paletteName" in layer.properties.options) {
        layer.properties.options.palette =
          COLORS[layer.properties.options.paletteName];
        options["palette"] = COLORS[layer.properties.options.paletteName];
      }
      if ("unit" in layer.properties) {
        options["unit"] = layer.properties.unit;
      }
    }

    layer.properties.options.image = image;
    layer.properties.options.dataMin = round(image.min, 2);
    layer.properties.options.dataMax = round(image.max, 2);
    layer.properties.options.updateDate = false;
    loading("Downloading satellite image");
    var { data } = await axios.get(image.url, {
      responseType: "arraybuffer",
    });

    loading("Processing satellite image");

    var leaflet_layer = getNested(layerStore, path);
    if (leaflet_layer !== null && leaflet_layer !== undefined) {
      leaflet_layer.update(data, options);
    } else {
      leaflet_layer = L.floatgeotiff(data, options).addTo(map);
      setNested(layerStore, path, leaflet_layer);
    }
  } else {
    leaflet_layer = getNested(layerStore, path);
    if (leaflet_layer !== null && leaflet_layer !== undefined) {
      map.removeLayer(leaflet_layer);
      setNested(layerStore, path, null);
    }
  }
};

const plotEyeonwater = (layer, layerStore, datetime, map, products) => {
  var path = [layer.type, layer.properties.model, layer.properties.lake];
  var colors = COLORS[layer.properties.options.paletteName];
  var leaflet_layer = getNested(layerStore, path);
  if (!(leaflet_layer === null || leaflet_layer === undefined)) {
    map.removeLayer(leaflet_layer);
  }

  leaflet_layer = L.markerClusterGroup({
    iconCreateFunction: function (cluster) {
      var mean = 0;
      cluster.getAllChildMarkers().forEach(function (marker) {
        mean += marker.options.value;
      });
      mean /= cluster.getChildCount(); // Calculate mean
      mean = Math.round(mean * 10) / 10;
      let point = Math.max(
        0,
        Math.min(
          1,
          mean /
            (parseFloat(layer.properties.options.max) -
              parseFloat(layer.properties.options.min))
        )
      );
      let color = findClosestValue(colors, point, "point");
      return new L.divIcon({
        html: `<div style="background-color:${
          "#" + convertToHex(color.color)
        }"></div>`,
        className: " marker-cluster",
        iconSize: new L.point(20, 20),
      });
    },
  }).addTo(map);
  leaflet_layer.on("clustermouseover", function (event) {
    var cluster = event.layer;
    var mean = 0;
    cluster.getAllChildMarkers().forEach(function (marker) {
      mean += marker.options.value;
    });
    mean /= cluster.getChildCount();
    mean = Math.round(mean * 10) / 10;
    cluster.bindTooltip(
      `${mean}${layer.properties.unit} (${cluster.getChildCount()})`,
      {
        direction: "top",
      }
    );
    cluster.openTooltip();
  });
  leaflet_layer.clearLayers();
  var date = formatDateToYYYYMMDD(datetime);
  var observations = products[layer.properties.model.toLowerCase()];
  if (date in observations) {
    for (let observation of observations[date]) {
      let sd = parseFloat(observation.value);
      let point = Math.max(
        0,
        Math.min(
          1,
          sd /
            (parseFloat(layer.properties.options.max) -
              parseFloat(layer.properties.options.min))
        )
      );
      let color = findClosestValue(colors, point, "point");
      var marker = L.circleMarker(
        [observation.location.lat, observation.location.lng],
        {
          color: "white",
          fillColor: "#" + convertToHex(color.color),
          fillOpacity: 1,
          radius: 10,
          value: observation.value,
        }
      ).addTo(leaflet_layer);
      marker.bindTooltip(observation.value + layer.properties.unit, {
        direction: "top",
      });
      var popup = ['<div class="obs-table"><table><tbody>'];

      popup.push(
        `<tr><th>Temps</th><td>${observation.image.date_photo}</td></tr>`
      );
      popup.push(
        `<tr><th>Latitude</th><td>${
          Math.round(parseFloat(observation.location.lat) * 100) / 100
        }</td></tr>`
      );
      popup.push(
        `<tr><th>Longitide</th><td>${
          Math.round(parseFloat(observation.location.lng) * 100) / 100
        }</td></tr>`
      );
      if (
        "sd_depth" in observation.water &&
        observation.water.sd_depth !== 0 &&
        observation.water.sd_depth !== null
      ) {
        popup.push(
          `<tr><th>Profondeur de secchi</th><td>${observation.water.sd_depth} m</td></tr>`
        );
      }
      if (
        "fu_value" in observation.water &&
        observation.water.fu_value !== null
      ) {
        popup.push(
          `<tr><th>Forel-Ule (User)</th><td>${observation.water.fu_value}</td></tr>`
        );
      }
      if (
        "fu_processed" in observation.water &&
        observation.water.fu_processed !== null
      ) {
        popup.push(
          `<tr><th>Forel-Ule (Auto)</th><td>${observation.water.fu_processed}</td></tr>`
        );
      }
      if (
        "p_temperature" in observation.water &&
        observation.water.p_temperature !== null
      ) {
        popup.push(
          `<tr><th>Température</th><td>${observation.water.p_temperature} °C</td></tr>`
        );
      }
      if (
        "nickname" in observation.user &&
        observation.user.nickname !== null
      ) {
        popup.push(
          `<tr><th>User</th><td>${observation.user.nickname}</td></tr>`
        );
      }
      popup.push("</table></tbody></div>");
      marker.bindPopup(popup.join(""));
    }
  }
  setNested(layerStore, path, leaflet_layer);
};
