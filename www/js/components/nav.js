// (function(exports){
//
//     var ul = null, slide, oldX = 0;
//     //view helpers
//     var init = function(element, isInitialized, context) {
//         if (!isInitialized) {
//             ul = document.getElementById('slide-out');
//             ul.style.left = '-105%';
//             // handle drag open/close
//             slide = document.getElementById('slide');
//             slide.ontouchmove = function(e){
//                 var diff = e.touches[0].clientX - oldX;
//                 oldX = e.touches[0].clientX;
//                 if(diff > 30){
//                     slideIn();
//                 } else if (diff < -30){
//                     slideOut();
//                 }
//             };
//         }
//     };
//     function addBodyClick(){
//         setTimeout(function(){
//             document.getElementsByClassName('app')[0].addEventListener('click', slideOut);
//         }, 500);
//     }
//     var out = false;
//     var slideIn = function(){
//         Velocity(ul, {left: 0, complete: function(){
//             out = true;
//             addBodyClick();
//         }});
//     };
//     var slideOut = function(){
//         if(out) {
//             Velocity(ul, {left: '-105%', complete: function(){
//                 out = false;
//             }});
//             document.getElementsByClassName('app')[0].removeEventListener('click', slideOut);
//         }
//     };
//     var toggle = function(){
//         if(out){
//             slideOut();
//         } else {
//             slideIn();
//         }
//     };
//
//     exports.Nav = {
//         controller: function(args){
//             this.nav_items = args.nav_items || [];
//         },
//         view: function(ctrl, args){
//             return m('nav', [
//                 m('ul', {class: 'right hide-on-med-and-down'}, [
//                     ctrl.nav_items.map(function(item){
//                         return m('li', [
//                             m('a', {href: '#!'}, item)
//                         ]);
//                     })
//                 ]),
//                 m('ul#slide-out', {class: 'side-nav'}, [
//                     ctrl.nav_items.map(function(item){
//                         return m('li', [
//                             m('a', {href: item.href, onclick: slideOut}, item.name)
//                         ]);
//                     })
//                 ]
//             ),
//             m('span', {href: '', class: 'button-collapse'}, [
//                 m('i', {class: 'mdi-navigation-menu', onclick: toggle, config: init})
//             ])
//             ]);
//         }
//     };
// })(lt = window.lt || {});
(function(exports){

    var ul = null, overlay;
    //view helpers
    var init = function(element, isInitialized, context) {
        if (!isInitialized) {
            ul = document.getElementById('slide-out');
            ul.style.left = '-105%';
            overlay = document.getElementById('sidenav-overlay');
        }
    };

    var out = false;
    var slideIn = function(){
        Velocity(ul, {left: 0, complete: function(){
            out = true;
        }});
        Velocity(overlay, {opacity: 1, complete: function(){
            overlay.addEventListener('click', slideOut);
            overlay.style.display = 'block';
        }});
    };
    var slideOut = function(){
        if(out) {
            Velocity(ul, {left: '-105%', complete: function(){
                out = false;
            }});
            Velocity(overlay, {opacity: 0, complete: function(){
                overlay.removeEventListener('click', slideOut);
                overlay.style.display = 'none';
            }});
        }
    };
    var toggle = function(){
        if(out){
            slideOut();
        } else {
            slideIn();
        }
    };

    exports.Nav = {
        controller: function(args){
            this.nav_items = args.nav_items || [];
        },
        view: function(ctrl, args){
            return m('nav', [
                m('ul', {class: 'right hide-on-med-and-down'}, [
                    ctrl.nav_items.map(function(item){
                        return m('li', [
                            m('a', {href: item.href, onclick: slideOut}, item.name)
                        ]);
                    })
                ]),
                m('ul#slide-out', {class: 'side-nav'}, [
                    ctrl.nav_items.map(function(item){
                        return m('li', [
                            m('a', {href: item.href, onclick: slideOut}, item.name)
                        ]);
                    })
                ]),
                m('span', {href: '', class: 'button-collapse hide-on-large'}, [
                    m('i', {class: 'mdi-navigation-menu', onclick: toggle, config: init})
                ])
            ]);
        }
    };
})(lt = window.lt || {});
