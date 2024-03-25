import L from "leaflet";
import * as d3 from "d3";
import axios from "axios";
import COLORS from "../colors/colors.json";
import CONFIG from "../../config.json";
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
    await addSencastTiff(layer, layerStore, datetime, map, products);
  } else if (layer.type === "sentinel_hub_wms") {
    await addSentinelHubWms(layer, layerStore, datetime, map);
  }
  loaded();
};

export const updateLayer = async (
  layer,
  map,
  datetime,
  layerStore,
  products
) => {
  if (layer.type === "sencast_tiff") {
    await updateSencastTiff(layer, layerStore, datetime, map, products);
  } else if (layer.type === "sentinel_hub_wms") {
    await updateSentinelHubWms(layer, layerStore, map, datetime);
  }
  loaded();
};

export const removeLayer = async (layer, map, layerStore) => {
  if (layer.type === "sencast_tiff") {
    await removeSencastTiff(layer, layerStore, map);
  } else if (layer.type === "sentinel_hub_wms") {
    removeSentinelHubWms(layer, layerStore, map);
  }
};

const addSencastTiff = async (layer, layerStore, datetime, map, products) => {
  var image = findClosest(
    products[layer.properties.model.toLowerCase()],
    "unix",
    datetime
  );
  await plotSencastTiff(image.url, layer, layerStore, map);
};

const plotSencastTiff = async (url, layer, layerStore, map) => {
  var path = [
    layer.type,
    layer.properties.model,
    layer.properties.lake,
    layer.properties.parameter,
  ];
  var options = {};
  if ("options" in layer.properties) {
    options = layer.properties.options;
    if ("paletteName" in layer.properties.options) {
      layer.properties.options.palette =
        COLORS[layer.properties.options.paletteName];
      options["palette"] = COLORS[layer.properties.options.paletteName];
    }
    if (!("opacity" in layer.properties.options)) {
      options["opacity"] = 1;
    }
    if (!("convolve" in layer.properties.options)) {
      options["convolve"] = 0;
    }
  }
  loading("Downloading satellite image");
  var { data } = await axios.get(url, {
    responseType: "arraybuffer",
  });

  loading("Processing satellite image");
  var leaflet_layer = L.floatgeotiff(data, options).addTo(map);
  setNested(layerStore, path, leaflet_layer);
};

const updateSencastTiff = async (
  layer,
  layerStore,
  datetime,
  map,
  products
) => {
  var path = [
    layer.type,
    layer.properties.model,
    layer.properties.lake,
    layer.properties.parameter,
  ];

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

  const image = findClosest(products[layer.properties.model.toLowerCase()], "unix", datetime);
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
  }
};

const removeSencastTiff = (layer, layerStore, map) => {
  var path = [
    layer.type,
    layer.properties.model,
    layer.properties.lake,
    layer.properties.parameter,
  ];
  var leaflet_layer = getNested(layerStore, path);
  map.removeLayer(leaflet_layer);
  setNested(layerStore, path, null);
};

const addSentinelHubWms = async (
  layer,
  dataStore,
  layerStore,
  datetime,
  map
) => {
  var path = [
    layer.type,
    layer.properties.model,
    layer.properties.lake,
    layer.properties.parameter,
  ];
  var metadata;
  var image;
  if (!checkNested(dataStore, path)) {
    ({ data: metadata } = await axios.get(layer.properties.metadata));
    var max_pixels = d3.max(metadata.map((m) => parseFloat(m.p)));
    metadata = metadata.map((m) => {
      m.unix = parseDate(m.dt).getTime();
      m.date = m.dt.slice(0, 8);
      m.url = CONFIG.sencast_bucket + "/" + m.k;
      m.time = parseDate(m.dt);
      m.percent = Math.ceil((parseFloat(m.vp) / max_pixels) * 100);
      return m;
    });
    setNested(dataStore, path, metadata);
    image = findClosest(metadata, "unix", datetime);
    var dates = keepDuplicatesWithHighestValue(metadata, "date", "percent");
    layer.properties.options.includeDates = dates.map((m) => m.time);
    layer.properties.options.percentage = dates.map((m) => m.percent);
    layer.properties.options.date = image.time;
  } else {
    metadata = getNested(dataStore, path);
    image = findClosest(metadata, "unix", layer.properties.options.date);
  }

  var leaflet_layer = L.tileLayer
    .wms(layer.properties.wms, {
      tileSize: 512,
      attribution:
        '&copy; <a href="http://www.sentinel-hub.com/" target="_blank">Sentinel Hub</a>',
      minZoom: 6,
      maxZoom: 16,
      preset: layer.properties.options.layer,
      layers: layer.properties.options.layer,
      time: formatWmsDate(layer.properties.options.date),
      gain: layer.properties.options.gain,
      gamma: layer.properties.options.gamma,
    })
    .addTo(map);
  setNested(layerStore, path, leaflet_layer);
};

const updateSentinelHubWms = async (
  layer,
  dataStore,
  layerStore,
  map,
  datetime
) => {
  var path = [
    layer.type,
    layer.properties.model,
    layer.properties.lake,
    layer.properties.parameter,
  ];
  var metadata = getNested(dataStore, path);
  var leaflet_layer = getNested(layerStore, path);

  const image = findClosest(
    metadata,
    "unix",
    layer.properties.options.date.getTime()
  );
  layer.properties.options.updateDate = false;

  leaflet_layer.setParams({
    time: formatWmsDate(image.time),
    gain: layer.properties.options.gain,
    gamma: layer.properties.options.gamma,
  });
};

const removeSentinelHubWms = (layer, layerStore, map) => {
  var path = [
    layer.type,
    layer.properties.model,
    layer.properties.lake,
    layer.properties.parameter,
  ];
  var leaflet_layer = getNested(layerStore, path);
  map.removeLayer(leaflet_layer);
  setNested(layerStore, path, null);
};
