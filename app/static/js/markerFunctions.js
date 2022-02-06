function getCurrentEventIDs(markersArray) {
    let markerIDs = new Set();
    for (let i = 0; i < markersArray.length; i++) {
        markerIDs.add(markersArray[i].get('event_id'));
    }
    return markerIDs;
}

function populateInitMarkers(events) {
    let currentMarkerIDs = getCurrentEventIDs(allMarkers);
    for (let i = 0; i < events.length; i++) {
        if (!(currentMarkerIDs.has(events[i].id))) {
            addMarker(events[i]);
        }
    }
}

function populateAdditionalMarkers(events) {
    let currentMarkerIDs = getCurrentEventIDs(allMarkers);
    for (let i = 0; i < events.length; i++) {
        let event_id = events[i].id;
        let event_net_id = events[i].net_id;
        if (!(currentMarkerIDs.has(event_id))) {
            addMarker(events[i]);
            setTimeout(notyf.open.bind(notyf, {
                type: "new-food",
                message: "A free food event titled \"" + events[i].title + "\" has just been added to the map by " +
                    event_net_id
            }), 1000)

            if (events[i].username === event_net_id) {
                setTimeout(clickMarkerByEventID.bind(null, event_id), 1000);
            }
        }
    }
}

function loadEventImages(marker) {
    let markerEventPicturesDict = marker.get("event_pictures");
    let markerEventID = marker.get("event_id");
    $.each(markerEventPicturesDict, function (pictureName, pictureURL) {
        loadEventImage(pictureURL, markerEventID)

    })
}

function loadEventImage(eventPictureURL, eventID) {
    loadImage(eventPictureURL.replace(/^http:\/\//i, 'https://'), '#images_' + eventID)
}

function removeEventImage(eventPictureURL) {
    removeImage(eventPictureURL);
}

// Loads associated event images
function loadImage(path, target) {
    $('<img src="' + path + ' "style="width:100%;max-width:310px;margin-top:2%" class="image">')
        .on('load', function () {
            $(this).appendTo(target);
            $(this).on("click", function () {
                modalImg.style.display = "block";
                modalImgContent.src = this.src;
            });
        });
}

function removeImage(path) {
    let public_id = path.split('/').pop().split('.')[0];
    modalImgContent.src = "#";
    $("img[src*=" + public_id + "]").remove();
}

// Sets initial form marker location and current location after button click on 'Add Free Food' and
// 'Use My Current Location'
function getCurrentLocationInitForm() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(showCurrentPositionFormInitForm, showDefaultPositionFormInitForm);
    } else {
        notyf.open({type: "warning", message: "Locating current location is not supported by this browser."});
    }
}

function getCurrentLocationEditForm() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(showCurrentPositionFormEditForm, showDefaultPositionFormEditForm);
    } else {
        notyf.open({type: "warning", message: "Locating current location is not supported by this browser."});
    }
}

function showCurrentPositionFormInitForm(position) {
    if ((40.33 < position.coords.latitude && position.coords.latitude < 40.357) &&
        (-74.67855 < position.coords.longitude && position.coords.longitude < -74.628)) {
        formMarker.setPosition({lat: position.coords.latitude, lng: position.coords.longitude});
        formMap.setCenter(formMarker.getPosition());
        formInfowindow.close();
    } else {
        showDefaultPositionFormInitForm();
    }
}

function showCurrentPositionFormEditForm(position) {
    if ((40.33 < position.coords.latitude && position.coords.latitude < 40.357) &&
        (-74.67855 < position.coords.longitude && position.coords.longitude < -74.628)) {
        editFormMarker.setPosition({lat: position.coords.latitude, lng: position.coords.longitude});
        editFormMap.setCenter(editFormMarker.getPosition());
        formEditInfowindow.close();
    } else {
        showDefaultPositionFormEditForm();
    }
}

function showDefaultPositionFormInitForm() {
    formMarker.setPosition(princetonCoords);
    formMap.setCenter(formMarker.getPosition());
    notyf.open({
        type: "warning",
        message: "Current location is not on Princeton University's campus. " +
            "Defaulted to Princeton University's Frist Campus Center."
    });
    formInfowindow.close();
}

