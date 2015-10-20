/**
 *  @param e the event object
 */
onmessage = function(e){
    // todo - train data
    ml.train(e);
    // setTimeout(function(){
    //     postMessage('Received: ' + e.data);
    // }, 2000);
};
