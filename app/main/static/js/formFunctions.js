let submitPreviewTemplate = null;
let editPreviewTemplate = null;
let submitDropzone = null;
let editDropzone = null;
let pic_URLs_for_deletion = [];
let dropzoneEditIsAddedFile = false;

function dropzoneInit() {
    submitPreviewTemplate = $("#submit-previews").html();
    $("#submit-template").remove();
    editPreviewTemplate = $("#edit-previews").html();
    $("#edit-template").remove();


    submitDropzone = new Dropzone(".submit-container", { // Make the whole body a dropzone
        url: "/handleFormData", // Set the url
        thumbnailWidth: 80,
        autoProcessQueue: false,
        uploadMultiple: true,
        thumbnailHeight: 80,
        parallelUploads: 100,
        previewTemplate: submitPreviewTemplate,
        acceptedFiles: ".jpeg,.jpg,.png,.heic",
        previewsContainer: "#submit-previews", // Define the container to display the previews
        clickable: ".fileinput-submit-button", // Define the element that should be used as click trigger to select files.,
        // The setting up of the dropzone
        init: function () {
            let myDropzone = this;

            // First change the button to actually tell Dropzone to process the queue.
            $("#submitFood").on("click", function (e) {
                if ($('#submit-form')[0].checkValidity()) {

                    // Make sure that the form isn't actually being sent.
                    e.preventDefault();

                    $('#inputFormModal').modal('hide');

                    if (myDropzone.files.length) {
                        myDropzone.processQueue();
                    } else {
                        let formData = new FormData(document.getElementById("submit-form"));
                        $.ajax({
                            type: 'POST',
                            url: '/handleFormData',
                            contentType: false,
                            dataType: "json",
                            cache: false,
                            processData: false,
                            data: formData,
                            success: function () {
                                notyf.success('Your new event has been successfully submitted!');
                                $('#submit-form').trigger("reset");
                            },
                            error: function (jqXHR) {
                                notyf.error(jqXHR.responseJSON.message);
                            }
                        })
                    }
                } else {
                    $('#submit-form')[0].reportValidity();
                }
            });

            this.on('sending', function (file, xhr, formData) {
                // Append all form inputs to the formData Dropzone will POST
                let data = $("#submit-form").serializeArray();
                $.each(data, function (key, el) {
                    formData.append(el.name, el.value);
                });
            });

            this.on("successmultiple", function (files, response) {
                notyf.success('Your new event has been successfully submitted!');
                $('#submit-form').trigger("reset");
                myDropzone.removeAllFiles(true);
            });

            this.on("errormultiple", function (files, response) {
                notyf.error(response.message);
                myDropzone.removeAllFiles(true);
            });
        }
    });


    editDropzone = new Dropzone(".edit-container", { // Make the whole body a dropzone
        url: "/handleDataEdit", // Set the url
        thumbnailWidth: 80,
        autoProcessQueue: false,
        uploadMultiple: true,
        thumbnailHeight: 80,
        parallelUploads: 100,
        previewTemplate: editPreviewTemplate,
        acceptedFiles: ".jpeg,.jpg,.png,.heic",
        previewsContainer: "#edit-previews", // Define the container to display the previews
        clickable: ".fileinput-edit-button", // Define the element that should be used as click trigger to select files.,
        // The setting up of the dropzone
        init: function () {
            let myDropzone = this;

            // First change the button to actually tell Dropzone to process the queue.
            $("#editFood").on("click", function (e) {
                if ($('#edit-form')[0].checkValidity()) {
                    // Make sure that the form isn't actually being sent.
                    e.preventDefault();
                    $('#editFormModal').modal('hide');

                    if (dropzoneEditIsAddedFile) {
                        myDropzone.processQueue();
                        dropzoneEditIsAddedFile = false;
                    } else {
                        let formData = new FormData(document.getElementById("edit-form"));
                        $.ajax({
                            type: 'POST',
                            url: '/handleDataEdit',
                            contentType: false,
                            dataType: "json",
                            cache: false,
                            processData: false,
                            data: formData,
                            success: function () {
                                notyf.success('Your event has been successfully edited!');
                                infoWindow.setPosition({lat: theseEditCoords.lat, lng: theseEditCoords.lng});
                            },
                            error: function (jqXHR) {
                                notyf.error(jqXHR.responseJSON.message);
                            }
                        })
                    }
                } else {
                    $('#edit-form')[0].reportValidity();
                }
            });

            this.on('addedfile', function () {
                dropzoneEditIsAddedFile = true;
            })

            this.on('sending', function (file, xhr, formData) {
                // Append all form inputs to the formData Dropzone will POST
                let data = $("#edit-form").serializeArray();
                $.each(data, function (key, el) {
                    formData.append(el.name, el.value);
                });
            });

            this.on("successmultiple", function (files, response) {
                notyf.success('Your event has been successfully edited!');
                $('#edit-form').trigger("reset");
                myDropzone.removeAllFiles(true);
                infoWindow.setPosition({lat: theseEditCoords.lat, lng: theseEditCoords.lng});
            });

            this.on("errormultiple", function (files, response) {
                notyf.error(response.message);
                myDropzone.removeAllFiles(true);
            });
        }
    });
}