function showDefaultPositionFormEditForm() {
    editFormMarker.setPosition(princetonCoords);
    editFormMap.setCenter(editFormMarker.getPosition());
    notyf.open({
        type: "warning",
        message: "Could not detect your current location. " +
            "Defaulted to Princeton University's Frist Campus Center."
    });
    formEditInfowindow.close();
}


// Adds a marker to the given map with the event data
function addMarker(event) {
    let img = {
        url: event.icon,
        scaledSize: new google.maps.Size(66, 51),
    };

    let marker = new google.maps.Marker({
        position: {lat: event.latitude, lng: event.longitude},
        title: event.title,
        icon: img
    })

    marker.set("event_id", event.id);
    marker.set("event_title", event.title);
    marker.set("event_building", event.building);
    marker.set("event_room", event.room);
    marker.set("event_description", event.description);
    marker.set("event_end_time", event.end_time);
    marker.set("event_remaining_minutes", event.remaining);
    marker.set("event_latitude", event.latitude);
    marker.set("event_longitude", event.longitude);

    let pictureDict = {};
    for (let i = 0; i < event.pictures.length; i++) {
        let pictureURL = event.pictures[i][0];
        let pictureName = event.pictures[i][1];
        pictureDict[pictureName + '-' + i] = pictureURL;
    }
    marker.set("event_pictures", pictureDict);
    allMarkers.push(marker);


    let isPoster = false;
    let infoWindowInfo = null;

    if (event.username === event.net_id) {
        isPoster = true;
        // provides separate views for poster and consumers
        fetch('/get_infowindow_poster?' +
            '&event_id=' + event.id)
            .then(response => response.text()).then(data => {
            infoWindowInfo = data;
        });
    } else {
        fetch('/get_infowindow_consumer?' +
            '&event_id=' + event.id)
            .then(response => response.text()).then(data => {
            infoWindowInfo = data;
        });
    }

    marker.addListener("spider_click", () => {

        infoWindow.close();

        // logic provides sensible timeliness information
        let endTime = marker.get("event_end_time")
        const endDate = new Date(endTime);

        let offset = endDate.getTimezoneOffset() * 60 * 1000;
        let withOffset = endDate.getTime();

        let endTimeMilliSeconds = withOffset - offset

        const time_remaining = getTimeRemaining(endTime);
        const remaining_time_message = time_remaining.total > 0 ? "<strong>" +
            (time_remaining.hours + "h "
                + time_remaining.minutes + "m " + time_remaining.seconds + "s " + " " +
                "remaining for event") + "</strong>" :
            "<strong>" + "This event has ended.<br>We hope you got some of the good food!" + "</strong>";
        const tenMinsAfterPresent = ((new Date()).getTime() + 10 * 60 * 1000);
        const threeHoursAfterPresent = ((new Date()).getTime() + 3 * 60 * 60 * 1000);
        // if there are less than 10 minutes remaining then event cannot be flagged
        const showSuffixButton = endTimeMilliSeconds > tenMinsAfterPresent;
        const maxExtensionMinutes = Math.floor((threeHoursAfterPresent - endTimeMilliSeconds) / (60 * 1000));

        // provides separate views for poster and consumers
        if (isPoster) {
            infoWindow.setContent(infoWindowInfo);
            google.maps.event.addListener(infoWindow, 'domready', function () {
                $('#remaining_time_' + event.id).html(remaining_time_message);
                $('#durationOfExtension').attr({
                    "max": maxExtensionMinutes,
                });
                $("#editButton").click(function () {
                    let event_id = $(this).data("event-id");
                    prePopulateEditForm(event_id);
                    dropzoneEdit(event_id);
                });
                loadEventImages(marker);
            });
        } else {
            infoWindow.setContent(infoWindowInfo);
            google.maps.event.addListener(infoWindow, 'domready', function () {
                $('#remaining_time_' + event.id).html(remaining_time_message);
                loadEventImages(marker);
            });
        }

        infoWindow.setPosition({lat: marker.getPosition().lat(), lng: marker.getPosition().lng()});
        infoWindow.open(main_map);
    })
    oms.addMarker(marker)
}

