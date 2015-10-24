(function(app){
    'use strict';
    /* jshint esnext: true */
    var ItemModel = function(parent, opt){
        var self = this;
        this.name = opt.name;
        this.id = opt.id;
        this.ready = opt.ready;

        this.delete = function(){
            let yes = confirm('Are you sure?');
            if(yes){
                m.request({method:'delete', url:'http://valis.strangled.net/locationtracker/train?apikey='+app.APIKEY, data:{id: self.id}}).then(function(res){
                    parent.data(parent.data().filter(function(item){
                        return item !== self;
                    }));
                    alert(self.name + ' deleted');
                });
            }
        };

        this.download = function(){
            m.request({method:'get', url:'http://valis.strangled.net/locationtracker/train/'+self.id+'?apikey='+app.APIKEY}).then(function(res){
                // save the downloaded network in local storage
                localStorage.setItem('network', JSON.stringify(res.network));
                machine.train('default', {network: res.network, action: 'train'}, function(msg){
                    alert(self.name + ' loaded');
                });
                app.locations = res.locations;
                app.loadedFromServer = true;
            });
        };
    };

    var model = function(){
        var self = this;
        this.data = m.prop([]);
        this.fetchData = function(cb){
            m.request({method:'get', url:'http://valis.strangled.net/locationtracker/train?apikey='+app.APIKEY}).then(function(res){
                cb(res);
            });
        };
        this.update = function(){
            self.fetchData(function(data){
                self.data(data.map(function(item){
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

    var vm = function(){
        var self = this;
        self.model = app.model = new model();
        app.model.update();
    };

    // the app controller
    var ctrl = function(){
        this.vm = new vm();
    };

    var tableview = function(ctrl){
        return m('table', [
            m('thead', [
                m('tr', [
                    m('th', 'Name'),
                    m('th', 'Ready'),
                    m('th', 'Delete'),
                    m('th', 'Load')
                ]),
            ]),
            m('tbody', [
                ctrl.vm.model.data().map(function(item, i){
                    return m('tr', [
                        m('td', item.name),
                        m('td', item.ready ? 'Yes':'No'),
                        m('td', [
                            m('button.table_btn.btn.waves-effect.waves-light', {onclick: item.delete}, 'Delete')
                        ]),
                        m('td', [
                            m('button.table_btn.btn.waves-effect.waves-light', {onclick: item.download}, 'Load')
                        ])
                    ]);
                })
            ])
        ]);
    };

    var component = {
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

    app.Networks = component;
})(app = window.app || {});
