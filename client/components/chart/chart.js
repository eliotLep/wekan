const { calculateIndex } = Utils;

//script(src="../node_modules/chart.js/dist/Chart.bundle.js")

//const Chart = require('chart.js');
import Chart from 'chart.js';
import Mongo from 'meteor/mongo'



BlazeComponent.extendComponent({


  onRendered() {

    //setup the buttons
    var buttonUpdate = document.getElementById('buttonUpdate');
    var buttonChangeView = document.getElementById('buttonChangeView');
    buttonUpdate.addEventListener('click',updateChart);
    buttonChangeView.addEventListener('click',changeChartView);


    updateChart();

  },
}).register('chart');


var currentView='Day';

class Day {
  constructor(day,nbTaskDone){
    this.day = day;
    this.nbTaskDone = nbTaskDone;
  }
  addTasksDone(nbTasks){
    this.nbTaskDone+=nbTasks;
  }

}

class Sprint {
  constructor(receivedAt,dueAt){
    this.receivedAt = receivedAt;
    this.dueAt = dueAt;
    this.numTasksTot = 0;
    this.numTasksDone = 0;
  }

  addTaskTot(nbTasks){
    this.numTasksTot+=nbTasks;
  }
  setTasksTot(nbTasks){
    this.numTasksTot=nbTasks;
  }
  remTaskTot(nbTasks){
    this.numTasksTot-=nbTasks;
  }

  setTasksDone(nbTasks){
    this.numTasksDone=nbTasks;
  }
  addTaskDone(nbTasks){
    this.numTasksDone+=nbTasks;
  }
  remTaskDone(nbTasks){
    this.numTasksDone-=nbTasks;
  }



}

function getNormalizedDate(isoDate){
  return isoDate.toISOString().substring(0,10);
}



function updateChart(){


  //get all the cards for this board
  const cardsDueTime = Cards.find().fetch(); //TODO test if it dont count other board tasks if it does get them by board id in find()

  //will contain sprint dates and other informations about sprints
  var sprints = new Array();
  //will contain the number of task done for each day of the project
  var days = new Array();


  //init the different sprints received and dueAt dates
  for(var i=0;i<cardsDueTime.length;i++){
    var item = cardsDueTime[i];

    if(item.dueAt==null || item.dueAt==undefined || item.receivedAt==null || item.receivedAt==undefined){
      continue;
    }
    var receivedAt = item.receivedAt;
    var dueAt = item.dueAt;

    var test=0;
    for(var j=0;j<sprints.length;j++){
      var itemSprint = sprints[j];
      if(getNormalizedDate(itemSprint.dueAt) == getNormalizedDate(dueAt) ){
        if(getNormalizedDate(itemSprint.receivedAt)>getNormalizedDate(receivedAt) ){//when a card ends at the same moment but start before, we dont add a new sprint be we replace the previous receivedAt
          sprints[j].receivedAt=receivedAt;
        }
        test=1;
        break;
      }
    }
    if(test==0){
      sprints.push( new Sprint(receivedAt,dueAt) );
    }

  }

  //setup some important values of the project
  var totalTaskCount=0;
  var dateStartProject;
  var dateEndProject;
  var totalDayProject;
  if(sprints.length>0){
    dateStartProject=sprints[0].receivedAt;
    dateEndProject=sprints[0].dueAt;
  }
  for(var i=0;i<sprints.length;i++){
    if(dateStartProject>sprints[i].receivedAt){
      dateStartProject = sprints[i].receivedAt;
    }
    if(dateEndProject<sprints[i].dueAt){
      dateEndProject = sprints[i].dueAt;
    }
  }

  totalDayProject = daysBetween(getNormalizedDate(dateStartProject),getNormalizedDate(dateEndProject) ) ;
  for(var i=0;i<totalDayProject;i++){
    days.push( new Day( i , 0) );
  }




  //set the other values of each sprint, the tasksDone and totalTasks
  for(var i=0;i<sprints.length;i++){
    var item = sprints[i];

    //on recupere les tasks de ce sprint.
    var sprintTasksTot = Cards.find( {receivedAt : {"$gte": item.receivedAt,"$lt": item.dueAt} } ).fetch();

    totalTaskCount+=sprintTasksTot.length;

    //on recupere les tasks terminé pour ce sprint
    var sprintTasksDone=new Array();
    for(var j=0;j<sprintTasksTot.length;j++){
      if(sprintTasksTot[j].endAt!=null && sprintTasksTot[j].endAt!=undefined){
        sprintTasksDone.push(sprintTasksTot[j]);

        var day = daysBetween(getNormalizedDate(dateStartProject),getNormalizedDate(sprintTasksTot[j].endAt));
        if(day<totalDayProject){
          days[ day ].addTasksDone(1);
        }


      }
    }

    item.setTasksTot(sprintTasksTot.length);
    item.setTasksDone(sprintTasksDone.length);
  }




  //mode day du burndown chart
  var tasksPerDay = new Array();
  var totDoneDays=totalTaskCount;
  tasksPerDay.push(totDoneDays);
  for(var i=0;i<totalDayProject;i++){
    totDoneDays = totDoneDays - days[i].nbTaskDone ;
    tasksPerDay.push(totDoneDays);
    console.log("day:"+tasksPerDay[i]);
  }
  console.log("day:"+tasksPerDay[tasksPerDay.length-1]);


  //setup les sprints dans l'odre ici
  //-
  /*var finalSprintArray = new Array();
  for(var i=0;i<sprints.length;i++){

  }*/
  //mode sprint du burndownchart
  var tasksPerSprint = new Array();
  var totalTemp=totalTaskCount;
  tasksPerSprint.push(totalTemp);
  for(var i=0;i<sprints.length;i++){
    totalTemp = totalTemp-sprints[i].numTasksDone;
    tasksPerSprint.push( totalTemp);
    console.log("sprint:"+tasksPerSprint[i]);
  }
  console.log("sprint:"+tasksPerSprint[tasksPerSprint.length-1]);


  if(currentView=='Day'){
    showBurnDown('myChart', tasksPerDay, [0],'Day');
  }else{
    showBurnDown('myChart', tasksPerSprint, [0],'Sprint');
  }

}

