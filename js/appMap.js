var viewModel = new (function () {
    var self = this;
    // This variable holds the current map coordinates.
    self.centerLocation = ko.observable({lat: 6.8936738, lng: 79.855619});
    // This variable holds the info text about the current map coordinates.
    self.centerText = ko.computed(function () {
        var center = self.centerLocation();
        return "Latitude: " + center.lat + ", Longitude: " + center.lng;
    });

    self.images = ko.observableArray();
    self.updateImages = function(data) {
        self.images.removeAll();
        var new_data = self.images();
        data.forEach(function (item) {
            new_data.push(
                {
                    name: item.location.name,
                    location: {lat: item.location.latitude, lng: item.location.longitude},
                    thumb: item.images.thumbnail.url,
                    image: item.images.low_resolution.url
                });
        });
        self.images(new_data);
    };
})();

var googleMap = {
    mapsApiKey: 'AIzaSyAgwbgTQdWFwEBCqiRae0pG4c8xyY2lNAQ',
    mapsUrl: "https://maps.googleapis.com/maps/api/js?key=API_KEY&libraries=places&callback=googleMap.initMap",
    map: null,
    markers: [],
    infowindow: null,
    // initMap is called by the javascript in the index.html file.
    initMap: function () {
        var self = this;
        self.map = new google.maps.Map(document.getElementById('map'), {
            center: viewModel.centerLocation(),
            zoom: 15,
            mapTypeId: google.maps.MapTypeId.ROADMAP,
            streetViewControl: false,
            mapTypeControl: false
        });
        var inp = document.getElementById('search-field');
        //self.map.controls[google.maps.ControlPosition.TOP_LEFT].push(inp); // Causes input location to shift.
        var autocomplete = new google.maps.places.Autocomplete(inp);

        autocomplete.addListener('place_changed', function () {
            var place = autocomplete.getPlace();
            if (!place.geometry) {
                console.log('Invalid place.');
                return;
            }
            viewModel.centerLocation({lat: place.geometry.location.lat(), lng: place.geometry.location.lng()});
            self.map.setCenter(viewModel.centerLocation());
            self.map.setZoom(15);

        });
        self.infowindow = new google.maps.InfoWindow();
    },
    addMarker: function (location, thumb_image, image) {
        var map = googleMap.map;
        var marker = new google.maps.Marker({
            position: location,
            map: googleMap.map,
            icon: {url: thumb_image, scaledSize: new google.maps.Size(75, 75)}
        });
        googleMap.markers.push(marker);
        marker.addListener('click', function() {
            googleMap.infowindow.setContent('<img alt="Marker image" src="'+image+'">');
            googleMap.infowindow.open(map, marker);
        });
    },
    clearMarkers: function () {
        googleMap.markers.forEach(function (marker) {
            marker = null;
        });
        googleMap.markers.length = 0;
    }
};
googleMap.mapsUrl = googleMap.mapsUrl.replace("API_KEY", googleMap.mapsApiKey);

var instagramModel = {
    getImages: function(centerLocation, callback, errorCallback) {
        var insta_api = (
        "https://api.instagram.com/v1/media/search?lat=" + centerLocation.lat + "&lng=" + centerLocation.lng +
        "&distance=5000&client_id=930a18ab1206433e8c877070ab636404");
        $.ajax({
            url: insta_api,
            type: "GET",
            crossDomain: true,
            dataType: "jsonp",
            cache: true,
            success: function (data) {
                console.log(data.data);
                callback(data.data);
            },
            error: function () {
                console.log('Failed to make insta api call.');
                errorCallback();
            }
        });
        console.log('instagram api call made.');
    }
};

// Glue the viewModel to the instagram api calling.
viewModel.centerLocation.subscribe(function (newCenter) {
    instagramModel.getImages(newCenter, viewModel.updateImages);
});
viewModel.images.subscribe(function (data) {
    if (data.length < 1)
    {
        return;
    }
    googleMap.clearMarkers();
    data.forEach(function (imageObject) {
        googleMap.addMarker(imageObject.location, imageObject.thumb, imageObject.image);
    })
});
ko.applyBindings(viewModel);