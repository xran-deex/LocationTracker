(function(app){

    app.APIURL = 'http://valis.strangled.net/locationtracker';
    app.APIKEY = '98e3de68-af67-4007-8a34-26fc9a445679';

    // basic log function
    app.log = function(val){
        console.log(val);
    };

    // collect log messages in a global object
    app.LogModel = {
        logs: [],
        Log: function(val){
            if(app.LogModel.logs.length > 100) app.LogModel.logs.length = 0;
            var d = new Date();
            app.LogModel.logs.unshift(d.toTimeString().substring(0,8) + ': ' + val);
        }
    };

    // some constants
    app.COLLECT_TIME = 8000; // 8 seconds
    app.PREDICT_SCAN_INTERVAL = 1000; //1 sec interval
    app.WIFI_SCAN_INTERVAL = 500;
    app.MAG_SCAN_INTERVAL = 100;

    app.debug = m.prop(true);
    app.message = m.prop('');

    /**
     *  Local Storage backed props
     */
    app.local_prop = function(name, val){
        var __val = val || JSON.parse(localStorage.getItem(name));
        return function(_val){
            if(arguments.length > 0) {
                __val = _val;
                localStorage.setItem(name, __val);
            }
            if(!__val){
                __val = JSON.parse(localStorage.getItem(name));
            }
            return __val;
        };
    };

    app.local = app.local_prop('local');
    app.freq = app.local_prop('freq');

})(app = window.app || {});
