(function(app){



})(app = window.app || {});

var NavLinks = [
    {
        name:'Home',
        href:'#/'
    },
    {
        name:'Logs',
        href:'#/page2'
    },
    {
        name:'Trained Networks',
        href:'#/networks'
    }
];

m.route.mode = "hash";
m.mount(document.getElementById('nav'), m.component(lt.Nav, {nav_items: NavLinks}));
m.route(document.getElementById('app'), '/', {
    '/': app.Page1,
    '/page2': app.Page2,
    '/networks': app.Networks
});
