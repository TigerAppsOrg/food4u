let intro = introJs();

intro.setOptions({
    steps: [
        {
            intro: "<h3><b>Welcome to food 4 u!</b></h3> food 4 u is a webapp to help the Princeton community " +
                "better organize distribution and retrieval of free food by highlighting the time and location of" +
                " free food giveaway events.",
        },
        {

            element: "#addFoodButton",
            intro: "<h4><b>Adding Free Food</b></h4>To add free food you find on campus, click \"Add Free Food\" " +
                "in the " +
                "top navigation bar. Input the title, building, and room of the food. The location will be" +
                " automatically " +
                "set to your current location. You can override this by clicking anywhere on the mini map. " +
                "Inputting a common " +
                "building will also automatically move the location to that building. You can reset the location " +
                "using the \"Use My Current Location\" button. Input how long you want the free food event to be " +
                "displayed between 5 and 180 minutes. Optionally, add up to five photos and a description! As the " +
                "original poster, you can edit the event. You can also extend the time of an event or delete an " +
                "event " +
                "entirely.",
            position: 'bottom'
        },
        {
            intro: "<h4><b>Finding Free Food</b></h4> On the map, you'll see markers with the food 4 u logo in" +
                " different colors. These indicate " +
                "free food events around campus." + "<br> <br> Markers are initially " +
                "green. Those with 10 minutes left are yellow. The markers that are red are events with no more time" +
                " left. If you find an event that is running out of food and has more than 10 minutes left, please" +
                " flag it to automatically set the remaining time to 10 minutes and prevent our community" +
                " from pursuing an event that will not feed them. <br> <br>Click on a marker to find information" +
                " about the event, including descriptions, pictures, location, and even directions!"
        },
        {
            intro: "<h4><b>Finding You on the Map</b></h4>  If you're on campus, " +
                "You'll also see a blue dot marking your current location to see "
                + "where you are relative to the food!" +
                " Click \"Map\" in the top navigation bar to reset the map view to be centered on your current location."
        },
        {
            element: "#openNotificationSettings",
            intro: "<h4><b>Notification Settings</b></h4> If you would like" +
                " to be notified about free food events, click on the dropdown menu" +
                " in the top right then select \"Notification Settings\". There, you can" +
                " subscribe to email notifications for new events.",
            position: 'left'
        },
        {
            intro: "<h4><b>Requirements</b></h4> food 4 u is primarily designed " +
                "for Chrome on Desktop. We additionally support Safari on Desktop, " +
                "Chrome on Mobile, and Safari on Mobile.\n" + "\n" + "To utilize all" +
                " features, allow food 4 u to use your location.\n" + "\n" + "As a Princeton " +
                "specific app, free food posts are constrained to campus and the surrounding area." +
                " For the best experience, use food 4 u at Princeton University.",
        },
        {
            element: "#tutorial",
            intro: "<h4><b>Tutorial</b></h4> If you need to review the tutorial again, please click here!",
            position: 'left'
        },
    ],
    exitOnOverlayClick: false,
    overlayOpacity: 0
})


intro.onexit(function () {
    $(".dropdown-toggle").attr("data-toggle", "dropdown");
    $('.dropdown').removeClass('open');
    $(".dropdown-toggle").attr("aria-expanded", "false");
});

let width = (window.innerWidth > 0) ? window.innerWidth : screen.width;

function tutorial() {
    if (width >= 767) {
        $(".dropdown-toggle").removeAttr("data-toggle");
        $('.dropdown').addClass('open');
        $(".dropdown-toggle").attr("aria-expanded", "true");
        intro.start();
    } else {
        $('#welcomeModal').modal('show');
    }
}

function tutorialAgain() {
    if (width >= 767) {
        $(".dropdown-toggle").removeAttr("data-toggle");
        $('.dropdown').addClass('open');
        $(".dropdown-toggle").attr("aria-expanded", "true");
        intro.start();
    } else {
        $('#tutorialModal').modal('show');
    }
}