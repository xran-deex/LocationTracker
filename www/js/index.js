(function(app){

    

})(app = window.app || {});

var NavLinks = [
    {
        name:'Page 1',
        href:'#/'
    },
    {
        name:'Page 2',
        href:'#/page2'
    }
];

m.route.mode = "hash";
m.mount(document.getElementById('nav'), m.component(lt.Nav, {nav_items: NavLinks}));
m.route(document.getElementById('app'), '/', {
    '/': app.Page1,
    '/page2': app.Page2
});
