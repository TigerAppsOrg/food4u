let socket = io();
let main_map;
const princetonCoords = {lat: 40.346916, lng: -74.655304};
let formMarker;
let formMap;
let editFormMarker;
let editFormMap;
let allMarkers = [];
let currentLocationMainMarker = null;