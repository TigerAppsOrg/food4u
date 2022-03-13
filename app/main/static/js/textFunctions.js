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
        let eventStartTime = allMarkers[i].get("event_start_time")
        let eventEndTime = allMarkers[i].get("event_end_time");
        let startTimeEstString = allMarkers[i].get("event_start_time_est_string");
        let startTimeRemaining = getTimeRemaining(eventStartTime);
        let endTimeRemaining = getTimeRemaining(eventEndTime);

        if ((endTimeRemaining.minutes === 10 && endTimeRemaining.seconds === 1) ||
            (endTimeRemaining.minutes === 0 && endTimeRemaining.seconds === 1)) {
            socket.emit("update");
        }
        let remaining_time_message;
        if (startTimeRemaining.total < 0) {
            remaining_time_message = endTimeRemaining.total > 0 ? "<span class='badge badge-warning'>" +
                (endTimeRemaining.hours + "h "
                    + endTimeRemaining.minutes + "m " + endTimeRemaining.seconds + "s " + " " +
                    "remaining for event") + "</span>" :
                "<span class='badge badge-warning' style='white-space: pre-line'>" + "This event has ended.<br>We hope you got some of the good food!" + "</span>";
        } else {
            remaining_time_message = "<span class='badge badge-warning' style='white-space: pre-line'>" +
                "This event starts on \n" + startTimeEstString + " EST" + "</span>"
        }
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

            let eventStartTime = foundMarker.get("event_start_time");
            const startTimeRemaining = getTimeRemaining(eventStartTime);

            let eventEndTime = foundMarker.get("event_end_time");
            let endTimeRemaining = getTimeRemaining(eventEndTime);

            let total_minutes_remaining = endTimeRemaining.total >= 0 ? Math.floor((endTimeRemaining.total / 1000 / 60))
                : 0;

            if (startTimeRemaining.total > 0) {
                total_minutes_remaining = total_minutes_remaining -
                    (startTimeRemaining.total >= 0 ? Math.floor((startTimeRemaining.total / 1000 / 60))
                        : 0);
                $("#later-final").prop("checked", true);
                $(".datetimepicker-final").show();
                let eventStartTimeEstString = foundMarker.get("event_start_time_est_string");
                $("#later-date-final").val(changeDateFormat(eventStartTimeEstString));
            } else {
                $("#now-final").prop("checked", true);
                $(".datetimepicker-final").hide();
            }

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

function changeDateFormat(inputDateString) {
    let months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    let stringArray = inputDateString.split(",").join("").split(" ");

    const isMonth = (element) => element === stringArray[0];

    stringArray[0] = String(months.findIndex(isMonth) + 1);
    let outputStringDate = stringArray.slice(0, -2).join("/") + " " + stringArray.slice(-2).join(" ");
    return outputStringDate;
}

function getAttendance(event_id) {
    fetch('/get_attendance?' +
        '&event_id=' + event_id)
        .then(response => response.text()).then(data => {
        $("#attendanceBody").empty();
        $("#attendanceBody").append(data);
    });
}