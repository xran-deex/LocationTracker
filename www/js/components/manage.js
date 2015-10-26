(function(app){
    'use strict';
    /* jshint esnext: true */
    var ItemModel = function(parent, opt){
        var self = this;
        this.name = opt.name;
        this.id = opt.id;

        this.delete = function(){
            let yes = confirm('Are you sure?');
            if(yes){
                m.request({method:'delete', url:app.APIURL+'/data?apikey='+app.APIKEY, data:{id: self.id}}).then(function(res){
                    parent.data(parent.data().filter(function(item){
                        return item !== self;
                    }));
                    //Materialize.toast(self.name + ' deleted', 3000);
                });
            }
        };
    };

    var Model = function(parent){
        var self = this;
        this.data = m.prop([]);
        this.fetchData = function(cb){
            m.request({method:'get', url:app.APIURL+'/data?apikey='+app.APIKEY}).then(function(res){
                cb(res);
            });
        };
        this.update = function(){
            self.fetchData(function(data){
                self.data(data.map(function(item){
                    item = new ItemModel(self, item);
                    item.selected = (function(val){
                        var _val = val;
                        return function(){
                            if(arguments.length > 0){
                                _val = arguments[0];
                                parent.deleteCheck();
                            }
                            return _val;
                        };
                    })(false);
                    return item;
                }));
                self.data().sort(function(i, j){
                    if(i.name < j.name){
                        return 1;
                    } else if (i.name > j.name){
                        return -1;
                    }
                    return 0;
                });
            });
        };
    };

    var VM = function(){
        var self = this;
        self.ws = null;
        self.model = app.model = new Model(self);
        app.model.update();
        this.showNameForm = m.prop(false);
        this.name = m.prop();
        self.log = m.prop('');
        self.wait = m.prop(false);
        this.train_btn_text = m.prop('Train');
        self.hasDeleted = m.prop(false);
        self.deleteCheck = function(){
            self.hasDeleted(false);
            self.model.data().forEach(function(item){
                if(item.selected()){
                    self.hasDeleted(true);
                }
            });
        };
        self.delete = function(){
            let yes = confirm('Are you sure?');
            if(yes){
                self.wait(true);
                self.model.data().forEach(function(item){
                    if(item.selected()){
                        m.request({method:'delete', url:app.APIURL+'/train?apikey='+app.APIKEY, data:{id: item.id}}).then(function(res){
                            self.model.data(self.model.data().filter(function(item2){
                                return item !== item2;
                            }));
                            self.hasDeleted(false);
                            self.wait(false);
                        });
                    }
                });
            }
        };
        this.train = function(){
            self.showNameForm(!self.showNameForm());
            if(self.showNameForm()){
                self.train_btn_text('Cancel');
            } else {
                self.train_btn_text('Train');
            }
        };
        this.submit = function(){
            let ids = self.model.data().filter(function(item){
                return item.selected();
            }).map(function(item){
                return item.id;
            });
            self.ws = new WebSocket('ws://valis.strangled.net/locationtrackersocket');

            // monitor progress messages from the server
            self.ws.onmessage = function(event){
                var data = JSON.parse(event.data);
                if(data.log){
                    m.startComputation();
                    self.log('Error: ' + data.log.error.toFixed(4));
                    m.endComputation();
                }
            };
            self.hasDeleted(false);
            m.request({method:'post', url:app.APIURL+'/train?apikey='+app.APIKEY, data: {ids: ids, name: self.name()}}).then(function(res){
                console.log(res);
                self.showNameForm(false);
                //Materialize.toast('Training now...', 2000);
                self.train_btn_text('Train');
                self.model.data().forEach(function(item){item.selected(false);});
            }, function(err){
                console.log(err);
            });
        };
    };

    // the app controller
    var ctrl = function(){
        this.vm = new VM();
    };

    var deleteView = function(ctrl){
        if(ctrl.vm.hasDeleted()){
            return m('div.btnspinner', [
                (function(){
                    if(!ctrl.vm.wait())
                    return [
                        m('button.btn.waves-effect.waves-light', {onclick: ctrl.vm.delete}, 'Delete selected'),
                        m('button.btn.waves-effect.waves-light.train_btn', {onclick: ctrl.vm.train}, ctrl.vm.train_btn_text()),
                    ];
                })(),
                (function(){
                    if(ctrl.vm.wait())
                    return m('div.preloader-wrapper.big.active.spinner', [
                        m('div.spinner-layer.spinner-blue-only', [
                            m('div.circle-clipper.left', [
                                m('div.circle')
                            ]),
                            m('div.gap-patch', [
                                m('div.circle')
                            ]),
                            m('div.circle-clipper.right', [
                                m('div.circle')
                            ])
                        ])
                    ]);
                })()
                ]);
        }
    };

    var tableview = function(ctrl){
        return m('table', [
            m('thead', [
                m('tr', [
                    m('th', 'Train'),
                    m('th', 'Name'),
                ]),
            ]),
            m('tbody', [
                ctrl.vm.model.data().map(function(item, i){
                    return m('tr', [
                        m('td', [
                            m('input[type=checkbox]', {id: 'item'+i, onclick: m.withAttr("checked", item.selected), checked: item.selected(), onchange: ctrl.vm.deleteCheck}),
                            m('label', {for: 'item'+i})
                        ]),
                        m('td', item.name),
                    ]);
                })
            ])
        ]);
    };

    var nameFormView = function(ctrl){
        if(ctrl.vm.showNameForm()){
            return m('div.container.nameInput', [
                m('div.input-field', [
                    m('input[type=text]#name', {onchange: m.withAttr('value', ctrl.vm.name), placeholder: 'Name', class: 'validate', name:'name'}, ctrl.vm.name())
                ]),
                m('div.row', [
                    m('div', {class: 'col s8 offset-s4'}, [
                        m('button.btn.waves-effect.waves-light', {onclick: ctrl.vm.submit}, 'Submit')
                    ])
                ])
            ]);
        }
    };

    app.ManageLocations = {
        controller: ctrl,
        view: function(ctrl){
            return [
                m('div.container', [
                    m('h4', 'My Locations'),
                    tableview(ctrl),
                    m('div.row', [
                        deleteView(ctrl)
                    ])
                ]),
                m('h6', ctrl.vm.log()),
                nameFormView(ctrl)
            ];
        }
    };

})(app = window.app || {});
