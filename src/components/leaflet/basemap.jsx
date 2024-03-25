import React, { Component } from "react";
import L from "leaflet";
import { addLayer, updateLayer, removeLayer } from "./functions";
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
        } else if (update.event === "updateLayer") {
          updateLayer(
            this.find(layers, "id", update.id),
            this.map,
            datetime,
            this.layerStore,
            products
          );
        } else if (update.event === "removeLayer") {
          removeLayer(
            this.find(layers, "id", update.id),
            this.map,
            this.layerStore
          );
        }
      }
      this.map.triggerLayersUpdate();
    }
  }
  async componentDidMount() {
    this.layerStore = {};
    var bounds = L.latLngBounds([
      [46.192, 6.118],
      [46.533, 6.943],
    ]);
    this.map = L.map("map", {
      maxBounds: bounds,
      maxBoundsViscosity: 0.75,
      zoomSnap: 0.1,
      showCursorLocation: true,
    }).fitBounds(bounds);
    this.map.doubleClickZoom.disable();
    var basemap = L.tileLayer(
      "https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.pixelkarte-grau/default/current/3857/{z}/{x}/{y}.jpeg",
      {
        maxZoom: 19,
        attribution:
          '<a title="Swiss Federal Office of Topography" href="https://www.swisstopo.admin.ch/">swisstopo</a>',
      }
    );
    this.map.addLayer(basemap);
    this.layer = L.layerGroup([]).addTo(this.map);
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
