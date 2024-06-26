import React, { Component } from "react";
import L from "leaflet";
import { addLayer } from "./functions";
import "./leaflet_geotiff";
import "./leaflet_colorpicker";
import "./leaflet_customtooltip";
import "./leaflet_customcontrol";
import "./css/leaflet.css";

class Basemap extends Component {
  find = (list, parameter, value) => {
    return list.find((l) => l[parameter] === value);
  };
  async componentDidUpdate(prevProps) {
    const { updates, updated, layers, datetime, products } = this.props;
    if (updates.length > 0) {
      updated();
      for (var update of updates) {
        if (update.event === "addLayer") {
          try {
            await addLayer(
              this.find(layers, "id", update.id),
              this.map,
              datetime,
              this.layerStore,
              products
            );
          } catch (e) {
            console.error(
              "Failed to add layer",
              this.find(layers, "id", update.id)
            );
            console.error(e);
            window.alert(
              `Failed to add layer ${
                this.find(layers, "id", update.id).properties.parameter
              }, try a different time period.`
            );
          }
        }
      }
      this.map.triggerLayersUpdate();
    }
  }
  async componentDidMount() {
    this.layerStore = {};
    var bounds = L.latLngBounds([
      [46.192, 6.118],
      [46.633, 6.943],
    ]);
    this.map = L.map("map", {
      zoomSnap: 0.5,
      showCursorLocation: true,
      minZoom: 9,
    }).fitBounds(bounds);
    this.map.doubleClickZoom.disable();
    var basemap = L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}",
      {
        attribution: "Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ",
        maxZoom: 16,
      }
    );
    this.map.addLayer(basemap);
    this.layer = L.layerGroup([]).addTo(this.map);
    L.control.scale().addTo(this.map);
  }

  render() {
    return (
      <React.Fragment>
        <div id="map"></div>
      </React.Fragment>
    );
  }
}

export default Basemap;
