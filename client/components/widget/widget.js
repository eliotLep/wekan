const { calculateIndex } = Utils;

import Timer from 'easytimer.js';

BlazeComponent.extendComponent({

  onRendered(){
    var timer = new Timer();

    //setup les boutons et zone de texte
    var startButton = document.getElementById('startButton');
    var pauseButton = document.getElementById('pauseButton');
    var stopButton = document.getElementById('stopButton');
    var resetButton = document.getElementById('resetButton');
    var values = document.getElementById('values');

    //ajoute les listener
    startButton.addEventListener('click',function () {
        timer.start();
    });
    pauseButton.addEventListener('click',function () {
        timer.pause();
    });
    stopButton.addEventListener('click',function () {
        timer.stop();
    });
    resetButton.addEventListener('click',function () {
        timer.reset();
    });

    //maj de value
    timer.addEventListener('secondsUpdated', function (e) {
        values.innerHTML=timer.getTimeValues().toString();
    });

    timer.addEventListener('started', function (e) {
        values.innerHTML=timer.getTimeValues().toString();
    });

    timer.addEventListener('reset', function (e) {
        values.innerHTML=timer.getTimeValues().toString();
    });


  },

}).register('widget');