function modifyMarkerOnClick(associatedEvent, associatedMarker) {
    // removes previous onClick event
    associatedMarker.unbind("spider_click");

    let isPoster = false;
    let infoWindowInfo = null;

    if (associatedEvent.username === associatedEvent.net_id) {
        isPoster = true;
        // provides separate views for poster and consumers
        fetch('/get_infowindow_poster?' +
            '&event_id=' + associatedEvent.id)
            .then(response => response.text()).then(data => {
            infoWindowInfo = data;
        });
    } else {
        fetch('/get_infowindow_consumer?' +
            '&event_id=' + associatedEvent.id)
            .then(response => response.text()).then(data => {
            infoWindowInfo = data;
        });
    }

    associatedMarker.addListener("spider_click", () => {

        infoWindow.close();

        // logic provides sensible timeliness information
        let endTime = associatedMarker.get("event_end_time")
        const endDate = new Date(endTime);

        let offset = endDate.getTimezoneOffset() * 60 * 1000;
        let withOffset = endDate.getTime();

        let endTimeMilliSeconds = withOffset - offset

        const time_remaining = getTimeRemaining(endTime);
        const remaining_time_message = time_remaining.total > 0 ? "<strong>" +
            (time_remaining.hours + "h "
                + time_remaining.minutes + "m " + time_remaining.seconds + "s " + " " +
                "remaining for event") + "</strong>" :
            "<strong>" + "This event has ended.<br>We hope you got some of the good food!" + "</strong>";
        const tenMinsAfterPresent = ((new Date()).getTime() + 10 * 60 * 1000);
        const threeHoursAfterPresent = ((new Date()).getTime() + 3 * 60 * 60 * 1000);
        // if there are less than 10 minutes remaining then event cannot be flagged
        const showSuffixButton = endTimeMilliSeconds > tenMinsAfterPresent;
        const maxExtensionMinutes = Math.floor((threeHoursAfterPresent - endTimeMilliSeconds) / (60 * 1000));

        // provides separate views for poster and consumers
        if (isPoster) {
            infoWindow.setContent(infoWindowInfo);
            google.maps.event.addListener(infoWindow, 'domready', function () {
                $('#remaining_time_' + associatedEvent.id).html(remaining_time_message);
                $('#durationOfExtension').attr({
                    "max": maxExtensionMinutes,
                });
                $("#editButton").click(function () {
                    let event_id = $(this).data("event-id");
                    prePopulateEditForm(event_id);
                    dropzoneEdit(event_id);
                });
            });
        } else {
            infoWindow.setContent(infoWindowInfo);
            google.maps.event.addListener(infoWindow, 'domready', function () {
                $('#remaining_time_' + associatedEvent.id).html(remaining_time_message);
            });
        }


        loadEventImages(associatedMarker);


        infoWindow.setPosition({lat: associatedMarker.getPosition().lat(), lng: associatedMarker.getPosition().lng()});
        infoWindow.open(main_map);

    })
}

function findMarkerByEventID(event_id) {
    for (let i = 0; i < allMarkers.length; i++) {
        let foundMarker = allMarkers[i]
        if (event_id === foundMarker.get('event_id')) {
            return foundMarker;
        }
    }
    return null;
}

function clickMarkerByEventID(event_id) {
    let marker = findMarkerByEventID(event_id);
    google.maps.event.trigger(marker, 'click');
    if (marker._omsData !== undefined) {
        // another click
        google.maps.event.trigger(marker, 'click');
    }
}

