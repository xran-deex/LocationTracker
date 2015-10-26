// (function(app){
//     'use strict';
//     /* jshint esnext: true */
//     var ItemModel = function(parent, opt){
//         var self = this;
//         this.name = opt.name;
//         this.id = opt.id;
//         this.ready = opt.ready;
//
//         this.delete = function(){
//             let yes = confirm('Are you sure?');
//             if(yes){
//                 m.request({method:'delete', url:'http://valis.strangled.net/locationtracker/train?apikey='+app.APIKEY, data:{id: self.id}}).then(function(res){
//                     parent.data(parent.data().filter(function(item){
//                         return item !== self;
//                     }));
//                     alert(self.name + ' deleted');
//                 });
//             }
//         };
//
//         this.download = function(){
//             m.request({method:'get', url:'http://valis.strangled.net/locationtracker/train/'+self.id+'?apikey='+app.APIKEY}).then(function(res){
//                 // save the downloaded network in local storage
//                 localStorage.setItem('network', JSON.stringify(res.network));
//                 machine.train('default', {network: res.network, action: 'train'}, function(msg){
//                     alert(self.name + ' loaded');
//                 });
//                 app.locations = res.locations;
//                 app.loadedFromServer = true;
//             });
//         };
//     };
//
//     var model = function(){
//         var self = this;
//         this.data = m.prop([]);
//         this.fetchData = function(cb){
//             m.request({method:'get', url:'http://valis.strangled.net/locationtracker/train?apikey='+app.APIKEY}).then(function(res){
//                 cb(res);
//             });
//         };
//         this.update = function(){
//             self.fetchData(function(data){
//                 self.data(data.map(function(item){
//                     item = new ItemModel(self, item);
//                     return item;
//                 }));
//                 self.data().sort(function(i, j){
//                     if(i.name < j.name){
//                         return -1;
//                     } else if (i.name > j.name){
//                         return 1;
//                     }
//                     return 0;
//                 });
//             });
//         };
//     };
//
//     var vm = function(){
//         var self = this;
//         self.model = app.model = new model();
//         app.model.update();
//     };
//
//     // the app controller
//     var ctrl = function(){
//         this.vm = new vm();
//     };
//
//     var tableview = function(ctrl){
//         return m('table', [
//             m('thead', [
//                 m('tr', [
//                     m('th', 'Name'),
//                     m('th', 'Ready'),
//                     m('th', 'Delete'),
//                     m('th', 'Load')
//                 ]),
//             ]),
//             m('tbody', [
//                 ctrl.vm.model.data().map(function(item, i){
//                     return m('tr', [
//                         m('td', item.name),
//                         m('td', item.ready ? 'Yes':'No'),
//                         m('td', [
//                             m('button.table_btn.btn.waves-effect.waves-light', {onclick: item.delete}, 'Delete')
//                         ]),
//                         m('td', [
//                             m('button.table_btn.btn.waves-effect.waves-light', {onclick: item.download}, 'Load')
//                         ])
//                     ]);
//                 })
//             ])
//         ]);
//     };
//
//     var component = {
//         controller: ctrl,
//         view: function(ctrl){
//             return [
//                 m('div.container', [
//                     m('h4', 'My Trained Locations'),
//                     tableview(ctrl)
//                 ])
//             ];
//         }
//     };
//
//     app.Networks = component;
// })(app = window.app || {});
(function(app){
    'use strict';
    /* jshint esnext: true */
    var ItemModel = function(parent, opt, vm){
        var self = this;
        this.name = opt.name;
        this.id = opt.id;
        this.ready = opt.ready;
        this.selected = (function(val){
            var _val = val;
            return function(){
                if(arguments.length > 0){
                    _val = arguments[0];
                    vm.deleteCheck();
                }
                return _val;
            };
        })(false);
        this.default = m.prop(opt._default);

        this.delete = function(){
            let yes = confirm('Are you sure?');
            if(yes){
                m.request({method:'delete', url:app.APIURL+'/train?apikey='+app.APIKEY, data:{id: self.id}}).then(function(res){
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
            m.request({method:'get', url:app.APIURL+'/train?apikey='+app.APIKEY}).then(function(res){
                cb(res);
            });
        };
        this.update = function(){
            self.fetchData(function(data){
                self.data(data.map(function(item){
                    item = new ItemModel(self, item, parent);
                    return item;
                }));
                self.data().sort(function(i, j){
                    if(i.name < j.name){
                        return -1;
                    } else if (i.name > j.name){
                        return 1;
                    }
                    return 0;
                });
            });
        };
    };

    var VM = function(){
        var self = this;
        self.model = app.model = new Model(self);
        self.wait = m.prop(false);
        app.model.update();
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
        self.defaultCheck = function(evt){
            var target = evt.target;
            var checkedItem;
            self.model.data().forEach(function(item){
                if('item2'+item.id !== target.id){
                    item.default(false);
                } else {
                    checkedItem = item;
                }
            });
            m.request({method:'put', url:app.APIURL+'/train?apikey='+app.APIKEY, data:{id: checkedItem.id}}).then(function(res){
                console.log(res);
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
                    return m('button.btn.waves-effect.waves-light', {onclick: ctrl.vm.delete}, 'Delete selected', [
                        m('i.material-icons.right', 'send')
                    ]);
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
        return m('div', [
            m('table', [
                m('thead', [
                    m('tr', [
                        m('th', 'Name'),
                        m('th', 'Ready'),
                        m('th', 'Delete'),
                        m('th', 'Default')
                    ]),
                ]),
                m('tbody', [
                    ctrl.vm.model.data().map(function(item, i){
                        return m('tr', [
                            m('td', item.name),
                            m('td', item.ready ? 'Yes':'No'),
                            m('td', [
                                m('input[type=checkbox]', {id: 'item'+i, onclick: m.withAttr("checked", item.selected), checked: item.selected()}),
                                m('label', {for: 'item'+i})
                            ]),
                            m('td', [
                                m('input[type=checkbox]', {id: 'item2'+item.id, onchange: ctrl.vm.defaultCheck, onclick: m.withAttr("checked", item.default), checked: item.default()}),
                                m('label', {for: 'item2'+item.id})
                            ]),
                        ]);
                    })
                ])
            ]),
            deleteView(ctrl)
        ]);
    };

    app.TrainedLocations = {
        controller: ctrl,
        view: function(ctrl){
            return [
                m('div.container', [
                    m('h4', 'My Trained Locations'),
                    tableview(ctrl)
                ])
            ];
        }
    };

})(app = window.app || {});