function dropzoneEdit(event_id) {
    editDropzone.removeAllFiles(true);
    pic_URLs_for_deletion.length = 0;
    $("#pic_URLs_for_deletion").val(pic_URLs_for_deletion);
    let eventMarker = findMarkerByEventID(event_id);
    let markerEventPictures = eventMarker.get("event_pictures");
    $.each(markerEventPictures, function (tempPicName, pictureURL) {
        let pictureName = tempPicName.split("-");
        pictureName.pop();
        pictureName = pictureName.join("-");
        let mockFile = {name: pictureName};
        editDropzone.options.addedfile.call(editDropzone, mockFile);
        editDropzone.files.push(mockFile);
        editDropzone.options.thumbnail.call(editDropzone, mockFile, pictureURL.replace(/^http:\/\//i, 'https://'));
    })
    dropzoneEditDelete();
}

function dropzoneEditDelete() {
    $(".edit-delete").each(function () {
        $(this).on("click", function () {
            let pictureSrc = $(this).parent().parent().find("img").attr("src");
            pic_URLs_for_deletion.push(pictureSrc);
            $("#pic_URLs_for_deletion").val(JSON.stringify(pic_URLs_for_deletion));
        });
    });
}

function notificationWithoutRefresh() {
    let notificationForm = $("form#manageNotificationSubscriptionsForm")[0];
    if (notificationForm.checkValidity()) {
        $('#notificationModal').modal('hide');
        let formData = new FormData(notificationForm);
        $.ajax({
            type: 'POST',
            url: '/manageNotificationSubscriptions',
            contentType: false,
            dataType: "json",
            cache: false,
            processData: false,
            data: formData,
            success: function (data, textStatus, jqXHR) {
                notyf.success(jqXHR.responseJSON.message);
            },
            error: function (jqXHR) {
                notyf.error(jqXHR.responseJSON.message);
            }
        })
    } else {
        notificationForm.reportValidity();
    }
}

function flagWithoutRefresh() {
    Swal.fire({
        title: 'Are you sure you want to flag this event?',
        text: "This event will be shown to have 10 minutes left for everyone. You won't be able to revert this!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes, flag it!'
    }).then((result) => {
        if (result.isConfirmed) {
            let flagForm = $("form#flagForm")[0];
            let formData = new FormData(flagForm);
            $.ajax({
                type: 'POST',
                url: '/handleEventFlag',
                contentType: false,
                dataType: "json",
                cache: false,
                processData: false,
                data: formData,
                success: function (data, textStatus, jqXHR) {
                    notyf.success(jqXHR.responseJSON.message);
                },
                error: function (jqXHR) {
                    notyf.error(jqXHR.responseJSON.message);
                }
            })
        }
    })
}

function extendWithoutRefresh() {
    let extendForm = $("form#extendForm")[0];
    let formData = new FormData(extendForm);
    $.ajax({
        type: 'POST',
        url: '/handleEventExtend',
        contentType: false,
        dataType: "json",
        cache: false,
        processData: false,
        data: formData,
        success: function (data, textStatus, jqXHR) {
            notyf.success(jqXHR.responseJSON.message);
        },
        error: function (jqXHR) {
            notyf.error(jqXHR.responseJSON.message);
        }
    })
}

function deleteWithoutRefresh() {
    Swal.fire({
        title: 'Are you sure you want to delete your event?',
        text: "You won't be able to revert this!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes, delete it!'
    }).then((result) => {
        if (result.isConfirmed) {
            let deleteForm = $("form#deleteForm")[0];
            let formData = new FormData(deleteForm);
            $.ajax({
                type: 'POST',
                url: '/handleEventDelete',
                contentType: false,
                dataType: "json",
                cache: false,
                processData: false,
                data: formData,
                success: function (data, textStatus, jqXHR) {
                    notyf.success(jqXHR.responseJSON.message);
                    infoWindow.close();
                    $("#editFormModal").modal('hide');
                },
                error: function (jqXHR) {
                    notyf.error(jqXHR.responseJSON.message);
                }
            })
        }
    })
}

function commentWithoutRefresh() {
    let commentForm = $("form#commentForm")[0];
    let formData = new FormData(commentForm);
    if (commentForm.checkValidity()) {
        $.ajax({
            type: 'POST',
            url: '/handleComment',
            contentType: false,
            dataType: "json",
            cache: false,
            processData: false,
            data: formData,
            success: function (data, textStatus, jqXHR) {
                notyf.success(jqXHR.responseJSON.message);
            },
            error: function (jqXHR) {
                notyf.error(jqXHR.responseJSON.message);
            }
        })
    } else {
        commentForm.reportValidity();
    }
}

function goingWithoutRefresh() {
    $("#goingSwitch").prop('checked', true);
    let goingForm = $("form#goingForm")[0];
    let formData = new FormData(goingForm);
    $.ajax({
        type: 'POST',
        url: '/handleGoing',
        contentType: false,
        dataType: "json",
        cache: false,
        processData: false,
        data: formData,
        success: function (data, textStatus, jqXHR) {
            notyf.success(jqXHR.responseJSON.message);
        },
        error: function (jqXHR) {
            notyf.error(jqXHR.responseJSON.message);
        }
    })
}

function notGoingWithoutRefresh() {
    $("#goingSwitch").prop('checked', false);
    let goingForm = $("form#goingForm")[0];
    let formData = new FormData(goingForm);
    $.ajax({
        type: 'POST',
        url: '/handleGoing',
        contentType: false,
        dataType: "json",
        cache: false,
        processData: false,
        data: formData,
        success: function (data, textStatus, jqXHR) {
            notyf.success(jqXHR.responseJSON.message);
        },
        error: function (jqXHR) {
            notyf.error(jqXHR.responseJSON.message);
        }
    })
}

function removeEventIDFromAttendance() {
    $("#attendanceCheck").removeData("event-id");
}

function removeEventIDFromComments() {
    $("#commentsCheck").removeData("event-id");
}

function hideShowCommentSectionModal(event_op_net_id) {
    if (username === event_op_net_id) {
        $("#hide-if-op").hide();
    } else {
        $("#hide-if-op").show();
    }
}


// show/hide start date
function showHideCalendar() {
    $(".radio-init").change(function () {
        if ($('#now-init').is(':checked')) {
            $(".datetimepicker-init").hide();
        } else if ($('#later-init').is(':checked')) {
            $(".datetimepicker-init").show();
        }
    });
    $(".radio-final").change(function () {
        if ($('#now-final').is(':checked')) {
            $(".datetimepicker-final").hide();
        } else if ($('#later-final').is(':checked')) {
            $(".datetimepicker-final").show();
        }
    });
}

function modalsRemoveEventIDs() {
    $('#attendanceModal').on('hidden.bs.modal', function () {
        removeEventIDFromAttendance();
    })
    $('#commentsModal').on('hidden.bs.modal', function () {
        removeEventIDFromComments();
    })
}
