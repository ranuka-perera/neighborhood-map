"use strict";
var model = new (function () {
    var self = this;
    // This observable holds the current map coordinates. Updatimg it updates the googlemap location.
    self.centerLocation = ko.observable({lat: 6.9255413357207045, lng: 79.86969523291009}, {persist: 'centerLocation'});
    //// This observable holds the info text about the current map coordinates.
    //self.centerText = ko.pureComputed(function () {
    //    var center = self.centerLocation();
    //    return "Latitude: " + center.lat + ", Longitude: " + center.lng;
    //});
    // This observableArray holds the image objects from instagram.
    self.images = ko.observableArray();
    // This observable holds the text about all the current locations from the images observableArray.
    self.locationText = ko.pureComputed(function () {
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
            return "(" + (fullLength - filteredLength).toString() + "/" + fullLength + " filtered out) " + filteredText;
        }
    });
    // This observable holds the filter text to filter the displayed values.
    self.filterValue = ko.observable();
    self.filterTypeAhead = ko.pureComputed(function () {
        return self.images().map(function (image) {
            return image.markerData.name;
        });
    });
    // Updating the observable properties in this object changes the notification message/style.
    self.notification = {
        message: ko.observable(),
        messageStatus: ko.observable(),  // 0 is hidden, 1 is ok, 2 is warning, 3 is error.
        messageClass: ko.pureComputed(function () {
            var returnVal;
            switch (self.notification.messageStatus()) {
                case 0:
                    returnVal = 'none';
                    break;
                case 1:
                    returnVal = 'completed';
                    break;
                case 2:
                    returnVal = 'loading';
                    break;
                case 3:
                    returnVal = 'error';
                    break;
            }
            return returnVal;
        })
    };
})();

//- The main class that gets 'run'. Holds the magic functions to make them all work.
var mainController = new (function () {
    //- Nice comfy closure to access this. 'self' is also used in python, so added bonus.
    var self = this;
    // Function to run to update the model.images observable after we get the instagram data.
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
                    // When this observable changes to false, the marker is automatically hidden from the map.
                    display: ko.observable(true)
                });
        });
        model.images(new_data);
    };

    self.init = function () {
        //Glue the model center location to google map center.
        model.centerLocation.subscribe(function (newCenter) {
            googleMapViewModel.map.setCenter(newCenter);
            googleMapViewModel.map.setZoom(13);
        });
        // Hide infowindow when typing info the filter.
        model.filterValue.subscribe(function () {
            googleMapViewModel.infowindow.close();
        });

        // Glue the model to the instagram api calling.
        model.centerLocation.subscribe(function (newCenter) {
            instagramController.getImages(newCenter, self.updateImages);
        });

        // Glue the model image array change to updating googleMap markers.
        model.images.subscribe(function (data) {
            if (data.length < 1) {
                return;
            }
            googleMapViewModel.clearMarkers();
            data.forEach(function (imageObject) {
                // Marker icon data.
                var iconData = imageObject.markerData;
                googleMapViewModel.addMarker(iconData.location, iconData.thumb, iconData.image, imageObject.display, iconData.name);
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

var googleMapViewModel = {
    mapsApiKey: 'AIzaSyAgwbgTQdWFwEBCqiRae0pG4c8xyY2lNAQ',
    mapsUrl: "https://maps.googleapis.com/maps/api/js?key=API_KEY&libraries=places&callback=googleMapViewModel.initMap",
    map: null,
    markers: [],
    infowindow: null,
    // initMap is called by the javascript in the index.html file.
    initMap: function () {
        var self = this;
        self.map = new google.maps.Map(document.getElementById('map'), {
            center: model.centerLocation(),
            zoom: 13,
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
        // Initialize infoWindow.
        self.infowindow = new google.maps.InfoWindow();
        self.infowindow.addListener('closeclick', function () {
            googleMapViewModel.stopMarkerAnimations();
        });
        // Calling location update once to trigger instagram on initial load.
        model.centerLocation(model.centerLocation());

    },
    addMarker: function (location, thumb_image, image, display, text) {
        var map = googleMapViewModel.map;
        var marker = new google.maps.Marker({
            position: location,
            map: display() ? googleMapViewModel.map : null,
            // instagram api completes before the map is loaded, so this animation might sometimes not be displayed.
            animation: google.maps.Animation.DROP,
            icon: {url: thumb_image, scaledSize: new google.maps.Size(75, 75)}
        });
        googleMapViewModel.markers.push(marker);
        marker.addListener('click', function () {
            // Clear animations in all markers;
            googleMapViewModel.stopMarkerAnimations();
            // Set animation in currect marker.
            marker.setAnimation(google.maps.Animation.BOUNCE);
            // Update infowindow.
            googleMapViewModel.infowindow.setContent(
                '<p><span class="info-title">' + text + '</span></p><p>' +
                '<img class="info-image" alt="Marker image" src="' + image + '"></p>');
            googleMapViewModel.infowindow.open(map, marker);
        });
        display.subscribe(function (newDisplayVal) {
            if (newDisplayVal) {
                marker.setMap(googleMapViewModel.map);
            }
            else {
                marker.setMap(null);
            }
        });
    },
    clearMarkers: function () {
        googleMapViewModel.markers.forEach(function (marker) {
            marker = null;
        });
        googleMapViewModel.markers = [];
    },
    stopMarkerAnimations: function () {
        googleMapViewModel.markers.forEach(function (marker) {
            marker.setAnimation(null);
        });
    }
};
googleMapViewModel.mapsUrl = googleMapViewModel.mapsUrl.replace("API_KEY", googleMapViewModel.mapsApiKey);

var instagramController = {
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
                model.notification.message('Data loaded from Instagram.');
                model.notification.messageStatus(1);
                setTimeout(function () {model.notification.message(''); model.notification.messageStatus(0);}, 3000);
                //console.log(data.data);
                callback(data.data);
            },
            error: function () {
                console.log('Failed to make insta api call.');
                model.notification.message('Instagram api call failed.');
                model.notification.messageStatus(3);
                errorCallback();
            }
        });

        model.notification.message('Loading data from Instagram.');
        model.notification.messageStatus(2);
        console.log('instagram api call made.');
    }
};

mainController.init();