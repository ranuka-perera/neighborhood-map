var model = new (function () {
    var self = this;
    // This observable holds the current map coordinates.
    self.centerLocation = ko.observable({lat: 6.8936738, lng: 79.855619});
    // This observable holds the info text about the current map coordinates.
    self.centerText = ko.computed(function () {
        var center = self.centerLocation();
        return "Latitude: " + center.lat + ", Longitude: " + center.lng;
    });
    // This observableArray holds the image objects from instagram.
    self.images = ko.observableArray();
    // This observable holds the text about all the current locations from the images observableArray.
    self.locationText = ko.computed(function () {
        var fullArray = self.images();
        var filteredArray = [];
        ko.utils.arrayForEach(fullArray, function (image) {
            if (image.display()) {
                filteredArray.push(image.markerData.name);
            }
        });
        var fullLength = fullArray.length;
        var filteredLength = filteredArray.length;
        var filteredText = ko.utils.arrayGetDistinctValues(filteredArray).join(' | ');
        if (fullLength > 0) {
            return "(" + fullLength - filteredLength + "/" + fullLength + " filtered out) " + filteredText;
        }
    });
    // This observable holds the filter text to filter the displayed values.
    self.filterValue = ko.observable();
})();

var mainController = new (function () {
    var self = this;
    self.updateImages = function (data) {
        model.images.removeAll();
        model.filterValue('');
        var new_data = model.images();
        data.forEach(function (item) {
            new_data.push(
                {
                    markerData: {
                        name: item.location.name,
                        location: {lat: item.location.latitude, lng: item.location.longitude},
                        thumb: item.images.thumbnail.url,
                        image: item.images.low_resolution.url
                    },
                    display: ko.observable(true)
                });
        });
        model.images(new_data);
    };
    //self.filterImages

    self.init = function () {
        //Glue the model center location to google map center.
        model.centerLocation.subscribe(function (newCenter) {
            googleMap.map.setCenter(newCenter);
            googleMap.map.setZoom(15);
        });
        // Hide infowindow when typing.
        model.filterValue.subscribe(function () {
            googleMap.infowindow.close();
        });

        // Glue the model to the instagram api calling.
        model.centerLocation.subscribe(function (newCenter) {
            instagramModel.getImages(newCenter, self.updateImages);
        });

        // Glue the model image array change to updating googleMap markers.
        model.images.subscribe(function (data) {
            if (data.length < 1) {
                return;
            }
            googleMap.clearMarkers();
            data.forEach(function (imageObject) {
                // Marker icon data.
                var iconData = imageObject.markerData;
                googleMap.addMarker(iconData.location, iconData.thumb, iconData.image, imageObject.display, iconData.name);
            })
        });

        // Filter data when the filter text is typed.
        model.filterValue.subscribe(function (filterValue) {
            var images = model.images();
            images.forEach(function (image) {
                image.display(!filterValue || image.markerData.name.toLowerCase().indexOf(filterValue.toLowerCase()) >= 0);
            });
        });

        // Bind the observables to the html.
        ko.applyBindings(model);
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
            center: model.centerLocation(),
            zoom: 15,
            mapTypeId: google.maps.MapTypeId.ROADMAP,
            streetViewControl: false,
            mapTypeControl: false
        });
        var inp = document.getElementById('search-field');
        // Use google Paces API, SearchBox for autocomplete.
        var searchBox = new google.maps.places.SearchBox(inp);

        // Set bounds so that the area displayed in the map is searched first.
        self.map.addListener('bounds_changed', function () {
            searchBox.setBounds(self.map.getBounds());
        });

        // Update model.centerLocation based on search result.
        searchBox.addListener('places_changed', function () {
            var places = searchBox.getPlaces();
            if (places.length == 0) {
                console.log('Invalid place.');
                return;
            }
            var place = places[0];
            model.centerLocation({lat: place.geometry.location.lat(), lng: place.geometry.location.lng()});

        });
        self.infowindow = new google.maps.InfoWindow();
    },
    addMarker: function (location, thumb_image, image, display, text) {
        var map = googleMap.map;
        var marker = new google.maps.Marker({
            position: location,
            map: display() ? googleMap.map : null,

            icon: {url: thumb_image, scaledSize: new google.maps.Size(75, 75)}
        });
        googleMap.markers.push(marker);
        marker.addListener('click', function () {
            googleMap.infowindow.setContent('<p><span class="info-title">' + text + '</span></p><p><img class="info-image" alt="Marker image" src="' + image + '"></p>');
            googleMap.infowindow.open(map, marker);
        });
        display.subscribe(function (newDisplayVal) {
            if (newDisplayVal) {
                marker.setMap(googleMap.map);
            }
            else {
                marker.setMap(null);
            }
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
    clientId: '930a18ab1206433e8c877070ab636404',
    getImages: function (centerLocation, callback, errorCallback) {
        var self = this;
        var insta_api = (
        "https://api.instagram.com/v1/media/search?lat=" + centerLocation.lat + "&lng=" + centerLocation.lng +
        "&distance=5000&client_id=API_KEY");
        insta_api = insta_api.replace("API_KEY", self.clientId);
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

mainController.init();