function changeChartView(){
  if(currentView=='Day')currentView='Sprint';
  else currentView='Day';
  updateChart();
}





function daysBetween(date1Normalized,date2Normalized){
  return (new Date(date2Normalized)-new Date(date1Normalized))/(1000*3600*24);
}


function sumArrayUpTo(arrData, index) {
  var total = 0;
  for (var i = 0; i <= index; i++) {
    if (arrData.length > i) {
      total += arrData[i];
        }
  }
  return total;
}


function showBurnDown(elementId, burndownData, scopeChange = [] , typeAbs) {

  var speedCanvas = document.getElementById(elementId);
  Chart.defaults.global.defaultFontFamily = "Arial";
  Chart.defaults.global.defaultFontSize = 14;

  nbData = burndownData.length;
  if(nbData<=0)return;

  const totalData = burndownData[0];

  var idealTaskPerData=0;
  if(nbData>1){
    idealTaskPerData=totalData / (nbData-1);
  }else{
    idealTaskPerData=totalData;
  }


  var labelsSpeedData = new Array();
  var idealData = new Array();
  idealData.push(totalData);
  labelsSpeedData.push( "Start" );

  for(var i=1;i<nbData;i++){
    labelsSpeedData.push( typeAbs+" "+(i) );
    idealData.push( totalData - (idealTaskPerData * i) + sumArrayUpTo(scopeChange, (i-1)) );
  }



  var speedData = {
    labels: labelsSpeedData,
    datasets: [
      {
        label: "Burndown",
        data: burndownData,
        fill: false,
        borderColor: "#EE6868",
        backgroundColor: "#EE6868",
        lineTension: 0,
      },
      {
        label: "Ideal",
        borderColor: "#6C8893",
        backgroundColor: "#6C8893",
        lineTension: 0,
        borderDash: [5, 5],
        fill: false,
        data: idealData
      },
    ]
  };

  var chartOptions = {
    legend: {
      display: true,
      position: 'top',
      labels: {
        boxWidth: 80,
        fontColor: 'black'
      }
    },
    scales: {
        yAxes: [{
            ticks: {
                min: 0,
                max: Math.round(burndownData[0] * 1.1)
            }
        }]
    }
  };

  var lineChart = new Chart(speedCanvas, {
    type: 'line',
    data: speedData,
    options: chartOptions
  });

}