function updateMarkers(events) {
    for (let i = 0; i < allMarkers.length; i++) {
        let found = false;
        let foundMarker = allMarkers[i]
        for (let j = 0; j < events.length; j++) {
            let foundEvent = events[j];
            if (foundEvent.id === foundMarker.get('event_id')) {
                found = true;
                // If end_time is different, update
                if (foundMarker.get("event_end_time") !== foundEvent.end_time) {
                    foundMarker.set("event_end_time", foundEvent.end_time);
                }
                if (foundMarker.title !== foundEvent.title) {
                    foundMarker.setTitle(foundEvent.title);
                    $("#event_title_" + foundEvent.id).text(foundEvent.title);
                    foundMarker.set("event_title", foundEvent.title);
                }
                if (foundMarker.get("event_building") !== foundEvent.building) {
                    foundMarker.set("event_building", foundEvent.building);
                    $("#event_building_" + foundEvent.id).text(foundEvent.building);
                    foundMarker.set("event_building", foundEvent.building);
                }
                if (foundMarker.get("event_room") !== foundEvent.room) {
                    foundMarker.set("event_room", foundEvent.room);
                    $("#event_room_" + foundEvent.id).text(foundEvent.room);
                    foundMarker.set("event_room", foundEvent.room);
                }
                if (foundMarker.get("event_description") !== foundEvent.description) {
                    foundMarker.set("event_description", foundEvent.description);
                    if (foundEvent.description === 'N/A') {
                        $('.descriptionOptional').empty();
                    } else if ($('.descriptionOptional').children().length === 0) {
                        $('.descriptionOptional').append("<div>Description: <strong><div id=\"event_description_" +
                            String(foundEvent.id) + "\">" + foundEvent.description + "</div></strong></div>");
                        $("#event_description_" + foundEvent.id).text(foundEvent.description);
                    } else {
                        $("#event_description_" + foundEvent.id).text(foundEvent.description);
                    }
                    foundMarker.set("event_description", foundEvent.description);
                }
                if ((foundMarker.get("event_latitude") !== foundEvent.latitude ||
                    foundMarker.get("event_longitude") !== foundEvent.longitude)) {
                    foundMarker.set("event_latitude", foundEvent.latitude);
                    foundMarker.set("event_longitude", foundEvent.longitude);
                    foundMarker.setPosition({lat: foundEvent.latitude, lng: foundEvent.longitude});
                }
                if (foundMarker.icon.url !== foundEvent.icon) {
                    let img = {
                        url: foundEvent.icon,
                        scaledSize: new google.maps.Size(66, 51),
                    };
                    foundMarker.setIcon(img);
                    // handles get directions button dynamically when infowindow is open
                    if (foundMarker.icon.url === "/static/images/red_logo_mini.png") {
                        $('#directionsButton_' + foundEvent.id).remove();
                    } else if ($('#directionsOptional_' + foundEvent.id).children().length === 0) {
                        $('#directionsOptional_' + foundEvent.id).append('                <a id="directionsButton_"\n' +
                            foundEvent.id +
                            '                   href="https://www.google.com/maps/dir/?api=1&destination=' +
                            foundEvent.latitude +
                            ',' + foundEvent.longitude + '{{ event.longitude }}"\n' +
                            '                   target="_blank"\n' +
                            '                   class="btn btn-primary">\n' +
                            '                    Get Directions\n' +
                            '                </a>')
                    }
                    // handles flag button dynamically when infowindow is open
                    if (foundMarker.icon.url !== "/static/images/green_logo_mini.png") {
                        $('#suffix_button_' + foundEvent.id).empty();
                    } else if ($('#suffix_button_' + foundEvent.id).children().length === 0) {
                        $('#suffix_button_' + foundEvent.id).append('<form action="/handleEventFlag" ' +
                            'id="flagForm" method="post" enctype="multipart/form-data">\n' +
                            '                <input type="text" class="input-hidden" id="idForFlagging" ' +
                            'name="idForFlagging" value="' + foundEvent.id + '">\n' +
                            '            </form>\n' +
                            '            <button type="submit" id="flagButton" form="flagForm" ' +
                            'class="btn btn-primary" onclick="flagWithoutRefresh();' +
                            ' return false">\n' +
                            '                Flag This Event As Ending\n' +
                            '            </button>')
                    }
                    // Also changes the infowindow content, so it can display the content
                    // when the infowindow is reopened
                    modifyMarkerOnClick(foundEvent, foundMarker);
                }
                let currentMarkerPictureDict = foundMarker.get("event_pictures");
                let eventPictureDict = {};
                let currentMarkerPictureSet = new Set();
                $.each(currentMarkerPictureDict, function (pictureName, pictureURL) {
                    currentMarkerPictureSet.add(pictureURL);
                })
                let eventPictureSet = new Set();
                for (let i = 0; i < foundEvent.pictures.length; i++) {
                    let pictureURL = foundEvent.pictures[i][0];
                    let pictureName = foundEvent.pictures[i][1];
                    eventPictureDict[pictureName + '-' + i] = pictureURL;
                    eventPictureSet.add(pictureURL);
                }
                let areSetsEqual = (a, b) => a.size === b.size && [...a].every(value => b.has(value));
                if (!areSetsEqual(currentMarkerPictureSet, eventPictureSet)) {
                    // Current set minus incoming event set
                    let toBeRemovedPictureURLs = Array.from(new Set(
                        [...currentMarkerPictureSet].filter(x => !eventPictureSet.has(x))));
                    // Incoming event set minus current set
                    let tobeAddedPictureURLs = Array.from(new Set(
                        [...eventPictureSet].filter(x => !currentMarkerPictureSet.has(x))));
                    for (let i = 0; i < toBeRemovedPictureURLs.length; i++) {
                        removeEventImage(toBeRemovedPictureURLs[i]);
                    }
                    for (let i = 0; i < tobeAddedPictureURLs.length; i++) {
                        loadEventImage(tobeAddedPictureURLs[i], foundEvent.id);
                    }
                    foundMarker.set("event_pictures", eventPictureDict);
                }
                break;
            }
        }
        // IF not in events, set marker to be invisible and change time remaining of infowindow to
        // say "This event has ended..."
        if (!found) {
            foundMarker.setMap(null);
            foundMarker.set("event_end_time", "1970-01-01T00:00:00.000000");
        }
    }
}

