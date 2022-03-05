function getTimeRemaining(event_endtime) {
    // create Date object for current location
    var d = new Date();

    // convert to msec
    // subtract local time zone offset
    // get UTC time in msec
    var utc = d.getTime() + (d.getTimezoneOffset() * 60000);
    const endtime = new Date(event_endtime.replace(' ', 'T'));
    const total = Date.parse(endtime) - (new Date(utc));
    const seconds = Math.floor((total / 1000) % 60);
    const minutes = Math.floor((total / 1000 / 60) % 60);
    const hours = Math.floor((total / (1000 * 60 * 60)));

    return {
        total,
        hours,
        minutes,
        seconds
    };
}

function updateTime() {
    for (let i = 0; i < allMarkers.length; i++) {
        let event_endtime = allMarkers[i].get("event_end_time");
        let time_remaining = getTimeRemaining(event_endtime);
        if ((time_remaining.minutes === 10 && time_remaining.seconds === 0) ||
            (time_remaining.minutes === 0 && time_remaining.seconds === 0)) {
            socket.timeout(1000).emit("update");
        }
        const remaining_time_message = time_remaining.total > 0 ? "<span class='badge badge-warning'>" +
            (time_remaining.hours + "h "
                + time_remaining.minutes + "m " + time_remaining.seconds + "s " + " " +
                "remaining for event") + "</span>" :
            "<span class='badge badge-warning'>" + "This event has ended.<br>We hope you got some of the good food!" + "</span>"
        $("#remaining_time" + '_' + String(allMarkers[i].get('event_id'))).html(remaining_time_message);
    }
}

function prePopulateEditForm(event_id) {
    // Insert event id into hidden field of edit form
    $("#edit_event_id").val(event_id)
    $("#edit_delete_event_id").val(event_id)

    for (let i = 0; i < allMarkers.length; i++) {
        let foundMarker = allMarkers[i];
        let foundMarkerID = foundMarker.get("event_id");
        if (event_id === foundMarkerID) {

            // Edit form location insertions
            let foundLatitude = foundMarker.get("event_latitude");
            let foundLongitude = foundMarker.get("event_longitude");
            let foundLocation = {lat: foundLatitude, lng: foundLongitude};
            editFormMarker.setPosition(foundLocation);
            editFormMap.setCenter(foundLocation);
            $("#edit_lat").val(foundLatitude);
            $("#edit_lng").val(foundLongitude);

            let event_endtime = foundMarker.get("event_end_time");
            let time_remaining = getTimeRemaining(event_endtime);
            let total_minutes_remaining = time_remaining.total >= 0 ? Math.floor((time_remaining.total / 1000 / 60))
                : 0;
            $("#edit_time").val(total_minutes_remaining);

            // Edit form title insertion
            $("#edit_title").val(foundMarker.get("event_title"));

            // Edit form building insertion
            $("#edit_location_building").val(foundMarker.get("event_building"));

            // Edit form room insertion
            $("#edit_location_room").val(foundMarker.get("event_room"));

            // Edit form description insertion
            let description = foundMarker.get("event_description");
            if (description !== 'N/A') {
                $("#edit_description").val(foundMarker.get("event_description"));
            } else {
                $("#edit_description").val('');
            }

        }
    }
}

function prePopulateNotificationPreferences(notificationPreferences) {
    if (notificationPreferences.name !== undefined) {
        $("#notificationName").val(notificationPreferences.name);
    } else {
        $("#notificationName").val($('#notificationName').data('name'));
    }

    if (notificationPreferences.emailAddress !== undefined) {
        $("#notificationEmailAddress").val(notificationPreferences.emailAddress);
    } else {
        $("#notificationEmailAddress").val($('#notificationEmailAddress').data('email'));
    }

    if (notificationPreferences.wantsEmail !== undefined) {
        $("#notificationEmailSwitch").prop('checked', notificationPreferences.wantsEmail);
    }

    if (notificationPreferences.wantsEmail === undefined) {
        if ($("#notificationEmailSwitch").is(':checked')) {
            // pass
        } else {
            $("#notificationEmailSwitch").prop('checked', true);
        }
    }
}