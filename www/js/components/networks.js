(function(app){
    'use strict';
    /* jshint esnext: true */
    var ItemModel = function(parent, opt){
        var self = this;
        this.name = opt.name;
        this.id = opt.id;
        this.ready = opt.ready;
	    this.error = opt.error || NaN;
        this.selected = m.prop(false);
        this.default = m.prop(opt._default);

        this.delete = function(){
            let yes = confirm('Are you sure?');
            if(yes){
                m.request({method:'delete', url:app.APIURL+'/train?apikey='+app.APIKEY, data:{id: self.id}}).then(function(res){
                    parent.data(parent.data().filter(function(item){
                        return item !== self;
                    }));
                });
            }
        };
    };

    var Model = function(){
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
                    console.log(item);
                    item = new ItemModel(self, item);
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
        self.model = app.model = new Model();
        self.wait = m.prop(false);
        app.model.update();
        // returns true if there are selected items
        self.hasSelected = function(){
            return self.model.data().filter(function(item){
                return item.selected();
            }).length > 0;
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
        if(ctrl.vm.hasSelected()){
            return m('div.row.flex-container', [
            m('div.btnspinner', [
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
            ])
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
			            m('th', 'Error'),
                        m('th', 'Delete'),
                        m('th', 'Default')
                    ]),
                ]),
                m('tbody', [
                    ctrl.vm.model.data().map(function(item, i){
                        return m('tr', [
                            m('td', item.name),
                            m('td', item.ready ? 'Yes':'No'),
			                m('td', item.error.toFixed(5)),
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
            ])
        ]);
    };

    app.TrainedLocations = {
        controller: ctrl,
        view: function(ctrl){
            return [
                m('div.container', [
                    m('h4', 'My Trained Locations'),
                    deleteView(ctrl),
                    tableview(ctrl)
                ])
            ];
        }
    };

})(app = window.app || {});
