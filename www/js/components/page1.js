(function(exports){

    exports.DATA_LENGTH = 29;

    var writeToDbIfComplete = function(model, vm){
        if(dataComplete(model)){
            writeToDb(model, vm);
        }
    };
    var _export = false,
    _predict = false,
    _collecting = false,
    _display = true,
    _sensor = false;
    _collection_ctn = 0;
    var writeToDb = function(model, vm){
        //vm.db.sensor_data.put(model);
        lt.WifiProcessor.insert_ssid(model.wifi, vm.db);
        if(_predict){
            lt.ML.constructInputData(model, vm.db, function(data){
                app.log(data);
                var id = data.shift();
                vm.dbModel.magnetic_field = null;
                machine.train('default', {data: data, action: 'predict'}, vm.handlePredictionResponse);
            });
        }
        if(_export){
            lt.ML.constructInputData(model, vm.db, function(data){
                app.log(data);
                var id = data.shift();
                if(data.length !== exports.DATA_LENGTH) return;
                vm.db.training_data.put({training_id: id, data: data});
                app.message('Collected ' +(_collection_ctn++)+' values');
                vm.dbModel.magnetic_field = null;
            });
        }
        if(!_export) {
            // create a new model if we are not exporting.
            vm.dbModel = new app.DbModel();
        }
    };

    /**
     *  @fn dataComplete - consider the data model complete if it has a lat, lng, wifi, and a non null mag array
     */
    var dataComplete = function(obj){
        //return R.isEmpty(R.filter(R.isNil, R.values(obj)));
        return obj.lat && obj.lng && obj.magnetic_field !== null && obj.wifi;
    };

    var vm = function(){
        var self = this;
        this.model = new app.Model();
        this.dbModel = new app.DbModel();
        this.predicted_location = m.prop();
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
            sensorcollector.stop('geomagnet', 'magnetic_field', function(){});
            sensorcollector.stop('wifi', null, function(){});
            navigator.geolocation.clearWatch(self.locId);
            clearInterval(self.magTimeout);
            clearInterval(self.wifiscanId);
        };

        this.onDeviceReady = function() {
            console.log('Device Ready');
            document.addEventListener('backButton', function(){
                navigator.app.exitApp();
            }, false);

            cordova.plugins.backgroundMode.setDefaults({ text:'Doing heavy tasks.'});
            cordova.plugins.backgroundMode.enable();

            // Called when background mode has been activated
            cordova.plugins.backgroundMode.onactivate = function () {
                setTimeout(function () {
                    cordova.plugins.backgroundMode.configure({
                        text:'Running in background for more than 5s now.'
                    });
                }, 5000);
            };

            // grab our database reference
            self.setupDB();
        };

        this.setupDB = function(){
            var db = new Dexie('SensorData');
        	db.version(1)
        		.stores({
                    wifi_ssids: '++_id,&name',
                    training_data: '++_id,training_id',
                    trained_locations: '++_id,&name'
        		});
        	// Open the database
        	db.open()
        		.catch(function(error){
        			alert('Uh oh : ' + error);
        		});
            self.db = db;
            exports.db = self.db;
        };

        this.handleWorkerResponse = function(e){
            app.log(e.data);
            m.startComputation();
            if(e.data.result){
                alert('Training finished in ' + (e.data.result.time/1000) + 's\nAfter ' + e.data.result.iterations +' iters');
                app.LogModel.Log('Training finished in ' + (e.data.result.time/1000) + 's');
                app.LogModel.Log('#Iters: ' + e.data.result.iterations);
                app.LogModel.Log('Error: ' + e.data.result.error);
                localStorage.setItem('network', JSON.stringify(e.data.network));
            } else {
                app.LogModel.Log('Err: '+e.data.log.error.toFixed(6) + ', iters: ' + e.data.log.iterations);
                app.message('Err: ' + e.data.log.error.toFixed(6));
            }
            m.endComputation();
        };

        var last_five = [];
        /**
         *  Finds the name of the trained location based on the predicted value
         *  @param val - the predicted value
         *  @param {function} callback - a callback that will be given the name
         */
        this.getPredictedName = function(val, callback){
            if(last_five.length < 5){
                last_five.unshift(val[0]);
            } else {
                last_five.pop();
                last_five.unshift(val[0]);
            }
            var one = last_five.filter(function(v){
                return v > 0.99;
            });
            var zero = last_five.filter(function(v){
                return v < 0.01;
            });
            if(one.length >= 3){
                //navigator.vibrate(200);
                self.db.trained_locations.where('_id').equals(2).first(function(trained_location){
                    callback(trained_location.name);
                });
            }
            if(zero.length >= 3){
                self.db.trained_locations.where('_id').equals(1).first(function(trained_location){
                    callback(trained_location.name);
                });
            }
            callback('');
        };


        this.handlePredictionResponse = function(e){
            m.startComputation();
            self.predicted_location(e.data);
            self.getPredictedName(e.data, function(name){
                self.predicted_name(name);
                m.endComputation();
            });
        };

        this.handleMagneticField = function(e){
            if(!self.readMagnet) return;
            if(typeof e === 'string') return;
            self.dbModel.magnetic_field = e;
            writeToDbIfComplete(self.dbModel, self);
            m.startComputation();
            self.model.magnetic_field(self.format(e));
            m.endComputation();
            self.readMagnet = false;
        };

        this.format = function(arr){
            if(arr instanceof Array)
            return arr[0].toFixed(2) + ", " + arr[1].toFixed(2) + ", " + arr[2].toFixed(2);
        };

        this.handleGeolocation = function(loc){
            self.dbModel.lat = loc.coords.latitude;
            self.dbModel.lng = loc.coords.longitude;
            writeToDbIfComplete(self.dbModel, self);
            m.startComputation();
            self.model.lat('Latitude: ' + loc.coords.latitude);
            self.model.lng('Longitude: ' + loc.coords.longitude);
            m.endComputation();
        };

        this.handleWifi = function(wifi){
            if(!wifi) return;
            console.log(wifi);
            self.dbModel.wifi = wifi;
            writeToDbIfComplete(self.dbModel, self);
        };

        // this.collect = function(start, interval){
        //     if(start){
        //         sensorcollector.start('geomagnet', 'magnetic_field', self.handleMagneticField);
        //         sensorcollector.start('wifi', null, function(e){});
        //         self.wifiscanId = setInterval(function(){
        //             sensorcollector.scan('wifi', null, self.handleWifi);
        //         }, interval * 2 || app.WIFI_SCAN_INTERVAL);
        //         self.magTimeout = setInterval(function(){
        //             self.readMagnet = true;
        //         }, interval || app.MAG_SCAN_INTERVAL);
        //         self.locId = navigator.geolocation.watchPosition(self.handleGeolocation);
        //         if(_export) {
        //             // if collecting training data, stop after 8 seconds.
        //             // setTimeout(function(){
        //             //     self.collect(false);
        //             //     app.LogModel.Log('Training complete');
        //             //     self.collect_btn_text('Train Location');
        //             //     _export = false;
        //             // }, app.COLLECT_TIME);
        //         }
        //         app.message('Collection started');
        //     } else {
        //         app.message('Collection stopped');
        //         self.onDevicePaused();
        //     }
        // };

        /**
         *  Starts the sensors
         *  @param toggle - determines how often to collect data
         */
        this.collect = function(toggle){
            clearInterval(self.magTimeout);
            clearInterval(self.wifiscanId);
            var timeoutAmt;
            if(toggle){
                timeoutAmt = 100;
            } else {
                timeoutAmt = 1000;
            }
            self.wifiscanId = setInterval(function(){
                sensorcollector.scan('wifi', null, self.handleWifi);
            }, timeoutAmt+400);
            self.magTimeout = setInterval(function(){
                self.readMagnet = true;
            }, timeoutAmt);
        };

        // simple alert method
        var a = function(e){alert(e.data);};

        this.train_neural_network = function(){
            var network = localStorage.getItem('network');
            if(network){
                machine.train('default', {network: network, action: 'train'}, a);
            } else
            self.db.training_data.where('training_id').anyOf(1,2).toArray(function(data){
                machine.train('default', {local: app.local(), data: data, action: 'train'}, self.handleWorkerResponse);
            });
        };

        // this.predict = function(){
        //     _predict = !_predict;
        //     if(_predict) {
        //         self.predict_btn_text('Stop');
        //         app.message('Prediction started');
        //         // when predicting, use a slower interval
        //         self.collect(true, app.PREDICT_SCAN_INTERVAL);
        //     } else {
        //         self.predict_btn_text('Predict');
        //         app.message('Prediction stopped');
        //         self.collect(false);
        //     }
        // };

        this.predict = function(){
            _predict = !_predict;
            if(_predict) {
                self.start_sensor();
                self.predict_btn_text('Stop');
            } else {
                self.start_sensor();
                self.predict_btn_text('Predict');
            }
        };

        this.start_sensor = function(){
            _sensor = !_sensor;
            if(_sensor){
                sensorcollector.start('geomagnet', 'magnetic_field', self.handleMagneticField);
                sensorcollector.start('wifi', null, function(e){});
                self.wifiscanId = setInterval(function(){
                    sensorcollector.scan('wifi', null, self.handleWifi);
                }, app.freq());
                self.magTimeout = setInterval(function(){
                    self.readMagnet = true;
                }, 1000);
                self.locId = navigator.geolocation.watchPosition(self.handleGeolocation);
                //self.sensor_btn_text('Stop sensor');
            } else {
                //self.sensor_btn_text('Start sensor');
                self.onDevicePaused();
            }
        };

        this.export = function(){
            _export = !_export;
            if(_export) {
                var name = prompt('Enter a name for this location: ');
                if(name === null) {
                    self.message('Collection aborted');
                    _export = !_export;
                    return;
                }
                // remove any existing trained network.
                localStorage.removeItem('network');
                self.db.trained_locations.put({name: name});
                self.start_sensor();
                self.collect_btn_text('Training...');
                _collection_ctn = 0;
                self.collect(true);
            } else {
                self.collect_btn_text('Train Location');
                self.collect(false);
                self.start_sensor();
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
            //m('a', {class: 'waves-effect waves-light btn', onclick: ctrl.vm.start_sensor}, ctrl.vm.sensor_btn_text()),
            m('a', {class: 'waves-effect waves-light btn', onclick: ctrl.vm.export}, ctrl.vm.collect_btn_text()),
            m('a', {class: 'waves-effect waves-light btn', onclick: ctrl.vm.train_neural_network}, ctrl.vm.train_btn_text()),
            m('a', {class: 'waves-effect waves-light btn', onclick: ctrl.vm.predict}, ctrl.vm.predict_btn_text()),
            m('h1', 'Prediction: '),
            m('h1', ctrl.vm.predicted_location()),
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
