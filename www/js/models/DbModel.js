(function(app){
    app.DbModel = function(){
            return {
            magnetic_field: null,
            //magnetic_field_uncalibrated: null,
            lat: null,
            lng: null,
            wifi: null
        };
    };
})(app = window.app || {});
