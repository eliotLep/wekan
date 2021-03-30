const { calculateIndex } = Utils;


//import les libs
import Chart from 'chart.js';
import Mongo from 'meteor/mongo'


BlazeComponent.extendComponent({

  //méthode appelé lors de l'affichage du composant blaze
  onRendered() {
    //setup les boutons
    var buttonUpdate = document.getElementById('buttonUpdate');
    var buttonChangeView = document.getElementById('buttonChangeView');
    buttonUpdate.addEventListener('click',updateChart);
    buttonChangeView.addEventListener('click',changeChartView);

    updateChart();
  },

}).register('chart');


//vu actuel du burndown chart
var currentView='Day';

//information d'un jour
class Day {
  constructor(day,nbTaskDone){
    this.day = day;
    this.nbTaskDone = nbTaskDone;
  }
  addTasksDone(nbTasks){
    this.nbTaskDone+=nbTasks;
  }
}

//informations d'un sprint
class Sprint {
  constructor(receivedAt,dueAt,listId){
    this.receivedAt = receivedAt;
    this.dueAt = dueAt;
    this.numTasksTot = 0;
    this.numTasksDone = 0;
    this.listId = listId;
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

//retourne une date sous forme de string sans les heures, minutes et secondes
function getNormalizedDate(isoDate){
  return isoDate.toISOString().substring(0,10);
}


//update les valeurs du burndown chart et le retrace
function updateChart(){

  var currentBoardId=Boards.findOne(Session.get('currentBoard'))._id;
  //get all the cards for this board
  const cardsDueTime = Cards.find({boardId: currentBoardId}).fetch(); //TODO test if it dont count other board tasks if it does get them by board id in find()

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
    var listId = item.listId;

    var test=0;
    for(var j=0;j<sprints.length;j++){
      var itemSprint = sprints[j];
      if( item.listId == itemSprint.listId ){
        //mise a jour des dates de received et dueAt de ce sprint si on recupere une card de ce sprint avec d'autre valeur de received et dueAt
        if( getNormalizedDate(itemSprint.receivedAt)>getNormalizedDate(receivedAt) ){//when a card ends at the same moment but start before, we dont add a new sprint be we replace the previous receivedAt
          sprints[j].receivedAt=receivedAt;
        }
        if( getNormalizedDate(itemSprint.dueAt)<getNormalizedDate(dueAt) ){//when a card ends at the same moment but start before, we dont add a new sprint be we replace the previous receivedAt
          sprints[j].dueAt=dueAt;
        }

        test=1;
        break;
      }
    }
    if(test==0){
      sprints.push( new Sprint(receivedAt,dueAt,listId) );
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

  //initialise le tableau de jour du projet
  totalDayProject = daysBetween(getNormalizedDate(dateStartProject),getNormalizedDate(dateEndProject) ) ;
  for(var i=0;i<=totalDayProject;i++){
    days.push( new Day( i , 0) );
  }




  //set the other values of each sprint, the tasksDone and totalTasks
  for(var i=0;i<sprints.length;i++){
    var item = sprints[i];

    //on recupere les tasks de ce sprint.
    var sprintTasksTot = Cards.find( {listId : item.listId, boardId: ""+currentBoardId } ).fetch();

    totalTaskCount+=sprintTasksTot.length;

    //on recupere les tasks terminé pour ce sprint
    var sprintTasksDone=new Array();
    for(var j=0;j<sprintTasksTot.length;j++){
      if(sprintTasksTot[j].endAt!=null && sprintTasksTot[j].endAt!=undefined){
        sprintTasksDone.push(sprintTasksTot[j]);

        //on incremente le nombre de task fini pour le jour concerné
        var day = daysBetween(getNormalizedDate(dateStartProject),getNormalizedDate(sprintTasksTot[j].endAt));
        if(day<=totalDayProject){
          days[ day ].addTasksDone(1);
          console.log("done day:"+day+" for:"+getNormalizedDate(sprintTasksTot[j].endAt));
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
  for(var i=0;i<=totalDayProject;i++){
    totDoneDays = totDoneDays - days[i].nbTaskDone ;
    tasksPerDay.push(totDoneDays);
  }



  //setup les sprints dans l'odre ici
  //-
  var bestDay=0;
  var finalSprintArray = new Array();
  if(sprints.length>0){
    finalSprintArray[0] = sprints[0];
    bestDay=sprints[0].dueAt;
  }

  var used = new Array();

  for(var x=0;x<sprints.length;x++){
    var last=0;
    bestDay=0;
    for(var i=0;i<sprints.length;i++){

      var day = sprints[i].dueAt;

      //console.log("try push:"+sprints[i].dueAt+" day was:"+day+" bestDay:"+bestDay);
      if((bestDay==0 || day<bestDay) && !used.includes(i) ){
        //console.log("push:"+sprints[i].dueAt+" day was:"+day+" bestDay:"+bestDay);
        bestDay=day;
        finalSprintArray[x]=sprints[i];
        last=i;
      }
    }
    used.push(last);
  }


  //mode sprint du burndownchart
  var tasksPerSprint = new Array();
  var totalTemp=totalTaskCount;
  tasksPerSprint.push(totalTemp);
  for(var i=0;i<finalSprintArray.length;i++){
    totalTemp = totalTemp-finalSprintArray[i].numTasksDone;
    tasksPerSprint.push( totalTemp);
  }



  if(currentView=='Day'){
    showBurnDown('myChart', tasksPerDay, [0],'Day');
  }else{
    showBurnDown('myChart', tasksPerSprint, [0],'Sprint');
  }

}

//change le mode de vu du burn down chart
function changeChartView(){
  if(currentView=='Day')currentView='Sprint';
  else currentView='Day';
  updateChart();
}




//retourne le nombre de jour entre deux date (si les dates sont trop proche peut poser problème à cause du decalage horraire de la zone)
function daysBetween(date1Normalized,date2Normalized){
  return (new Date(date2Normalized)-new Date(date1Normalized))/(1000*3600*24);
}


//fait varié le nombre de tache total au cours du projet, inutilisé actuelement
function sumArrayUpTo(arrData, index) {
  var total = 0;
  for (var i = 0; i <= index; i++) {
    if (arrData.length > i) {
      total += arrData[i];
        }
  }
  return total;
}

//affiche le burndown chart
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
