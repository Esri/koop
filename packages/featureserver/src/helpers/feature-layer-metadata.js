const _ = require('lodash');
const TableLayerMetadata = require('./table-layer-metadata');
const { PointRenderer, LineRenderer, PolygonRenderer } = require('./renderers');
const envelope = require('@turf/envelope').default;
const logManager = require('../log-manager');
const getSpatialReference = require('./get-spatial-reference');
const getGeometryTypeFromGeojson = require('./get-geometry-type-from-geojson');
const normalizeExtent = require('./normalize-extent');
const defaults = require('../metadata-defaults');

class FeatureLayerMetadata extends TableLayerMetadata {
  static create(geojson, options) {
    const { geojson: normalizedGeojson, options: normalizedOptions } =
      FeatureLayerMetadata.normalizeInput(geojson, options);
    const layerMetadata = new FeatureLayerMetadata();
    return layerMetadata.mixinOverrides(normalizedGeojson, normalizedOptions);
  }

  constructor() {
    super();
    Object.assign(this, defaults.featureLayerDefaults());
    return this;
  }

  mixinOverrides(geojson, options = {}) {
    super.mixinOverrides(geojson, options);

    const { renderer, labelingInfo, extent, inputCrs, sourceSR, capabilities = {} } = options;

    this.geometryType = getGeometryTypeFromGeojson({ ...geojson, ...options });

    this.supportsCoordinatesQuantization = !!capabilities.quantization;

    this.#_setExtent(geojson, { inputCrs, sourceSR, extent });

    this.#_setRenderer(renderer);

    this.#_setLabelingInfo(labelingInfo);

    this.#_setDirectOverrides(options);

    return this;
  }

  #_setExtent(geojson, options) {
    const extent = getLayerExtent(geojson, options);
    if (extent) {
      this.extent = extent;
    }
  }

  #_setRenderer(renderer) {
    if (renderer) {
      this.drawingInfo.renderer = renderer;
      return;
    }

    if (this.geometryType === 'esriGeometryPolygon') {
      this.drawingInfo.renderer = new PolygonRenderer();
      return;
    }

    if (this.geometryType === 'esriGeometryPolyline') {
      this.drawingInfo.renderer = new LineRenderer();
      return;
    }

    this.drawingInfo.renderer = new PointRenderer();
  }

  #_setLabelingInfo(labelingInfo) {
    if (labelingInfo) {
      this.drawingInfo.labelingInfo = labelingInfo;
    }
  }

  #_setDirectOverrides(options) {
    super._setDirectOverrides(options);
    const { minScale, maxScale } = options;

    _.merge(this, {
      minScale,
      maxScale,
    });
  }
}

function getLayerExtent(geojson, options) {
  const spatialReference = getSpatialReference(geojson, options);

  const { extent } = options;

  if (extent) {
    return normalizeExtent(extent, spatialReference);
  }

  return calculateExtentFromFeatures(geojson, spatialReference);
}

function calculateExtentFromFeatures(geojson, spatialReference) {
  if (!geojson.features || geojson.features.length === 0) {
    return;
  }

  try {
    const { bbox } = envelope(geojson);

    bbox.forEach((coordinate) => {
      if (!isFinite(coordinate)) {
        throw new Error(`Feature does not contain valid geometry`);
      }
    });

    const [xmin, ymin, xmax, ymax] = bbox;
    return {
      xmin,
      xmax,
      ymin,
      ymax,
      spatialReference,
    };
  } catch (error) {
    logManager.logger.debug(`Could not calculate extent from data: ${error.message}`);
  }
}

module.exports = FeatureLayerMetadata;
