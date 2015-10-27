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
                    markerData: {
                        name: item.location.name,
                        location: {lat: item.location.latitude, lng: item.location.longitude},
                        thumb: item.images.thumbnail.url,
                        image: item.images.low_resolution.url
                    },
                    display: true
                });
        });
        self.images(new_data);
    };
    self.locationText = ko.computed(function () {
        var images = self.images();
        var text_arr = [];
        images.forEach(function (image) {
            text_arr.push(image.markerData.name);
        });
        return text_arr.join(' | ');
    });
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
        // Use google Paces API, SearchBox for autocomplete.
        var searchBox = new google.maps.places.SearchBox(inp);

        // Set bounds so that the area displayed in the map is searched first.
        self.map.addListener('bounds_changed', function() {
            searchBox.setBounds(self.map.getBounds());
        });

        // Update viewModel.centerLocation based on search result.
        searchBox.addListener('places_changed', function () {
            var places = searchBox.getPlaces();
            if (places.length == 0) {
                console.log('Invalid place.');
                return;
            }
            var place = places[0];
            viewModel.centerLocation({lat: place.geometry.location.lat(), lng: place.geometry.location.lng()});

        });
        self.infowindow = new google.maps.InfoWindow();
    },
    addMarker: function (location, thumb_image, image, display, text) {
        var map = googleMap.map;
        var marker = new google.maps.Marker({
            position: location,
            map: display ? googleMap.map: null,

            icon: {url: thumb_image, scaledSize: new google.maps.Size(75, 75)}
        });
        googleMap.markers.push(marker);
        marker.addListener('click', function() {
            googleMap.infowindow.setContent('<p><span class="info-title">'+text+'</span></p><p><img class="info-image" alt="Marker image" src="'+image+'"></p>');
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
                console.log('instagram api call successful.');
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

//Glue the viewmodel to google map.
viewModel.centerLocation.subscribe(function (newCenter) {
    googleMap.map.setCenter(viewModel.centerLocation());
    googleMap.map.setZoom(15);
});

// Glue the viewModel to the instagram api calling.
viewModel.centerLocation.subscribe(function (newCenter) {
    instagramModel.getImages(newCenter, viewModel.updateImages);
});

// Glue the viewModel image array change to updating googleMap markers.
viewModel.images.subscribe(function (data) {
    if (data.length < 1)
    {
        return;
    }
    googleMap.clearMarkers();
    data.forEach(function (imageObject) {
        // Marker icon data.
        var iconData = imageObject.markerData;
        googleMap.addMarker(iconData.location, iconData.thumb, iconData.image, imageObject.display, iconData.name);
    })
});

ko.applyBindings(viewModel);