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
    _train = false;
    _collection_ctn = 0;
    var writeToDb = function(model, vm){
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
        return obj.lat && obj.lng && obj.magnetic_field !== null && obj.wifi;
    };

    var vm = function(){
        var self = this;
        this.model = new app.Model();
        this.dbModel = new app.DbModel();
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
            sensorcollector.stop('geomagnet', 'magnetic_field', function(){});
            sensorcollector.stop('wifi', null, function(){});
            navigator.geolocation.clearWatch(self.locId);
            clearInterval(self.magTimeout);
            clearInterval(self.wifiscanId);
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
            //app.log(e.data);
            m.startComputation();
            if(e.data.result){
                alert('Training finished in ' + (e.data.result.time/1000) + 's\nAfter ' + e.data.result.iterations +' iters');
                app.LogModel.Log('Training finished in ' + (e.data.result.time/1000) + 's');
                app.LogModel.Log('#Iters: ' + e.data.result.iterations);
                app.LogModel.Log('Error: ' + e.data.result.error);
                localStorage.setItem('network', JSON.stringify(e.data.network));
                self.train_btn_text('Train');
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
                last_five.unshift(val);
            } else {
                last_five.pop();
                last_five.unshift(val);
            }
            var map = {};
            val.forEach(function(item, index){
                map[index] = last_five.filter(function(v){
                    return v[index] > 0.9;
                });
            });

            if(app.loadedFromServer){
                outer2: {
                    for(var e in map){
                        if(map[e].length >= 3){
                            callback(app.locations[e].name);
                            break outer2;
                        } else {
                            callback('');
                        }
                    }
                }
            } else {
                self.db.trained_locations.toArray().then(function(locations){
                    var count = locations.length;
                    var diff = locations[0]._id;
                    outer: {
                        for(var e in map){
                            if(map[e].length >= 3){
                                callback(locations[e].name);
                                break outer;
                            } else {
                                callback('');
                            }
                        }
                    }
                });
            }
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
            _train = !_train;
            if(!_train){
                machine.train('default', {local: app.local(), action: 'abort'});
                self.train_btn_text('Train');
                cordova.plugins.backgroundMode.disable();
            } else {
                cordova.plugins.backgroundMode.enable();
                self.train_btn_text('Abort');
                var network = localStorage.getItem('network');
                app.loadedFromServer = false;
                if(network){
                    machine.train('default', {local: app.local(), network: network, action: 'train'}, a);
                    self.train_btn_text('Train');
                } else
                self.db.training_data.toArray(function(data){
                    machine.train('default', {local: app.local(), data: data, action: 'train'}, self.handleWorkerResponse);
                });
            }
        };

        this.predict = function(){
            _predict = !_predict;
            if(_predict) {
                var network;
                if(!app.local()){
                    app.loadedFromServer = true;
                    m.request({method:'get', url:'http://valis.strangled.net/locationtracker/default?apikey='+app.APIKEY}).then(function(res){
                        machine.train('default', {local: app.local(), network: res.network, action: 'train'}, function(e){
                            console.log(e.data);
                        });
                        app.locations = res.locations;
                        alert(res.name + ' loaded');
                    });
                } else {
                    app.loadedFromServer = false;
                    // try to load a previously saved network...
                    network = localStorage.getItem('network');
                    if(network){
                        machine.train('default', {local: app.local(), network: network, action: 'train'}, function(e){
                            console.log(e.data);
                        });
                    }
                }
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
                cordova.plugins.backgroundMode.enable();
            } else {
                cordova.plugins.backgroundMode.disable();
                self.onDevicePaused();
            }
        };

        var submitToServer = function(name){
            self.db.trained_locations.where('name').equals(name).toArray(function(location){
                var id = location[0]._id;
                self.db.training_data.where('training_id').equals(id).toArray(function(data){
                    var request = new Request('http://valis.strangled.net/locationtracker/data', {
                        method: 'post',
                        headers: {
                            'Accept': 'application/json',
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({data:data, name: name, apikey: exports.APIKEY})
                    });
                    fetch(request).then(function(res){return res.json();}).then(app.log);
                });
            });
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
                // submit to the server
                submitToServer(name);
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
            m('a', {class: 'waves-effect waves-light btn', onclick: ctrl.vm.train_neural_network}, ctrl.vm.train_btn_text()),
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
