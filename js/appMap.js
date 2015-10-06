var viewModelClass = function () {
    var self = this;
    self.centerLocation = ko.observable({lat: 6.8936738, lng: 79.855619});

    self.centerText = ko.computed(function () {
        var center = self.centerLocation();
        return "Latitude: " + center.lat + ", Longitude: " + center.lng;
    });
    self.centerLocation.subscribe(function (newCenter) {
        var insta_api = (
        "https://api.instagram.com/v1/media/search?lat=" + newCenter.lat + "&lng=" + newCenter.lng +
        "&distance=5000&client_id=930a18ab1206433e8c877070ab636404");
        $.get(insta_api, function (data) {
            console.log(data);
        } ).fail(function () {
            console.log('Failed to make insta api call.');
        })
    });
};

var googleMap = {
    mapsApiKey: 'AIzaSyAgwbgTQdWFwEBCqiRae0pG4c8xyY2lNAQ',
    mapsUrl: "https://maps.googleapis.com/maps/api/js?key=API_KEY&libraries=places&callback=googleMap.initMap",
    map: undefined,
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
        var autocomplete = new google.maps.places.Autocomplete(inp);

        autocomplete.addListener('place_changed', function () {
            var place = autocomplete.getPlace();
            if (!place.geometry) {
                console.log('Invalid place.');
                return;
            }
            viewModel.centerLocation({lat: place.geometry.location.H, lng: place.geometry.location.L});
            self.map.setCenter(viewModel.centerLocation());
            self.map.setZoom(15);

        });
    }
};
googleMap.mapsUrl = googleMap.mapsUrl.replace("API_KEY", googleMap.mapsApiKey);

var viewModel = new viewModelClass();
ko.applyBindings(viewModel);