function showCurrentPositionMain(position) {
    if ((40.33 < position.coords.latitude && position.coords.latitude < 40.357) &&
        (-74.67855 < position.coords.longitude && position.coords.longitude < -74.628)) {
        currentLocationMainMarker = new google.maps.Marker({
            position: {lat: position.coords.latitude, lng: position.coords.longitude},
            title: 'Current Location',
            map: main_map,
            icon: {
                path: google.maps.SymbolPath.CIRCLE,
                scale: 10,
                fillOpacity: 1,
                strokeWeight: 2,
                fillColor: '#5384ED',
                strokeColor: '#ffffff',
            },
        });
        centerMap(position);
    }
}

function setCommonBuilding(event, form) {
    var value = event.currentTarget.value;

    let commonCoords = null;
    if (value === 'Butler College') {
        commonCoords = {lat: 40.343976045616934, lng: -74.65633457372397};
    } else if (value === 'Campus Club') {
        commonCoords = {lat: 40.34759851090708, lng: -74.65444991836445};
    } else if (value === 'Carl A. Fields Center') {
        commonCoords = {lat: 40.349153790790474, lng: -74.65177169580478};
    } else if (value === 'Center for Jewish Life') {
        commonCoords = {lat: 40.34668462786897, lng: -74.65361797205118};
    } else if (value === 'EQuad') {
        commonCoords = {lat: 40.350711753138256, lng: -74.65050890117351};
    } else if (value === 'Fine Hall') {
        commonCoords = {lat: 40.34579955055668, lng: -74.65236397231686};
    } else if (value === 'First College') {
        commonCoords = {lat: 40.34478352718533, lng: -74.65610057205218};
    } else if (value === 'Friend Center') {
        commonCoords = {lat: 40.35030090667399, lng: -74.65274518999759};
    } else if (value === 'Frist Campus Center') {
        commonCoords = {lat: 40.34691702328191, lng: -74.65530646968027};
    } else if (value === 'Green Hall') {
        commonCoords = {lat: 40.34956080912481, lng: -74.65595567330864};
    } else if (value === 'Lewis Library') {
        commonCoords = {lat: 40.34610602786555, lng: -74.65264530091227};
    } else if (value === 'Mathey College') {
        commonCoords = {lat: 40.347777407020686, lng: -74.66143412554321};
    } else if (value === 'Murray-Dodge Hall') {
        commonCoords = {lat: 40.34796187587709, lng: -74.65781638535157};
    } else if (value === 'Rocky College') {
        commonCoords = {lat: 40.348501551479494, lng: -74.66218745569728};
    } else if (value === 'Whitman College') {
        commonCoords = {lat: 40.34415029916429, lng: -74.65822212183382};
    }

    if (commonCoords !== null) {
        if (form === "input") {
            formMarker.setPosition(commonCoords);
            formMap.setCenter(formMarker.getPosition());
            $("#lat").val(commonCoords.lat);
            $("#lng").val(commonCoords.lng);
            window.formInfowindow.close();
        } else if (form === "edit") {
            editFormMarker.setPosition(commonCoords);
            editFormMap.setCenter(editFormMarker.getPosition());
            $("#edit_lat").val(commonCoords.lat);
            $("#edit_lng").val(commonCoords.lng);
            window.formEditInfowindow.close();
        }
    }
}
