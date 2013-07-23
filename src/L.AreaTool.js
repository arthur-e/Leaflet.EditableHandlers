L.AreaTool = L.Class.extend({
	initialize: function (map, options, iconStart, iconEnd) {
		L.Util.setOptions(this, options);
		this._map = map;
		this._diStart = iconStart;
		this._diEnd = iconEnd;
		this._measureStart = null;
		this._measureStop = null;
		this._rectArea = null;
		this._distancePopup = null;
		this._markerList = [];
	},

	options: {
        minWidth: 50,
        autoPan: false,
        closeButton: false,
        className: 'measuring-label', /*css label class name*/
		lineClassName: 'measuring-line-class' /*css class name for the line*/
	},

	enable: function() {
		this._map.on('click', this._onMapClick, this);
	},

	disable: function () {
        var i;

		this._map.off('click', this._onMapClick, this);

		if (this._distancePopup) {
			this._map.removeLayer(this._distancePopup);
			this._distancePopup = undefined;
		}
		if (this._rectArea) {
			this._map.removeLayer(this._rectArea);
			this._rectArea = undefined;
		}
		if (this._measureStop) {
			this._map.removeLayer(this._measureStop);
			this._measureStop = undefined;
		}
		if (this._measureStart) {
			this._map.removeLayer(this._measureStart);
			this._measureStart = undefined;
		}

		for (i = 0; this._markerList.length; i+=1) {
			this._map.removeLayer(this._markerList.pop());
		}
	},

	_onMapClick: function (e) {
        // Get initial location from click event
		var markerLocation = e.latlng;

        // Create a Marker for that click
		var marker = new L.Marker(markerLocation, {draggable:true});

        // Don't create any new Markers after a certain point
		if (this._measureStop) { return; }

        // Add the Marker to the map
		this._map.addLayer(marker);

        // If this is the first Marker...
		if (!this._measureStart) {
            // Remember this point as the start
			this._measureStart = e.latlng;
            
            // And set the appropriate icon
			if (this._diStart) {
				marker.setIcon(this._diStart);
			}

			marker._pos = 0;

        // Otherwise, this is the second Marker
		} else if (!this._measureStop) {
			this._measureStop = e.latlng;

			if (this._diEnd) {
				marker.setIcon(this._diEnd);
			}

			marker._pos = 1;
			
			//Do not worry, I decided to set this as the standard behaviour.
			//But you can change the style by setting your own class "lineClassName"
			this._rectArea = new L.Rectangle([
				new L.LatLngBounds(this._measureStart, e.latlng)
		    ], { color: "black", opacity: 0.5, stroke: true });
			    
            this._drawLayer(this._rectArea);
		}

		marker.on('drag', this._updateRuler, this);
		this._markerList.push(marker);
	},

    /**
        This assumes Euclidean geometry and therefore may not be accurate for
        areas on a sphere, but should be a good approximation for small
        areas on a sphere.
     */
    _computeArea: function (bounds) {
        var a, b;

        a = bounds.getNorthWest().distanceTo(bounds.getSouthWest());
        b = bounds.getNorthWest().distanceTo(bounds.getNorthEast());

        return ((a * b) / (1000000)); // Convert to square kilometers
    },

    _drawLayer: function () {
        var centerPos;

		this._map.addLayer(this._rectArea);
		this._rectArea._path.setAttribute("class", this.options['lineClassName']);

		centerPos = new L.LatLng((this._measureStart.lat + this._measureStop.lat)/2, 
			 (this._measureStart.lng + this._measureStop.lng)/2);

		this.setContent(this._computeArea(this._rectArea.getBounds()), centerPos);
        this._distancePopup._source = this._rectArea; //FIXME Fix for Leaflet 0.6.2
		this._map.addLayer(this._distancePopup)
                     .fire('popupopen', { popup: this._distancePopup });
    },

	_updateRuler: function (e) {
        // Assuming that Rectangle layer exists...
		if (this._rectArea) {

            switch (e.target._pos) {
                case 0:
                this._measureStart = e.target.getLatLng();
                break;

                case 1:
                this._measureStop = e.target.getLatLng();
                break;
            }

			this._map.removeLayer(this._rectArea);
			this._rectArea = new L.Rectangle(new L.LatLngBounds(this._measureStop,
                this._measureStart), { color: "black", opacity: 0.5, stroke: true });
            this._drawLayer();
		}
	},

	setContent: function (area, coord) {
		if (!this._distancePopup) {
			this._distancePopup = new L.Popup(this.options, this);
		}

		this._distancePopup.setContent("<b>Area: </b></br>"+area.toFixed(2)+" km²");
		this._distancePopup.setLatLng(coord);
	}
});
