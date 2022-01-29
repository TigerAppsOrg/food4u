function initFormMap() {
    formMap = new google.maps.Map(document.getElementById("map_canvas"), {
        zoom: 17,
        center: princetonCoords,
        clickableIcons: false,
        streetViewControl: false
    });


    function showDefaultPositionForm() {
        formMarker = new google.maps.Marker({
            position: princetonCoords,
            map: formMap,
            icon: {
                url: "/static/images/original_orange_logo_poster_mini.png",
                scaledSize: new google.maps.Size(66, 51),
            }
        });
        openHelpBox(formMarker, formMap);
        lat.value = princetonCoords.lat;
        lng.value = princetonCoords.lng;
    }


    const formInfowindow = new google.maps.InfoWindow;
    window.formInfowindow = formInfowindow;


    function openHelpBox(marker, map) {
        const contentString =
            '<div id="content">' +
            '<h4 style="text-align: center" id="firstHeading" class="firstHeading">' +
            'Click or tap on the location of your current ' +
            'free food event' +
            '</h4>' +
            "</div>";


        formInfowindow.setContent(contentString);

        formInfowindow.open({
            anchor: formMarker,
            map: formMap,
            shouldFocus: false,
        });

    }


    google.maps.event.addListener(
        formMap,
        'click',
        function () {
            document.getElementById('lat').value = formMarker.position.lat().toFixed(6);
            document.getElementById('lng').value = formMarker.position.lng().toFixed(6);
        }
    );

    // Configure the click listener.
    formMap.addListener("click", (mapsMouseEvent) => {
        if (!formMarker || !formMarker.setPosition) {
            formMarker = new google.maps.Marker({
                position: mapsMouseEvent.latLng,
                map: formMap,
                icon: {
                    url: "/static/images/original_orange_logo_poster_mini.png",
                    scaledSize: new google.maps.Size(66, 51),
                }
            });
            formInfowindow.close();
        } else {
            formMarker.setPosition(mapsMouseEvent.latLng);
            formInfowindow.close();
        }
        let coordDict = mapsMouseEvent.latLng.toJSON()
        lat.value = coordDict["lat"]
        lng.value = coordDict["lng"]
    });

    showDefaultPositionForm();
}

function initEditFormMap() {
    editFormMap = new google.maps.Map(document.getElementById("map_canvas_edit"), {
        zoom: 17,
        center: princetonCoords,
        clickableIcons: false
    });


    const formEditInfowindow = new google.maps.InfoWindow;
    window.formEditInfowindow = formEditInfowindow;

    editFormMarker = new google.maps.Marker({
        map: editFormMap,
        icon: {
            url: "/static/images/original_orange_logo_poster_mini.png",
            scaledSize: new google.maps.Size(66, 51),
        }
    });
    formEditInfowindow.close();

    // Configure the click listener.
    editFormMap.addListener("click", (mapsMouseEvent) => {
        editFormMarker.setPosition(mapsMouseEvent.latLng);
        formEditInfowindow.close();
        let coordDict = mapsMouseEvent.latLng.toJSON()
        lat.value = coordDict["lat"]
        lng.value = coordDict["lng"]
    });

    google.maps.event.addListener(
        editFormMap,
        'click',
        function () {
            $('#edit_lat').val(editFormMarker.position.lat().toFixed(6));
            $('#edit_lng').val(editFormMarker.position.lng().toFixed(6));
        }
    );
}

function initMap() {
    main_map = new google.maps.Map(document.getElementById('map'), {
        zoom: 16,
        center: princetonCoords,
        clickableIcons: false,
        streetViewControl: false
    })

    google.maps.event.addListener(main_map, 'click', function (event) {
        infoWindow.close();
    });

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(showCurrentPositionMain);
    }

    window.infoWindow = new google.maps.InfoWindow();

    window.oms = new OverlappingMarkerSpiderfier(main_map, {
        markersWontMove: false,
        markersWontHide: false,
        basicFormatEvents: true,
        nearbyDistance: 20,
        circleFootSeparation: 80,
        keepSpiderfied: true,
        ignoreMapClick: true
    });

    populateInitMarkers(events);

    initFormMap();

    initEditFormMap();
}

// updates current user's location every second
function getCurrentLocationMainMap() {
    if (navigator.geolocation) {
        navigator.geolocation
            .getCurrentPosition(showCurrentPositionMainMap);
    }
}

function showCurrentPositionMainMap(position) {
    if (currentLocationMainMarker === null) {
        //pass
    } else {
        currentLocationMainMarker.setPosition({lat: position.coords.latitude, lng: position.coords.longitude});
    }
}

function centerMap(position) {
    if (currentLocationMainMarker === null) {
        main_map.setCenter(princetonCoords)
    } else {
        main_map.setCenter(currentLocationMainMarker.position)
    }
}