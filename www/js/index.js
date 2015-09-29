/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
var app = {};

app.Model = function(){
    this.magnetic_field_uncalibrated = m.prop('');
    this.magnetic_field = m.prop('');
    this.lat = m.prop('');
    this.lng = m.prop('');
    this.title = m.prop('Location Tracker');
};

app.vm = function(){
    var self = this;
    this.model = new app.Model();
    this.initialize = function() {
        this.bindEvents();
    };
    this.bindEvents = function() {

        document.addEventListener('deviceready', this.onDeviceReady.bind(this), false);
        document.addEventListener('offline', this.onDeviceOffline, false);
        document.addEventListener('online', this.onDeviceOnline, false);
        document.addEventListener('pause', function(){
            sensorcollector.stop('magnetic_field_uncalibrated', function(){});
            sensorcollector.stop('magnetic_field', function(){});
            navigator.geolocation.clearWatch(self.locId);
            clearTimeout(self.wifiscanId);
            celldetails.stop(function(){});
        });
        document.addEventListener('resume', this.onDeviceReady, false);
    };
    this.onDeviceReady = function() {
        console.log('Device Ready');
        document.addEventListener('backButton', function(){
            navigator.app.exitApp();
        }, false);
        sensorcollector.start('magnetic_field_uncalibrated', self.handleUncalMagneticField);
        sensorcollector.start('magnetic_field', self.handleMagneticField);
        self.wifiscanId = setInterval(function(){
            wifidetails.scan(self.handleWifi);
        }, 5000);
        celldetails.start(function(e){
            console.log(e);
        });
        self.locId = navigator.geolocation.watchPosition(self.handleGeolocation);
        if(!self.worker){
            self.worker = ml.train('default', self.handleWorkerResponse);
            ml.train('svm', self.handleWorkerResponse);
        }

        // Android customization
        cordova.plugins.backgroundMode.setDefaults({ text:'Doing heavy tasks.'});
        // Enable background mode
        cordova.plugins.backgroundMode.enable();

        // Called when background mode has been activated
        cordova.plugins.backgroundMode.onactivate = function () {
            setTimeout(function () {
                // Modify the currently displayed notification
                cordova.plugins.backgroundMode.configure({
                    text:'Running in background for more than 5s now.'
                });
                self.worker.postMessage('hello');
            }, 5000);
        };
        self.setupDB(function(db){
            self.db = db;
            // self.db.sensor_data.each(function(item){
            //     console.log(item);
            // });
        });
    };
    this.setupDB = function(callback){
        var db = new Dexie('SensorData');
    	// Define a schema
    	db.version(1)
    		.stores({
    			sensor_data: '++_id'
    		});
    	// Open the database
    	db.open()
    		.catch(function(error){
    			alert('Uh oh : ' + error);
    		});
        if(callback) callback(db);
    };
    this.handleWorkerResponse = function(e){
        alert(e.data);
    };
    this.onDeviceOffline = function(){
        console.log('Device is offline');
    };
    this.onDeviceOnline = function(){
        console.log('Device is online');
    };
    this.handleUncalMagneticField = function(e){
        m.startComputation();
        self.model.magnetic_field_uncalibrated(self.format(e));
        m.endComputation();
    };
    this.handleMagneticField = function(e){
        m.startComputation();
        self.model.magnetic_field(self.format(e));
        m.endComputation();
    };
    this.format = function(arr){
        if(arr instanceof Array)
        return arr[0].toFixed(2) + ", " + arr[1].toFixed(2) + ", " + arr[2].toFixed(2);
    };
    this.handleGeolocation = function(loc){
        m.startComputation();
        if(self.db){
            self.db.sensor_data.put({
                lat: loc.coords.latitude,
                lng: loc.coords.longitude
            });
        }
        self.model.lat('Latitude: ' + loc.coords.latitude);
        self.model.lng('Longitude: ' + loc.coords.longitude);
        m.endComputation();
    };
    this.handleWifi = function(wifi){
        console.log(wifi);
    };
};

//app.initialize();
var ctrl = function(){
    this.vm = new app.vm();
    this.vm.initialize();
};

var component = {
    controller: ctrl,
    view: function(ctrl){
        return [
            m('h1', ctrl.vm.model.title()),
            m('h3', 'Sensor Values (uncal): '),
            m('div', [
                m('span#uncal', ctrl.vm.model.magnetic_field_uncalibrated())
            ]),
            m('h3', [
                m('span#cal', ctrl.vm.model.magnetic_field())
            ]),
            m('div', ctrl.vm.model.lat()),
            m('div', ctrl.vm.model.lng())
        ];
    }
};

m.mount(document.getElementById('app'), component);
