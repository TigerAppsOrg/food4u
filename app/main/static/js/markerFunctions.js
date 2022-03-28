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

function populateAdditionalMarkers(incomingEvents) {
    let currentMarkerIDs = getCurrentEventIDs(allMarkers);
    for (let i = 0; i < incomingEvents.length; i++) {
        let event_id = incomingEvents[i].id;
        let event_net_id = incomingEvents[i].net_id;
        if (!(currentMarkerIDs.has(event_id))) {
            addMarker(incomingEvents[i]);
            setTimeout(notyf.open.bind(notyf, {
                type: "new-food",
                message: "A free food event titled \"" + incomingEvents[i].title + "\" has just been added to the map by " +
                    event_net_id
            }), 1000)

            if (username === event_net_id) {
                setTimeout(clickMarkerByEventID.bind(null, event_id), 1000);
            }
        }
    }
}

function removeEventImage(eventPictureURL) {
    removeImage(eventPictureURL);
}


// Loads associated event images
function loadEventImages(marker) {
    let dynamicHeight = Math.ceil(Math.random() * 30) + 100;
    let listenerHandle = marker.get("listenerHandle");
    if (listenerHandle === undefined) {
        listenerHandle = google.maps.event.addListener(infoWindow, 'domready', function () {
            let markerEventPicturesDict = marker.get("event_pictures");
            let markerEventID = marker.get("event_id");
            $.each(markerEventPicturesDict, function (pictureName, pictureURL) {
                let imageTag = $('<img src="' + pictureURL.replace(/^http:\/\//i, 'https://') + ' "style="height=' +
                    dynamicHeight + 'px;width:100%;max-width:310px;margin-top:2%" class="image elem">');
                imageTag.appendTo('#images_' + markerEventID);
                imageTag.on("click", function () {
                    modalImg.style.display = "block";
                    modalImgContent.src = this.src;
                });
            })
        });
        marker.set("listenerHandle", listenerHandle);
    } else {
        google.maps.event.removeListener(listenerHandle);
        listenerHandle = google.maps.event.addListener(infoWindow, 'domready', function () {
            let markerEventPicturesDict = marker.get("event_pictures");
            let markerEventID = marker.get("event_id");
            $.each(markerEventPicturesDict, function (pictureName, pictureURL) {
                let imageTag = $('<img src="' + pictureURL.replace(/^http:\/\//i, 'https://') + ' "style="height=' +
                    dynamicHeight + 'px;width:100%;max-width:310px;margin-top:2%" class="image elem">');
                imageTag.appendTo('#images_' + markerEventID);
                imageTag.on("click", function () {
                    modalImg.style.display = "block";
                    modalImgContent.src = this.src;
                });
            })
        });
        marker.set("listenerHandle", listenerHandle);
    }
}

function loadImagesWhileInfoWindowIsOpen(marker) {
    let dynamicHeight = Math.ceil(Math.random() * 30) + 100;
    let markerEventPicturesDict = marker.get("event_pictures");
    let markerEventID = marker.get("event_id");
    $.each(markerEventPicturesDict, function (pictureName, pictureURL) {
        let imageTag = $('<img src="' + pictureURL.replace(/^http:\/\//i, 'https://') + ' "style="height=' +
            dynamicHeight + 'px;width:100%;max-width:310px;margin-top:2%" class="image elem">');
        imageTag.appendTo('#images_' + markerEventID);
        imageTag.on("click", function () {
            modalImg.style.display = "block";
            modalImgContent.src = this.src;
        });
    })
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

function getIcon(color, username, net_id) {
    if (username !== net_id) {
        if (color == "green") {
            return '/main/images/green_logo_mini.png'
        } else if (color == "yellow") {
            return '/main/images/yellow_logo_mini.png'
        } else if (color == "orange") {
            return '/main/images/original_orange_logo_mini.png'
        } else {
            return '/main/images/red_logo_mini.png'
        }
    } else {
        if (color == "green") {
            return '/main/images/green_logo_poster_mini.png'
        } else if (color == "yellow") {
            return '/main/images/yellow_logo_poster_mini.png'
        } else if (color == "orange") {
            return '/main/images/original_orange_logo_poster_mini.png'
        } else {
            return '/main/images/red_logo_poster_mini.png'
        }
    }
}

// Adds a marker to the given map with the event data
function addMarker(event) {
    let img = {
        url: getIcon(event.icon, username, event.net_id),
        scaledSize: new google.maps.Size(66, 51),
    };

    let marker = new google.maps.Marker({
        position: {lat: event.latitude, lng: event.longitude},
        title: event.title,
        icon: img,
        label: {color: 'black', fontWeight: 'bold', fontSize: '22px', text: event.title, className: 'marker-label'},
    })

    marker.set("event_id", event.id);
    marker.set("event_title", event.title);
    marker.set("event_building", event.building);
    marker.set("event_room", event.room);
    marker.set("event_description", event.description);
    marker.set("event_start_time", event.start_time);
    marker.set("event_start_time_est_string", event.start_time_est_string);
    marker.set("event_end_time", event.end_time);
    marker.set("event_remaining_minutes", event.remaining);
    marker.set("event_latitude", event.latitude);
    marker.set("event_longitude", event.longitude);
    marker.set("number_of_comments", event.number_of_comments)
    marker.set("people_going", event.people_going);
    marker.set("going_percentage", event.going_percentage);
    marker.set("host_message", event.host_message);

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

    if (username === event.net_id) {
        isPoster = true;
        // provides separate views for poster and consumers
        fetchWithTimeout('/get_infowindow_poster?' +
            '&event_id=' + event.id)
            .then(response => response.text()).then(data => {
            infoWindowInfo = data;
        });
    } else {
        fetchWithTimeout('/get_infowindow_consumer?' +
            '&event_id=' + event.id)
            .then(response => response.text()).then(data => {
            infoWindowInfo = data;
        });
    }

    marker.addListener("spider_click", () => {

            infoWindow.close();

            // logic provides sensible timeliness information
            let startTime = marker.get("event_start_time");
            let endTime = marker.get("event_end_time");
            let startTimeEstString = marker.get("event_start_time_est_string");
            const endDate = new Date(endTime);

            let offset = endDate.getTimezoneOffset() * 60 * 1000;
            let withOffset = endDate.getTime();

            let endTimeMilliSeconds = withOffset - offset

            const startTimeRemaining = getTimeRemaining(startTime);
            const endTimeRemaining = getTimeRemaining(endTime);
            let remaining_time_message;
            if (startTimeRemaining.total < 0) {
                remaining_time_message = endTimeRemaining.total > 0 ? "<span class='badge badge-warning'>" +
                    (endTimeRemaining.hours + "h "
                        + endTimeRemaining.minutes + "m " + endTimeRemaining.seconds + "s " + " " +
                        "remaining for event") + "</span>" :
                    "<span class='badge badge-warning' style='white-space: pre-line'>" + "This event has ended.<br>We hope you got some of the good food!" + "</span>";
            } else {
                let event_minutes_remaining = endTimeRemaining.total - startTimeRemaining.total >= 0 ? Math.round(((endTimeRemaining.total - startTimeRemaining.total) / 1000 / 60))
                    : 0;
                remaining_time_message = "<span class='badge badge-warning' style='white-space: pre-line'>" +
                    "This event starts on \n" + startTimeEstString + " ET \n" + "lasting for " + event_minutes_remaining + " minutes" + "</span>"
            }

            const threeHoursAfterPresent = ((new Date()).getTime() + 3 * 60 * 60 * 1000);
            // if there are less than 10 minutes remaining then event cannot be flagged
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
                });
            } else {
                infoWindow.setContent(infoWindowInfo);
                google.maps.event.addListener(infoWindow, 'domready', function () {
                    $('#remaining_time_' + event.id).html(remaining_time_message);
                });
            }


            infoWindow.setPosition({lat: marker.getPosition().lat(), lng: marker.getPosition().lng()});
            infoWindow.open(main_map);

            loadEventImages(marker);
        }
    )

    oms.addMarker(marker);
}

function modifyMarkerOnClick(associatedEvent, associatedMarker) {
    // removes previous onClick event
    associatedMarker.unbind("spider_click");

    let isPoster = false;
    let infoWindowInfo = null;

    if (username === associatedEvent.net_id) {
        isPoster = true;
        // provides separate views for poster and consumers
        fetchWithTimeout('/get_infowindow_poster?' +
            '&event_id=' + associatedEvent.id)
            .then(response => response.text()).then(data => {
            infoWindowInfo = data;
        });
    } else {
        fetchWithTimeout('/get_infowindow_consumer?' +
            '&event_id=' + associatedEvent.id)
            .then(response => response.text()).then(data => {
            infoWindowInfo = data;
        });
    }

    associatedMarker.addListener("spider_click", () => {

        infoWindow.close();

        // logic provides sensible timeliness information
        let startTime = associatedMarker.get("event_start_time");
        let endTime = associatedMarker.get("event_end_time");
        let startTimeEstString = associatedMarker.get("event_start_time_est_string");
        const endDate = new Date(endTime);

        let offset = endDate.getTimezoneOffset() * 60 * 1000;
        let withOffset = endDate.getTime();

        let endTimeMilliSeconds = withOffset - offset

        const startTimeRemaining = getTimeRemaining(startTime);
        const endTimeRemaining = getTimeRemaining(endTime);
        let remaining_time_message;
        if (startTimeRemaining.total < 0) {
            remaining_time_message = endTimeRemaining.total > 0 ? "<span class='badge badge-warning'>" +
                (endTimeRemaining.hours + "h "
                    + endTimeRemaining.minutes + "m " + endTimeRemaining.seconds + "s " + " " +
                    "remaining for event") + "</span>" :
                "<span class='badge badge-warning' style='white-space: pre-line'>" + "This event has ended.<br>We hope you got some of the good food!" + "</span>";
        } else {
            let event_minutes_remaining = endTimeRemaining.total - startTimeRemaining.total >= 0 ? Math.round(((endTimeRemaining.total - startTimeRemaining.total) / 1000 / 60))
                : 0;
            remaining_time_message = "<span class='badge badge-warning' style='white-space: pre-line'>" +
                "This event starts on \n" + startTimeEstString + " ET \n" + "lasting for " + event_minutes_remaining + " minutes" + "</span>"
        }

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
                modifyMarkerOnClick(foundEvent, foundMarker);
                if (foundMarker.get("number_of_comments") !== foundEvent.number_of_comments) {
                    foundMarker.set("number_of_comments", foundEvent.number_of_comments);
                    $("#numberOfComments_" + foundEvent.id).text(foundEvent.number_of_comments);
                }
                if (foundMarker.get("people_going") !== foundEvent.people_going) {
                    foundMarker.set("people_going", foundEvent.people_going);
                    $("#attendance_info_" + foundEvent.id).find("#numberOfPeopleGoing").text(foundEvent.people_going);
                }
                if (foundMarker.get("going_percentage") !== foundEvent.going_percentage) {
                    foundMarker.set("going_percentage", foundEvent.going_percentage);
                    $("#attendance_info_" + foundEvent.id).find("#goingPercentage").text(foundEvent.going_percentage + "%");
                }
                if (foundMarker.get("host_message") !== foundEvent.host_message) {
                    foundMarker.set("host_message", foundEvent.host_message);
                    $("#attendance_info_" + foundEvent.id).find("#isHostThere").text(foundEvent.host_message);
                }
                if (foundMarker.get("event_start_time") !== foundEvent.start_time) {
                    foundMarker.set("event_start_time", foundEvent.start_time);
                    foundMarker.set("event_start_time_est_string", foundEvent.start_time_est_string);
                }
                // If end_time is different, update
                if (foundMarker.get("event_end_time") !== foundEvent.end_time) {
                    foundMarker.set("event_end_time", foundEvent.end_time);
                }
                if (foundMarker.title !== foundEvent.title) {
                    foundMarker.setTitle(foundEvent.title);
                    foundMarker.setLabel({
                        color: 'black',
                        fontWeight: 'bold',
                        fontSize: '22px',
                        text: foundEvent.title,
                        className: 'marker-label'
                    });
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
                        $('.descriptionOptional').append("<div>Description:\n<br>\n<strong>\n<div " +
                            "class=\"badge badge-info\"\nid=\"event_description_{{ event.id }}\"\nstyle=" +
                            "\"white-space: pre-line;\">" + foundEvent.description + "</div>\n</strong>\n</div>");
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
                        url: getIcon(foundEvent.icon, username, foundEvent.net_id),
                        scaledSize: new google.maps.Size(66, 51),
                    };
                    foundMarker.setIcon(img);
                    // handles get directions button dynamically when infowindow is open
                    if (foundMarker.icon.url === "/main/images/red_logo_mini.png") {
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
                    // handles going buttons dynamically when infowindow is open
                    if (foundMarker.icon.url === "/main/images/red_logo_mini.png") {
                        $('#going_line_' + foundEvent.id).remove();
                    }
                    // } else if ($('#goingLineOptional_' + foundEvent.id).children().length === 0) {
                    //     let stringToAppend = "         <span id=\"going_line_{{ event.id }}\">\n            Attending this event?\n            <span>\n                <button type=\"submit\" class=\"btn btn-success btn-xs shadow-none\"\n                        id=\"goingButton\" form=\"goingForm\" onclick=\"goingWithoutRefresh(); return false\">\n                    Yes\n                </button>\n                <button type=\"submit\" class=\"btn btn-danger btn-xs\"\n                        id=\"goingButton\" form=\"goingForm\" onclick=\"notGoingWithoutRefresh(); return false\">\n                    No\n                </button>\n            </span>\n            <div>\n                <form action=\"/handleGoing\" id=\"goingForm\" method=\"post\" enctype=\"multipart/form-data\">\n                    <input type=\"text\" class=\"input-hidden\" id=\"idForGoing\" name=\"idForGoing\"\n                           value=\"{{ event.id }}\">\n                    <input type=\"checkbox\" id=\"goingSwitch\" name=\"goingSwitch\" hidden>\n                </form>\n            </div>\n            <br>\n            </span>"
                    //     $('#goingLineOptional_' + foundEvent.id).append(stringToAppend);
                    // }
                    // handles flag button dynamically when infowindow is open
                    if (foundMarker.icon.url !== "/main/images/green_logo_mini.png" ||
                        foundMarker.icon.url !== "/main/images/original_orange_logo_mini.png") {
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
                            '                Flag This Event as Ending\n' +
                            '            </button>')
                    }
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
                    // let tobeAddedPictureURLs = Array.from(new Set(
                    //     [...eventPictureSet].filter(x => !currentMarkerPictureSet.has(x))));
                    for (let i = 0; i < toBeRemovedPictureURLs.length; i++) {
                        removeEventImage(toBeRemovedPictureURLs[i]);
                    }
                    foundMarker.set("event_pictures", eventPictureDict);
                    $("#images_" + foundMarker.get("event_id")).empty();
                    loadImagesWhileInfoWindowIsOpen(foundMarker);
                }
                break;
            }
        }
        // IF not in events, set marker to be invisible and change time remaining of infowindow to
        // say "This event has ended..."
        if (!found) {
            foundMarker.setMap(null);
            let eventID = foundMarker.get("event_id")
            foundMarker.set("event_end_time", "1970-01-01T00:00:00.000000");
            // handles get directions button dynamically when infowindow is open
            $('#directionsButton_' + eventID).remove();
            // handles flag button dynamically when infowindow is open
            $('#suffix_button_' + eventID).empty();
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
