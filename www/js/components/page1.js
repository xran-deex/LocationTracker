(function(exports){

    var _export = false,
    _predict = false,
    _collecting = false,
    _display = true,
    _sensor = false;
    _train = false;

    var vm = function(){
        var self = this;
        this.model = new app.Model();
        this.predicted_location = m.prop([]);
        this.predicted_name = m.prop();
        this.readMagnet = true;

        // view properties
        self.sensor_btn_text = m.prop('Start sensor');
        self.collect_btn_text = m.prop('Train Location');
        self.train_btn_text = m.prop('Train');
        self.predict_btn_text = m.prop('Predict');
        self.message = m.prop();

        this.initialize = function() {
            this.bindEvents();
        };

        this.bindEvents = function() {
            document.addEventListener('deviceready', this.onDeviceReady.bind(this), false);
            document.addEventListener('pause', this.onDevicePaused, false);
            document.addEventListener('resume', this.onDeviceReady, false);
        };

        this.onDevicePaused = function(){
        };

        this.onDeviceReady = function() {
            console.log('Device Ready');
            document.addEventListener('backButton', function(){
                if(window.location.hash === '#/'){
                    navigator.app.exitApp();
                }
                else {
                    history.back();
                }
            }, false);

            cordova.plugins.backgroundMode.setDefaults({ text:'Training Network'});
            // check for an api key
            var apikey = localStorage.getItem('APIKEY');
            if(!apikey){
                self.checkApiKey();
            } else {
                indoor.init(apikey);
            }
        };

        /**
         *
         */
        this.checkApiKey = function(){
            var apikey = prompt('Enter your API key');
            m.request({method:'get', url:app.APIURL+'/check_api_key?apikey='+apikey}).then(function(res){
                if(res.length !== 1){
                    alert('Invalid API key. Try again.');
                    self.checkApiKey();
                } else {
                    apikey = res[0].apikey;
                    localStorage.setItem('APIKEY', apikey);
                    indoor.init(apikey);
                }
            });
        };

        this.handlePredictionResponse = function(result){
            m.startComputation();
            self.predicted_location(result.predictionData);
            self.predicted_name(result.predictedName);
            m.endComputation();
        };

        this.format = function(arr){
            if(arr instanceof Array)
            return arr[0].toFixed(2) + ", " + arr[1].toFixed(2) + ", " + arr[2].toFixed(2);
        };

        this.predict = function(){
            _predict = !_predict;
            if(_predict) {
                var network;
                indoor.predict(app.freq(), self.handlePredictionResponse);
                self.predict_btn_text('Stop');
            } else {
                indoor.stop();
                self.predict_btn_text('Predict');
            }
        };

        this.start_sensor = function(){
            _sensor = !_sensor;
            if(_sensor){
                cordova.plugins.backgroundMode.enable();
            } else {
                cordova.plugins.backgroundMode.disable();
                indoor.stop();
            }
        };

        var name;
        this.export = function(){
            _export = !_export;
            if(_export) {
                name = prompt('Enter a name for this location: ');
                if(name === null) {
                    self.message('Collection aborted');
                    _export = !_export;
                    return;
                }
                indoor.collect(name, function(msg){
                    m.startComputation();
                    app.message(msg);
                    m.endComputation();
                });
                self.collect_btn_text('Training...');
            } else {
                self.collect_btn_text('Train Location');
                indoor.stop();
                app.message('Collected ' + _collection_ctn + ' values');
            }
        };
    };

    // the app controller
    var ctrl = function(){
        this.vm = new vm();
        this.vm.initialize();
        app.vm = this.vm;
    };

    var view = function(ctrl){
        return [
            m('h1', ctrl.vm.model.title()),
            m('a', {class: 'waves-effect waves-light btn', onclick: ctrl.vm.export}, ctrl.vm.collect_btn_text()),
            m('a', {class: 'waves-effect waves-light btn', onclick: ctrl.vm.predict}, ctrl.vm.predict_btn_text()),
            m('h1', 'Prediction: '),
            m('div', ctrl.vm.predicted_location().map(function(i){
                return m('h1', i.toFixed(6));
            })),
            (function(){
                if(app.debug()){
                    return [
                        m('h6', 'Sensor Values: '),
                        m('h6', [
                            m('span#cal', ctrl.vm.model.magnetic_field())
                        ]),
                        m('div', ctrl.vm.model.lat()),
                        m('div', ctrl.vm.model.lng()),
                        m('h6.message', app.message())
                    ];
                }
            })(),
            m('h1', ctrl.vm.predicted_name()),
        ];
    };

    exports.Page1 = {
        controller: ctrl,
        view: view
    };

})(app = window.app || {});
