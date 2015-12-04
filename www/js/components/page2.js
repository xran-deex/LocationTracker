(function(app){

    var ctrl = function(){
        var self = this;
        this.delete_db = function(){
            //app.db.delete();
            indoor.deleteDb();
            app.LogModel.Log('Db deleted');
        };
        this.delete_wifi = function(){
            indoor.deleteWifi(app.log);
        };
        this.clearLog = function(){
            app.LogModel.logs.length = 0;
        };
        this.clearLocalStorage = function(){
            localStorage.clear();
        };
        this.toggle = function(){
            app.local(!app.local());
        };
        this.logs = app.LogModel.logs;
    };

    var view = function(ctrl){
        return [
            m('a', {class: 'waves-effect waves-light btn', onclick: ctrl.delete_db}, 'Delete DB'),
            m('a', {class: 'waves-effect waves-light btn', onclick: ctrl.delete_wifi}, 'Reset wifi data'),
            m('a', {class: 'waves-effect waves-light btn', onclick: ctrl.clearLog}, 'Clear Log'),
            m('a', {class: 'waves-effect waves-light btn', onclick: ctrl.clearLocalStorage}, 'Clear Storage'),
            m('p', [
                m('input#local[type=checkbox]', {onchange: ctrl.toggle, checked: app.local()}),
                m('label', {for: 'local'}, 'Local Training')
            ]),
            m('div.range-field', [
                m('input#freq[type=range]', {min: 100, max:5000, step: 100, value: app.freq(), onchange: m.withAttr('value', app.freq)}),
            ]),
            m('div', app.freq()),
            m('label', {for: 'freq'}, 'Polling Freq'),
            m('div.log_list', [
                ctrl.logs.map(function(item){
                    return m('p', item);
                })
            ])
        ];
    };

    var component = {
        controller: ctrl,
        view: view
    };

    app.Page2 = component;
})(app = window.app || {});
