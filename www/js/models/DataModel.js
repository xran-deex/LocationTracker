(function(app){
    app.Model = function(){
        //this.magnetic_field_uncalibrated = m.prop('');
        this.magnetic_field = m.prop('');
        this.lat = m.prop('');
        this.lng = m.prop('');
        this.title = m.prop('Location Tracker');
    };
})(app = window.app || {});
